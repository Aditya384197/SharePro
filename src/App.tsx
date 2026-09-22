import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { HomeHub } from './components/HomeHub.tsx';
import { SendView } from './components/SendView.tsx';
import { ReceiveView } from './components/ReceiveView.tsx';
import { TransferView } from './components/TransferView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { FilePreviewModal } from './components/FilePreviewModal.tsx';
import { SourceCodeModal } from './components/SourceCodeModal.tsx';
import { TabBar } from './components/TabBar.tsx';
import { TransferManager } from './utils/webrtc.ts';
import { sounds } from './utils/audio.ts';
import type { Language } from './utils/i18n.ts';
import { translations } from './utils/i18n.ts';
import type { TransferFile, FileMeta, ActiveRoom, TransferHistoryItem, ReceiverReadyInfo } from './types.ts';

export type AppTab = 'home' | 'send' | 'receive' | 'transfer' | 'history' | 'settings';

export default function App() {
  const [lang, setLang] = useState<Language>('hi'); // Default Hindi
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [role, setRole] = useState<'sender' | 'receiver'>('sender');
  
  // Real user files (ZERO DEMO DATA)
  const [selectedFiles, setSelectedFiles] = useState<TransferFile[]>([]);
  const [transferFiles, setTransferFiles] = useState<TransferFile[]>([]);
  
  // Modals & Panels
  const [isSourceCodeModalOpen, setIsSourceCodeModalOpen] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<TransferFile | null>(null);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  // Network & Signaling state
  const [roomCode, setRoomCode] = useState<string>('');
  const [receiverShareUrl, setReceiverShareUrl] = useState<string>('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [peerName, setPeerName] = useState<string>('Remote Device');
  const [incomingSender, setIncomingSender] = useState<{
    senderName: string;
    senderType: string;
    filesMeta: FileMeta[];
  } | null>(null);

  // Transfer metrics
  const [overallProgress, setOverallProgress] = useState(0);
  const [overallBytes, setOverallBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [speedMBs, setSpeedMBs] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // History state from local storage
  const [history, setHistory] = useState<TransferHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('sharepro_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const transferManagerRef = useRef<TransferManager | null>(null);

  useEffect(() => {
    return () => {
      transferManagerRef.current?.destroy();
      transferManagerRef.current = null;
    };
  }, []);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 4000);
  };

  // Generate 6-digit room code
  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Get user's device name
  const getDeviceName = () => {
    const savedName = localStorage.getItem('sharepro_device_name');
    if (savedName && savedName.trim()) return savedName.trim();

    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (/Android/i.test(navigator.userAgent)) return 'Android Device';
    if (/iPhone|iPad/i.test(navigator.userAgent)) return 'Apple Device';
    if (/Mac/i.test(navigator.userAgent)) return 'MacBook / Mac';
    if (/Windows/i.test(navigator.userAgent)) return 'Windows PC';
    return isMobile ? 'Mobile Device' : 'Desktop PC';
  };

  // Initialize transfer manager callbacks
  const setupManager = useCallback(() => {
    if (transferManagerRef.current) {
      transferManagerRef.current.destroy();
    }

    const manager = new TransferManager({
      onStatusChange: (status) => {
        console.log('[TransferManager status]', status);
      },
      onActiveRooms: (rooms) => {
        setActiveRooms(rooms);
      },
      onSenderJoined: (info) => {
        sounds.playIncoming();
        setIncomingSender(info);
      },
      onTransferAccepted: () => {
        sounds.playConnect();
        setActiveTab('transfer');
      },
      onReceiverReady: (info: ReceiverReadyInfo) => {
        setRoomCode(info.room);
        setReceiverShareUrl(info.url);
      },
      onError: (message) => {
        showToast(message, 'error');
      },
      onTransferRejected: (reason) => {
        showToast(reason || (lang === 'hi' ? 'ट्रांसफर अस्वीकार कर दिया गया' : 'Transfer declined'), 'error');
        setActiveTab('home');
      },
      onProgress: (fileId, bytesTransferred, percent, speed, eta) => {
        setSpeedMBs(speed);
        setEtaSeconds(eta);

        setTransferFiles(prev => {
          const updated = prev.map(f => {
            if (f.id === fileId) {
              return {
                ...f,
                bytesTransferred,
                progress: percent,
                status: percent >= 100 ? ('completed' as const) : ('transferring' as const),
              };
            }
            return f;
          });

          const currentTransferred = updated.reduce((acc, f) => acc + f.bytesTransferred, 0);
          const total = updated.reduce((acc, f) => acc + f.size, 0);
          setOverallBytes(currentTransferred);
          setTotalBytes(total);
          setOverallProgress(total > 0 ? Math.min(100, Math.round((currentTransferred / total) * 100)) : 0);

          return updated;
        });
      },
      onFileReceived: (file) => {
        setTransferFiles(prev => {
          const exists = prev.some(f => f.id === file.id);
          if (exists) {
            return prev.map(f => f.id === file.id ? file : f);
          }
          return [...prev, file];
        });
      },
      onAllCompleted: () => {
        sounds.playCompleted();
        setIsCompleted(true);
        setSpeedMBs(0);
        setEtaSeconds(0);
        setOverallProgress(100);

        // Save to History
        setTransferFiles(currentFiles => {
          const newHistoryItem: TransferHistoryItem = {
            id: Math.random().toString(36).substring(2, 9),
            direction: manager.getRole() === 'sender' ? 'sent' : 'received',
            peerName: peerName,
            timestamp: Date.now(),
            files: currentFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
            totalSize: currentFiles.reduce((acc, f) => acc + f.size, 0),
          };

          setHistory(prev => {
            const updated = [newHistoryItem, ...prev];
            try {
              localStorage.setItem('sharepro_history', JSON.stringify(updated.slice(0, 40)));
            } catch {}
            return updated;
          });

          return currentFiles;
        });
      },
      onPeerDisconnected: (reason) => {
        console.warn('Peer disconnected:', reason);
      },
    });

    transferManagerRef.current = manager;
    return manager;
  }, [role, selectedFiles, peerName, lang]);

  // Handle URL room code parameter (e.g. ?room=123456)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom && urlRoom.length >= 4) {
      setRole('sender');
      setRoomCode(urlRoom.toUpperCase());
      setActiveTab('send');
      showToast(lang === 'hi' ? `रूम कोड ${urlRoom} कनेक्ट होने के लिए तैयार है। फाइलें चुनें।` : `Room ${urlRoom} ready. Select files to send.`, 'info');
    }
  }, []);

  // Online / offline detector
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast(lang === 'hi' ? 'इंटरनेट कनेक्टेड' : 'Online', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(lang === 'hi' ? 'नेटवर्क डिस्कनेक्टेड' : 'Offline', 'error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lang]);

  // Start SEND Flow
  const handleStartSend = () => {
    setRole('sender');
    setActiveTab('send');
  };

  // Start RECEIVE Flow
  const handleStartReceive = async () => {
    setRole('receiver');
    const code = generateRoomCode();
    setRoomCode(code);
    setReceiverShareUrl('');
    setIncomingSender(null);
    setIsCompleted(false);

    const manager = setupManager();
    await manager.registerReceiver(code, getDeviceName());
    setActiveTab('receive');
  };

  // Switch Tab cleanly
  const handleTabChange = (targetTab: AppTab) => {
    if (targetTab === 'receive') {
      handleStartReceive();
    } else {
      if (activeTab === 'receive' && targetTab !== 'transfer') {
        transferManagerRef.current?.cancelTransfer();
      }
      if (targetTab === 'send') {
        setRole('sender');
      }
      setActiveTab(targetTab);
    }
  };

  // Add real files selected by user
  const handleAddFiles = (newFilesList: FileList | File[]) => {
    const filesArray = Array.from(newFilesList);
    const newTransferFiles: TransferFile[] = filesArray.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      file,
      progress: 0,
      bytesTransferred: 0,
      status: 'pending',
    }));

    setSelectedFiles(prev => [...prev, ...newTransferFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearAllFiles = () => {
    setSelectedFiles([]);
  };

  // Proceed to connect to receiver
  const handleProceedToSend = (targetPin?: string) => {
    const destRoom = (targetPin || roomCode).trim();
    const validTarget = /^\d{6}$/.test(destRoom) || /^(sharepro:\/\/|https?:\/\/)/i.test(destRoom);
    if (!validTarget) {
      showToast(lang === 'hi' ? 'कृपया 6-अंकों का पिन या सही QR लिंक दें' : 'Enter a valid 6-digit PIN or QR link', 'error');
      return;
    }

    if (selectedFiles.length === 0) {
      showToast(lang === 'hi' ? 'कृपया भेजने के लिए कम से कम एक फाइल चुनें' : 'Please select files first', 'error');
      return;
    }

    setTransferFiles(selectedFiles);
    setTotalBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0));
    setOverallBytes(0);
    setOverallProgress(0);
    setIsCompleted(false);

    const manager = transferManagerRef.current;
    manager?.setOutgoingFiles(selectedFiles);
    void handleConnectToRoom(destRoom);
  };

  // Sender connects to a specific room
  const handleConnectToRoom = async (targetRoom: string) => {
    setRoomCode(targetRoom);
    const manager = setupManager();
    manager.setOutgoingFiles(selectedFiles);

    const filesMeta: FileMeta[] = selectedFiles.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    await manager.joinReceiver(targetRoom, getDeviceName(), filesMeta);
    showToast(
      lang === 'hi'
        ? 'रिसीवर से सुरक्षित कनेक्शन बनाया जा रहा है...'
        : 'Creating a secure connection to the receiver...',
      'info'
    );
  };

  // Receiver accepts incoming files
  const handleAcceptTransfer = () => {
    if (!incomingSender) return;
    setPeerName(incomingSender.senderName);

    const initialFiles: TransferFile[] = incomingSender.filesMeta.map(m => ({
      id: m.id,
      name: m.name,
      size: m.size,
      type: m.type,
      progress: 0,
      bytesTransferred: 0,
      status: 'pending',
    }));

    setTransferFiles(initialFiles);
    setTotalBytes(initialFiles.reduce((acc, f) => acc + f.size, 0));
    setOverallBytes(0);
    setOverallProgress(0);
    setIsCompleted(false);

    void transferManagerRef.current?.acceptTransfer();
    setIncomingSender(null);
    setActiveTab('transfer');
  };

  const handleRejectTransfer = () => {
    void transferManagerRef.current?.rejectTransfer('User declined');
    setIncomingSender(null);
    showToast(lang === 'hi' ? 'ट्रांसफर अस्वीकार किया गया' : 'Transfer declined', 'info');
  };

  // Cancel active transfer
  const handleCancelTransfer = () => {
    transferManagerRef.current?.cancelTransfer();
    setActiveTab('home');
    showToast(lang === 'hi' ? 'ट्रांसफर रद्द कर दिया गया' : 'Transfer cancelled', 'info');
  };

  // Reset to home when transfer completes
  const handleTransferDone = () => {
    transferManagerRef.current?.cancelTransfer();
    setSelectedFiles([]);
    setTransferFiles([]);
    setIncomingSender(null);
    setActiveTab('home');
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('sharepro_history');
    } catch {}
    showToast(lang === 'hi' ? 'इतिहास साफ कर दिया गया' : 'History cleared', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar with Corner Source Code Icon */}
      <Navbar
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
        onOpenHistory={() => setActiveTab('history')}
        onOpenSourceCode={() => setIsSourceCodeModalOpen(true)}
        historyCount={history.length}
        isOnline={isOnline}
      />

      <TabBar
        activeTab={activeTab}
        onSelectTab={(tab) => handleTabChange(tab)}
        lang={lang}
        isTransferring={activeTab === 'transfer' && !isCompleted}
        historyCount={history.length}
        selectedFilesCount={selectedFiles.length}
      />

      {/* Floating In-App Toast Notification */}
      {toastNotification && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-4 duration-200">
          <div className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-medium ${
            toastNotification.type === 'error'
              ? 'bg-red-950/90 text-red-200 border-red-800'
              : toastNotification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}>
            {toastNotification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            {toastNotification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastNotification.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
            <span>{toastNotification.message}</span>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Screen Content by Tab */}
      <main className="flex-1 pb-24">
        {activeTab === 'home' && (
          <HomeHub
            lang={lang}
            onStartSend={handleStartSend}
            onStartReceive={handleStartReceive}
            onFilesDropped={(files) => {
              handleAddFiles(files);
              setRole('sender');
              setActiveTab('send');
            }}
            history={history}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'send' && (
          <SendView
            files={selectedFiles}
            onAddFiles={handleAddFiles}
            onRemoveFile={handleRemoveFile}
            onClearAll={handleClearAllFiles}
            onProceedToSend={handleProceedToSend}
            onBackToHome={() => setActiveTab('home')}
            activeRooms={activeRooms}
            onRefreshRooms={() => {
              transferManagerRef.current?.requestRooms();
            }}
            lang={lang}
          />
        )}

        {activeTab === 'receive' && (
          <ReceiveView
            roomCode={roomCode}
            shareUrl={receiverShareUrl}
            incomingSender={incomingSender}
            onAcceptTransfer={handleAcceptTransfer}
            onRejectTransfer={handleRejectTransfer}
            onBackToHome={() => {
              transferManagerRef.current?.cancelTransfer();
              setActiveTab('home');
            }}
            onRegeneratePin={handleStartReceive}
            lang={lang}
          />
        )}

        {activeTab === 'transfer' && (
          <TransferView
            role={role}
            peerName={peerName}
            files={transferFiles}
            overallProgress={overallProgress}
            overallBytes={overallBytes}
            totalBytes={totalBytes}
            speedMBs={speedMBs}
            etaSeconds={etaSeconds}
            isCompleted={isCompleted}
            onCancel={handleCancelTransfer}
            onDone={handleTransferDone}
            onPreviewFile={(file) => setActivePreviewFile(file)}
            lang={lang}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onClearHistory={handleClearHistory}
            onBackToHome={() => setActiveTab('home')}
            lang={lang}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            lang={lang}
            onToggleLang={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
            onBackToHome={() => setActiveTab('home')}
            onClearHistory={handleClearHistory}
            historyCount={history.length}
          />
        )}
      </main>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={activePreviewFile}
        onClose={() => setActivePreviewFile(null)}
      />

      {/* Corner Source Code & APK Download Modal */}
      <SourceCodeModal
        isOpen={isSourceCodeModalOpen}
        onClose={() => setIsSourceCodeModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
