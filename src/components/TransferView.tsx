import React, { useState } from 'react';
import { CheckCircle2, Download, Eye, FileText, Image, Music, Package, Video, XCircle, ArrowRight, ArrowLeft, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import type { TransferFile } from '../types.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';
import { downloadFilesAsZip } from '../utils/downloadZip.ts';

interface TransferViewProps {
  role: 'sender' | 'receiver';
  peerName: string;
  files: TransferFile[];
  overallProgress: number; // 0 to 100
  overallBytes: number;
  totalBytes: number;
  speedMBs: number;
  etaSeconds: number;
  isCompleted: boolean;
  onCancel: () => void;
  onDone: () => void;
  onPreviewFile: (file: TransferFile) => void;
  lang: Language;
}

export const TransferView: React.FC<TransferViewProps> = ({
  role,
  peerName,
  files,
  overallProgress,
  overallBytes,
  totalBytes,
  speedMBs,
  etaSeconds,
  isCompleted,
  onCancel,
  onDone,
  onPreviewFile,
  lang,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const t = translations[lang];

  const handleBackToHome = () => {
    if (isCompleted) {
      onDone();
    } else {
      setShowExitConfirm(true);
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onCancel();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-emerald-400" />;
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4 text-blue-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4 text-purple-400" />;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="w-4 h-4 text-amber-400" />;
    }
    return <Package className="w-4 h-4 text-indigo-400" />;
  };

  const handleDownloadSingleFile = (file: TransferFile) => {
    if (file.downloadUrl) {
      const a = document.createElement('a');
      a.href = file.downloadUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (file.blob) {
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between pb-1">
        <button
          id="transfer-back-btn"
          onClick={handleBackToHome}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold shadow-sm transition-all active:scale-95 group cursor-pointer"
          title={t.backToHome}
        >
          <ArrowLeft className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform" />
          <span>{t.backToHome}</span>
        </button>

        <span className="text-xs font-medium text-slate-400 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
          {role === 'sender' ? t.send : t.receive}
        </span>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">
                {t.cancel} Transfer?
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {t.confirmCancelTransfer}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                रहने दें / Stay
              </button>
              <button
                onClick={handleConfirmExit}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                हाँ, वापस जाएं
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Connection Banner */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Peer relationship */}
          <div className="flex items-center space-x-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
              {role === 'sender' ? 'Sending To' : 'Receiving From'}
            </span>
            <span className="font-bold text-white text-base truncate max-w-[200px]">
              {peerName || 'Remote Device'}
            </span>
          </div>

          {/* Real WebRTC tag */}
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-800/40">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>Direct P2P Stream</span>
          </div>
        </div>

        {/* Overall Progress Metrics */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between items-baseline text-xs text-slate-400">
            <span className="font-semibold text-white text-base">
              {overallProgress}%
            </span>
            <span>
              {formatFileSize(overallBytes)} / {formatFileSize(totalBytes)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                isCompleted
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
            />
          </div>

          {/* Speed & ETA stats */}
          {!isCompleted && (
            <div className="flex justify-between text-xs text-slate-400 pt-1 font-mono">
              <span>
                {t.speed}: <strong className="text-white font-semibold">{speedMBs} MB/s</strong>
              </span>
              <span>
                {t.timeRemaining}: <strong className="text-white font-semibold">{etaSeconds}s</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Completion Header if Done */}
      {isCompleted && (
        <div className="p-6 rounded-3xl bg-emerald-950/40 border border-emerald-600/40 text-center space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              {t.transferCompleted}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {role === 'receiver'
                ? `सभी ${files.length} फाइलें प्राप्त हो गईं और उनके बाइट आकार सत्यापित हो गए हैं।`
                : `सभी ${files.length} फाइलें सीधे P2P कनेक्शन से सफलतापूर्वक भेजी गई हैं।`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {role === 'receiver' && (
              <button
                id="download-all-zip-btn"
                onClick={() => downloadFilesAsZip(files)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadAllZip}</span>
              </button>
            )}
            <button
              id="transfer-done-btn"
              onClick={onDone}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-300 px-1">
          Files ({files.length})
        </h4>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {getFileIcon(file.type)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(file.size)} • {file.status === 'completed' ? 'Completed' : `${file.progress}%`}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {file.status === 'completed' ? (
                  <>
                    <button
                      onClick={() => onPreviewFile(file)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {role === 'receiver' && (
                      <button
                        onClick={() => handleDownloadSingleFile(file)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1 transition-colors"
                        title="Save to Device"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t.saveFile}</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancel button if active */}
      {!isCompleted && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 text-red-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            <span>{t.cancel}</span>
          </button>
        </div>
      )}
    </div>
  );
};
