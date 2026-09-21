import express from 'express';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';

interface PeerConnection {
  peerId: string;
  role: 'sender' | 'receiver';
  name: string;
  res: express.Response;
}

interface Room {
  id: string;
  pin: string;
  receiverName: string;
  receiverAvatar: string;
  deviceType: string;
  createdAt: number;
  lastActive: number;
  peers: Map<string, PeerConnection>;
  relayFiles: Map<string, {
    id: string;
    name: string;
    size: number;
    type: string;
    chunks: Buffer[];
    receivedBytes: number;
  }>;
}

const rooms = new Map<string, Room>();

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (now - room.lastActive > 30 * 60 * 1000) {
      rooms.delete(id);
    }
  }
}, 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.raw({ limit: '100mb', type: 'application/octet-stream' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'SharePro', roomsCount: rooms.size });
  });

  function getProjectFiles(baseDir: string): string[] {
    const results: string[] = [];
    const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.cache', '.vite']);

    function scan(dir: string, relPrefix: string = '') {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (ignoredDirs.has(entry.name)) continue;
            scan(path.join(dir, entry.name), path.join(relPrefix, entry.name));
          } else if (entry.isFile()) {
            const relPath = path.join(relPrefix, entry.name);
            results.push(relPath);
          }
        }
      } catch {}
    }

    scan(baseDir);
    return results.sort();
  }

  app.get('/api/project-files-info', (req, res) => {
    try {
      const files = getProjectFiles(process.cwd());
      res.json({ success: true, count: files.length, files });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: msg });
    }
  });

  app.get('/api/project-files-bundle', (req, res) => {
    try {
      const files = getProjectFiles(process.cwd());
      const bundle: { path: string; content: string; size: number }[] = [];

      for (const relPath of files) {
        if (relPath.endsWith('.zip') || relPath.includes('SharePro-SourceCode')) continue;
        const fullPath = path.join(process.cwd(), relPath);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          bundle.push({
            path: relPath,
            content,
            size: Buffer.byteLength(content, 'utf8'),
          });
        }
      }

      res.json({ success: true, count: bundle.length, files: bundle });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: msg });
    }
  });

  const handleZipDownload = async (req: express.Request, res: express.Response) => {
    try {
      const files = getProjectFiles(process.cwd());
      const zip = new JSZip();

      for (const relPath of files) {
        if (relPath.endsWith('.zip') || relPath.includes('SharePro-SourceCode')) continue;
        const fullPath = path.join(process.cwd(), relPath);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const data = fs.readFileSync(fullPath);
          zip.file(relPath, data);
        }
      }

      const content = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="SharePro-SourceCode.zip"');
      res.setHeader('Content-Length', content.length.toString());
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.end(content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ success: false, error: msg });
    }
  };

  app.get('/SharePro-SourceCode.zip', handleZipDownload);
  app.get('/api/download-zip', handleZipDownload);

  app.post('/api/rooms', (req, res) => {
    const { name, avatar, deviceType } = req.body || {};
    let pin = Math.floor(100000 + Math.random() * 900000).toString();
    while (rooms.has(pin)) {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const room: Room = {
      id: pin,
      pin,
      receiverName: name || 'Device-' + pin.slice(-3),
      receiverAvatar: avatar || 'phone',
      deviceType: deviceType || 'Mobile',
      createdAt: Date.now(),
      lastActive: Date.now(),
      peers: new Map(),
      relayFiles: new Map(),
    };

    rooms.set(pin, room);
    res.json({
      success: true,
      room: {
        id: room.id,
        pin: room.pin,
        receiverName: room.receiverName,
        receiverAvatar: room.receiverAvatar,
        deviceType: room.deviceType,
      },
    });
  });

  app.get('/api/rooms', (req, res) => {
    const activeRooms = Array.from(rooms.values())
      .filter((r) => Date.now() - r.lastActive < 5 * 60 * 1000)
      .map((r) => ({
        id: r.id,
        pin: r.pin,
        name: r.receiverName,
        avatar: r.receiverAvatar,
        deviceType: r.deviceType,
        peersCount: r.peers.size,
        ageMs: Date.now() - r.createdAt,
      }));

    res.json({ success: true, rooms: activeRooms });
  });

  app.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found or expired' });
    }
    room.lastActive = Date.now();
    res.json({
      success: true,
      room: {
        id: room.id,
        pin: room.pin,
        receiverName: room.receiverName,
        receiverAvatar: room.receiverAvatar,
        deviceType: room.deviceType,
        peersCount: room.peers.size,
      },
    });
  });

  app.get('/api/events/:roomId', (req, res) => {
    const { roomId } = req.params;
    const peerId = (req.query.peerId as string) || `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const role = (req.query.role as 'sender' | 'receiver') || 'sender';
    const peerName = (req.query.name as string) || (role === 'receiver' ? 'Receiver' : 'Sender');

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    room.peers.set(peerId, {
      peerId,
      role,
      name: peerName,
      res,
    });
    room.lastActive = Date.now();

    const welcomeMsg = JSON.stringify({
      type: 'connected',
      peerId,
      role,
      roomId,
      receiverName: room.receiverName,
      peers: Array.from(room.peers.values()).map((p) => ({ peerId: p.peerId, role: p.role, name: p.name })),
    });
    res.write(`data: ${welcomeMsg}\n\n`);

    for (const [otherId, otherPeer] of room.peers.entries()) {
      if (otherId !== peerId) {
        try {
          otherPeer.res.write(
            `data: ${JSON.stringify({
              type: 'peer-joined',
              peerId,
              role,
              name: peerName,
            })}\n\n`
          );
        } catch {}
      }
    }

    const keepAliveTimer = setInterval(() => {
      try {
        res.write(`: keepalive\n\n`);
      } catch {
        clearInterval(keepAliveTimer);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      const currentRoom = rooms.get(roomId);
      if (currentRoom) {
        currentRoom.peers.delete(peerId);
        for (const otherPeer of currentRoom.peers.values()) {
          try {
            otherPeer.res.write(
              `data: ${JSON.stringify({
                type: 'peer-left',
                peerId,
                role,
              })}\n\n`
            );
          } catch {}
        }
      }
    });
  });

  app.post('/api/signal/:roomId', (req, res) => {
    const { roomId } = req.params;
    const { senderId, type, data } = req.body || {};

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    room.lastActive = Date.now();

    const payload = JSON.stringify({
      type: 'signal',
      senderId,
      signalType: type,
      data,
    });

    let sentCount = 0;
    for (const [otherId, peer] of room.peers.entries()) {
      if (otherId !== senderId) {
        try {
          peer.res.write(`data: ${payload}\n\n`);
          sentCount++;
        } catch {}
      }
    }

    res.json({ success: true, sentTo: sentCount });
  });

  app.post('/api/relay/:roomId/init', (req, res) => {
    const { roomId } = req.params;
    const { fileId, name, size, type } = req.body;
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    room.relayFiles.set(fileId, {
      id: fileId,
      name,
      size,
      type,
      chunks: [],
      receivedBytes: 0,
    });

    for (const peer of room.peers.values()) {
      if (peer.role === 'receiver') {
        peer.res.write(
          `data: ${JSON.stringify({
            type: 'relay-file-start',
            file: { id: fileId, name, size, type },
          })}\n\n`
        );
      }
    }

    res.json({ success: true });
  });

  app.post('/api/relay/:roomId/chunk/:fileId', (req, res) => {
    const { roomId, fileId } = req.params;
    const room = rooms.get(roomId);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

    const file = room.relayFiles.get(fileId);
    if (!file) return res.status(404).json({ success: false, error: 'File not registered' });

    const chunk = req.body instanceof Buffer ? req.body : Buffer.from(req.body);
    file.chunks.push(chunk);
    file.receivedBytes += chunk.length;

    for (const peer of room.peers.values()) {
      if (peer.role === 'receiver') {
        peer.res.write(
          `data: ${JSON.stringify({
            type: 'relay-file-progress',
            fileId,
            receivedBytes: file.receivedBytes,
            totalBytes: file.size,
          })}\n\n`
        );
      }
    }

    if (file.receivedBytes >= file.size) {
      for (const peer of room.peers.values()) {
        if (peer.role === 'receiver') {
          peer.res.write(
            `data: ${JSON.stringify({
              type: 'relay-file-complete',
              fileId,
              downloadUrl: `/api/relay/${roomId}/download/${fileId}`,
            })}\n\n`
          );
        }
      }
    }

    res.json({ success: true, received: file.receivedBytes, total: file.size });
  });

  app.get('/api/relay/:roomId/download/:fileId', (req, res) => {
    const { roomId, fileId } = req.params;
    const room = rooms.get(roomId);
    if (!room) return res.status(404).send('Room not found');

    const file = room.relayFiles.get(fileId);
    if (!file) return res.status(404).send('File not found');

    const buffer = Buffer.concat(file.chunks);
    res.setHeader('Content-Type', file.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SharePro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
