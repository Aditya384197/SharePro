export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'app' | 'video' | 'audio' | 'photo' | 'document' | 'file';
  lastModified?: number;
  file?: File;
  demoUrl?: string;
  blobUrl?: string;
  blob?: Blob;
  isReceived?: boolean;
  receivedFrom?: string;
  thumbnail?: string;
  description?: string;
}

export interface TransferProgress {
  fileId: string;
  name: string;
  size: number;
  type: string;
  transferredBytes: number;
  percent: number;
  speedBytesPerSec: number;
  speedMbps: number;
  etaSeconds: number;
  status: 'pending' | 'transferring' | 'completed' | 'error';
  blobUrl?: string;
}

export interface DiscoveredPeer {
  id: string;
  pin: string;
  name: string;
  avatar: string;
  deviceType: string;
  peersCount: number;
  ageMs: number;
}

export interface TransferRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: string;
  direction: 'sent' | 'received';
  peerName: string;
  timestamp: number;
  downloadUrl?: string;
  speedMbps: number;
}
