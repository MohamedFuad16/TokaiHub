import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, SlidersHorizontal, CheckCircle2, Lock, CalendarX, Circle, ListPlus, ListChecks, Plus, RefreshCw, ChevronDown, Snowflake } from 'lucide-react';
import type { Language } from '../App';
import { EASE, TAP, Skeleton } from './ScreenHeader';
import { SectionChip } from './CreditsNeeded';
import { getRecommend } from '../lib/api';
import { tidy } from '../lib/tipsAdapters';
import { buildPlan, scoreOf, usable, DEFAULT_PREFS, type Prefs, type Ranked, type Reason, type DeliveryPref, type AssessmentPref } from '../lib/recommend';
import type { Offering, RecommendStatus, RequiredCourse } from '../lib/recommendTypes';

const t = {
  en: {
    title: 'Picked for you', building: 'Reading TIPS to find your best courses…',
    steps: { records: 'Your records', sections: 'Course sections', syllabus: 'Syllabi', model: 'Jev' } as Record<string, string>,
    firstTime: 'The first look takes a few minutes; after that it is instant. You can keep using the app.',
    target: (n: number) => `Plan ${n} more credit${n === 1 ? '' : 's'} this term`,
    termTotal: (reg: number, n: number) => `${reg + n} this term with the ${reg} already registered`,
    frozen: (n: number) => `${n} credits wait for later`, cap: (n: number) => `Room for ${n} under your credit limit`,
    prefs: 'Preferences', delivery: 'Class format', assessment: 'Graded on',
    any: 'Any', remote: 'Online', inPerson: 'In person', assignments: 'Assignments', exams: 'Exams',
    continueSeries: 'Next level of what I studied', lighter: 'Lighter workload', avoidFirst: 'Avoid 1st period',
    required: 'Required courses', plan: 'Best plan', total: (c: number, tgt: number) => `${c} of ${tgt} credits`,
    planAll: 'Plan all', others: 'More good options', showMore: 'Show more', register: 'Register', planned: 'Planned', add: 'Plan',
    noPlan: 'Nothing registrable fits right now. Try other preferences, or check the slot view.',
    status: { earned: 'Earned', registered: 'Chosen', available: 'Take this term', locked: 'Not yet', not_offered: 'Not offered this term' } as Record<string, string>,
    reason: { remote: 'Online', in_person: 'In person', assignment: 'Assignment-based', exam: 'Exam-based', continues: 'Next level', light: 'Light workload', required: 'Required', required_elective: 'Required elective', first_period: '1st period' } as Record<Reason, string>,
    next: (x: string) => `after ${x}`, model: 'Jev read the syllabi', noModel: 'Add a TypeSafe key on the Mac for Jev to read grading style and workload.',
    refresh: 'Rebuild', failed: 'Could not finish reading TIPS', cr: 'cr',
  },
  jp: {
    title: 'あなたへのおすすめ', building: 'TIPSを読み込んで、最適な科目を探しています…',
    steps: { records: '成績・履修情報', sections: '開講クラス', syllabus: 'シラバス', model: 'Jev' } as Record<string, string>,
    firstTime: '初回は数分かかります。以降はすぐに表示されます。このままアプリを使えます。',
    target: (n: number) => `今学期あと${n}単位を計画`,
    termTotal: (reg: number, n: number) => `登録済み${reg}単位と合わせて今学期${reg + n}単位`,
    frozen: (n: number) => `${n}単位は来年度以降`, cap: (n: number) => `登録上限まであと${n}単位`,
    prefs: '希望', delivery: '授業形態', assessment: '評価方法',
    any: '指定なし', remote: 'オンライン', inPerson: '対面', assignments: '課題中心', exams: '試験中心',
    continueSeries: '履修済み科目の次のレベル', lighter: '負担が軽い', avoidFirst: '1限を避ける',
    required: '必修科目', plan: 'おすすめの組み合わせ', total: (c: number, tgt: number) => `${tgt}単位中${c}単位`,
    planAll: 'すべて計画に追加', others: 'その他のおすすめ', showMore: 'もっと見る', register: '登録', planned: '計画済み', add: '計画',
    noPlan: '今登録できる科目で条件に合うものがありません。希望を変えるか、コマから探してください。',
    status: { earned: '修得済', registered: '登録済み', available: '今学期に履修', locked: '条件未達', not_offered: '今学期は開講なし' } as Record<string, string>,
    reason: { remote: 'オンライン', in_person: '対面', assignment: '課題中心', exam: '試験中心', continues: '次のレベル', light: '負担が軽い', required: '必修', required_elective: '選択必修', first_period: '1限' } as Record<Reason, string>,
    next: (x: string) => `${x}の次`, model: 'Jevがシラバスを分析済み', noModel: 'MacにTypeSafeのキーを設定すると、Jevが評価方法や負担を読み取ります。',
    refresh: '再作成', failed: 'TIPSの読み込みが完了しませんでした', cr: '単位',
  },
};

const PREFS_KEY = 'tokaihub_smart_prefs';
function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }; } catch { return DEFAULT_PREFS; }
}

function Segmented<T extends string>({ id, value, options, onChange, isDark }: { id: string; value: T; options: [T, string][]; onChange: (v: T) => void; isDark: boolean }) {
  return (
    <div className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={`relative flex-1 min-h-9 px-2 rounded-lg text-xs font-bold transition-colors ${value === v ? (isDark ? 'text-brand-black' : 'text-brand-black') : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {value === v && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-0 rounded-lg bg-brand-yellow" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

const DAY = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], jp: ['日', '月', '火', '水', '木', '金', '土'] };
const slotLabel = (o: Offering, lang: Language) => o.slots.length ? o.slots.map(s => `${DAY[lang][s.day]}${s.period}`).join(' ') : (o.slotText || '—');

const PickCard: React.FC<{
  r: Ranked; lang: Language; isDark: boolean; planned: boolean; onPlan: () => void; onRegister: () => void; needed: boolean; done: boolean;
}> = ({ r, lang, isDark, planned, onPlan, onRegister, needed, done }) => {
  const tx = t[lang];
  const o = r.o;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: EASE }}
      className={`rounded-2xl p-4 ${isDark ? 'bg-gray-900' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black">{o.code}<span className={`ml-2 font-bold ${muted}`}>{slotLabel(o, lang)}</span></div>
          <div className="font-bold text-sm leading-snug mt-0.5 break-words">{tidy(o.title)}</div>
          <div className={`text-xs font-medium mt-1 ${muted}`}>{[tidy(o.teacher), o.delivery.label].filter(Boolean).join(' · ')}</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <SectionChip section={o.section} needed={needed} done={done} isDark={isDark} lang={lang} />
            {r.reasons.filter(x => x !== 'first_period').map(x => (
              <span key={x} className={`h-6 px-2 rounded-full text-[11px] font-bold flex items-center ${x === 'required' ? 'bg-red-500/15 text-red-600' : 'bg-green-500/15 text-green-700'}`}>
                {x === 'continues' && o.continues ? tx.next(tidy(o.continues)) : tx.reason[x]}
              </span>
            ))}
            {o.assessment.style !== 'unknown' && !r.reasons.includes('assignment') && !r.reasons.includes('exam') && (
              <span className={`h-6 px-2 rounded-full text-[11px] font-bold flex items-center ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                {o.assessment.style === 'assignment' ? tx.reason.assignment : o.assessment.style === 'exam' ? tx.reason.exam : o.assessment.style === 'mixed' ? `${Math.round(o.assessment.examShare * 100)}% ${lang === 'en' ? 'exams' : '試験'}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0"><div className="text-lg font-bold leading-none">{o.credits}</div><div className={`text-[10px] font-bold ${muted}`}>{tx.cr}</div></div>
      </div>
      <div className="flex gap-2 mt-3">
        <motion.button whileTap={TAP} onClick={onPlan} aria-pressed={planned}
          className={`h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1 ${planned ? 'bg-brand-yellow text-brand-black' : isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {planned ? <ListChecks className="w-3.5 h-3.5" /> : <ListPlus className="w-3.5 h-3.5" />}{planned ? tx.planned : tx.add}
        </motion.button>
        <motion.button whileTap={TAP} onClick={onRegister} disabled={!usable(o)}
          className={`flex-1 h-10 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-40 ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'}`}>
          <Plus className="w-3.5 h-3.5" />{tx.register}
        </motion.button>
      </div>
    </motion.div>
  );
};

const STATUS_ICON = { earned: CheckCircle2, registered: CheckCircle2, available: Circle, locked: Lock, not_offered: CalendarX };

/**
 * "For you": required courses first (already registered ones shown as chosen), the best plan for
 * this term's credits under the student's preferences, then more options per section. Data from
 * the bridge's recommender; ranking happens here, so preference changes are instant.
 */
export default function SmartPicks({ lang, isDark, needed, done, plannedCodes, onPlan, onPlanAll, onRegister }: {
  lang: Language; isDark: boolean; needed: Set<string>; done: Set<string>;
  plannedCodes: Set<string>; onPlan: (o: Offering) => void; onPlanAll: (os: Offering[]) => void; onRegister: (o: Offering) => void;
}) {
  const tx = t[lang];
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const [st, setSt] = useState<RecommendStatus | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [showPrefs, setShowPrefs] = useState(false);
  const [more, setMore] = useState(8);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const poll = async (refresh = false) => {
      try {
        const s = await getRecommend(lang, refresh);
        if (!alive) return;
        setSt(s);
        if (s.building) timer = window.setTimeout(() => poll(), 3000);
      } catch { if (alive) timer = window.setTimeout(() => poll(), 8000); }
    };
    void poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [lang]);

  const save = (p: Prefs) => { setPrefs(p); try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* private mode */ } };
  const data = st?.data ?? null;
  const plan = useMemo(() => (data ? buildPlan(data, prefs) : null), [data, prefs]);
  const others = useMemo(() => {
    if (!data || !plan) return [];
    const inPlan = new Set(plan.picks.map(p => p.o.code));
    const seen = new Set(plan.picks.map(p => p.o.title));
    return data.offerings.filter(o => usable(o) && !inPlan.has(o.code) && (o.section ? needed.has(o.section) || o.mark === 'elective' : false))
      .map(o => scoreOf(o, prefs)).sort((a, b) => b.score - a.score)
      .filter(r => (seen.has(r.o.title) ? false : (seen.add(r.o.title), true)));
  }, [data, plan, prefs, needed]);

  if (!data) {
    const p = st?.progress;
    return (
      <div className={`rounded-3xl p-5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-yellow" />{tx.title}</div>
        <p className={`text-sm font-medium mt-2 ${muted}`}>{st?.error ? `${tx.failed}: ${st.error}` : tx.building}</p>
        {p && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold mb-1.5"><span>{tx.steps[p.step] ?? p.step}</span><span className={muted}>{p.total ? `${p.done}/${p.total}` : ''}</span></div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <motion.div className="h-full bg-brand-yellow" animate={{ width: p.total ? `${Math.max(4, (p.done / p.total) * 100)}%` : '4%' }} transition={{ duration: 0.4, ease: EASE }} />
            </div>
          </div>
        )}
        <p className={`text-xs font-medium mt-3 ${muted}`}>{tx.firstTime}</p>
        {!p && !st?.error && <><Skeleton isDark={isDark} className="mt-4 h-24 rounded-2xl" /><Skeleton isDark={isDark} className="mt-3 h-24 rounded-2xl" /></>}
      </div>
    );
  }

  const c = data.credits;
  const frozenCredits = c.frozen.reduce((a, f) => a + f.credits, 0);
  const sectionsNeeded = data.sections.filter(s => s.remaining > 0).map(s => s.section);
  const statusOrder: RequiredCourse['status'][] = ['available', 'registered', 'locked', 'not_offered', 'earned'];

  return (
    <div className="space-y-4">
      {/* Target */}
      <section className={`rounded-3xl p-5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-yellow" />{tx.title}</div>
            <div className="text-2xl font-bold mt-2 leading-tight">{tx.target(c.target)}</div>
            <div className={`text-xs font-semibold mt-1 ${muted}`}>{tx.termTotal(c.registered, c.target)}</div>
          </div>
          <button onClick={() => { setSt(s => (s ? { ...s, building: true } : s)); void getRecommend(lang, true).then(setSt); }} aria-label={tx.refresh}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-white'}`}><RefreshCw className={`w-4 h-4 ${st?.building ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {frozenCredits > 0 && (
            <span title={c.frozen.map(f => `${tidy(f.title)} (${f.reason})`).join('\n')} className={`h-7 px-2.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <Snowflake className="w-3.5 h-3.5" />{tx.frozen(frozenCredits)}: {c.frozen.map(f => tidy(f.title)).join(', ')}
            </span>
          )}
          {c.limit !== null && <span className={`h-7 px-2.5 rounded-full text-[11px] font-bold flex items-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>{tx.cap(c.limit - c.registered)}</span>}
          <span className={`h-7 px-2.5 rounded-full text-[11px] font-bold flex items-center ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white border border-gray-200 text-gray-600'}`}>{data.model ? tx.model : tx.noModel}</span>
        </div>
      </section>

      {/* Preferences */}
      <section className={`rounded-3xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <button onClick={() => setShowPrefs(v => !v)} aria-expanded={showPrefs} className="w-full min-h-12 px-5 flex items-center gap-2 font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-brand-yellow" />{tx.prefs}<ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showPrefs ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {showPrefs && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: EASE }} className="overflow-hidden">
              <div className="px-5 pb-5 space-y-4">
                {sectionsNeeded.map(sec => {
                  const p = prefs.sections[sec] ?? { delivery: 'any' as DeliveryPref, assessment: 'any' as AssessmentPref };
                  const set = (patch: Partial<typeof p>) => save({ ...prefs, sections: { ...prefs.sections, [sec]: { ...p, ...patch } } });
                  return (
                    <div key={sec} className="space-y-2">
                      <div className="text-xs font-bold flex items-center gap-2"><SectionChip section={sec} needed done={false} isDark={isDark} lang={lang} />{tidy(data.sections.find(s => s.section === sec)?.name ?? '')}</div>
                      <div className={`text-[11px] font-bold ${muted}`}>{tx.delivery}</div>
                      <Segmented<DeliveryPref> id={`d-${sec}`} isDark={isDark} value={p.delivery} onChange={v => set({ delivery: v })} options={[['any', tx.any], ['remote', tx.remote], ['in_person', tx.inPerson]]} />
                      <div className={`text-[11px] font-bold ${muted}`}>{tx.assessment}</div>
                      <Segmented<AssessmentPref> id={`a-${sec}`} isDark={isDark} value={p.assessment} onChange={v => set({ assessment: v })} options={[['any', tx.any], ['assignment', tx.assignments], ['exam', tx.exams]]} />
                    </div>
                  );
                })}
                {([['continueSeries', tx.continueSeries], ['lighter', tx.lighter], ['avoidFirstPeriod', tx.avoidFirst]] as const).map(([k, label]) => (
                  <label key={k} className="flex items-center justify-between gap-3 min-h-10 text-sm font-semibold cursor-pointer">
                    {label}
                    <input type="checkbox" checked={prefs[k]} onChange={e => save({ ...prefs, [k]: e.target.checked })} className="w-5 h-5 accent-black" />
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Required */}
      {data.required.length > 0 && (
        <section>
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>{tx.required}</div>
          <div className="space-y-1.5">
            {[...data.required].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)).map(r => {
              const Icon = STATUS_ICON[r.status];
              const tone = r.status === 'available' ? 'text-red-600' : r.status === 'earned' || r.status === 'registered' ? 'text-green-600' : muted;
              return (
                <div key={r.title} className={`flex items-center gap-3 p-3 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} ${r.status === 'earned' ? 'opacity-60' : ''}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${tone}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold leading-snug break-words">{tidy(r.title)}</div>
                    {r.reason && r.status === 'locked' && <div className={`text-[11px] font-medium ${muted}`}>{r.reason}</div>}
                  </div>
                  <span className={`text-[11px] font-bold shrink-0 ${tone}`}>{tx.status[r.status]}</span>
                  <span className={`text-xs font-bold shrink-0 ${muted}`}>{r.credits}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Best plan */}
      {plan && (
        <section>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}>{tx.plan}<span className="ml-2 normal-case tracking-normal">{tx.total(plan.credits, plan.target)}</span></div>
            {plan.picks.length > 0 && (
              <button onClick={() => onPlanAll(plan.picks.map(p => p.o))} className={`h-9 px-3 rounded-xl text-xs font-bold ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>{tx.planAll}</button>
            )}
          </div>
          {plan.picks.length === 0 && <p className={`text-sm font-medium ${muted}`}>{tx.noPlan}</p>}
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {plan.picks.map(r => (
                <PickCard key={r.o.code} r={r} lang={lang} isDark={isDark} planned={plannedCodes.has(r.o.code)} onPlan={() => onPlan(r.o)} onRegister={() => onRegister(r.o)}
                  needed={!!r.o.section && needed.has(r.o.section)} done={!!r.o.section && done.has(r.o.section)} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* More options */}
      {others.length > 0 && (
        <section>
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>{tx.others}</div>
          <div className="space-y-2">
            {others.slice(0, more).map(r => (
              <PickCard key={r.o.code} r={r} lang={lang} isDark={isDark} planned={plannedCodes.has(r.o.code)} onPlan={() => onPlan(r.o)} onRegister={() => onRegister(r.o)}
                needed={!!r.o.section && needed.has(r.o.section)} done={!!r.o.section && done.has(r.o.section)} />
            ))}
          </div>
          {others.length > more && <button onClick={() => setMore(m => m + 8)} className={`mt-2 w-full h-10 rounded-xl text-xs font-bold ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>{tx.showMore}</button>}
        </section>
      )}
    </div>
  );
}
