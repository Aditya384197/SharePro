import React, { useEffect, useState } from 'react';
import { X, Download, FileText, Share2 } from 'lucide-react';
import type { TransferFile } from '../types.ts';

interface FilePreviewModalProps {
  file: TransferFile | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    if (file.downloadUrl) {
      setPreviewUrl(file.downloadUrl);
      return;
    }

    const source = file.blob || file.file;
    if (!source) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(source);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  const handleShare = async () => {
    if (!previewUrl || !navigator.share) return;
    try {
      const source = file.blob || file.file;
      if (source instanceof Blob && typeof File !== 'undefined') {
        const shareFile = new File([source], file.name, { type: file.type || source.type });
        await navigator.share({ files: [shareFile], title: file.name });
      } else {
        await navigator.share({ title: file.name, url: previewUrl });
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') console.warn('Share failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="truncate mr-4 min-w-0">
            <h3 className="font-semibold text-white text-base truncate">{file.name}</h3>
            <p className="text-xs text-slate-400 truncate">
              {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Unknown type'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex items-center justify-center bg-black/40 min-h-[260px]">
          {isImage && previewUrl && (
            <img src={previewUrl} alt={file.name} className="max-h-[62vh] max-w-full rounded-xl object-contain shadow-md" />
          )}
          {isVideo && previewUrl && (
            <video src={previewUrl} controls playsInline className="max-h-[62vh] max-w-full rounded-xl shadow-md" />
          )}
          {isAudio && previewUrl && (
            <div className="w-full max-w-md p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-4">
              <audio src={previewUrl} controls className="w-full" />
            </div>
          )}
          {!isImage && !isVideo && !isAudio && (
            <div className="text-center space-y-3 py-8 px-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-300 font-medium">Binary / Document File</p>
              <p className="text-xs text-slate-500">इस प्रकार की फाइल का प्रीव्यू यहाँ उपलब्ध नहीं है। नीचे से सेव या शेयर करें।</p>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Close
          </button>
          {previewUrl && typeof navigator.share === 'function' && (
            <button
              onClick={handleShare}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          )}
          {previewUrl && (
            <a
              href={previewUrl}
              download={file.name}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              Save File
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
