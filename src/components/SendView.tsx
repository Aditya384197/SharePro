import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, FileText, Image, Video, Music, Package, Trash2, ArrowRight, Radio, KeyRound, Smartphone, Laptop, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { TransferFile, ActiveRoom } from '../types.ts';
import { SenderScannerModal } from './SenderScannerModal.tsx';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface SendViewProps {
  files: TransferFile[];
  onAddFiles: (newFiles: FileList | File[]) => void;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  onProceedToSend: (roomCode?: string) => void;
  onBackToHome: () => void;
  activeRooms: ActiveRoom[];
  onRefreshRooms: () => void;
  lang: Language;
}

export const SendView: React.FC<SendViewProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
  onClearAll,
  onProceedToSend,
  onBackToHome,
  activeRooms,
  onRefreshRooms,
  lang,
}) => {
  const [step, setStep] = useState<'select' | 'connect'>('select');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [pinInput, setPinInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-emerald-400" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-blue-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-purple-400" />;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="w-5 h-5 text-amber-400" />;
    }
    return <Package className="w-5 h-5 text-indigo-400" />;
  };

  const filteredFiles = files.filter(f => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'images') return f.type.startsWith('image/');
    if (activeCategory === 'videos') return f.type.startsWith('video/');
    if (activeCategory === 'audio') return f.type.startsWith('audio/');
    if (activeCategory === 'docs') return f.type.includes('pdf') || f.type.includes('doc') || f.type.includes('text');
    return true;
  });

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  const handleConnectWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    if (/^\d{6}$/.test(cleanPin) || cleanPin.startsWith('sharepro://') || cleanPin.startsWith('http://') || cleanPin.startsWith('https://')) {
      onProceedToSend(cleanPin);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header with Prominent Back Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          id="send-back-btn"
          onClick={() => {
            if (step === 'connect') {
              setStep('select');
            } else {
              onBackToHome();
            }
          }}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold shadow-sm transition-all active:scale-95 group cursor-pointer"
          title={step === 'connect' ? 'Back to Files' : t.backToHome}
        >
          <ArrowLeft className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform" />
          <span>
            {step === 'connect'
              ? (lang === 'hi' ? '← फाइल चयन पर वापस' : '← Back to Files')
              : t.backToHome}
          </span>
        </button>

        <div className="flex items-center space-x-2">
          {step === 'select' ? (
            <span className="text-xs font-medium text-slate-400 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              {lang === 'hi' ? 'स्टेप 1: फाइलें चुनें' : 'Step 1: Select Files'}
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-400 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40">
              {lang === 'hi' ? 'स्टेप 2: रिसीवर से कनेक्ट करें' : 'Step 2: Connect to Receiver'}
            </span>
          )}
        </div>
      </div>

      {step === 'select' ? (
        /* STEP 1: FILE SELECTION */
        <div className="space-y-5">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'all', labelHi: 'सभी फाइलें', labelEn: 'All Files' },
              { id: 'images', labelHi: 'फोटो', labelEn: 'Photos' },
              { id: 'videos', labelHi: 'वीडियो', labelEn: 'Videos' },
              { id: 'audio', labelHi: 'ऑडियो', labelEn: 'Audio' },
              { id: 'docs', labelHi: 'डॉक्यूमेंट्स', labelEn: 'Documents' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'hi' ? cat.labelHi : cat.labelEn}
              </button>
            ))}
          </div>

          {/* Drag & Drop Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-3xl border-2 border-dashed border-slate-700/80 hover:border-blue-500 bg-slate-900/60 hover:bg-slate-900 transition-all text-center cursor-pointer group shadow-xl"
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onAddFiles(e.target.files);
                }
              }}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-inner">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-white text-lg">
              {t.dropFilesHere}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {lang === 'hi' ? 'फोन या कंप्यूटर से कोई भी फाइल, फोटो, वीडियो चुनें' : 'Select photos, videos, apps, or documents to send'}
            </p>
            <button
              type="button"
              className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              {t.chooseFromDevice}
            </button>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">
                    {lang === 'hi' ? 'चुनी गई फाइलें' : 'Selected Files'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold">
                    {files.length}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-400">
                    {t.totalSize}: <strong className="text-white">{formatFileSize(totalSize)}</strong>
                  </span>
                  <button
                    onClick={onClearAll}
                    className="text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.clearAll}</span>
                  </button>
                </div>
              </div>

              {/* Files Grid */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs"
                  >
                    <div className="flex items-center space-x-3 truncate mr-2">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Proceed to Connect Button */}
              <div className="pt-2">
                <button
                  id="send-proceed-btn"
                  onClick={() => {
                    onRefreshRooms();
                    setStep('connect');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/30 active:scale-98 transition-all cursor-pointer"
                >
                  <span>{t.nextChooseReceiver}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: CONNECT TO RECEIVER (Nearby Wi-Fi list or PIN) */
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">
                {lang === 'hi' ? 'रिसीवर से कनेक्ट करें' : 'Connect to Receiver'}
              </h3>
              <p className="text-xs text-slate-400">
                {t.scanningReceivers}
              </p>
            </div>
            <button
              onClick={onRefreshRooms}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Active Rooms on Wi-Fi */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.availableReceivers}
            </h4>
            {activeRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeRooms.map((room) => (
                  <div
                    key={room.room}
                    onClick={() => onProceedToSend(room.room)}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/80 cursor-pointer transition-all hover:scale-[1.01] active:scale-98 flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                          {room.deviceName}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">PIN: {room.room}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <Radio className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? 'नजदीकी रिसीवर खोज रहे हैं... दूसरे डिवाइस पर "प्राप्त करें" दबाएं या नीचे पिन डालें' : 'Searching for nearby receivers... Tap "Receive" on the other device or enter PIN below'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-700/40 bg-emerald-950/20 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-950/40"
          >
            <span className="text-base">▣</span>
            <span>{lang === 'hi' ? 'रिसीवर का QR स्कैन करें' : 'Scan receiver QR code'}</span>
          </button>

          {/* Manual PIN Form */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-white flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>{t.orEnterPin}</span>
            </h4>
            <form onSubmit={handleConnectWithPin} className="flex gap-2">
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-Digit PIN"
                maxLength={6}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono text-lg font-bold tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!/^\d{6}$/.test(pinInput)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {t.connectAndSend}
              </button>
            </form>
          </div>
        </div>
      )}
      <SenderScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onBackToFileSelect={() => setShowScanner(false)}
        files={files}
        activeRooms={activeRooms}
        onRefreshRooms={onRefreshRooms}
        onConnectToTarget={(value) => {
          setShowScanner(false);
          onProceedToSend(value);
        }}
        lang={lang}
      />
    </div>
  );
};
