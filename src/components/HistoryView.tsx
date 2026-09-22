import React, { useState } from 'react';
import { Clock, Trash2, Send, Download, HardDrive, ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import type { TransferHistoryItem } from '../types.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface HistoryViewProps {
  history: TransferHistoryItem[];
  onClearHistory: () => void;
  onBackToHome: () => void;
  lang: Language;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onClearHistory,
  onBackToHome,
  lang,
}) => {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const t = translations[lang];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    return item.direction === filter;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header with Prominent Back Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          id="history-back-btn"
          onClick={onBackToHome}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold shadow-sm transition-all active:scale-95 group cursor-pointer"
          title={t.backToHome}
        >
          <ArrowLeft className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform" />
          <span>{t.backToHome}</span>
        </button>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 text-xs font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'इतिहास मिटाएं' : 'Clear History'}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 text-xs">
        {[
          { id: 'all', labelHi: 'सभी ट्रांसफर', labelEn: 'All Transfers' },
          { id: 'sent', labelHi: 'भेजी गई (Sent)', labelEn: 'Sent' },
          { id: 'received', labelHi: 'प्राप्त की गई (Received)', labelEn: 'Received' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'hi' ? tab.labelHi : tab.labelEn}
          </button>
        ))}
      </div>

      {/* History Items */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      item.direction === 'sent'
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {item.direction === 'sent' ? (
                      <Send className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {item.peerName}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-semibold text-emerald-400 block">
                    {formatFileSize(item.totalSize)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {item.files.length} {t.filesSelected}
                  </span>
                </div>
              </div>

              {/* Files summary */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/60 space-y-1">
                {item.files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="truncate mr-2 text-slate-400 flex items-center space-x-1.5">
                      <FileText className="w-3 h-3 text-slate-500" />
                      <span>{file.name}</span>
                    </span>
                    <span className="font-mono text-slate-500 whitespace-nowrap">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-white font-semibold text-base">{t.noHistory}</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {lang === 'hi' ? 'जब आप फाइलें भेजेंगे या प्राप्त करेंगे, तो उनका रिकॉर्ड यहां दिखेगा।' : 'Transfers you send or receive will appear here.'}
          </p>
          <button
            onClick={onBackToHome}
            className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            {t.backToHome}
          </button>
        </div>
      )}
    </div>
  );
};
