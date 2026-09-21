import React, { useState } from 'react';
import {
  Send,
  Download,
  Layers,
  Film,
  Music,
  Image,
  FileText,
  FolderOpen,
  Wifi,
  ShieldCheck,
  Zap,
  Inbox,
  Play,
  Eye,
  ArrowRight,
  FolderArchive,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { FileItem } from '../types';
import { formatBytes } from '../utils/demoData';
import { downloadProjectZip } from '../utils/downloadZip';

interface HomeHubProps {
  onInitiateSend: (category?: FileItem['category']) => void;
  onInitiateReceive: () => void;
  receivedFiles?: FileItem[];
  onOpenReceived?: () => void;
  onPreviewFile?: (file: FileItem) => void;
  onOpenSourceModal?: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  onInitiateSend,
  onInitiateReceive,
  receivedFiles = [],
  onOpenReceived,
  onPreviewFile,
  onOpenSourceModal,
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  const handleDownloadZipDirect = async () => {
    setDownloadingZip(true);
    setDownloadSuccessMsg(null);
    try {
      const res = await downloadProjectZip();
      setDownloadSuccessMsg(`सफलता! ${res.sizeFormatted}`);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'डाउनलोड विफल';
      alert('डाउनलोड त्रुटि: ' + msg);
    } finally {
      setDownloadingZip(false);
    }
  };
  const categoryCards = [
    {
      id: 'app' as const,
      label: 'Apps',
      icon: Layers,
      color: 'from-blue-500 to-indigo-600',
      subtitle: 'APKs & Apps',
    },
    {
      id: 'video' as const,
      label: 'Videos',
      icon: Film,
      color: 'from-rose-500 to-red-600',
      subtitle: 'MP4, 4K, MKV',
    },
    {
      id: 'audio' as const,
      label: 'Music',
      icon: Music,
      color: 'from-amber-500 to-orange-600',
      subtitle: 'MP3 & Audio',
    },
    {
      id: 'photo' as const,
      label: 'Photos',
      icon: Image,
      color: 'from-emerald-500 to-teal-600',
      subtitle: 'Images & RAW',
    },
    {
      id: 'document' as const,
      label: 'Documents',
      icon: FileText,
      color: 'from-purple-500 to-violet-600',
      subtitle: 'PDF, Office, ZIP',
    },
    {
      id: 'file' as const,
      label: 'Storage',
      icon: FolderOpen,
      color: 'from-cyan-500 to-blue-600',
      subtitle: 'Device Files',
    },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-bold border border-blue-500/20 mb-1.5">
              <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
              <span>Direct P2P • High Speed</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Fast File Sharing
            </h1>
            <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
              Transfer apps, videos, music, and documents directly between devices.
            </p>
          </div>

          <div className="hidden xs:flex flex-col items-end shrink-0 pl-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>100+ Mbps</span>
            </div>
            <span className="text-[10px] text-slate-400">Zero Mobile Data</span>
          </div>
        </div>
      </div>

      {/* Direct Source Code ZIP Attached Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/40 p-3.5 sm:p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <FolderArchive className="w-5 h-5 text-blue-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  SharePro-SourceCode.zip
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 shrink-0">
                  Android & Web (.ZIP)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                संपूर्ण Android Studio प्रोजेक्ट, GitHub Actions वर्कफ़्लो (.yml), व सोर्स कोड शामिल
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {onOpenSourceModal && (
              <button
                onClick={onOpenSourceModal}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                फाइल लिस्ट
              </button>
            )}
            <button
              onClick={handleDownloadZipDirect}
              disabled={downloadingZip}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all text-center"
            >
              {downloadSuccessMsg ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-200">{downloadSuccessMsg}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingZip ? 'पैकेजिंग...' : 'डाउनलोड ज़िप (.ZIP)'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onInitiateSend()}
          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-xl shadow-blue-950/40 border border-blue-400/30 active:scale-[0.98] transition-all text-left flex flex-col justify-between min-h-[140px] sm:min-h-[160px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
              Send
            </span>
          </div>

          <div className="mt-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              SEND
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-100/90 font-medium">
              Pick & beam files
            </p>
          </div>
        </button>

        <button
          onClick={onInitiateReceive}
          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white shadow-xl shadow-emerald-950/40 border border-emerald-400/30 active:scale-[0.98] transition-all text-left flex flex-col justify-between min-h-[140px] sm:min-h-[160px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
              QR Code
            </span>
          </div>

          <div className="mt-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              RECEIVE
            </h2>
            <p className="text-[11px] sm:text-xs text-emerald-100/90 font-medium">
              Show QR & receive
            </p>
          </div>
        </button>
      </div>

      {receivedFiles.length > 0 && (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Inbox className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Received Files</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    {receivedFiles.length}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Stored in app storage • Tap to play or view</p>
              </div>
            </div>

            {onOpenReceived && (
              <button
                onClick={onOpenReceived}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {receivedFiles.slice(0, 3).map((file) => {
              const isMedia = file.category === 'video' || file.category === 'audio';
              return (
                <div
                  key={file.id}
                  className="p-2 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between gap-2 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-slate-700/80 flex items-center justify-center shrink-0">
                      {file.category === 'video' ? (
                        <Film className="w-3.5 h-3.5 text-rose-400" />
                      ) : file.category === 'audio' ? (
                        <Music className="w-3.5 h-3.5 text-amber-400" />
                      ) : file.category === 'photo' ? (
                        <Image className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{formatBytes(file.size)}</p>
                    </div>
                  </div>

                  {onPreviewFile && (
                    <button
                      onClick={() => onPreviewFile(file)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 ${
                        isMedia
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      }`}
                    >
                      {isMedia ? <Play className="w-3 h-3 fill-current" /> : <Eye className="w-3 h-3" />}
                      <span>{isMedia ? 'Play' : 'View'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Categories
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Quick Send
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
          {categoryCards.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => onInitiateSend(cat.id)}
                className="group p-3 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-md"
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center shadow-md text-white transition-transform group-hover:scale-105`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 tracking-tight">
                  {cat.label}
                </span>
                <span className="text-[9px] text-slate-400 hidden sm:block">
                  {cat.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-[11px] font-bold text-white">Direct P2P</div>
          <div className="text-[9px] text-slate-400">No Cloud Storage</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <Wifi className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-[11px] font-bold text-white">High-Speed Wi-Fi</div>
          <div className="text-[9px] text-slate-400">Up to 100+ MB/s</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-[11px] font-bold text-white">Cross Platform</div>
          <div className="text-[9px] text-slate-400">Web & Android</div>
        </div>
      </div>
    </div>
  );
};
