import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, ArrowDown, Copy, Check, Radio, Shield, Download, Smartphone, Laptop, Sparkles, RefreshCw } from 'lucide-react';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';
import type { FileMeta } from '../types.ts';

interface ReceiveViewProps {
  roomCode: string;
  shareUrl?: string;
  incomingSender: {
    senderName: string;
    senderType: string;
    filesMeta: FileMeta[];
  } | null;
  onAcceptTransfer: () => void;
  onRejectTransfer: () => void;
  onBackToHome: () => void;
  onRegeneratePin?: () => void;
  lang: Language;
}

export const ReceiveView: React.FC<ReceiveViewProps> = ({
  roomCode,
  shareUrl,
  incomingSender,
  onAcceptTransfer,
  onRejectTransfer,
  onBackToHome,
  onRegeneratePin,
  lang,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const t = translations[lang];

  const effectiveShareUrl = shareUrl || `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  useEffect(() => {
    if (roomCode) {
      QRCode.toDataURL(effectiveShareUrl, {
        width: 280,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [roomCode, effectiveShareUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(effectiveShareUrl);
    } catch {
      // Clipboard may be unavailable on older WebViews.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `SharePro-Receiver-QR-${roomCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalIncomingSize = incomingSender
    ? incomingSender.filesMeta.reduce((acc, f) => acc + f.size, 0)
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header with Prominent Back Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          id="receive-back-btn"
          onClick={onBackToHome}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold shadow-sm transition-all active:scale-95 group cursor-pointer"
          title={t.backToHome}
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
          <span>{t.backToHome}</span>
        </button>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{lang === 'hi' ? 'रिसीव मोड सक्रिय' : 'Receive Mode Active'}</span>
        </div>
      </div>

      {/* Main Content Area */}
      {incomingSender ? (
        /* Incoming Transfer Acceptance Card */
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/70 to-slate-900 border border-emerald-600/50 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <ArrowDown className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="font-bold text-xl text-white">
              {t.incomingRequest}
            </h3>
            <p className="text-sm text-slate-300">
              <strong className="text-emerald-400 font-semibold">{incomingSender.senderName}</strong> {t.wantsToSend}:
            </p>
          </div>

          {/* Incoming Files List */}
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800/80 p-3 max-h-48 overflow-y-auto space-y-2">
            {incomingSender.filesMeta.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/50 text-xs"
              >
                <div className="truncate mr-2">
                  <p className="font-medium text-white truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-400">{file.type || 'File'}</p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 whitespace-nowrap">
                  {formatFileSize(file.size)}
                </span>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="flex items-center justify-between text-xs px-2 text-slate-400 border-t border-slate-800/80 pt-2">
            <span>{incomingSender.filesMeta.length} {t.filesSelected}</span>
            <span className="font-semibold text-white">
              {t.totalSize}: {formatFileSize(totalIncomingSize)}
            </span>
          </div>

          {/* Accept / Decline Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              id="decline-incoming-transfer-btn"
              onClick={onRejectTransfer}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              {t.decline}
            </button>
            <button
              id="accept-incoming-transfer-btn"
              onClick={onAcceptTransfer}
              className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              {t.accept}
            </button>
          </div>
        </div>
      ) : (
        /* Waiting For Sender Display (PIN + QR Code + Wi-Fi Radar) */
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-center">
          {/* Radar Scanner Animation */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-emerald-500/20 animate-pulse" />
            <div className="w-14 h-14 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shadow-inner relative z-10">
              <Radio className="w-7 h-7 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

          <div>
            <h3 className="font-bold text-xl text-white">
              {t.receiverWaiting}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {t.shareLinkOrQr}
            </p>
          </div>

          {/* 6-Digit Transfer PIN */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-xs mx-auto space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider">
              <span>{t.receiverRoomCode}</span>
              {onRegeneratePin && (
                <button
                  onClick={onRegeneratePin}
                  className="hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
                  title="New PIN"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>नया पिन</span>
                </button>
              )}
            </div>
            <div className="text-3xl font-mono font-black tracking-widest text-emerald-400 py-1 select-all bg-emerald-950/20 rounded-xl border border-emerald-800/30">
              {roomCode}
            </div>
          </div>

          {/* High Contrast QR Code */}
          {qrCodeDataUrl && (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-white rounded-2xl inline-block shadow-2xl shadow-emerald-950/30">
                <img
                  src={qrCodeDataUrl}
                  alt="Transfer QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>

              <p className="text-[11px] text-slate-500 break-all max-w-xl mx-auto">
                {effectiveShareUrl}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  id="receive-copy-link-btn"
                  onClick={handleCopyLink}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  <span>{copied ? t.linkCopied : t.copyLink}</span>
                </button>

                <button
                  id="receive-download-qr-btn"
                  onClick={handleDownloadQR}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'hi' ? 'QR कोड सेव करें' : 'Save QR'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Back Button */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={onBackToHome}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'hi' ? 'मुख्य पेज पर वापस जाएं' : 'Back to Main Screen'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
