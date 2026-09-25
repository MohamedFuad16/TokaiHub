import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { CalendarCheck, Clock, AlertTriangle, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { EASE } from './ScreenHeader';
import { GradingChart, Linked } from './SyllabusText';
import { analyzeGrading, type GradingAnalysis, type GradingRule } from '../lib/grading';

type Lang = 'en' | 'jp';

const t = {
  en: {
    weighted: 'Weights stated', single: 'One component', unweighted: 'Weights not stated', none: 'Not broken down',
    parts: (n: number) => `${n} components named`, seeRubric: 'See the rubric', notListed: 'Not broken down in the syllabus',
    scale: 'Grade scale', rules: 'To be graded', minAttend: (p: number) => `Attend at least ${p}% of classes`,
    maxAbs: (n: number) => `No more than ${n} absence${n === 1 ? '' : 's'}`, late: (m: number) => `${m}+ min late counts as absent`,
    you: (rate: number, abs: number) => `You: ${rate}% attended · ${abs} absence${abs === 1 ? '' : 's'}`,
  },
  jp: {
    weighted: '配分あり', single: '評価項目1つ', unweighted: '配分の記載なし', none: '内訳の記載なし',
    parts: (n: number) => `評価項目${n}つ`, seeRubric: 'ルーブリック参照', notListed: 'シラバスに内訳の記載なし',
    scale: '評価基準', rules: '評価の条件', minAttend: (p: number) => `出席率${p}%以上が必要`,
    maxAbs: (n: number) => `欠席は${n}回まで`, late: (m: number) => `${m}分以上の遅刻は欠席扱い`,
    you: (rate: number, abs: number) => `あなた: 出席率${rate}%・欠席${abs}回`,
  },
};

// Letters are dark: white on these segments measures 1.7 to 3.8:1.
const GRADE_COLOR: Record<string, string> = { S: 'bg-emerald-500', A: 'bg-green-500', B: 'bg-lime-500', C: 'bg-amber-400', D: 'bg-orange-500', E: 'bg-red-500' };

/** Same-size ring for courses whose syllabus names no weights, so every grading card lines up. */
function OpenRing({ a, isDark, lang }: { a: GradingAnalysis; isDark: boolean; lang: Lang }) {
  const tx = t[lang];
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden>
          <motion.circle cx="50" cy="50" r="42" fill="none" strokeWidth="14" strokeDasharray="6 5"
            className={isDark ? 'stroke-gray-600' : 'stroke-gray-300'}
            initial={{ opacity: 0, rotate: -30 }} animate={{ opacity: 1, rotate: 0 }} transition={{ duration: 0.6, ease: EASE }} style={{ transformOrigin: '50px 50px' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          {a.mode === 'none' ? <FileText className={`w-6 h-6 ${muted}`} /> : <div className="text-2xl font-bold leading-none">?</div>}
          <div className={`mt-1 text-[10px] font-bold leading-tight ${muted}`}>{a.mode === 'none' ? (a.rubric ? tx.seeRubric : tx.notListed) : tx.parts(a.parts.length)}</div>
        </div>
      </div>
      {a.parts.length > 0 && (
        <ul className="w-full min-w-0 space-y-1.5">
          {a.parts.map(p => (
            <li key={p.label} className="min-h-10 flex items-center gap-3 px-3 py-2 rounded-xl">
              <span className={`w-3 h-3 rounded-full shrink-0 border-2 border-dashed ${isDark ? 'border-gray-500' : 'border-gray-400'}`} />
              <span className="flex-1 min-w-0 text-sm font-semibold leading-snug [word-break:keep-all] [overflow-wrap:anywhere]">{lang === 'en' ? p.en ?? p.label : p.label}</span>
              <span aria-hidden className={`text-sm font-bold ${muted}`}>—</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Scale({ bands, isDark, lang }: { bands: GradingAnalysis['scale']; isDark: boolean; lang: Lang }) {
  const asc = [...bands].sort((x, y) => x.min - y.min);
  return (
    <div>
      <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t[lang].scale}</div>
      <div className="flex h-9 rounded-xl overflow-hidden">
        {asc.map((b, i) => (
          <motion.div key={b.grade} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.4, delay: 0.05 * i, ease: EASE }} style={{ flexGrow: b.max - b.min + 1, transformOrigin: 'left' }}
            className={`${GRADE_COLOR[b.grade] ?? 'bg-gray-400'} flex items-center justify-center text-brand-black text-sm font-black border-r border-white/40 last:border-r-0`}>
            {b.grade}
          </motion.div>
        ))}
      </div>
      <div className="flex mt-1">
        {asc.map(b => (
          <div key={b.grade} style={{ flexGrow: b.max - b.min + 1 }} className={`text-center text-[10px] font-bold tabular-nums ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{b.min}–{b.max}</div>
        ))}
      </div>
    </div>
  );
}

const RuleRow: React.FC<{ r: GradingRule; isDark: boolean; lang: Lang; attendance?: { attended: number; absent: number } | null }> = ({ r, isDark, lang, attendance }) => {
  const tx = t[lang];
  const Icon = r.kind === 'attendance' ? CalendarCheck : r.kind === 'late' ? Clock : AlertTriangle;
  const facts = [
    r.minAttendance != null ? tx.minAttend(Math.round(r.minAttendance * 100)) : null,
    r.maxAbsences != null ? tx.maxAbs(r.maxAbsences) : null,
    r.lateMinutes != null ? tx.late(r.lateMinutes) : null,
  ].filter(Boolean) as string[];
  const held = attendance ? attendance.attended + attendance.absent : 0;
  const rate = held ? Math.round((attendance!.attended / held) * 100) : null;
  const ok = rate === null ? null
    : (r.minAttendance == null || rate >= Math.round(r.minAttendance * 100)) && (r.maxAbsences == null || attendance!.absent <= r.maxAbsences);
  return (
    <li className={`rounded-2xl p-3 ${isDark ? 'bg-gray-900/60' : 'bg-white'}`}>
      <div className="flex gap-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${r.kind === 'other' ? 'text-amber-500' : isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <div className="min-w-0 flex-1">
          {facts.length > 0 && <div className="flex flex-wrap gap-1.5 mb-1.5">{facts.map(f => <span key={f} className="text-xs font-bold">{f}</span>)}</div>}
          <p className={`text-[13px] leading-relaxed [overflow-wrap:anywhere] ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><Linked text={r.text.replace(/^[・•\s]+/, '')} isDark={isDark} /></p>
          {r.kind === 'attendance' && ok !== null && (r.minAttendance != null || r.maxAbsences != null) && (
            <span className={`mt-2 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold ${ok ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
              {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{tx.you(rate!, attendance!.absent)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
};

/**
 * The grading card, laid out the same way for every course: what the grade is made of (always a
 * ring of the same size), the grade scale, the conditions for being graded (with the student's
 * own attendance when TIPS has it), then files and the syllabus wording.
 */
export default function GradingPanel({ text, lang, isDark, attendance, after }: {
  text: string; lang: Lang; isDark: boolean;
  attendance?: { attended: number; absent: number } | null;
  /** Attachments and the original wording, below the analysis. */
  after?: React.ReactNode;
}) {
  const a = useMemo(() => analyzeGrading(text), [text]);
  const tx = t[lang];
  const badge = { weighted: tx.weighted, single: tx.single, unweighted: tx.unweighted, none: tx.none }[a.mode];
  return (
    <div className="space-y-5">
      <span className={`inline-flex h-6 items-center px-2 rounded-full text-[11px] font-bold ${a.mode === 'weighted' || a.mode === 'single' ? 'bg-brand-yellow/30' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{badge}</span>
      {a.mode === 'weighted' || a.mode === 'single'
        ? <GradingChart parts={a.parts.map(p => ({ label: lang === 'en' ? p.en ?? p.label : p.label, pct: p.pct ?? 0 }))} isDark={isDark} lang={lang} />
        : <OpenRing a={a} isDark={isDark} lang={lang} />}
      {a.scale.length >= 3 && <Scale bands={a.scale} isDark={isDark} lang={lang} />}
      {a.rules.length > 0 && (
        <div>
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.rules}</div>
          <ul className="space-y-2">{a.rules.map((r, i) => <RuleRow key={i} r={r} isDark={isDark} lang={lang} attendance={attendance} />)}</ul>
        </div>
      )}
      {after}
    </div>
  );
}
