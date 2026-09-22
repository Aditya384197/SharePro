import React, { useState, useEffect } from 'react';
import { X, Download, Terminal, Check, Smartphone, Github, Sparkles, FolderArchive, ArrowLeft, FileCode, CheckCircle2 } from 'lucide-react';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';

interface SourceCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const SourceCodeModal: React.FC<SourceCodeModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showFileList, setShowFileList] = useState(false);
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [totalFilesCount, setTotalFilesCount] = useState<number>(0);
  const [downloadError, setDownloadError] = useState<string>('');
  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      setDownloadError('');
      fetch('/api/project-files-info')
        .then(res => res.json())
        .then(data => {
          if (data && data.files && Array.isArray(data.files)) {
            setProjectFiles(data.files);
            setTotalFilesCount(data.files.length);
          }
        })
        .catch(err => {
          console.warn('Could not fetch file info from server:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      // The complete ZIP is generated from the actual project tree on the server.
      const resp = await fetch('/api/download-source-zip', { cache: 'no-store' });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SharePro-Full-SourceCode-and-Android-Project.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }
      throw new Error('Source ZIP server unavailable');
    } catch (err) {
      console.warn('Source ZIP download failed:', err);
      setDownloadError(lang === 'hi'
        ? 'स्रोत ZIP केवल विकास सर्वर से उपलब्ध है। यह APK के अंदर नकली ZIP नहीं बनाता।'
        : 'The source ZIP is available from the development server; the APK does not generate a fake source package.');
    } finally {
      setIsDownloading(false);
    }
  };

  const copyCommand = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header with Prominent Back Button */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <button
              id="source-code-header-back-btn"
              onClick={onClose}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all active:scale-95 group cursor-pointer shadow-sm"
              title={t.backToHome}
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400 group-hover:-translate-x-1 transition-transform" />
              <span>{lang === 'hi' ? '← वापस जाएं' : '← Back'}</span>
            </button>
            <div className="flex items-center space-x-2 ml-1">
              <FolderArchive className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-base">
                {t.sourceCodeTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Exit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Main Download Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-blue-950/50 border border-indigo-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-950/30">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                  {totalFilesCount} Files Verified
                </span>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? '100% रियल कोड' : '100% Real Code'}</span>
                </span>
              </div>
              <h4 className="font-bold text-white text-base mt-1.5 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>SharePro Complete Project (.ZIP)</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                {lang === 'hi' 
                  ? 'वास्तविक प्रोजेक्ट फाइलें, WebRTC इंजन, Node सिग्नलिंग और Android प्रोजेक्ट शामिल हैं।'
                  : 'Includes the real project files, WebRTC engine, Node signaling server and Android project.'}
              </p>
              {downloadError && (
                <p className="text-[11px] text-amber-300 mt-2">{downloadError}</p>
              )}
            </div>
            <button
              id="download-source-zip-btn"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Packaging ZIP...' : (lang === 'hi' ? 'ZIP डाउनलोड करें' : t.downloadZip)}</span>
            </button>
          </div>

          {/* Project Files Audit Accordion */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white text-xs">
                  {lang === 'hi' ? `प्रोजेक्ट फाइलें (${totalFilesCount} फाइल्स)` : `Project Files (${totalFilesCount} Files)`}
                </span>
              </div>
              <button
                onClick={() => setShowFileList(!showFileList)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline transition-colors cursor-pointer"
              >
                {showFileList ? (lang === 'hi' ? 'छुपाएं' : 'Hide') : (lang === 'hi' ? 'फाइल सूची देखें' : 'View File List')}
              </button>
            </div>

            {showFileList && (
              <div className="max-h-48 overflow-y-auto space-y-1 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-300">
                {projectFiles.length > 0 ? (
                  projectFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center space-x-2 px-2 py-1 rounded bg-slate-900/60 border border-slate-800/50">
                      <span className="text-slate-500 w-5">{idx + 1}.</span>
                      <span className="text-blue-300 truncate">{file}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400">Loading files...</div>
                )}
              </div>
            )}
          </div>

          {/* Android APK Build Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>{t.buildingApk}</span>
            </h4>

            <div className="space-y-3 text-xs text-slate-300">
              {/* Option 1: Android Studio */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white block">
                  {lang === 'hi' ? 'विधि 1: Android Studio से APK बनाएं' : 'Method 1: Android Studio (Local APK)'}
                </span>
                <p className="text-slate-400 text-[11px]">
                  {lang === 'hi' ? 'ZIP निकालें और टर्मिनल में यह चलाएं:' : 'Extract ZIP, open terminal and run:'}
                </p>
                <div className="p-2.5 rounded-xl bg-black/70 font-mono text-slate-300 flex items-center justify-between border border-slate-800">
                  <code className="truncate text-[11px]">npm install && npm run build && npx cap open android</code>
                  <button
                    onClick={() => copyCommand('npm install && npm run build && npx cap open android', 1)}
                    className="ml-2 p-1 text-slate-400 hover:text-white"
                    title="Copy command"
                  >
                    {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'hi' ? 'Android Studio में Build > Build APK पर क्लिक करें।' : 'In Android Studio, click Build > Build APK to generate your file.'}
                </p>
              </div>

              {/* Option 2: Automatic GitHub Actions */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <Github className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'hi' ? 'विधि 2: GitHub Actions (ऑटोमेटिक, बिना किसी इंस्टॉलेशन के)' : 'Method 2: GitHub Actions (Automatic, No local tools)'}</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  {lang === 'hi'
                    ? 'प्रोजेक्ट को GitHub पर पुश करें। इसमें शामिल .github/workflows/build-apk.yml अपने आप APK बनाकर Releases में दे देता है!'
                    : 'Push the project to GitHub. The included workflow builds and attaches the APK in GitHub Actions!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Back Button */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <button
            id="source-code-footer-back-btn"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t.backToHome}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors cursor-pointer"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};
