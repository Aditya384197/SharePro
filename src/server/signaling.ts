import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'http';

interface PeerSession {
  ws: WebSocket;
  id: string;
  room?: string;
  role?: 'receiver' | 'sender';
  deviceName?: string;
  deviceType?: string;
}

interface Room {
  id: string;
  receiverId: string;
  receiverName: string;
  receiverType: string;
  created: number;
  senderId?: string;
}

export function setupSignaling(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });
  const peers = new Map<string, PeerSession>();
  const rooms = new Map<string, Room>();

  httpServer.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
    if (pathname !== '/ws' && pathname !== '/ws/') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  const roomView = (room: Room) => ({
    room: room.id,
    deviceName: room.receiverName,
    deviceType: room.receiverType,
    hasSender: Boolean(room.senderId),
  });

  const broadcastRooms = () => {
    const payload = JSON.stringify({
      type: 'active_rooms',
      rooms: Array.from(rooms.values()).map(roomView),
    });

    for (const peer of peers.values()) {
      if (peer.role === 'sender' || !peer.room) {
        if (peer.ws.readyState === WebSocket.OPEN) peer.ws.send(payload);
      }
    }
  };

  const clearPeerRoom = (peer: PeerSession) => {
    const roomCode = peer.room;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    if (peer.role === 'receiver') {
      if (room.senderId) {
        const sender = peers.get(room.senderId);
        if (sender?.ws.readyState === WebSocket.OPEN) {
          sender.ws.send(JSON.stringify({
            type: 'peer_disconnected',
            reason: 'Receiver disconnected',
          }));
        }
      }
      rooms.delete(roomCode);
    } else if (peer.role === 'sender' && room.senderId === peer.id) {
      const receiver = peers.get(room.receiverId);
      if (receiver?.ws.readyState === WebSocket.OPEN) {
        receiver.ws.send(JSON.stringify({
          type: 'peer_disconnected',
          reason: 'Sender disconnected',
        }));
      }
      room.senderId = undefined;
    }

    peer.room = undefined;
    peer.role = undefined;
    broadcastRooms();
  };

  wss.on('connection', (ws: WebSocket) => {
    const peerId = cryptoRandomId();
    const peer: PeerSession = { ws, id: peerId };
    peers.set(peerId, peer);

    ws.send(JSON.stringify({ type: 'connected', peerId }));

    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString());
        if (!msg || typeof msg.type !== 'string') return;

        switch (msg.type) {
          case 'get_rooms': {
            ws.send(JSON.stringify({
              type: 'active_rooms',
              rooms: Array.from(rooms.values()).map(roomView),
            }));
            break;
          }

          case 'register_room': {
            const roomCode = normalizeRoom(msg.room);
            if (!/^\d{6}$/.test(roomCode)) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid 6-digit room code.' }));
              return;
            }

            const old = rooms.get(roomCode);
            if (old && old.receiverId !== peerId) {
              const oldReceiver = peers.get(old.receiverId);
              if (oldReceiver?.ws.readyState === WebSocket.OPEN) {
                oldReceiver.ws.send(JSON.stringify({ type: 'peer_disconnected', reason: 'Room replaced' }));
              }
            }

            clearPeerRoom(peer);
            peer.room = roomCode;
            peer.role = 'receiver';
            peer.deviceName = sanitizeText(msg.deviceName, 'Receiver Device');
            peer.deviceType = sanitizeText(msg.deviceType, 'unknown');

            rooms.set(roomCode, {
              id: roomCode,
              receiverId: peerId,
              receiverName: peer.deviceName,
              receiverType: peer.deviceType,
              created: Date.now(),
            });

            ws.send(JSON.stringify({ type: 'room_registered', room: roomCode }));
            broadcastRooms();
            break;
          }

          case 'join_room': {
            const roomCode = normalizeRoom(msg.room);
            const room = rooms.get(roomCode);
            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found. Check the code or refresh.' }));
              return;
            }
            if (room.senderId && room.senderId !== peerId) {
              ws.send(JSON.stringify({ type: 'error', message: 'This receiver is already handling another sender.' }));
              return;
            }

            clearPeerRoom(peer);
            peer.room = roomCode;
            peer.role = 'sender';
            peer.deviceName = sanitizeText(msg.deviceName, 'Sender Device');
            peer.deviceType = sanitizeText(msg.deviceType, 'unknown');
            room.senderId = peerId;

            const receiver = peers.get(room.receiverId);
            if (!receiver || receiver.ws.readyState !== WebSocket.OPEN) {
              room.senderId = undefined;
              ws.send(JSON.stringify({ type: 'error', message: 'Receiver is offline or disconnected.' }));
              return;
            }

            receiver.ws.send(JSON.stringify({
              type: 'sender_joined',
              senderId: peerId,
              senderName: peer.deviceName,
              senderType: peer.deviceType,
              filesMeta: Array.isArray(msg.filesMeta) ? msg.filesMeta : [],
            }));
            ws.send(JSON.stringify({
              type: 'joined_success',
              room: roomCode,
              receiverName: room.receiverName,
            }));
            broadcastRooms();
            break;
          }

          case 'accept_transfer':
          case 'reject_transfer': {
            const room = peer.room ? rooms.get(peer.room) : undefined;
            if (!room || peer.role !== 'receiver' || !room.senderId) return;
            const sender = peers.get(room.senderId);
            if (!sender || sender.ws.readyState !== WebSocket.OPEN) return;

            if (msg.type === 'accept_transfer') {
              sender.ws.send(JSON.stringify({ type: 'transfer_accepted' }));
            } else {
              sender.ws.send(JSON.stringify({
                type: 'transfer_rejected',
                reason: sanitizeText(msg.reason, 'Declined by receiver'),
              }));
            }
            break;
          }

          case 'signal': {
            const room = peer.room ? rooms.get(peer.room) : undefined;
            if (!room) return;
            const targetId = peer.role === 'sender' ? room.receiverId : room.senderId;
            if (!targetId) return;
            const targetPeer = peers.get(targetId);
            if (targetPeer?.ws.readyState === WebSocket.OPEN) {
              targetPeer.ws.send(JSON.stringify({
                type: 'signal',
                signal: msg.signal,
                from: peer.role,
              }));
            }
            break;
          }

          // Deliberately no file-relay message exists here. File bytes must stay
          // on the direct WebRTC DataChannel path.
          case 'cancel_transfer': {
            const room = peer.room ? rooms.get(peer.room) : undefined;
            if (!room) return;
            const otherId = peer.role === 'sender' ? room.receiverId : room.senderId;
            if (!otherId) return;
            const otherPeer = peers.get(otherId);
            if (otherPeer?.ws.readyState === WebSocket.OPEN) {
              otherPeer.ws.send(JSON.stringify({ type: 'transfer_cancelled' }));
            }
            break;
          }
        }
      } catch (err) {
        console.error('Signaling parse error:', err);
      }
    });

    ws.on('close', () => {
      clearPeerRoom(peer);
      peers.delete(peerId);
    });

    ws.on('error', () => {
      // close event performs cleanup.
    });
  });

  return { wss, peers, rooms };
}

function cryptoRandomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeRoom(value: unknown): string {
  return String(value ?? '').trim().replace(/\D/g, '');
}

function sanitizeText(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim().replace(/[\r\n|]/g, ' ');
  return text ? text.slice(0, 80) : fallback;
}
