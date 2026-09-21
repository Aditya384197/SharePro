import React, { useState } from 'react';
import { Zap, History, Smartphone, Check, FolderArchive, Wifi } from 'lucide-react';

interface NavbarProps {
  deviceName: string;
  onDeviceNameChange: (name: string) => void;
  historyCount: number;
  onOpenHistory: () => void;
  onOpenSourceModal: () => void;
  onOpenWifiStatus?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  deviceName,
  onDeviceNameChange,
  historyCount,
  onOpenHistory,
  onOpenSourceModal,
  onOpenWifiStatus,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(deviceName);

  const handleNameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (tempName.trim()) {
      onDeviceNameChange(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white w-full">
      <div className="max-w-xl mx-auto px-3.5 sm:px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base font-black tracking-tight text-white">
              SharePro
            </span>
            <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              P2P
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenWifiStatus && (
            <button
              onClick={onOpenWifiStatus}
              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-emerald-400 transition-colors"
              title="Wi-Fi P2P Status"
              aria-label="Wi-Fi Status"
            >
              <Wifi className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenSourceModal}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs text-blue-300 transition-colors"
            title="Download Source ZIP & APK Build"
            aria-label="Download Source Code ZIP"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span className="hidden xs:inline font-bold">ZIP</span>
          </button>

          {isEditingName ? (
            <form onSubmit={handleNameSubmit} className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => handleNameSubmit()}
                autoFocus
                className="bg-slate-800 text-white text-xs px-2 py-1 rounded-lg border border-blue-500 outline-none w-20 sm:w-32"
                maxLength={18}
              />
              <button
                type="submit"
                className="p-1 rounded-lg bg-blue-600 text-white"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setTempName(deviceName);
                setIsEditingName(true);
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition-colors"
            >
              <Smartphone className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="max-w-[70px] sm:max-w-[110px] truncate font-medium">
                {deviceName}
              </span>
            </button>
          )}

          <button
            onClick={onOpenHistory}
            className="relative p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-colors"
            aria-label="Transfer History"
          >
            <History className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                {historyCount > 9 ? '9+' : historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
