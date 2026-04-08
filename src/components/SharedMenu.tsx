import React from 'react';
import { X, Home, Calendar, ClipboardList, Settings } from 'lucide-react';
import { Language, AppSettings } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface SharedMenuProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
}

const navItems = [
  { path: '/', icon: Home, labelEn: 'Home', labelJp: 'ホーム' },
  { path: '/schedule', icon: Calendar, labelEn: 'My Schedule', labelJp: 'スケジュール' },
  { path: '/assignments', icon: ClipboardList, labelEn: 'Assignments', labelJp: '課題' },
  { path: '/settings', icon: Settings, labelEn: 'Settings', labelJp: '設定' },
];

export default function SharedMenu({ isOpen, onClose, lang, setLang, settings }: SharedMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-100';
  const btnBgClass = isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200';
  const btnActiveBgClass = isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

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
            {/* Menu header */}
            <div className={`flex justify-between items-center mb-10 mt-6 pb-6 border-b ${borderClass}`}>
              <div className="font-bold text-2xl leading-none tracking-tighter">TOKAI<br/><span className="text-brand-yellow">HUB</span></div>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-1">
              {navItems.map(({ path, icon: Icon, labelEn, labelJp }) => {
                const active = isActive(path);
                const label = lang === 'en' ? labelEn : labelJp;
                return (
                  <motion.button
                    key={path}
                    onClick={() => { onClose(); setTimeout(() => navigate(path), 150); }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-base transition-colors text-left w-full ${
                      active
                        ? (isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900')
                        : (isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand-yellow' : ''}`} />
                    <span>{label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-yellow shadow-[0_0_4px_rgba(250,204,21,0.8)]" />
                    )}
                  </motion.button>
                );
              })}
            </nav>

            {/* Language Toggle */}
            <div className={`mt-auto pt-6 border-t ${borderClass}`}>
              <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {lang === 'en' ? 'Language' : '言語'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLang('en')}
                  aria-label="Switch to English"
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${lang === 'en' ? btnActiveBgClass : btnBgClass}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLang('jp')}
                  aria-label="日本語に切り替え"
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${lang === 'jp' ? btnActiveBgClass : btnBgClass}`}
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
