import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Search,
  Check,
  Layers,
  Film,
  Music,
  Image,
  FileText,
  FolderOpen,
  ArrowRight,
  FileIcon,
  Play,
  Eye,
  Inbox,
} from 'lucide-react';
import { FileItem } from '../types';
import { DEMO_FILES, formatBytes } from '../utils/demoData';

interface FileSelectorModalProps {
  initialCategory?: FileItem['category'];
  receivedFiles?: FileItem[];
  onClose: () => void;
  onProceedToSend: (selectedFiles: FileItem[]) => void;
  onPreviewFile?: (file: FileItem) => void;
}

export const FileSelectorModal: React.FC<FileSelectorModalProps> = ({
  initialCategory,
  receivedFiles = [],
  onClose,
  onProceedToSend,
  onPreviewFile,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customFiles, setCustomFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allFiles: FileItem[] = [...receivedFiles, ...customFiles, ...DEMO_FILES];

  const handleDeviceFilesUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: FileItem[] = Array.from(files).map((f, i) => {
      let cat: FileItem['category'] = 'file';
      if (f.name.endsWith('.apk')) cat = 'app';
      else if (f.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm)$/i.test(f.name)) cat = 'video';
      else if (f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name)) cat = 'audio';
      else if (f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)) cat = 'photo';
      else if (f.type.includes('pdf') || /\.(pdf|docx|doc|txt|xlsx|pptx|zip|rar)$/i.test(f.name)) cat = 'document';

      return {
        id: `custom-${Date.now()}-${i}`,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        category: cat,
        file: f,
        description: 'Device Storage',
      };
    });

    setCustomFiles((prev) => [...newItems, ...prev]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      newItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (itemsToToggle: FileItem[]) => {
    const allSelected = itemsToToggle.length > 0 && itemsToToggle.every((item) => selectedIds.has(item.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        itemsToToggle.forEach((item) => next.delete(item.id));
      } else {
        itemsToToggle.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const filteredFiles = allFiles.filter((item) => {
    let matchesCategory = true;
    if (activeCategory === 'received') {
      matchesCategory = item.isReceived === true;
    } else if (activeCategory !== 'all') {
      matchesCategory = item.category === activeCategory;
    }
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedFiles = allFiles.filter((item) => selectedIds.has(item.id));
  const totalSelectedSize = selectedFiles.reduce((acc, cur) => acc + cur.size, 0);

  const getCategoryIcon = (cat: FileItem['category']) => {
    switch (cat) {
      case 'app':
        return <Layers className="w-4 h-4 text-blue-400" />;
      case 'video':
        return <Film className="w-4 h-4 text-rose-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-amber-400" />;
      case 'photo':
        return <Image className="w-4 h-4 text-emerald-400" />;
      case 'document':
        return <FileText className="w-4 h-4 text-purple-400" />;
      default:
        return <FileIcon className="w-4 h-4 text-cyan-400" />;
    }
  };

  const categories = [
    { id: 'all', label: 'All Files' },
    ...(receivedFiles.length > 0 ? [{ id: 'received', label: `Received (${receivedFiles.length})` }] : []),
    { id: 'app', label: 'Apps' },
    { id: 'video', label: 'Videos' },
    { id: 'audio', label: 'Music' },
    { id: 'photo', label: 'Photos' },
    { id: 'document', label: 'Docs' },
    { id: 'file', label: 'Storage' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden my-auto">
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-base font-bold text-white truncate">
              File Selector & Storage
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {receivedFiles.length > 0 ? `${receivedFiles.length} received files stored` : 'Browse device files and received items'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-800 bg-slate-950/50 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => handleDeviceFilesUpload(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow active:scale-98"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Browse Device Storage</span>
            </button>

            <button
              onClick={() => toggleSelectAll(filteredFiles)}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
            >
              {filteredFiles.length > 0 && filteredFiles.every((f) => selectedIds.has(f.id)) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[220px]">
          {filteredFiles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-1.5">
              {activeCategory === 'received' ? (
                <>
                  <Inbox className="w-9 h-9 mx-auto text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">No received files yet</p>
                  <p className="text-[10px] text-slate-500">Receive files from another device to locate them here</p>
                </>
              ) : (
                <>
                  <FolderOpen className="w-9 h-9 mx-auto text-slate-600" />
                  <p className="text-xs">No matching files found</p>
                </>
              )}
            </div>
          ) : (
            filteredFiles.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isMedia = item.category === 'video' || item.category === 'audio';

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500/50'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
                  }`}
                >
                  <div
                    onClick={() => toggleSelect(item.id)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-[260px]">
                          {item.name}
                        </h4>
                        {item.isReceived && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shrink-0">
                            Received
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatBytes(item.size)} {item.description ? `• ${item.description}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onPreviewFile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewFile(item);
                        }}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          isMedia
                            ? 'bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/30'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                        }`}
                        title={isMedia ? 'Play in Player' : 'Preview'}
                      >
                        {isMedia ? <Play className="w-3.5 h-3.5 fill-current" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="text-[10px] hidden xs:inline">{isMedia ? 'Play' : 'View'}</span>
                      </button>
                    )}

                    <div
                      onClick={() => toggleSelect(item.id)}
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border cursor-pointer transition-all shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span className="text-xs font-bold text-white block">
              {selectedFiles.length} selected
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {formatBytes(totalSelectedSize)}
            </span>
          </div>

          <button
            onClick={() => onProceedToSend(selectedFiles)}
            disabled={selectedFiles.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              selectedFiles.length > 0
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>Send Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
