import React, { useCallback } from 'react';
import { X, Home, Calendar, ClipboardList, Settings, ChevronRight } from 'lucide-react';
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
  { path: '/', icon: Home, labelEn: 'Home', labelJp: 'ホーム', descEn: 'Dashboard', descJp: 'ダッシュボード' },
  { path: '/schedule', icon: Calendar, labelEn: 'Schedule', labelJp: 'スケジュール', descEn: 'Weekly View', descJp: '週別表示' },
  { path: '/class', icon: ClipboardList, labelEn: 'Classes', labelJp: '授業', descEn: 'Course Explorer', descJp: '授業一覧' },
  { path: '/assignments', icon: ClipboardList, labelEn: 'Assignments', labelJp: '課題', descEn: 'Tasks & Deadlines', descJp: '提出物・締め切り' },
  { path: '/settings', icon: Settings, labelEn: 'Settings', labelJp: '設定', descEn: 'Preferences & Academic', descJp: '設定・成績' },
];

export default function SharedMenu({ isOpen, onClose, lang, setLang, settings }: SharedMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = settings.isDarkMode;

  const isActive = useCallback((path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-[85%] max-w-sm h-full flex flex-col shadow-2xl ${isDark ? 'bg-gray-950' : 'bg-white'}`}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-brand-yellow shrink-0" />

            {/* Header */}
            <div
              style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}
              className={`px-6 pb-4 shrink-0 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className={`font-bold text-2xl leading-none tracking-tighter ${isDark ? 'text-white' : 'text-brand-black'}`}>
                    TOKAI<br /><span className="text-brand-yellow">HUB</span>
                  </div>
                  <p className={`text-xs font-medium mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {lang === 'en' ? 'Student Hub v1.0' : '学生ポータル v1.0'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close menu"
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {navItems.map(({ path, icon: Icon, labelEn, labelJp, descEn, descJp }) => {
                const active = isActive(path);
                const label = lang === 'en' ? labelEn : labelJp;
                const desc = lang === 'en' ? descEn : descJp;
                return (
                  <motion.button
                    key={path}
                    onClick={() => { onClose(); setTimeout(() => navigate(path), 150); }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl text-left transition-all duration-200 ${
                      active
                        ? isDark
                          ? 'bg-brand-yellow text-brand-black'
                          : 'bg-brand-black text-white'
                        : isDark
                          ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      active
                        ? isDark ? 'bg-black/20' : 'bg-white/20'
                        : isDark ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15px] leading-tight">{label}</div>
                      <div className={`text-xs font-medium mt-0.5 ${
                        active
                          ? isDark ? 'text-black/60' : 'text-white/60'
                          : isDark ? 'text-gray-600' : 'text-gray-400'
                      }`}>{desc}</div>
                    </div>
                    {active && <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />}
                  </motion.button>
                );
              })}
            </nav>

            {/* Language + Footer */}
            <div
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
              className={`px-4 pt-3 border-t shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
            >
              <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 px-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {lang === 'en' ? 'Language' : '言語'}
              </div>
              <div className={`flex gap-2 p-1 rounded-2xl ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                {(['en', 'jp'] as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                      lang === l
                        ? isDark ? 'bg-brand-yellow text-brand-black shadow-sm' : 'bg-white text-brand-black shadow-sm'
                        : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {l === 'en' ? 'English' : '日本語'}
                  </button>
                ))}
              </div>
              <p className={`text-[10px] font-semibold text-center mt-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
                © 2026 Mohamed Fuad™
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
