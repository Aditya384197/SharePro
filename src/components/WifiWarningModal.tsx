import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Radio,
} from 'lucide-react';

interface WifiWarningModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onWifiRestored?: () => void;
}

export const WifiWarningModal: React.FC<WifiWarningModalProps> = ({
  isOpen,
  onClose,
  onWifiRestored,
}) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (onWifiRestored) onWifiRestored();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onWifiRestored]);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
        if (onWifiRestored) onWifiRestored();
      }
    } catch {
      setIsOnline(false);
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-md rounded-3xl shadow-2xl p-5 text-center space-y-4 my-auto">
        <div className="relative w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/40">
          {isOnline ? (
            <Wifi className="w-8 h-8 text-emerald-400 animate-pulse" />
          ) : (
            <WifiOff className="w-8 h-8 text-amber-400 animate-bounce" />
          )}
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-bold border border-amber-500/20 mb-2">
            <AlertTriangle className="w-3 h-3" />
            <span>High-Speed Wi-Fi Required</span>
          </div>

          <h3 className="text-lg font-black text-white">
            {isOnline ? 'Wi-Fi Connection Restored!' : 'Wi-Fi is Turned Off'}
          </h3>
          <p className="text-xs text-amber-200/90 font-medium mt-1">
            हाई स्पीड फाइल भेजने के लिए कृपया वाई-फ़ाई चालू करें
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Why Wi-Fi instead of Bluetooth?</span>
              <span className="text-[11px] text-slate-400">
                Bluetooth max speed is only 1-2 Mbps. SharePro transfers over Local Wi-Fi Direct / Hotspot at <strong>40 to 100+ MB/s</strong> with zero internet data cost.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 border-t border-slate-700/40">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400">
              Please turn <strong>ON</strong> your Wi-Fi or Mobile Hotspot. Transfer will automatically start or resume instantly once turned on.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Dismiss
            </button>
          )}

          <button
            onClick={checkConnection}
            disabled={checking}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-98"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Connection...' : 'Check / Reconnect Wi-Fi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
