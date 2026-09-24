import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Check, X, Sparkles } from 'lucide-react';
import type { Language } from '../App';
import { Skeleton, Fresh, EASE } from './ScreenHeader';
import { tidy } from '../lib/tipsAdapters';
import { allocate, type useCourseCategories, type CategorySection, type PlanItem } from '../lib/courseCategories';

export type { PlanItem } from '../lib/courseCategories';

const t = {
  en: {
    title: 'Credits to graduate', loading: 'Reading your graduation check from TIPS…',
    left: (n: number) => `${n} left`, done: 'Done', needed: 'Needed', total: (n: number) => `${n} credits still needed`,
    afterPlan: (n: number) => `${n} after your plan`, earned: 'Earned', inProgress: 'In progress', planned: 'Planned',
    beyond: (n: number) => `+${n} beyond this section's requirement`, plan: 'Your plan', emptyPlan: 'Tap "Plan" on a course below to see what it covers.',
    completed: 'Completed', remove: 'Remove from plan', cr: 'cr', hint: 'From your TIPS graduation check. Registered courses count as in progress.',
  },
  jp: {
    title: '卒業に必要な単位', loading: 'TIPSの卒業要件を読み込み中…',
    left: (n: number) => `残り${n}単位`, done: '充足', needed: '要修得', total: (n: number) => `あと${n}単位`,
    afterPlan: (n: number) => `計画後 ${n}単位`, earned: '修得済', inProgress: '履修中', planned: '計画',
    beyond: (n: number) => `この区分の必要単位を${n}単位超えています`, plan: '履修計画', emptyPlan: '下の科目の「計画」を押すと、どの区分を満たすか確認できます。',
    completed: '充足済みの区分', remove: '計画から外す', cr: '単位', hint: 'TIPSの卒業要件より。登録済みの科目は履修中として数えています。',
  },
};

/** "IV" pill for a course: highlighted while the student still needs credits in that section. */
export function SectionChip({ section, needed, done = false, isDark, lang, category }: { section: string | null | undefined; needed: boolean; done?: boolean; isDark: boolean; lang: Language; category?: string }) {
  if (!section) return null;
  return (
    <span title={category ? tidy(category) : undefined}
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-black tracking-wide ${needed
        ? 'bg-brand-yellow text-brand-black'
        : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
      {section}
      {needed ? <span className="font-bold tracking-normal">{t[lang].needed}</span> : done ? <Check className="w-3 h-3" /> : null}
    </span>
  );
}

function Bar({ s, planned, isDark }: { s: CategorySection; planned: number; isDark: boolean }) {
  const req = Math.max(s.required, 1);
  const pct = (n: number) => `${Math.min(100, (n / req) * 100)}%`;
  const plannedShown = Math.min(planned, s.remaining);
  return (
    <div className={`relative h-2.5 rounded-full overflow-hidden flex ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
      <motion.div initial={{ width: 0 }} animate={{ width: pct(s.earned) }} transition={{ duration: 0.6, ease: EASE }} className={isDark ? 'bg-white' : 'bg-brand-black'} />
      <motion.div initial={{ width: 0 }} animate={{ width: pct(s.inProgress) }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        className="bg-blue-500 bg-[length:8px_8px] bg-[linear-gradient(45deg,rgba(255,255,255,.35)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.35)_50%,rgba(255,255,255,.35)_75%,transparent_75%)]" />
      <motion.div initial={false} animate={{ width: pct(plannedShown) }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="bg-brand-yellow" />
    </div>
  );
}

/**
 * What the student still needs per graduation section, live against their plan: picking a
 * course subtracts its credits from the section it counts toward.
 */
export default function CreditsNeeded({ lang, isDark, cats, plan, onRemove }: {
  lang: Language; isDark: boolean; cats: ReturnType<typeof useCourseCategories>; plan: PlanItem[]; onRemove: (code: string) => void;
}) {
  const tx = t[lang];
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const data = (lang === 'en' ? cats.en.data : cats.ja.data) ?? cats.ja.data ?? cats.en.data;

  if (!data) {
    return (
      <div className={`rounded-3xl p-5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className={`text-xs font-bold mb-3 ${muted}`}>{tx.loading}</div>
        <Skeleton isDark={isDark} className="h-6 w-40 rounded-lg" />
        <Skeleton isDark={isDark} className="mt-4 h-2.5 rounded-full" />
        <Skeleton isDark={isDark} className="mt-4 h-2.5 rounded-full" />
      </div>
    );
  }

  const alloc = allocate(plan, data.sections);
  const plannedIn = (sec: string) => plan.filter(p => alloc.get(p.code)?.section === sec).reduce((a, p) => a + p.credits, 0);
  const counted = data.sections.filter(s => s.required > 0);
  const open = counted.filter(s => s.remaining > 0);
  const closed = counted.filter(s => s.remaining === 0);
  const totalLeft = open.reduce((a, s) => a + s.remaining, 0);
  const afterPlan = open.reduce((a, s) => a + Math.max(0, s.remaining - plannedIn(s.section)), 0);

  return (
    <section className={`rounded-3xl p-5 sm:p-6 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 className="font-bold text-lg flex items-center gap-2"><GraduationCap className="w-5 h-5 text-brand-yellow" />{tx.title}</h2>
        <div className="text-right">
          <div className="text-2xl font-bold leading-none"><Fresh value={totalLeft}>{tx.total(totalLeft)}</Fresh></div>
          <AnimatePresence initial={false}>
            {plan.length > 0 && afterPlan !== totalLeft && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`text-sm font-bold mt-1 ${isDark ? 'text-brand-yellow' : 'text-amber-600'}`}>
                → <Fresh value={afterPlan}>{tx.afterPlan(afterPlan)}</Fresh>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className={`mt-1 text-xs font-medium ${muted}`}>{tx.hint}</p>

      <div className="mt-5 space-y-4">
        {open.map(s => {
          const planned = plannedIn(s.section);
          const left = Math.max(0, s.remaining - planned);
          const beyond = Math.max(0, planned - s.remaining);
          return (
            <motion.div layout key={s.section} className={`rounded-2xl p-4 border-2 ${left > 0 ? 'border-brand-yellow' : 'border-green-500'} ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
              <div className="flex items-start gap-3">
                <span className={`shrink-0 min-w-10 h-10 px-2 rounded-xl flex items-center justify-center text-sm font-black ${left > 0 ? 'bg-brand-yellow text-brand-black' : 'bg-green-500 text-white'}`}>{s.section}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm leading-snug break-words">{tidy(s.name)}</div>
                  {s.items.filter(i => i.remaining > 0).map(i => (
                    <div key={i.name} className={`text-[11px] font-medium leading-snug mt-0.5 break-words ${muted}`}>{tidy(i.name)} · {tx.left(i.remaining)}</div>
                  ))}
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold leading-none ${left > 0 ? '' : 'text-green-600'}`}>
                    <Fresh value={left}>{left > 0 ? left : <Check className="w-5 h-5 inline" />}</Fresh>
                  </div>
                  <div className={`text-[10px] font-bold mt-0.5 ${muted}`}>{left > 0 ? tx.cr : tx.done}</div>
                </div>
              </div>
              <div className="mt-3"><Bar s={s} planned={planned} isDark={isDark} /></div>
              <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold ${muted}`}>
                <span className="flex items-center gap-1"><i className={`w-2 h-2 rounded-full ${isDark ? 'bg-white' : 'bg-brand-black'}`} />{tx.earned} {s.earned}/{s.required}</span>
                {s.inProgress > 0 && <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-blue-500" />{tx.inProgress} {s.inProgress}</span>}
                {planned > 0 && <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-brand-yellow" />{tx.planned} {planned}</span>}
              </div>
              {beyond > 0 && <p className="mt-2 text-[11px] font-semibold text-amber-600 flex items-center gap-1"><Sparkles className="w-3 h-3" />{tx.beyond(beyond)}</p>}
            </motion.div>
          );
        })}

        {closed.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-bold mr-1 ${muted}`}>{tx.completed}</span>
            {closed.map(s => (
              <span key={s.section} title={tidy(s.name)} className={`h-7 px-2.5 rounded-full text-[11px] font-black flex items-center gap-1 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {s.section}<Check className="w-3 h-3 text-green-600" />
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>{tx.plan}</div>
        {plan.length === 0 && <p className={`text-xs font-medium ${muted}`}>{tx.emptyPlan}</p>}
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {plan.map(p => (
              <motion.span key={p.code} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.2, ease: EASE }}
                className={`h-9 pl-2 pr-1 rounded-full text-xs font-bold flex items-center gap-1.5 max-w-full ${isDark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
                {alloc.get(p.code)?.section && (
                  <span className={`px-1.5 rounded-md text-[10px] font-black ${alloc.get(p.code)!.beyond ? (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600') : 'bg-brand-yellow text-brand-black'}`}>
                    {alloc.get(p.code)!.via ? `${alloc.get(p.code)!.via}→` : ''}{alloc.get(p.code)!.section}
                  </span>
                )}
                <span className="truncate">{tidy(p.title)}</span>
                <span className={muted}>{p.credits} {tx.cr}</span>
                <button onClick={() => onRemove(p.code)} aria-label={`${tx.remove}: ${tidy(p.title)}`} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10"><X className="w-3.5 h-3.5" /></button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
