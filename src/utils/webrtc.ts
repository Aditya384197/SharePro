export const CHUNK_SIZE = 64 * 1024;

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export interface ChunkHeader {
  type: 'meta' | 'chunk' | 'complete' | 'cancel';
  fileId: string;
  name?: string;
  size?: number;
  mimeType?: string;
  index?: number;
  totalChunks?: number;
}

export class P2PTransferManager {
  pc: RTCPeerConnection | null = null;
  dataChannel: RTCDataChannel | null = null;
  roomId: string;
  peerId: string;
  role: 'sender' | 'receiver';
  onSpeedUpdate?: (speedBytesSec: number, percent: number, transferred: number, total: number) => void;
  onFileReceived?: (file: { id: string; name: string; size: number; type: string; blob: Blob }) => void;
  onStateChange?: (state: string) => void;

  private incomingFile: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    chunks: ArrayBuffer[];
    receivedBytes: number;
    startTime: number;
  } | null = null;

  private lastTransferredBytes = 0;
  private lastSpeedCheckTime = Date.now();
  private speedCheckTimer: number | null = null;

  constructor(roomId: string, peerId: string, role: 'sender' | 'receiver') {
    this.roomId = roomId;
    this.peerId = peerId;
    this.role = role;
  }

  initPeerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onReady: () => void
  ) {
    this.cleanup();
    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.onStateChange?.(this.pc?.connectionState || 'disconnected');
    };

    if (this.role === 'sender') {
      this.dataChannel = this.pc.createDataChannel('sharepro-transfer', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel, onReady);
    } else {
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel, onReady);
      };
    }
  }

  private setupDataChannel(channel: RTCDataChannel, onReady: () => void) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = 128 * 1024;

    channel.onopen = () => {
      this.onStateChange?.('connected');
      this.startSpeedTracker();
      onReady();
    };

    channel.onclose = () => {
      this.onStateChange?.('closed');
      this.stopSpeedTracker();
    };

    channel.onerror = () => {};

    channel.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };
  }

  private handleIncomingMessage(data: string | ArrayBuffer) {
    if (typeof data === 'string') {
      try {
        const header: ChunkHeader = JSON.parse(data);
        if (header.type === 'meta') {
          this.incomingFile = {
            id: header.fileId,
            name: header.name || 'unnamed-file',
            size: header.size || 0,
            mimeType: header.mimeType || 'application/octet-stream',
            chunks: [],
            receivedBytes: 0,
            startTime: Date.now(),
          };
          this.lastTransferredBytes = 0;
          this.lastSpeedCheckTime = Date.now();
        } else if (header.type === 'complete') {
          if (this.incomingFile && this.incomingFile.id === header.fileId) {
            const blob = new Blob(this.incomingFile.chunks, { type: this.incomingFile.mimeType });
            this.onFileReceived?.({
              id: this.incomingFile.id,
              name: this.incomingFile.name,
              size: this.incomingFile.size,
              type: this.incomingFile.mimeType,
              blob,
            });
            this.incomingFile = null;
          }
        }
      } catch {}
    } else if (data instanceof ArrayBuffer) {
      if (this.incomingFile) {
        this.incomingFile.chunks.push(data);
        this.incomingFile.receivedBytes += data.byteLength;

        const percent = Math.min(100, Math.round((this.incomingFile.receivedBytes / (this.incomingFile.size || 1)) * 100));
        const now = Date.now();
        const duration = (now - this.lastSpeedCheckTime) / 1000;
        let speedBytesSec = 0;
        if (duration >= 0.5) {
          const deltaBytes = this.incomingFile.receivedBytes - this.lastTransferredBytes;
          speedBytesSec = deltaBytes / duration;
          this.lastTransferredBytes = this.incomingFile.receivedBytes;
          this.lastSpeedCheckTime = now;
        }

        this.onSpeedUpdate?.(speedBytesSec, percent, this.incomingFile.receivedBytes, this.incomingFile.size);
      }
    }
  }

  async sendFile(
    fileId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    blob: Blob,
    onProgress: (percent: number, transferredBytes: number, speedBytesSec: number) => void
  ): Promise<boolean> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('DataChannel not connected');
    }

    const metaHeader: ChunkHeader = {
      type: 'meta',
      fileId,
      name: fileName,
      size: fileSize,
      mimeType,
    };
    this.dataChannel.send(JSON.stringify(metaHeader));

    let offset = 0;
    let lastBytes = 0;
    let lastTime = Date.now();
    let currentSpeed = 0;

    const bufferWait = () => {
      return new Promise<void>((resolve) => {
        if (!this.dataChannel || this.dataChannel.bufferedAmount <= 256 * 1024) {
          return resolve();
        }
        const onBufferedLow = () => {
          if (this.dataChannel) {
            this.dataChannel.onbufferedamountlow = null;
          }
          resolve();
        };
        this.dataChannel.onbufferedamountlow = onBufferedLow;
      });
    };

    while (offset < blob.size) {
      if (this.dataChannel.readyState !== 'open') {
        throw new Error('Transfer aborted: connection lost');
      }

      await bufferWait();

      const slice = blob.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await slice.arrayBuffer();

      this.dataChannel.send(arrayBuffer);
      offset += arrayBuffer.byteLength;

      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 0.3) {
        const delta = offset - lastBytes;
        currentSpeed = delta / elapsed;
        lastBytes = offset;
        lastTime = now;
      }

      const percent = Math.min(100, Math.round((offset / blob.size) * 100));
      onProgress(percent, offset, currentSpeed);
    }

    const completeHeader: ChunkHeader = {
      type: 'complete',
      fileId,
    };
    this.dataChannel.send(JSON.stringify(completeHeader));

    onProgress(100, blob.size, currentSpeed);
    return true;
  }

  private startSpeedTracker() {
    this.stopSpeedTracker();
  }

  private stopSpeedTracker() {
    if (this.speedCheckTimer) {
      clearInterval(this.speedCheckTimer);
      this.speedCheckTimer = null;
    }
  }

  cleanup() {
    this.stopSpeedTracker();
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
    this.incomingFile = null;
  }
}
