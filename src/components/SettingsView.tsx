import React, { useState, useEffect } from 'react';
import { ArrowLeft, Smartphone, Volume2, VolumeX, Globe, Shield, Wifi, RefreshCw, Trash2, Check, Server } from 'lucide-react';
import type { Language } from '../utils/i18n.ts';
import { translations } from '../utils/i18n.ts';
import { playSound, isSoundEnabled, setSoundEnabled } from '../utils/audio.ts';

interface SettingsViewProps {
  lang: Language;
  onToggleLang: () => void;
  onBackToHome: () => void;
  onClearHistory: () => void;
  historyCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  onToggleLang,
  onBackToHome,
  onClearHistory,
  historyCount,
}) => {
  const t = translations[lang];
  const [deviceName, setDeviceName] = useState<string>(() => {
    return localStorage.getItem('sharepro_device_name') || 'My Device';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [soundActive, setSoundActive] = useState(isSoundEnabled());
  const [clearedSuccess, setClearedSuccess] = useState(false);

  const handleSaveDeviceName = (e: React.FormEvent) => {
    e.preventDefault();
    if (deviceName.trim()) {
      localStorage.setItem('sharepro_device_name', deviceName.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) {
      playSound('ping');
    }
  };

  const handleClearHistory = () => {
    onClearHistory();
    setClearedSuccess(true);
    setTimeout(() => setClearedSuccess(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header with Prominent Back Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          id="settings-back-btn"
          onClick={onBackToHome}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold shadow-sm transition-all active:scale-95 group cursor-pointer"
          title={t.backToHome}
        >
          <ArrowLeft className="w-4 h-4 text-blue-400 group-hover:-translate-x-1 transition-transform" />
          <span>{t.backToHome}</span>
        </button>

        <span className="text-xs font-medium text-slate-400 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
          {lang === 'hi' ? 'सेटिंग्स और नेटवर्क' : 'Settings & Diagnostics'}
        </span>
      </div>

      <div className="space-y-5">
        {/* Device Identity */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {lang === 'hi' ? 'डिवाइस पहचान' : 'Device Identity'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'hi' ? 'यह नाम अन्य डिवाइस को फाइल भेजते या प्राप्त करते समय दिखेगा' : 'This name will appear on other devices when sharing files'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveDeviceName} className="flex gap-2">
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Rahul's Galaxy S23"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{savedSuccess ? (lang === 'hi' ? 'सेव हुआ!' : 'Saved!') : (lang === 'hi' ? 'सेव करें' : 'Save')}</span>
            </button>
          </form>
        </div>

        {/* Audio & Feedback */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                {soundActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {lang === 'hi' ? 'ऑडियो अलर्ट और साउंड' : 'Sound Effects & Alerts'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? 'ट्रांसफर शुरू और पूरा होने पर घंटी बजेगी' : 'Audio chimes when transfer starts and completes'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => playSound('complete')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                {lang === 'hi' ? 'टेस्ट टोन' : 'Test Sound'}
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  soundActive ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {lang === 'hi' ? 'ऐप की भाषा (Language)' : 'App Language'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? 'हिन्दी और English दोनों में उपलब्ध है' : 'Available in both Hindi and English'}
                </p>
              </div>
            </div>

            <button
              onClick={onToggleLang}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <span>{lang === 'hi' ? 'हिन्दी (Hindi)' : 'English'}</span>
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            </button>
          </div>
        </div>

        {/* Network & Diagnostics */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {lang === 'hi' ? 'नेटवर्क और P2P स्थिति' : 'Network & P2P Diagnostics'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'hi' ? 'सिस्टम सिग्नलिंग और डायरेक्ट ट्रांसफर इंजन' : 'System signaling & direct transfer engine'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">{lang === 'hi' ? 'सिग्नलिंग चैनल:' : 'Signaling channel:'}</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block mr-1" />
                {lang === 'hi' ? 'केवल SDP/कनेक्शन डेटा' : 'SDP/connection data only'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">{lang === 'hi' ? 'सार्वजनिक STUN/TURN:' : 'Public STUN/TURN:'}</span>
              <span className="text-emerald-400 font-semibold">{lang === 'hi' ? 'आवश्यक नहीं (LAN)' : 'Not required (LAN)'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">{lang === 'hi' ? 'ट्रांसफर मोड:' : 'Transfer Mode:'}</span>
              <span className="text-blue-400 font-semibold">{lang === 'hi' ? 'डायरेक्ट P2P (Binary Chunks)' : 'Direct P2P (Binary Chunks)'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">{lang === 'hi' ? 'सिक्योरिटी:' : 'Security:'}</span>
              <span className="text-emerald-400 font-semibold">{lang === 'hi' ? 'एंड-टू-एंड एनक्रिप्टेड' : 'End-to-End Encrypted'}</span>
            </div>
          </div>
        </div>

        {/* Clear Storage */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">
              {lang === 'hi' ? 'ट्रांसफर हिस्ट्री साफ करें' : 'Clear Transfer History'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {historyCount > 0
                ? (lang === 'hi' ? `वर्तमान में ${historyCount} रिकॉर्ड सेव हैं` : `${historyCount} records currently stored`)
                : (lang === 'hi' ? 'कोई रिकॉर्ड मौजूद नहीं है' : 'No records stored')}
            </p>
          </div>

          <button
            onClick={handleClearHistory}
            disabled={historyCount === 0}
            className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 hover:text-red-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {clearedSuccess ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{clearedSuccess ? (lang === 'hi' ? 'साफ हो गया!' : 'Cleared!') : (lang === 'hi' ? 'हिस्ट्री हटाएं' : 'Clear All')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
