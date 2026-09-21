import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ExternalLink,
  Share2,
  RotateCw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { formatBytes } from '../utils/demoData';

interface FilePreviewModalProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  blobUrl: string;
  blob?: Blob;
  onClose: () => void;
  onDownload: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  fileName,
  fileSize,
  fileType,
  blobUrl,
  blob,
  onClose,
  onDownload,
}) => {
  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const isVideo = fileType.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm)$/i.test(fileName);
  const isAudio = fileType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName);
  const isApp = fileName.endsWith('.apk') || fileType.includes('android.package-archive');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (shareFeedback) {
      const timer = setTimeout(() => setShareFeedback(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [shareFeedback]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleOpenInExternalPlayer = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        let fileToShare: File | null = null;
        if (blob) {
          fileToShare = new File([blob], fileName, { type: fileType || 'application/octet-stream' });
        } else {
          const res = await fetch(blobUrl);
          const b = await res.blob();
          fileToShare = new File([b], fileName, { type: fileType || 'application/octet-stream' });
        }

        if (navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
          await navigator.share({
            title: fileName,
            files: [fileToShare],
          });
          setShareFeedback('Opened in system chooser!');
          return;
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
    }

    const newTab = window.open(blobUrl, '_blank');
    if (!newTab) {
      onDownload();
      setShareFeedback('Downloading file to open with external player');
    } else {
      setShareFeedback('Opening in dedicated external tab');
    }
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'video' | 'audio') => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (mediaType === 'video' && videoRef.current) {
      videoRef.current.currentTime = time;
    } else if (mediaType === 'audio' && audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm sm:max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90dvh]">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate">
              {fileName}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {formatBytes(fileSize)} • {isVideo ? 'Video Media' : isAudio ? 'Audio Media' : isImage ? 'Image' : isApp ? 'Android App (APK)' : 'Document'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(isVideo || isAudio) && (
              <button
                onClick={handleOpenInExternalPlayer}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow active:scale-95"
                title={isVideo ? 'Open in VLC / MX Player' : 'Open in Music Player App'}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Open in App</span>
              </button>
            )}

            <button
              onClick={onDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {shareFeedback && (
          <div className="bg-indigo-950/80 border-b border-indigo-800/60 px-4 py-1.5 text-center text-xs text-indigo-200 font-medium">
            {shareFeedback}
          </div>
        )}

        <div className="flex-1 overflow-auto p-3 flex flex-col items-center justify-center bg-black/40 min-h-[220px]">
          {isVideo ? (
            <div className="w-full space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[50vh] shadow-xl border border-slate-800">
                <video
                  ref={videoRef}
                  src={blobUrl}
                  playsInline
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTime(videoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration);
                    }
                  }}
                  onEnded={() => setIsPlaying(false)}
                  className="max-h-[50vh] max-w-full object-contain"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-850 bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => handleSeek(e, 'video')}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleVideoPlay}
                      className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow transition-all active:scale-95"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (videoRef.current?.requestFullscreen) {
                          videoRef.current.requestFullscreen();
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                      title="Fullscreen"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleOpenInExternalPlayer}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>VLC / MX Player</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : isAudio ? (
            <div className="w-full p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Music className="w-9 h-9" />
                {isPlaying && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-white truncate px-2">{fileName}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1 h-6">
                {[40, 70, 90, 30, 80, 100, 60, 40, 85, 50, 75, 30].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: isPlaying ? `${Math.max(15, (h * (Math.sin(currentTime * 5 + i) + 1.2)) / 2.2)}%` : '20%' }}
                    className="w-1 bg-gradient-to-t from-amber-500 to-orange-400 rounded-full transition-all duration-150"
                  />
                ))}
              </div>

              <audio
                ref={audioRef}
                src={blobUrl}
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    setCurrentTime(audioRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    setDuration(audioRef.current.duration);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
              />

              <div className="space-y-3 pt-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => handleSeek(e, 'audio')}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={toggleAudioPlay}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 transition-all active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                  </button>

                  <button
                    onClick={handleOpenInExternalPlayer}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open in Music Player</span>
                  </button>
                </div>
              </div>
            </div>
          ) : isImage ? (
            <div className="w-full space-y-3 flex flex-col items-center">
              <div className="overflow-hidden rounded-2xl max-h-[50vh] flex items-center justify-center bg-black/60 p-2 border border-slate-800">
                <img
                  src={blobUrl}
                  alt={fileName}
                  style={{ transform: `rotate(${rotation}deg)` }}
                  className="max-h-[45vh] max-w-full object-contain rounded-xl shadow-md transition-transform duration-300"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate</span>
                </button>
                <button
                  onClick={handleOpenInExternalPlayer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Gallery App</span>
                </button>
              </div>
            </div>
          ) : isApp ? (
            <div className="text-center p-6 space-y-3 max-w-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center border border-blue-500/30">
                <Layers className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">{fileName}</h4>
              <p className="text-xs text-slate-400">
                Android Application Package. Save to device and tap to install.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={onDownload}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install / Save APK</span>
                </button>
                <button
                  onClick={handleOpenInExternalPlayer}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Package Installer</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 space-y-3 max-w-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center border border-slate-700">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">{fileName}</h4>
              <p className="text-xs text-slate-400">
                Tap Save to download to your device storage or open in an external reader.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={onDownload}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save to Device Storage</span>
                </button>
                <button
                  onClick={handleOpenInExternalPlayer}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open in External Reader</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
