import React from 'react';
import { X } from 'lucide-react';
import { Language, AppSettings } from '../App';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface SharedMenuProps {
  isOpen: boolean;
  onClose: () => void;
    lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
}

export default function SharedMenu({ isOpen, onClose, lang, setLang, settings }: SharedMenuProps) {
  const navigate = useNavigate();
  const t = {
    en: { 
      home: "Home", 
      schedule: "My Schedule", 
      assignments: "Assignments", 
      settings: "Settings", 
      lang: "Language / 言語" 
    },
    jp: { 
      home: "ホーム", 
      schedule: "スケジュール", 
      assignments: "課題", 
      settings: "設定", 
      lang: "Language / 言語" 
    }
  };

  const bgClass = settings.isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const borderClass = settings.isDarkMode ? 'border-gray-800' : 'border-gray-100';
  const hoverClass = settings.isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100';
  const btnBgClass = settings.isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200';
  const btnActiveBgClass = settings.isDarkMode ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 flex lg:hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-3/4 max-w-xs h-full p-6 flex flex-col shadow-2xl ${bgClass}`}
          >
            <div className="flex justify-between items-center mb-12 mt-6">
              <div className="font-bold text-2xl leading-none">TOKAI<br/>HUB</div>
              <button 
                onClick={onClose} 
                aria-label="Close menu"
                className={`p-2 rounded-full transition-colors ${hoverClass}`}
              >
                <X className="w-6 h-6"/>
              </button>
            </div>
            <nav className="flex flex-col gap-6 text-xl font-bold">
              <button onClick={() => { onClose(); setTimeout(() => navigate('/'), 150); }} className={`text-left py-2 border-b ${borderClass} hover:text-brand-yellow transition-colors`}>{t[lang].home}</button>
              <button onClick={() => { onClose(); setTimeout(() => navigate('/schedule'), 150); }} className={`text-left py-2 border-b ${borderClass} hover:text-brand-yellow transition-colors`}>{t[lang].schedule}</button>
              <button onClick={() => { onClose(); setTimeout(() => navigate('/assignments'), 150); }} className={`text-left py-2 border-b ${borderClass} hover:text-brand-yellow transition-colors`}>{t[lang].assignments}</button>
              <button onClick={() => { onClose(); setTimeout(() => navigate('/settings'), 150); }} className={`text-left py-2 border-b ${borderClass} hover:text-brand-yellow transition-colors`}>{t[lang].settings}</button>
            </nav>

            {/* Language Toggle */}
            <div className={`mt-auto pt-8 border-t ${borderClass}`}>
              <div className="text-sm font-bold text-gray-400 mb-4">{t[lang].lang}</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setLang('en')} 
                  aria-label="Switch to English"
                  className={`flex-1 py-3 rounded-2xl font-bold transition-colors ${lang === 'en' ? btnActiveBgClass : btnBgClass}`}
                >
                  English
                </button>
                <button 
                  onClick={() => setLang('jp')} 
                  aria-label="日本語に切り替え"
                  className={`flex-1 py-3 rounded-2xl font-bold transition-all duration-200 ${lang === 'jp' ? btnActiveBgClass : btnBgClass}`}
                >
                  日本語
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
