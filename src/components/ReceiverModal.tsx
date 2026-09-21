import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Radio, Loader2 } from 'lucide-react';
import { sounds } from '../utils/audio';

interface ReceiverModalProps {
  deviceName: string;
  onClose: () => void;
  onPeerConnected: (roomId: string, pin: string, senderInfo?: { id: string; name: string }) => void;
}

export const ReceiverModal: React.FC<ReceiverModalProps> = ({
  deviceName,
  onClose,
  onPeerConnected,
}) => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [pin, setPin] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const initRoom = async () => {
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deviceName,
            avatar: 'phone',
            deviceType: typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Computer',
          }),
        });
        const data = await res.json();
        if (isCancelled) return;

        if (data.success && data.room) {
          const newRoomId = data.room.id;
          const newPin = data.room.pin;
          setRoomId(newRoomId);
          setPin(newPin);

          const qrPayload = JSON.stringify({
            app: 'sharepro',
            roomId: newRoomId,
            pin: newPin,
            url: `${window.location.origin}/?join=${newPin}`,
          });

          const dataUrl = await QRCode.toDataURL(qrPayload, {
            width: 260,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#020617',
              light: '#ffffff',
            },
          });

          if (!isCancelled) {
            setQrCodeUrl(dataUrl);
            setIsInitializing(false);
          }

          const sse = new EventSource(
            `/api/events/${newRoomId}?peerId=receiver_${Date.now()}&role=receiver&name=${encodeURIComponent(deviceName)}`
          );
          sseRef.current = sse;

          sse.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data);
              if (payload.type === 'peer-joined' && payload.role === 'sender') {
                sounds.playPairSuccess();
                onPeerConnected(newRoomId, newPin, { id: payload.peerId, name: payload.name });
              }
            } catch {}
          };
        }
      } catch (err) {
        if (!isCancelled) {
          setIsInitializing(false);
        }
      }
    };

    initRoom();

    return () => {
      isCancelled = true;
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [deviceName, onPeerConnected]);

  const copyRoomPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight truncate">
                Receive • {deviceName}
              </h3>
              <p className="text-[11px] text-emerald-400 font-medium">
                Ready to Receive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col items-center text-center space-y-4">
          <div className="relative p-2.5 rounded-2xl bg-white shadow-xl border-4 border-emerald-500/30 max-w-full">
            {isInitializing || !qrCodeUrl ? (
              <div className="w-44 h-44 sm:w-52 sm:h-52 flex flex-col items-center justify-center gap-2.5 bg-slate-100 rounded-xl">
                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                <span className="text-xs font-semibold text-slate-600">
                  Generating QR Code...
                </span>
              </div>
            ) : (
              <img
                src={qrCodeUrl}
                alt="Receiver QR Code"
                className="w-44 h-44 sm:w-52 sm:h-52 object-contain rounded-xl block mx-auto"
              />
            )}
          </div>

          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Direct PIN
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400 tracking-widest">
                {pin || '------'}
              </span>
            </div>

            <button
              onClick={copyRoomPin}
              disabled={!pin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
