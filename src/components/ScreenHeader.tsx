import React, { useState } from 'react';
import { ChevronLeft, Menu, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import SharedMenu from './SharedMenu';
import type { AppSettings, Language } from '../App';

/** Width + gutters every page uses, so content lines up across screens. */
export const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

interface PageShellProps {
  title: string;
  subtitle?: string;
  lang: Language;
  setLang: (l: Language) => void;
  settings: AppSettings;
  onRefresh?: () => void;
  refreshing?: boolean;
  back?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}

/** Page frame: title row (menu on mobile, optional back/refresh), scrolling body, drawer. */
export default function PageShell({ title, subtitle, lang, setLang, settings, onRefresh, refreshing, back, right, children }: PageShellProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = settings.isDarkMode;
  const btn = `w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`;
  return (
    <div className={`h-full relative flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header style={{ paddingTop: 'calc(1.75rem + env(safe-area-inset-top, 0px))' }} className="shrink-0 pb-4">
        <div className={`${CONTAINER} flex items-center gap-3`}>
          {back ? (
            <button onClick={() => navigate(-1)} aria-label={lang === 'en' ? 'Back' : '戻る'} className={btn}><ChevronLeft className="w-5 h-5" /></button>
          ) : (
            <button onClick={() => setMenuOpen(true)} aria-label={lang === 'en' ? 'Open menu' : 'メニューを開く'} className={`${btn} lg:hidden`}><Menu className="w-5 h-5" /></button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className={`text-xs font-medium truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
          </div>
          {right}
          {onRefresh && (
            <button onClick={onRefresh} aria-label={lang === 'en' ? 'Refresh from TIPS' : 'TIPSから更新'} className={btn}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className={`${CONTAINER} pb-32 lg:pb-16`}>{children}</div>
      </div>
      <SharedMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} setLang={setLang} settings={settings} />
    </div>
  );
}

export const since = (cachedAt: number | null, lang: Language) => {
  if (!cachedAt) return '';
  const min = Math.round((Date.now() - cachedAt) / 60000);
  if (lang === 'en') return min < 1 ? 'Updated just now' : `Updated ${min} min ago`;
  return min < 1 ? 'たった今更新' : `${min}分前に更新`;
};

/** Small shared building blocks. */
export const Card: React.FC<{ isDark: boolean; className?: string; children: React.ReactNode; onClick?: () => void }> = ({ isDark, className = '', children, onClick }) => {
  return (
    <div onClick={onClick} className={`rounded-3xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} ${onClick ? 'cursor-pointer transition-colors ' + (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100') : ''} ${className}`}>
      {children}
    </div>
  );
};

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="font-bold text-lg flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-brand-yellow" />{children}</h2>
      {right}
    </div>
  );
}

export const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; isDark: boolean }> = ({ active, onClick, children, isDark }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all active:scale-95 shrink-0 ${active
        ? 'bg-[#0B1F3A] text-white shadow-md'
        : `border ${isDark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}`}
    >
      {children}
    </button>
  );
};

export function Loading({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-medium py-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
      <span className="w-4 h-4 rounded-full border-2 border-brand-yellow border-t-transparent animate-spin" />{text}
    </div>
  );
}

export function Empty({ text, isDark }: { text: string; isDark: boolean }) {
  return <div className={`p-6 rounded-3xl text-sm font-medium ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>{text}</div>;
}

/** Re-animates its content whenever `value` changes (background refresh brought new data). */
export const Fresh: React.FC<{ value: React.Key; children: React.ReactNode; className?: string }> = ({ value, children, className }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span key={value} className={className} initial={{ opacity: 0, y: 6, filter: 'blur(2px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} style={{ display: 'inline-block' }}>
      {children}
    </motion.span>
  </AnimatePresence>
);
