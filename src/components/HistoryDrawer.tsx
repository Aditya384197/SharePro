import React from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Download, Trash2, Clock } from 'lucide-react';
import { TransferRecord } from '../types';
import { formatBytes } from '../utils/demoData';

interface HistoryDrawerProps {
  history: TransferRecord[];
  onClose: () => void;
  onClearHistory: () => void;
  onDownloadItem: (item: TransferRecord) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onClose,
  onClearHistory,
  onDownloadItem,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-sm sm:max-w-md h-full shadow-2xl flex flex-col">
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Transfer History</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">
              {history.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                aria-label="Clear History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-24 text-slate-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No transfers yet</p>
            </div>
          ) : (
            history.map((record) => {
              const isSent = record.direction === 'sent';
              return (
                <div
                  key={record.id}
                  className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-all flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSent
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isSent ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate max-w-[170px] sm:max-w-[220px]">
                        {record.fileName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span>{formatBytes(record.fileSize)}</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-mono">
                          {record.speedMbps > 0 ? `${record.speedMbps.toFixed(0)} Mbps` : 'Direct'}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(record.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {record.downloadUrl && (
                    <button
                      onClick={() => onDownloadItem(record)}
                      className="p-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors shrink-0"
                      aria-label="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
