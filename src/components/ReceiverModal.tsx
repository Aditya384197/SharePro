import React, { useEffect, useState } from 'react';
import { X, QrCode, Copy, Check, Radio, FileText, ArrowDown, Shield, Smartphone, ArrowLeft, Home } from 'lucide-react';
import QRCode from 'qrcode';
import type { FileMeta } from '../types.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface ReceiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  incomingSender: {
    senderName: string;
    senderType: string;
    filesMeta: FileMeta[];
  } | null;
  onAcceptTransfer: () => void;
  onRejectTransfer: () => void;
  lang: Language;
}

export const ReceiverModal: React.FC<ReceiverModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  incomingSender,
  onAcceptTransfer,
  onRejectTransfer,
  lang,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    if (isOpen && roomCode) {
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      QRCode.toDataURL(shareUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('QR code generation error:', err));
    }
  }, [isOpen, roomCode]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const totalIncomingSize = incomingSender
    ? incomingSender.filesMeta.reduce((acc, f) => acc + f.size, 0)
    : 0;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-200">
        {/* Header with Prominent Back Button */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <button
              id="receiver-header-back-btn"
              onClick={onClose}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all active:scale-95 group cursor-pointer shadow-sm"
              title={t.backToHome}
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform" />
              <span>{t.back}</span>
            </button>
            <div className="flex items-center space-x-2 ml-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-bold text-white text-base">
                {t.receive}
              </h3>
            </div>
          </div>
          <button
            id="receiver-close-btn"
            onClick={onClose}
            className="flex items-center space-x-1 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t.exit}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {incomingSender ? (
            /* Incoming Transfer Acceptance Card */
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <ArrowDown className="w-8 h-8 animate-bounce" />
                </div>
                <h4 className="font-bold text-xl text-white">
                  {t.incomingRequest}
                </h4>
                <p className="text-sm text-slate-300">
                  <strong className="text-emerald-400 font-semibold">{incomingSender.senderName}</strong> {t.wantsToSend}:
                </p>
              </div>

              {/* Files summary */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                <div className="flex justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
                  <span>{incomingSender.filesMeta.length} files</span>
                  <span className="font-semibold text-slate-200">{formatFileSize(totalIncomingSize)}</span>
                </div>
                {incomingSender.filesMeta.map((file) => (
                  <div key={file.id} className="flex items-center justify-between py-1 text-xs">
                    <span className="truncate text-slate-300 max-w-[200px] sm:max-w-xs">{file.name}</span>
                    <span className="text-slate-500">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>

              {/* Accept / Decline actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  id="reject-transfer-btn"
                  onClick={onRejectTransfer}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  {t.decline}
                </button>
                <button
                  id="accept-transfer-btn"
                  onClick={onAcceptTransfer}
                  className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  {t.accept}
                </button>
              </div>
            </div>
          ) : (
            /* Waiting for Sender view */
            <div className="space-y-6 text-center">
              {/* Radar pulse */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-emerald-500/20 animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">
                  {t.receiverWaiting}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {t.shareLinkOrQr}
                </p>
              </div>

              {/* 6-Digit PIN Display */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500">
                  {t.receiverRoomCode}
                </span>
                <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-emerald-400 select-all">
                  {roomCode}
                </div>
              </div>

              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-2xl inline-block shadow-xl mx-auto">
                    <img
                      src={qrCodeDataUrl}
                      alt="Transfer QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copied ? t.linkCopied : t.copyLink}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Back to Home Button */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
          <button
            id="receiver-footer-back-btn"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.backToHome}</span>
          </button>
          <span className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>P2P Direct Encryption</span>
          </span>
        </div>
      </div>
    </div>
  );
};
