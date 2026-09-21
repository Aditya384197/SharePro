import React from 'react';
import {
  Zap,
  Smartphone,
  CheckCircle2,
  Clock,
  Gauge,
  Download,
  Eye,
  Check,
  RotateCcw,
} from 'lucide-react';
import { TransferProgress } from '../types';
import { formatBytes } from '../utils/demoData';

interface TransferViewProps {
  role: 'sender' | 'receiver';
  senderName: string;
  receiverName: string;
  files: TransferProgress[];
  overallPercent: number;
  overallTransferredBytes: number;
  overallTotalBytes: number;
  currentSpeedMbps: number;
  currentSpeedBytesSec: number;
  etaSeconds: number;
  isComplete: boolean;
  onCancel: () => void;
  onFinish: () => void;
  onDownloadFile?: (fileId: string) => void;
  onPreviewFile?: (fileId: string) => void;
}

export const TransferView: React.FC<TransferViewProps> = ({
  role,
  senderName,
  receiverName,
  files,
  overallPercent,
  overallTransferredBytes,
  overallTotalBytes,
  currentSpeedMbps,
  currentSpeedBytesSec,
  etaSeconds,
  isComplete,
  onCancel,
  onFinish,
  onDownloadFile,
  onPreviewFile,
}) => {
  const formatSpeedMBs = (bytesSec: number) => {
    const mbSec = bytesSec / (1024 * 1024);
    return `${mbSec.toFixed(1)} MB/s`;
  };

  const formatEta = (seconds: number) => {
    if (seconds <= 0 || !isFinite(seconds)) return '0s';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between px-1 sm:px-4">
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 border border-white/20">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-[11px] font-bold text-white max-w-[80px] sm:max-w-[100px] truncate text-center">
              {senderName}
            </span>
            <span className="text-[9px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.2 rounded-full border border-blue-500/20">
              Sender
            </span>
          </div>

          <div className="flex-1 px-3 sm:px-5 flex flex-col items-center gap-1 min-w-0">
            <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, overallPercent)}%` }}
              />
              {!isComplete && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.2s_infinite]" />
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400">
              <Zap className="w-3 h-3 animate-bounce" />
              <span>{isComplete ? 'Transfer Complete' : 'P2P Stream'}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 border border-white/20">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-[11px] font-bold text-white max-w-[80px] sm:max-w-[100px] truncate text-center">
              {receiverName}
            </span>
            <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20">
              Receiver
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>Speed</span>
            </div>
            <div className="text-base sm:text-lg font-black text-cyan-400 font-mono">
              {isComplete ? '0 MB/s' : formatSpeedMBs(currentSpeedBytesSec)}
            </div>
            <div className="text-[9px] text-slate-500">
              {isComplete ? 'Done' : `${currentSpeedMbps.toFixed(0)} Mbps`}
            </div>
          </div>

          <div className="space-y-0.5 border-x border-slate-800 px-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Progress
            </div>
            <div className="text-base sm:text-lg font-black text-white font-mono">
              {overallPercent}%
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              {formatBytes(overallTransferredBytes)} / {formatBytes(overallTotalBytes)}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Time Left</span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {isComplete ? '0s' : formatEta(etaSeconds)}
            </div>
            <div className="text-[9px] text-slate-500">
              {isComplete ? 'Finished' : 'Remaining'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Files ({files.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            {isComplete ? 'All Transferred' : 'Transferring'}
          </span>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {files.map((file) => (
            <div
              key={file.fileId}
              className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-[320px]">
                    {file.name}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {formatBytes(file.transferredBytes)} / {formatBytes(file.size)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {file.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Done</span>
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {file.percent}%
                    </span>
                  )}

                  {file.blobUrl && onPreviewFile && (
                    <button
                      onClick={() => onPreviewFile(file.fileId)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {file.blobUrl && onDownloadFile && (
                    <button
                      onClick={() => onDownloadFile(file.fileId)}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    file.status === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                  }`}
                  style={{ width: `${file.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center gap-2">
          {isComplete ? (
            <button
              onClick={onFinish}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-98"
            >
              Done
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              Cancel Transfer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
