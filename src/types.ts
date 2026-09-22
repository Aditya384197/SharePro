export interface TransferFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File; // Sender-side source file.
  blob?: Blob; // Receiver-side completed file when available.
  progress: number;
  bytesTransferred: number;
  status: 'pending' | 'transferring' | 'completed' | 'error';
  error?: string;
  downloadUrl?: string;
}

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface ActiveRoom {
  room: string;
  deviceName: string;
  deviceType: string;
  hasSender: boolean;
  address?: string;
  token?: string;
}

export interface ReceiverReadyInfo {
  room: string;
  deviceName: string;
  deviceType: string;
  address: string;
  url: string;
  token: string;
}

export interface TransferHistoryItem {
  id: string;
  direction: 'sent' | 'received';
  peerName: string;
  timestamp: number;
  files: {
    name: string;
    size: number;
    type: string;
  }[];
  totalSize: number;
}
