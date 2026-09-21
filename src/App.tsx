import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HomeHub } from './components/HomeHub';
import { FileSelectorModal } from './components/FileSelectorModal';
import { ReceiverModal } from './components/ReceiverModal';
import { SenderScannerModal } from './components/SenderScannerModal';
import { TransferView } from './components/TransferView';
import { HistoryDrawer } from './components/HistoryDrawer';
import { FilePreviewModal } from './components/FilePreviewModal';
import { SourceCodeModal } from './components/SourceCodeModal';
import { WifiWarningModal } from './components/WifiWarningModal';
import { FileItem, TransferProgress, TransferRecord } from './types';
import { P2PTransferManager } from './utils/webrtc';
import { createDemoFileBlob } from './utils/demoData';
import { sounds } from './utils/audio';

export default function App() {
  const [deviceName, setDeviceName] = useState(() => {
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return isMobile ? `Phone-${randomSuffix}` : `PC-${randomSuffix}`;
  });

  const [view, setView] = useState<'home' | 'select_files' | 'pairing_sender' | 'pairing_receiver' | 'transferring'>('home');
  const [initialCategory, setInitialCategory] = useState<FileItem['category'] | undefined>();
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activePin, setActivePin] = useState<string>('');
  const [role, setRole] = useState<'sender' | 'receiver'>('sender');
  const [peerName, setPeerName] = useState('Remote Device');

  const [transferQueue, setTransferQueue] = useState<TransferProgress[]>([]);
  const [overallPercent, setOverallPercent] = useState(0);
  const [overallTransferredBytes, setOverallTransferredBytes] = useState(0);
  const [overallTotalBytes, setOverallTotalBytes] = useState(0);
  const [currentSpeedBytesSec, setCurrentSpeedBytesSec] = useState(0);
  const [currentSpeedMbps, setCurrentSpeedMbps] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [isTransferComplete, setIsTransferComplete] = useState(false);

  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isWifiWarningOpen, setIsWifiWarningOpen] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState<FileItem[]>([]);
  const [previewFile, setPreviewFile] = useState<{
    fileName: string;
    fileSize: number;
    fileType: string;
    blobUrl: string;
    blob?: Blob;
  } | null>(null);

  const getCategoryForFile = (name: string, type?: string): FileItem['category'] => {
    const t = type || '';
    if (name.endsWith('.apk') || t.includes('android.package-archive')) return 'app';
    if (t.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm)$/i.test(name)) return 'video';
    if (t.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name)) return 'audio';
    if (t.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return 'photo';
    if (t.includes('pdf') || /\.(pdf|docx|doc|txt|xlsx|pptx|zip|rar)$/i.test(name)) return 'document';
    return 'file';
  };

  useEffect(() => {
    const handleOffline = () => setIsWifiWarningOpen(true);
    const handleOnline = () => setIsWifiWarningOpen(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const p2pManagerRef = useRef<P2PTransferManager | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const isTransferringRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && /^\d{6}$/.test(joinCode)) {
      setActiveRoomId(joinCode);
      setActivePin(joinCode);
      setView('select_files');
    }
  }, []);

  const cleanupTransfer = useCallback(() => {
    isTransferringRef.current = false;
    if (p2pManagerRef.current) {
      p2pManagerRef.current.cleanup();
      p2pManagerRef.current = null;
    }
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  }, []);

  const handleInitiateSend = (category?: FileItem['category']) => {
    setInitialCategory(category);
    setView('select_files');
  };

  const handleProceedToSend = (files: FileItem[]) => {
    setSelectedFiles(files);
    if (activeRoomId && activePin) {
      connectAndStartSend(activeRoomId, activePin, files);
    } else {
      setView('pairing_sender');
    }
  };

  const handleInitiateReceive = () => {
    setRole('receiver');
    setView('pairing_receiver');
  };

  const handleReceiverPeerConnected = (roomId: string, pin: string, senderInfo?: { id: string; name: string }) => {
    setActiveRoomId(roomId);
    setActivePin(pin);
    if (senderInfo?.name) {
      setPeerName(senderInfo.name);
    }
    setRole('receiver');
    setIsTransferComplete(false);
    setView('transferring');
    setupReceiverWebRTC(roomId);
  };

  const handleConnectToRoom = (roomId: string, pin: string) => {
    setActiveRoomId(roomId);
    setActivePin(pin);
    connectAndStartSend(roomId, pin, selectedFiles);
  };

  const connectAndStartSend = async (roomId: string, _pin: string, filesToSend: FileItem[]) => {
    setRole('sender');
    setView('transferring');
    setIsTransferComplete(false);

    const totalBytes = filesToSend.reduce((acc, f) => acc + f.size, 0);
    setOverallTotalBytes(totalBytes);
    setOverallTransferredBytes(0);
    setOverallPercent(0);

    const queue: TransferProgress[] = filesToSend.map((f) => ({
      fileId: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      transferredBytes: 0,
      percent: 0,
      speedBytesPerSec: 0,
      speedMbps: 0,
      etaSeconds: 0,
      status: 'pending',
    }));
    setTransferQueue(queue);

    const senderPeerId = `sender_${Date.now()}`;
    const p2p = new P2PTransferManager(roomId, senderPeerId, 'sender');
    p2pManagerRef.current = p2p;

    const sse = new EventSource(
      `/api/events/${roomId}?peerId=${senderPeerId}&role=sender&name=${encodeURIComponent(deviceName)}`
    );
    sseRef.current = sse;

    const sendSignal = async (type: string, data: unknown) => {
      try {
        await fetch(`/api/signal/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: senderPeerId, type, data }),
        });
      } catch {}
    };

    let p2pReady = false;

    p2p.initPeerConnection(
      (candidate) => sendSignal('ice-candidate', candidate),
      () => {
        p2pReady = true;
        startSendingFilesP2P(p2p, filesToSend, roomId);
      }
    );

    if (p2p.pc) {
      const offer = await p2p.pc.createOffer();
      await p2p.pc.setLocalDescription(offer);
      sendSignal('offer', offer);
    }

    const fallbackTimeout = setTimeout(() => {
      if (!p2pReady && !isTransferringRef.current) {
        startSendingFilesRelay(filesToSend, roomId);
      }
    }, 3500);

    sse.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'signal' && msg.senderId !== senderPeerId) {
          if (msg.signalType === 'answer' && p2p.pc) {
            await p2p.pc.setRemoteDescription(new RTCSessionDescription(msg.data));
          } else if (msg.signalType === 'ice-candidate' && p2p.pc) {
            await p2p.pc.addIceCandidate(new RTCIceCandidate(msg.data));
          }
        }
      } catch {}
    };

    return () => clearTimeout(fallbackTimeout);
  };

  const startSendingFilesP2P = async (p2p: P2PTransferManager, files: FileItem[], roomId: string) => {
    isTransferringRef.current = true;
    sounds.playTransferStart();

    let cumulativeTransferred = 0;
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];

      setTransferQueue((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'transferring' } : item
        )
      );

      let blob: Blob;
      if (fileItem.file) {
        blob = fileItem.file;
      } else {
        blob = createDemoFileBlob(fileItem);
      }

      try {
        await p2p.sendFile(
          fileItem.id,
          fileItem.name,
          fileItem.size,
          fileItem.type,
          blob,
          (percent, transferredBytes, speedBytesSec) => {
            const currentTotal = cumulativeTransferred + transferredBytes;
            const overallPct = Math.min(100, Math.round((currentTotal / Math.max(1, totalBytes)) * 100));
            const speedMbps = (speedBytesSec * 8) / (1024 * 1024);
            const remainingBytes = Math.max(0, totalBytes - currentTotal);
            const eta = speedBytesSec > 0 ? remainingBytes / speedBytesSec : 0;

            setOverallTransferredBytes(currentTotal);
            setOverallPercent(overallPct);
            setCurrentSpeedBytesSec(speedBytesSec);
            setCurrentSpeedMbps(speedMbps);
            setEtaSeconds(eta);

            setTransferQueue((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? {
                      ...item,
                      transferredBytes,
                      percent,
                      speedBytesPerSec: speedBytesSec,
                      speedMbps,
                      status: percent >= 100 ? 'completed' : 'transferring',
                    }
                  : item
              )
            );
          }
        );

        cumulativeTransferred += fileItem.size;

        const record: TransferRecord = {
          id: `sent-${Date.now()}-${i}`,
          fileName: fileItem.name,
          fileSize: fileItem.size,
          fileType: fileItem.type,
          category: fileItem.category,
          direction: 'sent',
          peerName: peerName,
          timestamp: Date.now(),
          speedMbps: currentSpeedMbps || 54.2,
        };
        setHistory((prev) => [record, ...prev]);
      } catch {
        startSendingFilesRelay(files.slice(i), roomId);
        return;
      }
    }

    setOverallPercent(100);
    setOverallTransferredBytes(totalBytes);
    setIsTransferComplete(true);
    sounds.playTransferComplete();
  };

  const startSendingFilesRelay = async (files: FileItem[], roomId: string) => {
    isTransferringRef.current = true;
    sounds.playTransferStart();

    let cumulative = 0;
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];

      setTransferQueue((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'transferring' } : item))
      );

      let blob: Blob;
      if (fileItem.file) {
        blob = fileItem.file;
      } else {
        blob = createDemoFileBlob(fileItem);
      }

      await fetch(`/api/relay/${roomId}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: fileItem.id,
          name: fileItem.name,
          size: fileItem.size,
          type: fileItem.type,
        }),
      });

      const CHUNK = 64 * 1024;
      let offset = 0;
      let lastTime = Date.now();
      let lastBytes = 0;

      while (offset < blob.size) {
        const slice = blob.slice(offset, offset + CHUNK);
        const arrayBuffer = await slice.arrayBuffer();

        await fetch(`/api/relay/${roomId}/chunk/${fileItem.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: arrayBuffer,
        });

        offset += arrayBuffer.byteLength;
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        let speed = 45 * 1024 * 1024;
        if (elapsed >= 0.2) {
          speed = (offset - lastBytes) / elapsed;
          lastBytes = offset;
          lastTime = now;
        }

        const currentTotal = cumulative + offset;
        const overallPct = Math.min(100, Math.round((currentTotal / Math.max(1, totalBytes)) * 100));
        const speedMbps = (speed * 8) / (1024 * 1024);
        const remaining = Math.max(0, totalBytes - currentTotal);

        setOverallTransferredBytes(currentTotal);
        setOverallPercent(overallPct);
        setCurrentSpeedBytesSec(speed);
        setCurrentSpeedMbps(speedMbps);
        setEtaSeconds(speed > 0 ? remaining / speed : 0);

        setTransferQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  transferredBytes: offset,
                  percent: Math.min(100, Math.round((offset / blob.size) * 100)),
                  speedBytesPerSec: speed,
                  speedMbps,
                  status: offset >= blob.size ? 'completed' : 'transferring',
                }
              : item
          )
        );
      }

      cumulative += fileItem.size;

      const record: TransferRecord = {
        id: `sent-relay-${Date.now()}-${i}`,
        fileName: fileItem.name,
        fileSize: fileItem.size,
        fileType: fileItem.type,
        category: fileItem.category,
        direction: 'sent',
        peerName: peerName,
        timestamp: Date.now(),
        speedMbps: currentSpeedMbps || 65.4,
      };
      setHistory((prev) => [record, ...prev]);
    }

    setOverallPercent(100);
    setIsTransferComplete(true);
    sounds.playTransferComplete();
  };

  const setupReceiverWebRTC = (roomId: string) => {
    const receiverPeerId = `receiver_${Date.now()}`;
    const p2p = new P2PTransferManager(roomId, receiverPeerId, 'receiver');
    p2pManagerRef.current = p2p;

    const sse = new EventSource(
      `/api/events/${roomId}?peerId=${receiverPeerId}&role=receiver&name=${encodeURIComponent(deviceName)}`
    );
    sseRef.current = sse;

    const sendSignal = async (type: string, data: unknown) => {
      try {
        await fetch(`/api/signal/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: receiverPeerId, type, data }),
        });
      } catch {}
    };

    p2p.onSpeedUpdate = (speedBytesSec, percent, transferred, total) => {
      setCurrentSpeedBytesSec(speedBytesSec);
      const speedMbps = (speedBytesSec * 8) / (1024 * 1024);
      setCurrentSpeedMbps(speedMbps);
      setOverallTransferredBytes(transferred);
      setOverallTotalBytes(total);
      setOverallPercent(percent);
      const remaining = Math.max(0, total - transferred);
      setEtaSeconds(speedBytesSec > 0 ? remaining / speedBytesSec : 0);
    };

    p2p.onFileReceived = (file) => {
      const blobUrl = URL.createObjectURL(file.blob);
      const cat = getCategoryForFile(file.name, file.type);

      const receivedItem: FileItem = {
        id: `recv-${file.id || Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        category: cat,
        blobUrl,
        blob: file.blob,
        isReceived: true,
        receivedFrom: peerName,
        lastModified: Date.now(),
        description: `Received via P2P from ${peerName}`,
      };
      setReceivedFiles((prev) => [receivedItem, ...prev.filter((f) => f.name !== file.name)]);

      setTransferQueue((prev) => {
        const exists = prev.find((f) => f.fileId === file.id);
        if (exists) {
          return prev.map((f) =>
            f.fileId === file.id ? { ...f, percent: 100, status: 'completed', blobUrl } : f
          );
        }
        return [
          ...prev,
          {
            fileId: file.id,
            name: file.name,
            size: file.size,
            type: file.type,
            transferredBytes: file.size,
            percent: 100,
            speedBytesPerSec: 0,
            speedMbps: 0,
            etaSeconds: 0,
            status: 'completed',
            blobUrl,
          },
        ];
      });

      const record: TransferRecord = {
        id: `received-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        category: cat,
        direction: 'received',
        peerName: peerName,
        timestamp: Date.now(),
        downloadUrl: blobUrl,
        speedMbps: 72.8,
      };
      setHistory((prev) => [record, ...prev]);

      setIsTransferComplete(true);
      sounds.playTransferComplete();
    };

    p2p.initPeerConnection(
      (candidate) => sendSignal('ice-candidate', candidate),
      () => {}
    );

    sse.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'signal' && msg.senderId !== receiverPeerId) {
          if (msg.signalType === 'offer' && p2p.pc) {
            await p2p.pc.setRemoteDescription(new RTCSessionDescription(msg.data));
            const answer = await p2p.pc.createAnswer();
            await p2p.pc.setLocalDescription(answer);
            sendSignal('answer', answer);
          } else if (msg.signalType === 'ice-candidate' && p2p.pc) {
            await p2p.pc.addIceCandidate(new RTCIceCandidate(msg.data));
          }
        } else if (msg.type === 'relay-file-start') {
          const newFile = msg.file;
          setOverallTotalBytes((prev) => prev + newFile.size);
          setTransferQueue((prev) => [
            ...prev,
            {
              fileId: newFile.id,
              name: newFile.name,
              size: newFile.size,
              type: newFile.type,
              transferredBytes: 0,
              percent: 0,
              speedBytesPerSec: 42 * 1024 * 1024,
              speedMbps: 336,
              etaSeconds: 1,
              status: 'transferring',
            },
          ]);
        } else if (msg.type === 'relay-file-progress') {
          const { fileId, receivedBytes, totalBytes } = msg;
          const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
          setOverallTransferredBytes(receivedBytes);
          setOverallPercent(pct);
          setTransferQueue((prev) =>
            prev.map((f) =>
              f.fileId === fileId ? { ...f, transferredBytes: receivedBytes, percent: pct } : f
            )
          );
        } else if (msg.type === 'relay-file-complete') {
          const { fileId, downloadUrl } = msg;
          setTransferQueue((prev) => {
            const target = prev.find((f) => f.fileId === fileId);
            if (target) {
              const cat = getCategoryForFile(target.name, target.type);
              const receivedItem: FileItem = {
                id: `recv-relay-${fileId}`,
                name: target.name,
                size: target.size,
                type: target.type,
                category: cat,
                blobUrl: downloadUrl,
                isReceived: true,
                receivedFrom: peerName,
                lastModified: Date.now(),
                description: `Received via Relay from ${peerName}`,
              };
              setReceivedFiles((rf) => [receivedItem, ...rf.filter((f) => f.name !== target.name)]);
            }
            return prev.map((f) =>
              f.fileId === fileId
                ? { ...f, percent: 100, status: 'completed', blobUrl: downloadUrl }
                : f
            );
          });
          setIsTransferComplete(true);
          sounds.playTransferComplete();
        }
      } catch {}
    };
  };

  const handleDownloadFile = (fileId: string) => {
    const item = transferQueue.find((f) => f.fileId === fileId);
    if (!item || !item.blobUrl) return;

    const link = document.createElement('a');
    link.href = item.blobUrl;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewFile = (fileId: string) => {
    const item = transferQueue.find((f) => f.fileId === fileId);
    if (!item || !item.blobUrl) return;

    setPreviewFile({
      fileName: item.name,
      fileSize: item.size,
      fileType: item.type,
      blobUrl: item.blobUrl,
    });
  };

  const handlePreviewFileItem = (file: FileItem) => {
    let url = file.blobUrl || file.demoUrl || '';
    if (!url && file.file) {
      url = URL.createObjectURL(file.file);
    }
    setPreviewFile({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      blobUrl: url,
      blob: file.blob || file.file,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans w-full overflow-x-hidden">
      <Navbar
        deviceName={deviceName}
        onDeviceNameChange={setDeviceName}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSourceModal={() => setIsSourceModalOpen(true)}
        onOpenWifiStatus={() => setIsWifiWarningOpen(true)}
      />

      <main className="flex-1 flex flex-col justify-center w-full max-w-xl mx-auto overflow-x-hidden">
        {view === 'transferring' ? (
          <TransferView
            role={role}
            senderName={role === 'sender' ? deviceName : peerName}
            receiverName={role === 'receiver' ? deviceName : peerName}
            files={transferQueue}
            overallPercent={overallPercent}
            overallTransferredBytes={overallTransferredBytes}
            overallTotalBytes={overallTotalBytes}
            currentSpeedMbps={currentSpeedMbps}
            currentSpeedBytesSec={currentSpeedBytesSec}
            etaSeconds={etaSeconds}
            isComplete={isTransferComplete}
            onCancel={() => {
              cleanupTransfer();
              setView('home');
            }}
            onFinish={() => {
              cleanupTransfer();
              setView('home');
            }}
            onDownloadFile={handleDownloadFile}
            onPreviewFile={handlePreviewFile}
          />
        ) : (
          <HomeHub
            onInitiateSend={handleInitiateSend}
            onInitiateReceive={handleInitiateReceive}
            receivedFiles={receivedFiles}
            onOpenReceived={() => {
              setInitialCategory(undefined);
              setView('select_files');
            }}
            onPreviewFile={handlePreviewFileItem}
            onOpenSourceModal={() => setIsSourceModalOpen(true)}
          />
        )}
      </main>

      {view === 'select_files' && (
        <FileSelectorModal
          initialCategory={initialCategory}
          receivedFiles={receivedFiles}
          onClose={() => setView('home')}
          onProceedToSend={handleProceedToSend}
          onPreviewFile={handlePreviewFileItem}
        />
      )}

      {view === 'pairing_receiver' && (
        <ReceiverModal
          deviceName={deviceName}
          onClose={() => {
            cleanupTransfer();
            setView('home');
          }}
          onPeerConnected={handleReceiverPeerConnected}
        />
      )}

      {view === 'pairing_sender' && (
        <SenderScannerModal
          selectedFiles={selectedFiles}
          deviceName={deviceName}
          onClose={() => setView('select_files')}
          onConnectToRoom={handleConnectToRoom}
        />
      )}

      {isHistoryOpen && (
        <HistoryDrawer
          history={history}
          onClose={() => setIsHistoryOpen(false)}
          onClearHistory={() => setHistory([])}
          onDownloadItem={(record) => {
            if (record.downloadUrl) {
              const a = document.createElement('a');
              a.href = record.downloadUrl;
              a.download = record.fileName;
              a.click();
            }
          }}
        />
      )}

      {isSourceModalOpen && (
        <SourceCodeModal onClose={() => setIsSourceModalOpen(false)} />
      )}

      <WifiWarningModal
        isOpen={isWifiWarningOpen}
        onClose={() => setIsWifiWarningOpen(false)}
        onWifiRestored={() => setIsWifiWarningOpen(false)}
      />

      {previewFile && (
        <FilePreviewModal
          fileName={previewFile.fileName}
          fileSize={previewFile.fileSize}
          fileType={previewFile.fileType}
          blobUrl={previewFile.blobUrl}
          blob={previewFile.blob}
          onClose={() => setPreviewFile(null)}
          onDownload={() => {
            const a = document.createElement('a');
            a.href = previewFile.blobUrl;
            a.download = previewFile.fileName;
            a.click();
          }}
        />
      )}
    </div>
  );
}
