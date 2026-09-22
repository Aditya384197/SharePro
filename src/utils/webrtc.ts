import type {
  TransferFile,
  FileMeta,
  ActiveRoom,
  ReceiverReadyInfo,
} from '../types.ts';
import { isNativeAndroid, LocalSignaling } from './native.ts';

const CHUNK_SIZE = 64 * 1024;
const MAX_BUFFERED_AMOUNT = 4 * 1024 * 1024;
const BUFFERED_LOW_THRESHOLD = 1024 * 1024;
const ICE_GATHER_TIMEOUT_MS = 10_000;
const ACK_TIMEOUT_MS = 45_000;
const NATIVE_POLL_MS = 350;

type NativeTarget = {
  room: string;
  deviceName: string;
  deviceType: string;
  address: string;
  token: string;
  url: string;
};

type SignalingMessage =
  | { kind: 'join'; senderName: string; senderType: string; filesMeta: FileMeta[] }
  | { kind: 'accept' }
  | { kind: 'reject'; reason: string }
  | { kind: 'signal'; signal: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }
  | { kind: 'cancel'; reason?: string };

export interface WebRTCManagerCallbacks {
  onStatusChange?: (status: string) => void;
  onActiveRooms?: (rooms: ActiveRoom[]) => void;
  onReceiverReady?: (info: ReceiverReadyInfo) => void;
  onSenderJoined?: (info: { senderName: string; senderType: string; filesMeta: FileMeta[] }) => void;
  onTransferAccepted?: () => void;
  onTransferRejected?: (reason: string) => void;
  onProgress?: (
    fileId: string,
    bytesTransferred: number,
    percent: number,
    speedMBs: number,
    etaSeconds: number
  ) => void;
  onFileReceived?: (file: TransferFile) => void;
  onAllCompleted?: () => void;
  onPeerDisconnected?: (reason?: string) => void;
  onError?: (message: string) => void;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export class TransferManager {
  private ws: WebSocket | null = null;
  private signalingPromise: Promise<void> | null = null;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  private callbacks: WebRTCManagerCallbacks = {};
  private roomCode = '';
  private role: 'sender' | 'receiver' | null = null;
  private nativeTarget: NativeTarget | null = null;

  private destroyed = false;
  private cancelled = false;
  private accepting = false;

  private outgoingFiles: TransferFile[] = [];
  private sendLoopRunning = false;
  private currentOutgoingFileId: string | null = null;

  private currentIncomingFileMeta: FileMeta | null = null;
  private incomingChunks: ArrayBuffer[] = [];
  private incomingReceivedBytes = 0;
  private incomingWriteChain: Promise<void> = Promise.resolve();
  private incomingFileHandle: any = null;
  private incomingWritable: any = null;
  private incomingBatchEnded = false;

  private fileAckWaiters = new Map<string, { resolve: () => void; reject: (e: Error) => void }>();
  private fileReadyWaiters = new Map<string, { resolve: () => void; reject: (e: Error) => void }>();
  private batchAckWaiter: { resolve: () => void; reject: (e: Error) => void } | null = null;

  private lastProgressTime = 0;
  private lastProgressBytes = 0;

  private nativePollTimer: ReturnType<typeof setTimeout> | null = null;
  private nativePolling = false;
  private nativePollStopped = true;

  constructor(callbacks: WebRTCManagerCallbacks) {
    this.callbacks = callbacks;
  }

  private setStatus(status: string) {
    this.callbacks.onStatusChange?.(status);
  }

  private error(message: string) {
    console.error('[SharePro]', message);
    this.callbacks.onError?.(message);
  }

  async connectSignaling(): Promise<void> {
    if (isNativeAndroid()) {
      this.setStatus('स्थानीय LAN मोड तैयार');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.signalingPromise) return this.signalingPromise;

    this.signalingPromise = new Promise<void>((resolve) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      let settled = false;
      const resolveOnce = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      ws.onopen = () => {
        this.setStatus('सिग्नलिंग सर्वर से कनेक्टेड');
        resolveOnce();
      };

      ws.onerror = () => {
        this.setStatus('सिग्नलिंग सर्वर उपलब्ध नहीं है');
        resolveOnce();
      };

      ws.onmessage = (event) => {
        void this.handleWebSocketMessage(JSON.parse(event.data)).catch((e) => {
          console.warn('WebSocket message error:', e);
        });
      };

      ws.onclose = () => {
        this.callbacks.onStatusChange?.('सिग्नलिंग डिस्कनेक्टेड');
        this.signalingPromise = null;
      };

      setTimeout(resolveOnce, 5000);
    });

    try {
      await this.signalingPromise;
    } finally {
      this.signalingPromise = null;
    }
  }

  private async handleWebSocketMessage(msg: any) {
    switch (msg?.type) {
      case 'active_rooms':
        this.callbacks.onActiveRooms?.(msg.rooms || []);
        break;

      case 'sender_joined':
        this.callbacks.onSenderJoined?.({
          senderName: msg.senderName || 'Sender Device',
          senderType: msg.senderType || 'unknown',
          filesMeta: Array.isArray(msg.filesMeta) ? msg.filesMeta : [],
        });
        break;

      case 'transfer_accepted':
        this.accepting = true;
        this.callbacks.onTransferAccepted?.();
        await this.createOffer();
        this.startSendWhenReady();
        break;

      case 'transfer_rejected':
        this.callbacks.onTransferRejected?.(msg.reason || 'Transfer declined');
        break;

      case 'signal':
        await this.handleSignalMessage(msg.signal);
        break;

      case 'transfer_cancelled':
        this.cancelled = true;
        this.callbacks.onPeerDisconnected?.('दूसरे डिवाइस ने ट्रांसफर रद्द किया');
        this.cleanupPeer();
        break;

      case 'peer_disconnected':
        this.callbacks.onPeerDisconnected?.(msg.reason);
        this.cleanupPeer();
        break;

      case 'error':
        this.error(msg.message || 'सिग्नलिंग त्रुटि');
        break;
    }
  }

  async requestRooms(): Promise<void> {
    if (isNativeAndroid()) {
      try {
        const result = await LocalSignaling.discoverReceivers({
          room: '',
          timeoutMs: 900,
        });

        const rooms: ActiveRoom[] = (result.receivers || []).map((r) => ({
          room: r.room,
          deviceName: r.deviceName,
          deviceType: r.deviceType,
          hasSender: false,
          address: r.address,
          token: r.token,
        }));

        this.callbacks.onActiveRooms?.(rooms);
      } catch (e) {
        this.error('स्थानीय रिसीवर खोजने में समस्या हुई');
      }
      return;
    }

    try {
      await this.connectSignaling();
    } catch {}

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'get_rooms' }));
    }
  }

  async registerReceiver(roomCode: string, deviceName: string): Promise<void> {
    this.cancelled = false;
    this.roomCode = roomCode.toUpperCase();
    this.role = 'receiver';

    if (isNativeAndroid()) {
      try {
        const info = await LocalSignaling.startReceiver({
          room: this.roomCode,
          deviceName,
        });

        this.nativeTarget = {
          room: info.room,
          deviceName: info.deviceName,
          deviceType: info.deviceType,
          address: info.address,
          token: info.token,
          url: info.url,
        };

        this.initPeerConnection();

        const receiverInfo: ReceiverReadyInfo = {
          room: info.room,
          deviceName: info.deviceName,
          deviceType: info.deviceType,
          address: info.address,
          token: info.token,
          url: info.url,
        };

        this.callbacks.onReceiverReady?.(receiverInfo);
        this.setStatus(`LAN रिसीवर चालू: ${info.address}`);
        this.startNativePolling();
      } catch (e) {
        this.error('LAN रिसीवर शुरू नहीं हो सका');
      }
      return;
    }

    await this.connectSignaling();
    this.initPeerConnection();

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'register_room',
          room: this.roomCode,
          deviceName,
          deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        })
      );
    }
  }

  getRole(): 'sender' | 'receiver' | null {
    return this.role;
  }

  setOutgoingFiles(files: TransferFile[]) {
    this.outgoingFiles = files.slice();
  }

  async joinReceiver(
    roomOrTarget: string,
    senderName: string,
    filesMeta: FileMeta[]
  ): Promise<void> {
    this.cancelled = false;
    this.role = 'sender';

    if (isNativeAndroid()) {
      const target = await this.resolveNativeTarget(roomOrTarget);
      if (!target) {
        this.error('रिसीवर नहीं मिला। उसी Wi-Fi पर कनेक्ट करके फिर कोशिश करें।');
        return;
      }

      this.nativeTarget = target;
      this.roomCode = target.room;
      this.initPeerConnection();
      this.startNativePolling();

      await this.sendNativeMessage({
        kind: 'join',
        senderName,
        senderType: 'mobile',
        filesMeta,
      });

      this.setStatus(`${target.deviceName} से कनेक्शन शुरू हो रहा है`);
      return;
    }

    this.roomCode = roomOrTarget.trim().toUpperCase();
    await this.connectSignaling();
    this.initPeerConnection();

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'join_room',
          room: this.roomCode,
          deviceName: senderName,
          deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          filesMeta,
        })
      );
    } else {
      this.error('सिग्नलिंग सर्वर से कनेक्शन नहीं है');
    }
  }

  async acceptTransfer() {
    if (!this.role) return;

    if (isNativeAndroid()) {
      await this.sendNativeMessage({ kind: 'accept' });
      this.accepting = true;
      this.setStatus('रिसीवर ने ट्रांसफर स्वीकार किया');
      this.startNativePolling();
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'accept_transfer' }));
    }
  }

  async rejectTransfer(reason = 'User declined') {
    if (isNativeAndroid()) {
      await this.sendNativeMessage({ kind: 'reject', reason });
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'reject_transfer', reason }));
    }
  }

  private async resolveNativeTarget(input: string): Promise<NativeTarget | null> {
    const value = input.trim();

    if (value.startsWith('sharepro://')) {
      try {
        const url = new URL(value);
        const room = url.searchParams.get('room') || '';
        const address = url.searchParams.get('address') || '';
        const token = url.searchParams.get('token') || '';
        const name = url.searchParams.get('name') || 'Receiver Device';
        const port = safeNumber(url.searchParams.get('port'), 38490);

        if (!room || !token || !address) return null;

        const base = address.includes('://')
          ? address
          : `http://${address}:${port}`;

        return {
          room: room.toUpperCase(),
          deviceName: name,
          deviceType: 'mobile',
          address: base,
          token,
          url: value,
        };
      } catch {
        return null;
      }
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        const url = new URL(value);
        const room = url.searchParams.get('room') || '';
        const token = url.searchParams.get('token') || '';
        const name = url.searchParams.get('name') || 'Receiver Device';
        if (!room || !token) return null;
        return {
          room: room.toUpperCase(),
          deviceName: name,
          deviceType: 'mobile',
          address: `${url.protocol}//${url.host}`,
          token,
          url: value,
        };
      } catch {
        return null;
      }
    }

    const discovery = await LocalSignaling.discoverReceivers({
      room: value,
      timeoutMs: 1200,
    });
    const found = discovery.receivers?.[0];
    if (!found) return null;

    return {
      room: found.room,
      deviceName: found.deviceName,
      deviceType: found.deviceType,
      address: found.address,
      token: found.token,
      url: found.url,
    };
  }

  private initPeerConnection() {
    this.cleanupPeer(false);

    // LAN-first design: host candidates are enough on the same Wi-Fi/LAN,
    // so the transfer does not depend on any public STUN/TURN service.
    const config: RTCConfiguration = { iceServers: [] };

    try {
      this.pc = new RTCPeerConnection(config);
      this.pc.onicecandidate = () => {
        // Trickle ICE is intentionally unused. We send the complete SDP
        // only after ICE gathering finishes, which makes LAN pairing simpler.
      };

      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc?.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          this.setStatus('डायरेक्ट P2P कनेक्शन स्थापित');
        }
      };

      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        this.callbacks.onStatusChange?.(`P2P: ${state}`);

        if (!this.cancelled && (state === 'failed' || state === 'closed')) {
          this.callbacks.onPeerDisconnected?.('P2P कनेक्शन टूट गया');
        }
      };

      if (this.role === 'sender') {
        this.dataChannel = this.pc.createDataChannel('sharepro-files', {
          ordered: true,
        });
        this.dataChannel.bufferedAmountLowThreshold = BUFFERED_LOW_THRESHOLD;
        this.setupDataChannel(this.dataChannel);
      } else {
        this.pc.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.dataChannel.bufferedAmountLowThreshold = BUFFERED_LOW_THRESHOLD;
          this.setupDataChannel(this.dataChannel);
        };
      }
    } catch (e) {
      this.error('WebRTC उपलब्ध नहीं है। इस डिवाइस पर प्रत्यक्ष ट्रांसफर नहीं चल सकता।');
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      this.setStatus('तेज़ सुरक्षित P2P डेटा चैनल सक्रिय');
      if (this.role === 'sender') {
        this.startSendWhenReady();
      }
    };

    channel.onclose = () => {
      this.setStatus('डेटा चैनल बंद हो गया');
    };

    channel.onerror = () => {
      this.error('डेटा चैनल में त्रुटि आई');
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          this.handleControlPacket(JSON.parse(event.data));
        } catch {
          this.error('अमान्य ट्रांसफर नियंत्रण संदेश मिला');
        }
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryData(event.data);
      } else if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buffer) => this.handleBinaryData(buffer)).catch(() => {
          this.error('बाइनरी डेटा पढ़ने में समस्या हुई');
        });
      }
    };
  }

  private async sendNativeMessage(message: SignalingMessage) {
    if (!this.nativeTarget) throw new Error('Native signaling target missing');
    await LocalSignaling.postSignal({
      address: this.nativeTarget.address,
      token: this.nativeTarget.token,
      role: this.role === 'sender' ? 'sender' : 'receiver',
      message,
    });
  }

  private startNativePolling() {
    this.nativePollStopped = false;
    if (!this.nativePollTimer) {
      this.scheduleNativePoll(0);
    }
  }

  private scheduleNativePoll(delay: number) {
    if (this.nativePollStopped || this.destroyed) return;
    this.nativePollTimer = setTimeout(() => {
      this.nativePollTimer = null;
      void this.pollNative();
    }, delay);
  }

  private async pollNative() {
    if (this.nativePollStopped || this.destroyed || this.nativePolling || !this.nativeTarget) return;
    this.nativePolling = true;

    try {
      const response = await LocalSignaling.pollSignal({
        address: this.nativeTarget.address,
        token: this.nativeTarget.token,
        role: this.role === 'sender' ? 'sender' : 'receiver',
      });

      const message = response?.message as SignalingMessage | undefined;
      if (message) {
        await this.handleNativeMessage(message);
      }
    } catch (e) {
      // Brief network errors are retried automatically.
    } finally {
      this.nativePolling = false;
      this.scheduleNativePoll(NATIVE_POLL_MS);
    }
  }

  private async handleNativeMessage(message: SignalingMessage) {
    switch (message.kind) {
      case 'join':
        this.callbacks.onSenderJoined?.({
          senderName: message.senderName,
          senderType: message.senderType,
          filesMeta: message.filesMeta,
        });
        break;

      case 'accept':
        this.accepting = true;
        this.callbacks.onTransferAccepted?.();
        await this.createOffer();
        this.startSendWhenReady();
        break;

      case 'reject':
        this.callbacks.onTransferRejected?.(message.reason || 'Transfer declined');
        break;

      case 'signal':
        await this.handleSignalMessage(message.signal);
        break;

      case 'cancel':
        this.cancelled = true;
        this.callbacks.onPeerDisconnected?.(message.reason || 'Transfer cancelled');
        this.cleanupPeer();
        break;
    }
  }

  private async handleSignalMessage(signal: SignalingMessage['signal']) {
    if (!this.pc) this.initPeerConnection();
    if (!this.pc) return;

    try {
      if (signal.sdp) {
        const description = new RTCSessionDescription(signal.sdp);
        await this.pc.setRemoteDescription(description);

        if (description.type === 'offer') {
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await this.waitForIceGatheringComplete();
          const local = this.pc.localDescription;
          if (!local) throw new Error('Local answer unavailable');

          await this.sendSignal({ sdp: { type: local.type, sdp: local.sdp || '' } });
          this.setStatus('रिसीवर का P2P उत्तर भेज दिया गया');
        }
      } else if (signal.candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch {
          // The current implementation normally does not use trickle ICE.
        }
      }
    } catch (e) {
      this.error('P2P handshake पूरा नहीं हो सका');
    }
  }

  private async sendSignal(signal: SignalingMessage['signal']) {
    if (isNativeAndroid()) {
      await this.sendNativeMessage({ kind: 'signal', signal });
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'signal', signal }));
    } else {
      throw new Error('Signaling connection is not available');
    }
  }

  private async createOffer() {
    if (!this.pc) return;

    try {
      this.setStatus('P2P कनेक्शन तैयार किया जा रहा है');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.waitForIceGatheringComplete();

      const local = this.pc.localDescription;
      if (!local) throw new Error('Local offer unavailable');

      await this.sendSignal({
        sdp: {
          type: local.type,
          sdp: local.sdp || '',
        },
      });
    } catch (e) {
      this.error('P2P offer बनाने में समस्या हुई');
    }
  }

  private waitForIceGatheringComplete(): Promise<void> {
    if (!this.pc || this.pc.iceGatheringState === 'complete') return Promise.resolve();

    return new Promise((resolve) => {
      const started = Date.now();
      const check = () => {
        if (!this.pc || this.pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        if (Date.now() - started >= ICE_GATHER_TIMEOUT_MS) {
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  private handleControlPacket(packet: any) {
    switch (packet?.type) {
      case 'file_start':
        void this.beginIncomingFile(packet);
        break;

      case 'file_end':
        void this.finalizeIncomingFile(String(packet.fileId || ''));
        break;

      case 'batch_end':
        this.incomingBatchEnded = true;
        this.sendControl({ type: 'batch_ack' });
        this.callbacks.onAllCompleted?.();
        break;

      case 'file_ready': {
        const waiter = this.fileReadyWaiters.get(String(packet.fileId || ''));
        if (waiter) {
          this.fileReadyWaiters.delete(String(packet.fileId || ''));
          waiter.resolve();
        }
        break;
      }

      case 'file_complete_ack': {
        const waiter = this.fileAckWaiters.get(String(packet.fileId || ''));
        if (waiter) {
          this.fileAckWaiters.delete(String(packet.fileId || ''));
          waiter.resolve();
        }
        break;
      }

      case 'batch_ack':
        if (this.batchAckWaiter) {
          this.batchAckWaiter.resolve();
          this.batchAckWaiter = null;
        }
        break;

      case 'error':
        this.error(String(packet.message || 'Remote transfer error'));
        break;
    }
  }

  private async beginIncomingFile(packet: any) {
    const meta: FileMeta = {
      id: String(packet.fileId || ''),
      name: String(packet.name || 'received-file'),
      size: Math.max(0, safeNumber(packet.size)),
      type: String(packet.mimeType || 'application/octet-stream'),
    };

    if (!meta.id) {
      this.error('फाइल पहचान उपलब्ध नहीं है');
      return;
    }

    this.currentIncomingFileMeta = meta;
    this.incomingChunks = [];
    this.incomingReceivedBytes = 0;
    this.incomingBatchEnded = false;
    this.incomingWriteChain = Promise.resolve();
    this.incomingWritable = null;
    this.incomingFileHandle = null;

    try {
      const storage: any = (navigator as any).storage;
      if (storage?.getDirectory) {
        const root = await storage.getDirectory();
        const safeName = `sharepro-${crypto.randomUUID()}-${meta.name}`.replace(/[\\/:*?"<>|]/g, '_');
        this.incomingFileHandle = await root.getFileHandle(safeName, { create: true });
        this.incomingWritable = await this.incomingFileHandle.createWritable();
      }
    } catch {
      this.incomingWritable = null;
      this.incomingFileHandle = null;
    }

    const now = Date.now();
    this.lastProgressTime = now;
    this.lastProgressBytes = 0;

    this.sendControl({ type: 'file_ready', fileId: meta.id });
  }

  private handleBinaryData(buffer: ArrayBuffer) {
    const meta = this.currentIncomingFileMeta;
    if (!meta) return;

    this.incomingReceivedBytes += buffer.byteLength;
    if (this.currentIncomingFileMeta && this.incomingReceivedBytes > this.currentIncomingFileMeta.size) {
      this.error(`फाइल ${this.currentIncomingFileMeta.name} अपेक्षित आकार से बड़ी है`);
      this.cancelTransfer();
      return;
    }

    if (this.incomingWritable) {
      this.incomingWriteChain = this.incomingWriteChain
        .then(() => this.incomingWritable.write(buffer))
        .catch((e: unknown) => {
          this.error(`फाइल सेव करते समय त्रुटि: ${String(e)}`);
        });
    } else {
      this.incomingChunks.push(buffer);
    }

    const now = Date.now();
    if (now - this.lastProgressTime >= 150 || this.incomingReceivedBytes >= meta.size) {
      const elapsed = Math.max(0.001, (now - this.lastProgressTime) / 1000);
      const deltaBytes = this.incomingReceivedBytes - this.lastProgressBytes;
      const speed = (deltaBytes / (1024 * 1024)) / elapsed;
      const remaining = Math.max(0, meta.size - this.incomingReceivedBytes);
      const eta = speed > 0 ? Math.ceil(remaining / (speed * 1024 * 1024)) : 0;
      const percent = meta.size > 0
        ? Math.min(100, Math.round((this.incomingReceivedBytes / meta.size) * 100))
        : 100;

      this.callbacks.onProgress?.(
        meta.id,
        Math.min(meta.size, this.incomingReceivedBytes),
        percent,
        Number(speed.toFixed(2)),
        eta
      );

      this.lastProgressTime = now;
      this.lastProgressBytes = this.incomingReceivedBytes;
    }
  }

  private async finalizeIncomingFile(fileId: string) {
    const meta = this.currentIncomingFileMeta;
    if (!meta || meta.id !== fileId) return;

    try {
      await this.incomingWriteChain;

      if (this.incomingWritable) {
        await this.incomingWritable.close();
        this.incomingWritable = null;
      }

      let blob: Blob;
      if (this.incomingFileHandle) {
        const file = await this.incomingFileHandle.getFile();
        if (file.size !== meta.size) {
          throw new Error(`आकार सत्यापन विफल (${file.size}/${meta.size})`);
        }
        blob = file;
      } else {
        blob = new Blob(this.incomingChunks, {
          type: meta.type || 'application/octet-stream',
        });
        if (blob.size !== meta.size) {
          throw new Error(`आकार सत्यापन विफल (${blob.size}/${meta.size})`);
        }
      }

      const downloadUrl = URL.createObjectURL(blob);

      const completedFile: TransferFile = {
        id: meta.id,
        name: meta.name,
        size: meta.size,
        type: meta.type,
        blob,
        progress: 100,
        bytesTransferred: meta.size,
        status: 'completed',
        downloadUrl,
      };

      this.callbacks.onFileReceived?.(completedFile);
      this.sendControl({ type: 'file_complete_ack', fileId: meta.id });

      this.currentIncomingFileMeta = null;
      this.incomingChunks = [];
      this.incomingFileHandle = null;
    } catch (e) {
      const writer = this.incomingWritable;
      this.incomingWritable = null;
      if (writer?.abort) {
        void Promise.resolve(writer.abort()).catch(() => undefined);
      }
      this.sendControl({
        type: 'error',
        message: `फाइल प्राप्त नहीं हो सकी: ${e instanceof Error ? e.message : String(e)}`,
      });
      this.error(`फाइल ${meta.name} सत्यापन में विफल`);
      this.currentIncomingFileMeta = null;
      this.incomingFileHandle = null;
      this.incomingChunks = [];
    }
  }

  private startSendWhenReady() {
    if (this.role !== 'sender' || this.sendLoopRunning || this.cancelled) return;
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
    if (this.outgoingFiles.length === 0) {
      this.error('भेजने के लिए कोई फाइल उपलब्ध नहीं है');
      return;
    }

    this.sendLoopRunning = true;
    void this.sendFilesInternal();
  }

  private async sendFilesInternal() {
    try {
      for (const transferFile of this.outgoingFiles) {
        if (this.cancelled) throw new Error('Transfer cancelled');

        const fileObj = transferFile.file;
        if (!fileObj) throw new Error(`Source file missing: ${transferFile.name}`);
        if (fileObj.size !== transferFile.size) {
          throw new Error(`फाइल बदल गई है: ${transferFile.name}`);
        }

        this.currentOutgoingFileId = transferFile.id;
        const readyPromise = this.waitForFileReady(transferFile.id);
        this.sendControl({
          type: 'file_start',
          fileId: transferFile.id,
          name: transferFile.name,
          size: transferFile.size,
          mimeType: transferFile.type,
        });
        await readyPromise;

        let offset = 0;
        let lastTime = Date.now();
        let lastBytes = 0;

        while (offset < fileObj.size && !this.cancelled) {
          await this.waitForDataChannelCapacity();

          const chunk = await fileObj.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
          if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            throw new Error('डेटा चैनल बीच में बंद हो गया');
          }

          this.dataChannel.send(chunk);
          offset += chunk.byteLength;

          const now = Date.now();
          if (now - lastTime >= 150 || offset >= fileObj.size) {
            const elapsed = Math.max(0.001, (now - lastTime) / 1000);
            const speed = ((offset - lastBytes) / (1024 * 1024)) / elapsed;
            const remaining = Math.max(0, fileObj.size - offset);
            const eta = speed > 0 ? Math.ceil(remaining / (speed * 1024 * 1024)) : 0;
            const percent = fileObj.size > 0
              ? Math.min(100, Math.round((offset / fileObj.size) * 100))
              : 100;

            this.callbacks.onProgress?.(
              transferFile.id,
              offset,
              percent,
              Number(speed.toFixed(2)),
              eta
            );

            lastTime = now;
            lastBytes = offset;
          }

          if (offset % (CHUNK_SIZE * 8) === 0) {
            await wait(0);
          }
        }

        if (this.cancelled) break;

        const fileAck = this.waitForFileAck(transferFile.id);
        this.sendControl({ type: 'file_end', fileId: transferFile.id });
        await fileAck;

        this.callbacks.onProgress?.(
          transferFile.id,
          transferFile.size,
          100,
          0,
          0
        );
      }

      if (!this.cancelled) {
        const batchAck = this.waitForBatchAck();
        this.sendControl({ type: 'batch_end' });
        await batchAck;
        this.callbacks.onAllCompleted?.();
      }
    } catch (e) {
      if (!this.cancelled) {
        this.error(e instanceof Error ? e.message : 'ट्रांसफर विफल हुआ');
      }
    } finally {
      this.currentOutgoingFileId = null;
      this.sendLoopRunning = false;
    }
  }

  private waitForDataChannelCapacity(): Promise<void> {
    const channel = this.dataChannel;
    if (!channel || channel.readyState !== 'open') {
      return Promise.reject(new Error('डेटा चैनल उपलब्ध नहीं है'));
    }

    if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('ट्रांसफर backpressure timeout'));
      }, 10_000);

      const cleanup = () => {
        clearTimeout(timeout);
        channel.removeEventListener('bufferedamountlow', onLow);
      };

      const onLow = () => {
        cleanup();
        resolve();
      };

      channel.addEventListener('bufferedamountlow', onLow, { once: true });
      if (channel.bufferedAmount <= BUFFERED_LOW_THRESHOLD) {
        cleanup();
        resolve();
      }
    });
  }

  private waitForFileReady(fileId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fileReadyWaiters.delete(fileId);
        reject(new Error(`रिसीवर ने ${fileId} को तैयार नहीं किया`));
      }, ACK_TIMEOUT_MS);

      this.fileReadyWaiters.set(fileId, {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
    });
  }

  private waitForFileAck(fileId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fileAckWaiters.delete(fileId);
        reject(new Error(`रिसीवर ने ${fileId} का पुष्टि संदेश नहीं भेजा`));
      }, ACK_TIMEOUT_MS);

      this.fileAckWaiters.set(fileId, {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
    });
  }

  private waitForBatchAck(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.batchAckWaiter = null;
        reject(new Error('बैच पूरा होने की पुष्टि नहीं मिली'));
      }, ACK_TIMEOUT_MS);

      this.batchAckWaiter = {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      };
    });
  }

  private sendControl(packet: unknown) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(packet));
    }
  }

  cancelTransfer() {
    this.cancelled = true;
    this.nativePollStopped = true;

    if (this.nativePollTimer) {
      clearTimeout(this.nativePollTimer);
      this.nativePollTimer = null;
    }

    if (isNativeAndroid() && this.nativeTarget) {
      void this.sendNativeMessage({
        kind: 'cancel',
        reason: 'Transfer cancelled',
      }).catch(() => undefined);

      void LocalSignaling.stopReceiver().catch(() => undefined);
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'cancel_transfer' }));
    }

    this.cleanupPeer();
    this.rejectPendingAcks(new Error('Transfer cancelled'));
  }

  private rejectPendingAcks(error: Error) {
    for (const [, waiter] of this.fileAckWaiters) {
      waiter.reject(error);
    }
    this.fileAckWaiters.clear();
    for (const [, waiter] of this.fileReadyWaiters) {
      waiter.reject(error);
    }
    this.fileReadyWaiters.clear();
    if (this.batchAckWaiter) {
      this.batchAckWaiter.reject(error);
      this.batchAckWaiter = null;
    }
  }

  private cleanupPeer(resetPending = true) {
    try {
      this.dataChannel?.close();
      this.pc?.close();
    } catch {}

    this.dataChannel = null;
    this.pc = null;
    this.currentIncomingFileMeta = null;
    const writer = this.incomingWritable;
    this.incomingWritable = null;
    if (writer?.abort) {
      void Promise.resolve(writer.abort()).catch(() => undefined);
    }
    this.incomingFileHandle = null;
    this.incomingChunks = [];

    if (resetPending) {
      this.sendLoopRunning = false;
      this.currentOutgoingFileId = null;
    }
  }

  destroy() {
    this.destroyed = true;
    this.nativePollStopped = true;

    if (this.nativePollTimer) {
      clearTimeout(this.nativePollTimer);
      this.nativePollTimer = null;
    }

    if (isNativeAndroid()) {
      void LocalSignaling.stopReceiver().catch(() => undefined);
    }

    try {
      this.ws?.close();
    } catch {}

    this.ws = null;
    this.cleanupPeer();
  }
}
