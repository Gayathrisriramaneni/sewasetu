import React from 'react';
import { Type, Eye, Languages, Shield, RefreshCw } from 'lucide-react';
import { Language, translations } from '../services/localization';

export type TextSize = 'normal' | 'large' | 'xlarge';

interface AccessibilityToolbarProps {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  highContrast: boolean;
  setHighContrast: (contrast: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  kioskMode: boolean;
  setKioskMode: (kiosk: boolean) => void;
  onClearSession: () => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  textSize,
  setTextSize,
  highContrast,
  setHighContrast,
  language,
  setLanguage,
  kioskMode,
  setKioskMode,
  onClearSession,
}) => {
  const t = translations[language];

  return (
    <aside aria-label="Accessibility settings" className="bg-[#072747] text-white/90 text-xs px-3 sm:px-8 py-1.5 border-b border-white/10">
      <div className="max-w-[1000px] mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Accessibility Controls */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-4">
          {/* Text Size */}
          <div className="flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-blue-300" aria-hidden="true" />
            <span className="font-medium mr-1">Text:</span>
            <div className="inline-flex rounded border border-white/20 bg-white/5 overflow-hidden">
              <button
                type="button"
                onClick={() => setTextSize('normal')}
                className={`px-2 py-0.5 text-[11px] font-semibold cursor-pointer transition-colors ${
                  textSize === 'normal' ? 'bg-amber-500 text-slate-900 font-bold' : 'hover:bg-white/10 text-white/80'
                }`}
                title="Normal Text Size (100%)"
                aria-label="Normal text size"
                aria-pressed={textSize === 'normal'}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setTextSize('large')}
                className={`px-2 py-0.5 text-xs font-semibold cursor-pointer border-l border-white/20 transition-colors ${
                  textSize === 'large' ? 'bg-amber-500 text-slate-900 font-bold' : 'hover:bg-white/10 text-white/80'
                }`}
                title="Large Text Size (115%)"
                aria-label="Large text size"
                aria-pressed={textSize === 'large'}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setTextSize('xlarge')}
                className={`px-2 py-0.5 text-sm font-semibold cursor-pointer border-l border-white/20 transition-colors ${
                  textSize === 'xlarge' ? 'bg-amber-500 text-slate-900 font-bold' : 'hover:bg-white/10 text-white/80'
                }`}
                title="Extra Large Text Size (130%)"
                aria-label="Extra large text size"
                aria-pressed={textSize === 'xlarge'}
              >
                A++
              </button>
            </div>
          </div>

          {/* High Contrast Mode */}
          <button
            type="button"
            onClick={() => setHighContrast(!highContrast)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/20 text-[11px] font-medium cursor-pointer transition-colors ${
              highContrast ? 'bg-yellow-400 text-black font-bold border-yellow-300' : 'hover:bg-white/10 text-white/80'
            }`}
            title="Toggle High Contrast for visual clarity"
            aria-pressed={highContrast}
          >
            <Eye className="w-3 h-3" aria-hidden="true" />
            <span>{highContrast ? 'High Contrast: ON' : 'High Contrast'}</span>
          </button>

          {/* Language Toggle */}
          <div className="flex items-center gap-1">
            <Languages className="w-3.5 h-3.5 text-blue-300" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-[11px] font-semibold text-amber-300 cursor-pointer"
              title="Change portal language"
              aria-label={`Current language is ${language === 'en' ? 'English' : 'Hindi'}. Click to switch language.`}
            >
              {language === 'en' ? 'हिन्दी (Hindi)' : 'English'}
            </button>
          </div>
        </div>

        {/* Right: CSC Kiosk / Shared Device Security Controls */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={kioskMode}
              onChange={e => setKioskMode(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500 cursor-pointer"
            />
            <span className="flex items-center gap-1 font-medium">
              <Shield className="w-3 h-3 text-amber-400" aria-hidden="true" />
              <span>CSC Kiosk Mode</span>
            </span>
          </label>

          {kioskMode && (
            <button
              type="button"
              onClick={onClearSession}
              className="bg-red-800 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-red-500/50"
              title="Immediately wipe all active session drafts and verification for privacy"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              <span>{t.clearKioskSession}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
