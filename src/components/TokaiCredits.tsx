import React, { useMemo, useState } from 'react';
import { GraduationCap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenProps } from '../App';
import PageShell, { Card, SectionTitle, Pill, Loading, LoadError, Skeleton, Fresh, EASE } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { pct, termLabel, tidy } from '../lib/tipsAdapters';
import type { TipsGrades, TipsGraduation } from '../lib/types';

const t = {
  en: {
    title: 'Grades & Credits', asOf: (d: string) => `From TIPS, as of ${d}`, earned: 'Credits earned', more: (n: number) => `${n} more credits to graduate`,
    done: 'Graduation credits complete', cumulative: 'Cumulative', rank: (r: number, c: number) => `Latest term rank: ${r} of ${c}`,
    requirements: 'Graduation requirements', perTerm: 'Credits by semester', total: (n: number | null) => `total ${n ?? '—'}`,
    grades: 'Course grades', all: 'All terms', passed: 'Passed', notPassed: 'Not passed', loading: 'Loading grades from TIPS…', cr: 'cr',
  },
  jp: {
    title: '成績・単位', asOf: (d: string) => `TIPS ${d} 現在`, earned: '修得単位数', more: (n: number) => `卒業まであと${n}単位`,
    done: '卒業単位を満たしています', cumulative: '通算', rank: (r: number, c: number) => `直近学期の順位：${c}人中${r}位`,
    requirements: '卒業要件（自己判定）', perTerm: 'セメスター別修得単位', total: (n: number | null) => `累計 ${n ?? '—'}`,
    grades: '科目別成績', all: 'すべての学期', passed: '合格', notPassed: '不合格', loading: 'TIPSから成績を読み込み中…', cr: '単位',
  },
};

const GRADE_COLOR: Record<string, string> = { S: 'bg-brand-green', A: 'bg-brand-yellow', B: 'bg-blue-200', C: 'bg-orange-200', D: 'bg-brand-pink', E: 'bg-red-300' };

export default function TokaiCredits(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const grades = useTips<TipsGrades>('grades');
  const graduation = useTips<TipsGraduation>('graduation');
  const [termFilter, setTermFilter] = useState<string>('all');

  const g = grades.data;
  const grad = graduation.data;
  const earned = grad?.total?.earned ?? g?.totalEarned ?? 0;
  const required = grad?.total?.required ?? null;
  const shortfall = grad?.total?.shortfall ?? null;
  const last = g?.gpa[g.gpa.length - 1];

  // Term keys ("2026-1") newest first, labelled in the UI language.
  const terms = useMemo(() => {
    const keys = [...new Set((g?.courses ?? []).map(c => `${c.year}-${c.term}`))].sort().reverse();
    return keys.map(k => { const [y, tm] = k.split('-'); return { key: k, label: termLabel(tm as '1' | '2', Number(y), lang) }; });
  }, [g, lang]);
  const visible = useMemo(() => (g?.courses ?? []).filter(c => termFilter === 'all' || `${c.year}-${c.term}` === termFilter), [g, termFilter]);
  const grouped = useMemo(() => terms.map(tm => ({ ...tm, courses: visible.filter(c => `${c.year}-${c.term}` === tm.key) })).filter(x => x.courses.length), [terms, visible]);

  return (
    <PageShell {...props} title={tx.title} subtitle={g?.asOf ? tx.asOf(g.asOf) : undefined} onRefresh={() => { grades.refresh(); graduation.refresh(); }} refreshing={grades.loading || graduation.loading}>
      {!g && grades.error && <LoadError error={grades.error} isDark={isDark} lang={lang} onRetry={grades.refresh} />}
      {!g && !grades.error && (
        <>
          <Loading text={tx.loading} isDark={isDark} rows={0} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <Skeleton isDark={isDark} className="h-44 rounded-3xl" />
              <Skeleton isDark={isDark} className="h-64 rounded-3xl" />
            </div>
            <Skeleton isDark={isDark} className="h-80 rounded-3xl" />
          </div>
        </>
      )}
      {g && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              {/* Credits toward graduation */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="relative overflow-hidden rounded-3xl p-6 bg-brand-black text-white">
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-brand-yellow/10" />
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{tx.earned}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-bold tracking-tight leading-none"><Fresh value={earned}>{earned}</Fresh></span>
                      {required !== null && <span className="text-gray-500 text-lg font-semibold mb-1">/ {required}</span>}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-yellow/20 flex items-center justify-center"><GraduationCap className="w-6 h-6 text-brand-yellow" /></div>
                </div>
                {required !== null && (
                  <>
                    <div className="h-2 rounded-full bg-white/10 mb-2">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct(earned, required), 100)}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-brand-yellow" />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-medium">{shortfall && shortfall < 0 ? tx.more(Math.abs(shortfall)) : tx.done}</span>
                      <span className="text-gray-400 font-semibold">{pct(earned, required)}%</span>
                    </div>
                  </>
                )}
              </motion.div>

              {/* GPA by term */}
              <Card isDark={isDark} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${muted}`}><TrendingUp className="w-4 h-4" />GPA</h3>
                  {last && <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-lg">{tx.cumulative} {last.cumulativeGpa.toFixed(2)}</span>}
                </div>
                <div className="flex items-end gap-3 h-44">
                  {g.gpa.map(x => (
                    <div key={`${x.year}-${x.term}`} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 min-w-0">
                      <span className="text-xs font-bold">{x.termGpa.toFixed(2)}</span>
                      <motion.div initial={{ height: 0 }} animate={{ height: `${(x.termGpa / 4) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[44px] rounded-xl bg-brand-yellow" />
                      <span className={`text-[10px] font-bold truncate ${muted}`}>{termLabel(x.term, x.year, lang).replace(' Semester', '').replace('年度 ', '/')}</span>
                    </div>
                  ))}
                </div>
                {last?.rank && last.cohort && <p className={`text-xs font-medium mt-4 ${muted}`}>{tx.rank(last.rank, last.cohort)}</p>}
              </Card>

              {/* Credits per semester */}
              {g.perTerm.length > 0 && (
                <div>
                  <SectionTitle>{tx.perTerm}</SectionTitle>
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                    {g.perTerm.map(x => (
                      <Card key={x.label} isDark={isDark} className="p-3 text-center">
                        <div className={`text-[10px] font-bold ${muted}`}>{x.label.replace(/^(\d{2})(?=\D)/, '$1 ')}</div>
                        <div className="text-xl font-bold">{x.earned}</div>
                        <div className={`text-[10px] font-semibold ${muted}`}>{tx.total(x.cumulative)}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Graduation requirements */}
            {grad && (
              <Card isDark={isDark} className="p-5 sm:p-6 self-start">
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-5 ${muted}`}>{tx.requirements}</h3>
                <div className="space-y-5">
                  {grad.groups.map(group => {
                    const items = group.items.filter(i => (i.required ?? 0) > 0);
                    if (!items.length) return null;
                    return (
                      <div key={group.section}>
                        <div className="text-sm font-bold mb-2 break-words">{group.section}. {group.name}</div>
                        <div className="space-y-3">
                          {items.map(item => {
                            const p = Math.min(pct(item.earned, item.required), 100);
                            const done = (item.shortfall ?? 0) >= 0;
                            return (
                              <div key={item.name}>
                                <div className="flex justify-between mb-1 gap-3">
                                  <span className={`min-w-0 text-xs font-medium break-words ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.name}</span>
                                  <span className={`text-xs font-bold shrink-0 ${done ? 'text-green-600' : ''}`}>{item.earned}/{item.required}</span>
                                </div>
                                <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.6, ease: EASE }} className={`h-full rounded-full ${done ? 'bg-brand-green' : 'bg-brand-yellow'}`} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Grades */}
          <section>
            <SectionTitle>{tx.grades}</SectionTitle>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <Pill layoutId="grades-term" active={termFilter === 'all'} isDark={isDark} onClick={() => setTermFilter('all')}>{tx.all}</Pill>
              {terms.map(tm => <Pill key={tm.key} layoutId="grades-term" active={termFilter === tm.key} isDark={isDark} onClick={() => setTermFilter(tm.key)}>{tm.label}</Pill>)}
            </div>
            <div className="space-y-6">
              <AnimatePresence mode="popLayout" initial={false}>
              {grouped.map(group => (
                // Term groups fade out and the rest close the gap when the filter changes.
                <motion.div key={group.key} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: EASE, layout: { type: 'spring', stiffness: 400, damping: 40 } }}>
                  <div className={`text-xs font-bold mb-2 ${muted}`}>{group.label}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.courses.map((c, i) => (
                      <Card key={`${c.title}-${i}`} isDark={isDark} className="flex items-center gap-4 p-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-brand-black ${GRADE_COLOR[c.grade] ?? 'bg-brand-gray'}`}>{c.grade === '/' ? '—' : c.grade}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm leading-snug line-clamp-2">{tidy(c.title)}</div>
                          <div className={`text-xs font-medium mt-0.5 truncate ${muted}`}>{[c.category, c.subcategory].filter(Boolean).join(' · ')}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-lg font-bold leading-none">{c.credits ?? 0}</div>
                          <div className={`text-[10px] font-semibold ${c.passed ? muted : 'text-red-500'}`}>{c.passed ? tx.cr : tx.notPassed}</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}
