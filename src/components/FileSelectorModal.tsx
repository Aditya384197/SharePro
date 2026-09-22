import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Image, Video, Music, Package, Trash2, FolderPlus, ArrowRight, FilePlus, ArrowLeft, Home } from 'lucide-react';
import type { TransferFile } from '../types.ts';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface FileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: TransferFile[];
  onAddFiles: (newFiles: FileList | File[]) => void;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  onProceedToSend: () => void;
  lang: Language;
}

export const FileSelectorModal: React.FC<FileSelectorModalProps> = ({
  isOpen,
  onClose,
  files,
  onAddFiles,
  onRemoveFile,
  onClearAll,
  onProceedToSend,
  lang,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-emerald-400" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-blue-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-purple-400" />;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="w-5 h-5 text-amber-400" />;
    }
    return <Package className="w-5 h-5 text-indigo-400" />;
  };

  const filteredFiles = files.filter(f => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'images') return f.type.startsWith('image/');
    if (activeCategory === 'videos') return f.type.startsWith('video/');
    if (activeCategory === 'audio') return f.type.startsWith('audio/');
    if (activeCategory === 'docs') return f.type.includes('pdf') || f.type.includes('doc') || f.type.includes('text');
    return true;
  });

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <button
              id="file-selector-back-btn"
              onClick={onClose}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all active:scale-95 group cursor-pointer shadow-sm mr-1"
              title={t.backToHome}
            >
              <ArrowLeft className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform" />
              <span>{t.back}</span>
            </button>
            <div>
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <span>{t.selectFiles}</span>
                {files.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30">
                    {files.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {t.realUseNotice}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={t.exit}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/30 flex items-center space-x-2 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'images', label: 'Photos' },
            { id: 'videos', label: 'Videos' },
            { id: 'audio', label: 'Music' },
            { id: 'docs', label: 'Documents' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Real Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-blue-500 bg-slate-950/40 hover:bg-blue-950/10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              {t.dropFilesHere}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports photos, 4K videos, zip files, apks, music, and all documents
            </p>

            <div className="flex items-center space-x-3 mt-4" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow-md shadow-blue-600/20"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>{t.chooseFromDevice}</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 border border-slate-700"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Folder</span>
              </button>
            </div>

            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  onAddFiles(e.target.files);
                }
              }}
            />
            <input
              type="file"
              ref={folderInputRef}
              multiple
              // @ts-ignore
              webkitdirectory=""
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  onAddFiles(e.target.files);
                }
              }}
            />
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{filteredFiles.length} {t.filesSelected}</span>
                <button
                  onClick={onClearAll}
                  className="text-red-400 hover:text-red-300 flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearAll}</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-sm">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span className="font-semibold text-white">{files.length}</span> files selected (
            <span className="font-semibold text-slate-200">{formatFileSize(totalSize)}</span>)
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              {t.cancel}
            </button>
            <button
              id="proceed-to-send-btn"
              disabled={files.length === 0}
              onClick={onProceedToSend}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 active:scale-95 text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <span>{t.nextChooseReceiver}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
