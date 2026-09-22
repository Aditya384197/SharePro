import React from 'react';
import { Clock3, Code2, Globe2, Share2, Wifi, WifiOff } from 'lucide-react';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  onOpenHistory: () => void;
  onOpenSourceCode: () => void;
  historyCount: number;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  onOpenHistory,
  onOpenSourceCode,
  historyCount,
  isOnline,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-950/40">
            <Share2 className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-extrabold tracking-tight text-white">{t.appName}</span>
              <span className="hidden rounded-full border border-blue-500/25 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-300 sm:inline">
                P2P
              </span>
            </div>
            <p className="hidden truncate text-[10px] text-slate-500 sm:block">{t.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-[10px] font-medium text-slate-400 md:flex">
            {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
            <span>{isOnline ? 'Network' : 'Local'}</span>
          </div>

          <button
            onClick={onToggleLang}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            title="हिन्दी / English"
            aria-label="Change language"
          >
            <Globe2 className="h-4 w-4" />
          </button>

          <button
            onClick={onOpenHistory}
            className="relative rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            title={t.history}
            aria-label={t.history}
          >
            <Clock3 className="h-4 w-4" />
            {historyCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                {historyCount > 99 ? '99+' : historyCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSourceCode}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:border-indigo-500/40 hover:bg-indigo-950/40 hover:text-white"
            title="Source & APK"
            aria-label="Source & APK"
          >
            <Code2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
