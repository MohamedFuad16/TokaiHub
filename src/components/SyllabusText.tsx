import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Paperclip, ExternalLink } from 'lucide-react';
import { EASE } from './ScreenHeader';
import { reflow, linkify } from '../lib/syllabusText';
import { openTipsFile, tipsFileUrl, type TipsFileRef } from '../lib/api';

/** Link colours for TIPS text; long addresses wrap anywhere so a phone never scrolls sideways. */
const linkClass = (isDark: boolean) =>
  `font-semibold underline-offset-2 hover:underline [overflow-wrap:anywhere] ${isDark ? 'text-blue-400' : 'text-blue-600'}`;

/** Text with every web address and e-mail address as a link that opens in a new tab. */
export function Linked({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <>
      {linkify(text).map((p, i) => p.kind === 'text'
        ? <React.Fragment key={i}>{p.text}</React.Fragment>
        : <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className={linkClass(isDark)}>{p.text}</a>)}
    </>
  );
}

/**
 * TIPS prose. By default wrapped lines are joined into paragraphs and ・ lines become a list
 * (syllabus fields); `keepLines` keeps the author's line breaks (bulletin posts). Addresses are
 * links either way.
 */
export function RichText({ text, isDark, size = 'text-[15px]', keepLines = false }: { text: string; isDark: boolean; size?: string; keepLines?: boolean }) {
  const color = isDark ? 'text-gray-300' : 'text-gray-700';
  if (keepLines) {
    return <div className={`${size} leading-relaxed ${color} whitespace-pre-line break-words [overflow-wrap:anywhere]`}><Linked text={text} isDark={isDark} /></div>;
  }
  return (
    <div className={`${size} leading-relaxed ${color} space-y-2.5 break-words [overflow-wrap:anywhere]`}>
      {reflow(text).map((b, i) => b.kind === 'p'
        ? <p key={i}><Linked text={b.text} isDark={isDark} /></p>
        : (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2.5"><span className="mt-[0.6em] w-1.5 h-1.5 rounded-full bg-brand-yellow shrink-0" /><span className="min-w-0"><Linked text={it} isDark={isDark} /></span></li>
            ))}
          </ul>
        ))}
    </div>
  );
}

/**
 * A TIPS file (rubric, handout, bulletin attachment) as a link. The bridge fetches it with the
 * TIPS session; off the Mac the tab gets a one-minute link (openTipsFile).
 */
export const FileLink: React.FC<{ name: string; file: TipsFileRef; isDark: boolean }> = ({ name, file, isDark }) => {
  const external = 'url' in file && !!file.url;
  const Icon = external ? ExternalLink : Paperclip;
  return (
    <a href={tipsFileUrl(file)} target="_blank" rel="noopener noreferrer" onClick={e => { e.preventDefault(); openTipsFile(file); }}
      className={`flex items-center gap-2.5 min-h-10 px-3 py-2 rounded-xl text-sm transition-colors ${isDark ? 'bg-gray-700/60 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 border border-gray-200'}`}>
      <Icon className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
      <span className={`min-w-0 ${linkClass(isDark)}`}>{name}</span>
    </a>
  );
};

const COLORS = ['#F5C518', '#3B82F6', '#10B981', '#F43F5E', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

/**
 * Donut of the grading weights. Tapping a slice or its legend row brings it forward and shows
 * its share in the middle.
 */
export function GradingChart({ parts, isDark, lang }: { parts: { label: string; pct: number }[]; isDark: boolean; lang: 'en' | 'jp' }) {
  const [active, setActive] = useState<number | null>(null);
  const R = 42, C = 2 * Math.PI * R, GAP = parts.length > 1 ? 1.2 : 0;
  const total = parts.reduce((a, p) => a + p.pct, 0);
  let offset = 0;
  const arcs = parts.map((p, i) => {
    const len = (p.pct / total) * C;
    const arc = { i, len: Math.max(0, len - GAP), offset };
    offset += len;
    return arc;
  });
  const shown = active ?? null;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" role="img" aria-label={parts.map(p => `${p.label} ${p.pct}%`).join(', ')}>
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="14" className={isDark ? 'stroke-gray-700' : 'stroke-gray-200'} />
          {arcs.map(a => (
            <motion.circle
              key={a.i} cx="50" cy="50" r={R} fill="none" stroke={COLORS[a.i % COLORS.length]} strokeLinecap="butt"
              initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: -a.offset }}
              animate={{ strokeDasharray: `${a.len} ${C - a.len}`, strokeDashoffset: -a.offset, strokeWidth: shown === a.i ? 18 : 14, opacity: shown === null || shown === a.i ? 1 : 0.35 }}
              transition={{ duration: 0.7, delay: 0.08 * a.i, ease: EASE }}
              onPointerEnter={() => setActive(a.i)} onPointerLeave={() => setActive(null)} onClick={() => setActive(v => (v === a.i ? null : a.i))}
              className="cursor-pointer"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <motion.div key={shown ?? 'all'} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, ease: EASE }}>
            <div className="text-2xl font-bold leading-none">{shown === null ? `${total}%` : `${parts[shown].pct}%`}</div>
            <div className={`mt-1 text-[10px] font-bold leading-tight line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {shown === null ? (lang === 'en' ? 'of the grade' : '成績の内訳') : parts[shown].label}
            </div>
          </motion.div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5">
        {parts.map((p, i) => (
          <li key={i}>
            <button onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onClick={() => setActive(v => (v === i ? null : i))}
              className={`w-full min-h-10 flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${active === i ? (isDark ? 'bg-gray-700' : 'bg-white shadow-sm') : ''}`}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              {/* keep-all: Japanese labels wrap between words, never inside 中間試験. */}
              <span className="flex-1 min-w-0 text-sm font-semibold leading-snug [word-break:keep-all] [overflow-wrap:anywhere]">{p.label}</span>
              <span className="text-sm font-bold tabular-nums">{p.pct}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
