import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  Radio,
  KeyRound,
  Smartphone,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DiscoveredPeer, FileItem } from '../types';
import { sounds } from '../utils/audio';

interface SenderScannerModalProps {
  selectedFiles: FileItem[];
  deviceName: string;
  onClose: () => void;
  onConnectToRoom: (roomId: string, pin: string) => void;
}

export const SenderScannerModal: React.FC<SenderScannerModalProps> = ({
  selectedFiles,
  deviceName,
  onClose,
  onConnectToRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'radar' | 'pin'>('scan');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [discoveredPeers, setDiscoveredPeers] = useState<DiscoveredPeer[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScanningQrRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'scan') {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        isScanningQrRef.current = true;
        scanQrFrame();
      }
    } catch {
      setCameraError('Camera unavailable');
      setActiveTab('radar');
    }
  };

  const stopCamera = () => {
    isScanningQrRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const scanQrFrame = () => {
    if (!isScanningQrRef.current) return;

    const video = videoRef.current;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          try {
            let targetRoomId = '';
            let targetPin = '';

            if (code.data.includes('join=')) {
              const url = new URL(code.data);
              targetPin = url.searchParams.get('join') || '';
              targetRoomId = targetPin;
            } else if (code.data.startsWith('{')) {
              const parsed = JSON.parse(code.data);
              targetRoomId = parsed.roomId;
              targetPin = parsed.pin || parsed.roomId;
            } else if (/^\d{6}$/.test(code.data.trim())) {
              targetPin = code.data.trim();
              targetRoomId = targetPin;
            }

            if (targetRoomId) {
              sounds.playPairSuccess();
              stopCamera();
              onConnectToRoom(targetRoomId, targetPin);
              return;
            }
          } catch {}
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanQrFrame);
  };

  useEffect(() => {
    let timer: number;

    const fetchPeers = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms)) {
          setDiscoveredPeers(data.rooms);
        }
      } catch {}
    };

    fetchPeers();
    timer = window.setInterval(fetchPeers, 3000);

    return () => clearInterval(timer);
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setPinError('Enter a valid 6-digit PIN');
      return;
    }

    setPinError(null);
    setIsSubmittingPin(true);
    try {
      const res = await fetch(`/api/rooms/${cleanPin}`);
      const data = await res.json();
      if (data.success) {
        sounds.playPairSuccess();
        onConnectToRoom(cleanPin, cleanPin);
      } else {
        setPinError('Room not found or expired');
      }
    } catch {
      setPinError('Connection failed');
    } finally {
      setIsSubmittingPin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm sm:max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90dvh]">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                Connect to Receiver
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0 font-bold">
                {selectedFiles.length} files
              </span>
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

        <div className="p-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'scan'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>

          <button
            onClick={() => setActiveTab('radar')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'radar'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('pin')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pin'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[260px]">
          {activeTab === 'scan' && (
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden bg-black border-2 border-blue-500/50 shadow-xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-6 border-2 border-cyan-400 rounded-xl pointer-events-none shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-bounce" />
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-3 text-center">
                    <AlertCircle className="w-7 h-7 text-amber-400 mb-1.5" />
                    <p className="text-xs text-slate-300 mb-2">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('radar')}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                    >
                      Use Radar
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs font-semibold text-slate-300 text-center">
                Align QR Code within Frame
              </p>
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-full border border-emerald-500/30 bg-slate-950/80 flex items-center justify-center overflow-hidden shadow-inner">
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(16,185,129,0.3)_360deg)] animate-spin [animation-duration:3s]" />
                <div className="absolute w-36 h-36 rounded-full border border-emerald-500/20" />
                <div className="absolute w-24 h-24 rounded-full border border-emerald-500/20" />

                <div className="relative z-10 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white/40">
                  <Smartphone className="w-4 h-4" />
                </div>

                {discoveredPeers.map((peer, idx) => {
                  const angle = (idx * (360 / Math.max(1, discoveredPeers.length))) * (Math.PI / 180);
                  const radius = 62;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <button
                      key={peer.id}
                      onClick={() => {
                        sounds.playPairSuccess();
                        onConnectToRoom(peer.id, peer.pin);
                      }}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className="absolute z-20 flex flex-col items-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white animate-pulse">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[9px] font-bold text-white bg-slate-900/90 px-1 py-0.5 rounded border border-emerald-500/40 mt-0.5 whitespace-nowrap shadow max-w-[70px] truncate">
                        {peer.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="w-full space-y-1.5 pt-1">
                {discoveredPeers.length > 0 ? (
                  discoveredPeers.map((peer) => (
                    <button
                      key={peer.id}
                      onClick={() => {
                        sounds.playPairSuccess();
                        onConnectToRoom(peer.id, peer.pin);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/30 text-left transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Smartphone className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{peer.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">PIN: {peer.pin}</span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-lg bg-emerald-600 text-white font-semibold shrink-0">
                        Connect
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Searching for nearby devices...
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pin' && (
            <form onSubmit={handlePinSubmit} className="w-full flex flex-col items-center space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <KeyRound className="w-5 h-5" />
              </div>

              <div className="w-full max-w-xs space-y-1.5">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  autoFocus
                  className="w-full text-center tracking-[0.4em] text-2xl sm:text-3xl font-mono font-black py-2.5 px-3 rounded-2xl bg-slate-950 border border-indigo-500/50 text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                {pinError && (
                  <p className="text-xs text-red-400 text-center font-medium">{pinError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={pinInput.length !== 6 || isSubmittingPin}
                className={`w-full max-w-xs py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  pinInput.length === 6 && !isSubmittingPin
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSubmittingPin ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  'Connect'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
