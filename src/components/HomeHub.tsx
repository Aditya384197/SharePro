import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Clock3, FileCheck2, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';
import type { TransferHistoryItem } from '../types.ts';

interface HomeHubProps {
  lang: Language;
  onStartSend: () => void;
  onStartReceive: () => void;
  onFilesDropped: (files: FileList) => void;
  history: TransferHistoryItem[];
  onClearHistory: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  lang,
  onStartSend,
  onStartReceive,
  onFilesDropped,
  history,
  onClearHistory,
}) => {
  const t = translations[lang];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) onFilesDropped(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-5 sm:pt-8" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <section className="relative overflow-hidden rounded-[30px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 p-5 shadow-2xl sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-16 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative grid gap-6 md:grid-cols-[1.1fr_.9fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.55)]" />
              Direct device transfer
            </div>

            <h1 className="max-w-xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              {lang === 'hi' ? 'फाइल भेजें।' : 'Send files.'}
              <br />
              <span className="text-slate-400">{lang === 'hi' ? 'सीधे दूसरे डिवाइस पर।' : 'Directly to another device.'}</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              {lang === 'hi'
                ? 'फोटो, वीडियो, दस्तावेज़ और बड़ी फाइलें चुनें। कनेक्शन बनते ही डेटा सीधे डिवाइसों के बीच ट्रांसफर होता है।'
                : 'Choose photos, videos, documents, or large files. Once paired, the binary data moves directly between devices.'}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"><Zap className="h-3.5 w-3.5 text-amber-300" />High throughput</span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />Encrypted P2P</span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"><FileCheck2 className="h-3.5 w-3.5 text-blue-300" />Size checked</span>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              onClick={onStartSend}
              className="group flex min-h-28 items-center justify-between rounded-3xl border border-blue-500/25 bg-blue-600/10 px-5 py-4 text-left transition hover:border-blue-400/50 hover:bg-blue-600/15 active:scale-[.99]"
            >
              <span>
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/40">
                  <ArrowUpFromLine className="h-5 w-5" />
                </span>
                <span className="block text-lg font-bold text-white">{t.send}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t.sendDesc}</span>
              </span>
              <span className="text-2xl text-blue-300 transition group-hover:translate-x-1">›</span>
            </button>

            <button
              onClick={onStartReceive}
              className="group flex min-h-28 items-center justify-between rounded-3xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/15 active:scale-[.99]"
            >
              <span>
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/40">
                  <ArrowDownToLine className="h-5 w-5" />
                </span>
                <span className="block text-lg font-bold text-white">{t.receive}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t.receiveDesc}</span>
              </span>
              <span className="text-2xl text-emerald-300 transition group-hover:translate-x-1">›</span>
            </button>
          </div>
        </div>

        <div className="relative mt-5 rounded-2xl border border-slate-800 bg-slate-950/45 p-3 text-center text-[11px] text-slate-500">
          {lang === 'hi'
            ? 'डेस्कटॉप पर फाइलें इस कार्ड पर ड्रैग-एंड-ड्रॉप भी कर सकते हैं।'
            : 'On desktop, you can also drag files anywhere onto this screen.'}
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
          <HardDrive className="h-4 w-4 text-slate-400" />
          <p className="mt-3 text-xs font-semibold text-slate-200">{lang === 'hi' ? 'कोई डमी फाइल नहीं' : 'No demo files'}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{t.realUseNotice}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
          <Zap className="h-4 w-4 text-amber-300" />
          <p className="mt-3 text-xs font-semibold text-slate-200">{lang === 'hi' ? 'सीधा डेटा चैनल' : 'Direct data channel'}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{lang === 'hi' ? 'फाइल डेटा सिग्नलिंग सर्वर के रास्ते नहीं भेजा जाता।' : 'File bytes do not travel through the signaling server.'}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
          <Clock3 className="h-4 w-4 text-blue-300" />
          <p className="mt-3 text-xs font-semibold text-slate-200">{lang === 'hi' ? 'हाल का इतिहास' : 'Recent history'}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            {history.length ? `${history.length} ${history.length === 1 ? 'transfer' : 'transfers'}` : t.noHistory}
          </p>
        </div>
      </section>

      {history.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">{t.history}</h2>
              <p className="text-[11px] text-slate-500">{lang === 'hi' ? 'हाल के ट्रांसफर' : 'Recent transfers'}</p>
            </div>
            <button onClick={onClearHistory} className="text-[11px] font-semibold text-slate-500 hover:text-red-300">
              {t.clearAll}
            </button>
          </div>

          <div className="space-y-2">
            {history.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">
                    {item.files.length} {t.filesSelected} · {item.peerName}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {formatSize(item.totalSize)}
                  </p>
                </div>
                <span className={`ml-3 shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                  item.direction === 'sent'
                    ? 'bg-blue-500/10 text-blue-300'
                    : 'bg-emerald-500/10 text-emerald-300'
                }`}>
                  {item.direction === 'sent' ? 'Sent' : 'Received'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
