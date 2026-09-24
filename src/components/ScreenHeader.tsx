import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronLeft, Menu, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import SharedMenu from './SharedMenu';
import type { AppSettings, Language } from '../App';

/** Width + gutters every page uses, so content lines up across screens. */
export const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

/** Shared motion presets, so every screen moves the same way. */
export const EASE = [0.22, 1, 0.36, 1] as const;
/** Press feedback: a short spring that settles in about 150 ms. */
export const TAP = { scale: 0.96, transition: { type: 'spring', stiffness: 600, damping: 32 } } as const;
/** Staggered entrance for the i-th item of a list; capped so long lists do not trail. */
export const rise = (i = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: Math.min(i * 0.035, 0.28), ease: EASE },
});

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
  const refreshLabel = lang === 'en' ? 'Refresh from TIPS' : 'TIPSから更新';
  return (
    <div className={`h-full relative flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <header style={{ paddingTop: 'calc(1.75rem + env(safe-area-inset-top, 0px))' }} className="shrink-0 pb-4">
        <div className={`${CONTAINER} flex items-center gap-3`}>
          {back ? (
            <motion.button whileTap={TAP} onClick={() => navigate(-1)} aria-label={lang === 'en' ? 'Back' : '戻る'} className={btn}><ChevronLeft className="w-5 h-5" /></motion.button>
          ) : (
            <motion.button whileTap={TAP} onClick={() => setMenuOpen(true)} aria-label={lang === 'en' ? 'Open menu' : 'メニューを開く'} className={`${btn} lg:hidden`}><Menu className="w-5 h-5" /></motion.button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className={`text-xs font-medium truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
          </div>
          {right}
          {onRefresh && <RefreshButton onClick={onRefresh} refreshing={refreshing} label={refreshLabel} className={btn} />}
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

/** Header refresh button: spins while TIPS is being asked, springs on press. */
export function RefreshButton({ onClick, refreshing, label, className }: { onClick: () => void; refreshing?: boolean; label: string; className: string }) {
  return (
    <motion.button whileTap={TAP} onClick={onClick} aria-label={label} aria-busy={refreshing} title={label} className={className}>
      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
    </motion.button>
  );
}

/** Small shared building blocks. */
export const Card: React.FC<{ isDark: boolean; className?: string; children: React.ReactNode; onClick?: () => void }> = ({ isDark, className = '', children, onClick }) => {
  const base = `rounded-3xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} ${className}`;
  if (!onClick) return <div className={base}>{children}</div>;
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      whileTap={{ scale: 0.985, transition: TAP.transition }}
      className={`${base} cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
    >
      {children}
    </motion.div>
  );
};

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      {/* items-start + a dot at the first line's middle: long titles wrap without the dot drifting. */}
      <h2 className="font-bold text-lg leading-snug flex items-start gap-2 min-w-0 [word-break:keep-all] [overflow-wrap:anywhere]"><span className="mt-[0.55em] w-2 h-2 rounded-full bg-brand-yellow shrink-0" /><span className="min-w-0 flex items-center gap-2">{children}</span></h2>
      {right}
    </div>
  );
}

/**
 * Filter chip. Pass the same `layoutId` to every pill of one group and the active
 * background slides between them instead of jumping.
 */
export const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; isDark: boolean; layoutId?: string }> = ({ active, onClick, children, isDark, layoutId }) => {
  const activeBg = isDark ? 'bg-brand-yellow' : 'bg-[#0B1F3A]';
  return (
    <motion.button
      whileTap={TAP}
      onClick={onClick}
      aria-pressed={active}
      className={`relative isolate h-10 px-4 rounded-full border font-bold text-sm whitespace-nowrap shrink-0 transition-colors ${active
        ? `border-transparent ${isDark ? 'text-brand-black' : 'text-white'} ${layoutId ? '' : `${activeBg} shadow-md`}`
        : isDark ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
    >
      {active && layoutId && (
        <motion.span layoutId={layoutId} className={`absolute inset-0 -z-10 rounded-full shadow-md ${activeBg}`} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
      )}
      {children}
    </motion.button>
  );
};

/** Native select styled like a Pill (40px tall, same chevron in Safari and Chrome). */
export function Select({ value, onChange, isDark, children, label, className = '' }: { value: string; onChange: (v: string) => void; isDark: boolean; children: React.ReactNode; label: string; className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        className={`h-10 w-full appearance-none rounded-full pl-4 pr-9 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow truncate ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
      >
        {children}
      </select>
      <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
    </span>
  );
}

/** Grey placeholder block with a shimmer, sized by the caller. */
export const Skeleton: React.FC<{ isDark: boolean; className?: string }> = ({ isDark, className = '' }) => (
  <div aria-hidden className={`${isDark ? 'skeleton-dark' : 'skeleton'} ${className}`} />
);

/** Loading state: a shimmering caption (TIPS can take seconds) over placeholder rows. */
export function Loading({ text, isDark, rows = 3 }: { text: string; isDark: boolean; rows?: number }) {
  return (
    <motion.div role="status" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="py-2">
      <p className={`text-shimmer text-sm font-medium ${rows ? 'mb-3' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{text}</p>
      {rows > 0 && (
        <div className="space-y-2">
          {Array.from({ length: rows }, (_, i) => <Skeleton key={i} isDark={isDark} className="h-16 rounded-2xl" />)}
        </div>
      )}
    </motion.div>
  );
}

/**
 * A TIPS request failed and nothing is cached to show instead. Keeps the page usable: says what
 * happened in the UI language, shows the bridge's reason small, and offers a retry.
 */
export function LoadError({ error, isDark, lang, onRetry }: { error: Error; isDark: boolean; lang: Language; onRetry?: () => void }) {
  return (
    <motion.div role="alert" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}
      className={`p-5 rounded-3xl flex items-start gap-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{lang === 'en' ? 'Could not load this from TIPS.' : 'TIPSから読み込めませんでした。'}</p>
        <p className={`mt-1 text-xs font-medium break-words [overflow-wrap:anywhere] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{error.message}</p>
        {onRetry && (
          <motion.button whileTap={TAP} onClick={onRetry} className={`mt-3 h-10 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white border border-gray-200 hover:bg-gray-100'}`}>
            <RefreshCw className="w-3.5 h-3.5" />{lang === 'en' ? 'Try again' : '再試行'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/** The one search box style used by every list screen. */
export function SearchField({ value, onChange, placeholder, isDark, className = 'mb-4' }: { value: string; onChange: (v: string) => void; placeholder: string; isDark: boolean; className?: string }) {
  return (
    <label className={`flex items-center h-12 rounded-2xl px-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} ${className}`}>
      <Search className={`w-5 h-5 mr-3 shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} enterKeyHint="search"
        className="min-w-0 bg-transparent outline-none w-full text-sm font-medium placeholder:text-gray-400" />
    </label>
  );
}

export function Empty({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className={`p-6 rounded-3xl text-sm font-medium ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
      {text}
    </motion.div>
  );
}

/** Re-animates its content whenever `value` changes (background refresh brought new data). */
export const Fresh: React.FC<{ value: React.Key; children: React.ReactNode; className?: string }> = ({ value, children, className }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span key={value} className={className} initial={{ opacity: 0, y: 6, filter: 'blur(2px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease: EASE }} style={{ display: 'inline-block' }}>
      {children}
    </motion.span>
  </AnimatePresence>
);
