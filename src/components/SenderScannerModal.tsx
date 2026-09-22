import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import {
  X,
  Send,
  Radio,
  Smartphone,
  Laptop,
  ArrowLeft,
  RefreshCw,
  KeyRound,
  Camera,
} from 'lucide-react';
import type { TransferFile, ActiveRoom } from '../types.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface SenderScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToFileSelect: () => void;
  files: TransferFile[];
  activeRooms: ActiveRoom[];
  onRefreshRooms: () => void;
  onConnectToTarget: (value: string) => void;
  lang: Language;
}

export const SenderScannerModal: React.FC<SenderScannerModalProps> = ({
  isOpen,
  onClose,
  onBackToFileSelect,
  files,
  activeRooms,
  onRefreshRooms,
  onConnectToTarget,
  lang,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [scanError, setScanError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const t = translations[lang];

  useEffect(() => {
    if (!isOpen) return;
    onRefreshRooms();
    const interval = setInterval(onRefreshRooms, 2000);
    return () => clearInterval(interval);
  }, [isOpen, onRefreshRooms]);

  useEffect(() => {
    if (!isScanningCamera) return;

    let cancelled = false;
    setScanError('');
    const reader = new BrowserQRCodeReader();

    void reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error, controls) => {
          controlsRef.current = controls;
          if (cancelled || !result) return;

          const value = result.getText()?.trim();
          if (!value) return;

          cancelled = true;
          controls.stop();
          controlsRef.current = null;
          setIsScanningCamera(false);
          onConnectToTarget(value);
        }
      )
      .catch(() => {
        if (!cancelled) {
          setScanError(
            lang === 'hi'
              ? 'कैमरा या QR स्कैन उपलब्ध नहीं है। पिन/लिंक से कनेक्ट करें।'
              : 'Camera or QR scanning is unavailable. Use the PIN/link instead.'
          );
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [isScanningCamera, lang, onConnectToTarget]);

  if (!isOpen) return null;

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  };

  const targetValue = pinInput.trim();
  const canSubmit = /^\d{6}$/.test(targetValue) || /^(sharepro:\/\/|https?:\/\/)/i.test(targetValue);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (canSubmit) onConnectToTarget(targetValue);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/75 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToFileSelect}
              className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-200"
              aria-label={t.back}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h3 className="font-bold text-white">{t.connectAndSend}</h3>
              <p className="text-xs text-slate-400">
                {files.length} {t.filesSelected} · {formatFileSize(totalSize)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={t.exit}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          {isScanningCamera ? (
            <div className="space-y-4">
              <div className="relative mx-auto aspect-square max-w-sm overflow-hidden rounded-3xl border border-blue-500/50 bg-black shadow-xl">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-10 rounded-3xl border-2 border-dashed border-emerald-400/80" />
                <div className="absolute left-1/2 top-1/2 h-0.5 w-[68%] -translate-x-1/2 bg-emerald-400/70" />
              </div>
              {scanError && <p className="text-center text-xs text-amber-300">{scanError}</p>}
              <button
                onClick={() => setIsScanningCamera(false)}
                className="w-full rounded-2xl bg-slate-800 py-3 text-sm font-semibold text-slate-200"
              >
                {lang === 'hi' ? 'स्कैन बंद करें' : 'Close Scanner'}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white">
                      {lang === 'hi' ? 'नजदीकी डिवाइस' : 'Nearby devices'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {lang === 'hi' ? 'उसी Wi-Fi नेटवर्क पर रिसीवर खोजें' : 'Receivers on the same Wi-Fi network'}
                    </p>
                  </div>
                  <button
                    onClick={onRefreshRooms}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300"
                    aria-label="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {activeRooms.length > 0 ? (
                  <div className="space-y-2">
                    {activeRooms.map((room) => (
                      <button
                        key={`${room.room}-${room.address || ''}`}
                        onClick={() => onConnectToTarget(room.address ? `${room.address}?room=${encodeURIComponent(room.room)}&token=${encodeURIComponent(room.token || '')}&name=${encodeURIComponent(room.deviceName)}` : room.room)}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition hover:border-emerald-500/50"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                            {room.deviceType === 'desktop' ? <Laptop className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-white">{room.deviceName}</span>
                            <span className="block text-xs text-slate-500">PIN · {room.room}</span>
                          </span>
                        </span>
                        <Send className="h-4 w-4 text-emerald-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 px-5 py-8 text-center">
                    <Radio className="mx-auto h-7 w-7 text-slate-600" />
                    <p className="mt-3 text-sm text-slate-300">
                      {lang === 'hi' ? 'रिसीवर खोज रहे हैं…' : 'Looking for receivers…'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">या</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <form onSubmit={submit} className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <KeyRound className="h-4 w-4 text-blue-400" />
                  {lang === 'hi' ? 'पिन या QR लिंक' : 'PIN or QR link'}
                </label>
                <div className="flex gap-2">
                  <input
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder={lang === 'hi' ? '6-अंकों का पिन' : '6-digit PIN'}
                    className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-center font-mono text-lg tracking-widest text-white outline-none focus:border-blue-500"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {lang === 'hi' ? 'जोड़ें' : 'Connect'}
                  </button>
                </div>
              </form>

              <button
                onClick={() => setIsScanningCamera(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 py-3 text-sm font-semibold text-slate-200"
              >
                <Camera className="h-4 w-4 text-emerald-400" />
                {lang === 'hi' ? 'QR कोड स्कैन करें' : 'Scan QR code'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
