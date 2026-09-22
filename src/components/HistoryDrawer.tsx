import React from 'react';
import { X, Clock, Trash2, Send, Download, HardDrive, ArrowLeft } from 'lucide-react';
import type { TransferHistoryItem } from '../types.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: TransferHistoryItem[];
  onClearHistory: () => void;
  lang: Language;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all active:scale-95 group cursor-pointer shadow-sm mr-1"
                title={t.back}
              >
                <ArrowLeft className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform" />
                <span>{t.back}</span>
              </button>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-white text-base">
                  {t.history}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t.exit}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <HardDrive className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-400">
                  {t.noHistory}
                </p>
                <p className="text-xs text-slate-600">
                  Real transfers you make will be recorded here locally.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            item.direction === 'sent'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {item.direction === 'sent' ? <Send className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {item.peerName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                        {item.direction}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 border-t border-slate-900 pt-2">
                      <div className="flex justify-between font-medium">
                        <span>{item.files.length} files</span>
                        <span className="text-slate-200">{formatFileSize(item.totalSize)}</span>
                      </div>
                      <div className="space-y-0.5 max-h-24 overflow-y-auto">
                        {item.files.map((f, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-500">
                            <span className="truncate max-w-[180px]">{f.name}</span>
                            <span>{formatFileSize(f.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {history.length > 0 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button
                onClick={onClearHistory}
                className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.clearAll}</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                {t.done}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
