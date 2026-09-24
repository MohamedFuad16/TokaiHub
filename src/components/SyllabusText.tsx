import React, { useState } from 'react';
import { motion } from 'motion/react';
import { EASE } from './ScreenHeader';
import { reflow } from '../lib/syllabusText';

/** Syllabus prose with wrapped lines joined into paragraphs and ・ lines as a list. */
export function RichText({ text, isDark, size = 'text-[15px]' }: { text: string; isDark: boolean; size?: string }) {
  const color = isDark ? 'text-gray-300' : 'text-gray-700';
  return (
    <div className={`${size} leading-relaxed ${color} space-y-2.5 break-words [overflow-wrap:anywhere]`}>
      {reflow(text).map((b, i) => b.kind === 'p'
        ? <p key={i}>{b.text}</p>
        : (
          <ul key={i} className="space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-2.5"><span className="mt-[0.6em] w-1.5 h-1.5 rounded-full bg-brand-yellow shrink-0" /><span className="min-w-0">{it}</span></li>
            ))}
          </ul>
        ))}
    </div>
  );
}

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
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
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
              <span className="flex-1 min-w-0 text-sm font-semibold leading-snug break-words">{p.label}</span>
              <span className="text-sm font-bold tabular-nums">{p.pct}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
