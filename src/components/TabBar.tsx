import React from 'react';
import { Clock3, Download, Home, Send, Settings, Zap } from 'lucide-react';
import type { Language } from '../utils/i18n.ts';

export type ActiveTab = 'home' | 'send' | 'receive' | 'transfer' | 'history' | 'settings';

interface TabBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  lang: Language;
  isTransferring: boolean;
  historyCount: number;
  selectedFilesCount: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onSelectTab,
  lang,
  isTransferring,
  historyCount,
  selectedFilesCount,
}) => {
  const tabs = [
    { id: 'home' as const, labelHi: 'होम', labelEn: 'Home', icon: Home },
    { id: 'send' as const, labelHi: 'भेजें', labelEn: 'Send', icon: Send },
    { id: 'receive' as const, labelHi: 'प्राप्त', labelEn: 'Receive', icon: Download },
    ...(isTransferring || activeTab === 'transfer'
      ? [{ id: 'transfer' as const, labelHi: 'ट्रांसफर', labelEn: 'Transfer', icon: Zap }]
      : []),
    { id: 'history' as const, labelHi: 'इतिहास', labelEn: 'History', icon: Clock3 },
    { id: 'settings' as const, labelHi: 'सेटिंग', labelEn: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/90 bg-slate-950/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-stretch justify-between gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const label = lang === 'hi' ? tab.labelHi : tab.labelEn;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${
                active ? 'text-blue-300' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`relative flex h-7 w-8 items-center justify-center rounded-xl ${
                active ? 'bg-blue-600/20 text-blue-300' : ''
              }`}>
                <Icon className={`h-4 w-4 ${tab.id === 'transfer' && isTransferring ? 'animate-pulse text-emerald-400' : ''}`} />
                {tab.id === 'send' && selectedFilesCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-bold text-white">
                    {selectedFilesCount}
                  </span>
                )}
                {tab.id === 'history' && historyCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-700 px-1 text-[8px] font-bold text-white">
                    {historyCount > 99 ? '99+' : historyCount}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
