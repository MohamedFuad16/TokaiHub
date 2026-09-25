import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle2, Lock, CalendarX, Circle, ListPlus, ListChecks, Plus, RefreshCw, ChevronLeft, Pencil, AlertTriangle } from 'lucide-react';
import type { Language } from '../App';
import { EASE, TAP, Skeleton } from './ScreenHeader';
import { SectionChip } from './CreditsNeeded';
import { getRecommend } from '../lib/api';
import { tidy } from '../lib/tipsAdapters';
import { buildPlan, campusKey, misfitOf, scoreOf, usable, DEFAULT_PREFS, type Prefs, type Ranked, type Reason, type DeliveryPref, type AssessmentPref, type Misfit } from '../lib/recommend';
import { PERIOD_TIMES } from '../config/periods';
import type { Offering, RecommendStatus, RequiredCourse } from '../lib/recommendTypes';

const t = {
  en: {
    title: 'Picked for you', building: 'Reading TIPS to find your best courses…',
    steps: { records: 'Your records', sections: 'Course sections', syllabus: 'Syllabi', model: 'Jev' } as Record<string, string>,
    firstTime: 'The first look takes a few minutes; after that it is instant. You can keep using the app.',
    target: (n: number) => `Plan ${n} more credit${n === 1 ? '' : 's'} this term`,
    termTotal: (reg: number, n: number) => `${reg + n} this term with the ${reg} already registered`,
    cap: (n: number) => `Room for ${n} under your credit limit`,
    any: 'Either', remote: 'Online', inPerson: 'In person', assignments: 'Assignments', exams: 'Exams',
    continueSeries: 'Next level of a language or series I studied', lighter: 'Lighter workload',
    intro: 'Answer five quick questions to see the courses that fit your week.', start: 'Start', change: 'Change answers', yourAnswers: 'Your answers',
    stepOf: (i: number, n: number) => `${i} of ${n}`, back: 'Back', nextStep: 'Next', finish: 'Show my courses',
    q: {
      days: ['Which days do you want off?', 'Tap every day you want free.'],
      format: ['Online or in person?', 'Online classes work from any campus.'],
      campus: ['Which campus can you get to?', 'Online classes are included wherever they run from.'],
      periods: ['When can you be in class?', 'Tap a period to rule it out.'],
      style: ['How do you like to be graded?', ''],
    } as Record<string, [string, string]>,
    hasClasses: 'classes', bothCampuses: 'Both', noDaysOff: 'No days off', allPeriods: 'Any period',
    off: (d: string) => `Off ${d}`, periodsOnly: (p: string) => `Periods ${p}`,
    unfit: (x: string) => `${x} is required, but no section fits your answers:`,
    why: { day_off: 'it meets on a day you want off', period: 'it meets in a period you ruled out', campus: 'it runs at another campus', format: 'its format does not match' } as Record<Misfit, string>,
    hidden: (n: number) => `${n} section${n === 1 ? '' : 's'} left out by your answers`,
    required: 'Required courses', plan: 'Best plan', total: (c: number, tgt: number) => `${c} of ${tgt} credits`,
    planAll: 'Plan all', others: 'More good options', showMore: 'Show more', register: 'Register', planned: 'Planned', add: 'Plan',
    noPlan: 'Nothing registrable fits right now. Try other preferences, or check the slot view.',
    status: { earned: 'Earned', registered: 'Chosen', available: 'Take this term', locked: 'Not yet', not_offered: 'Not offered this term' } as Record<string, string>,
    reason: { remote: 'Online', in_person: 'In person', assignment: 'Assignment-based', exam: 'Exam-based', continues: 'Next level', light: 'Light workload', required: 'Required', required_elective: 'Required elective' } as Record<Reason, string>,
    next: (x: string) => `after ${x}`,
    refresh: 'Rebuild', failed: 'Could not finish reading TIPS', signedOut: 'The Mac is signed out of TIPS. Sign in again from Settings, then rebuild.', cr: 'cr',
  },
  jp: {
    title: 'あなたへのおすすめ', building: 'TIPSを読み込んで、最適な科目を探しています…',
    steps: { records: '成績・履修情報', sections: '開講クラス', syllabus: 'シラバス', model: 'Jev' } as Record<string, string>,
    firstTime: '初回は数分かかります。以降はすぐに表示されます。このままアプリを使えます。',
    target: (n: number) => `今学期あと${n}単位を計画`,
    termTotal: (reg: number, n: number) => `登録済み${reg}単位と合わせて今学期${reg + n}単位`,
    cap: (n: number) => `登録上限まであと${n}単位`,
    any: 'どちらでも', remote: 'オンライン', inPerson: '対面', assignments: '課題中心', exams: '試験中心',
    continueSeries: '履修済みの語学・シリーズ科目の次のレベル', lighter: '負担が軽い',
    intro: '5つの質問に答えると、あなたの1週間に合う科目を表示します。', start: 'はじめる', change: '回答を変更', yourAnswers: 'あなたの回答',
    stepOf: (i: number, n: number) => `${i} / ${n}`, back: '戻る', nextStep: '次へ', finish: '科目を表示',
    q: {
      days: ['休みにしたい曜日は？', '空けたい曜日をすべて選んでください。'],
      format: ['オンラインと対面、どちらがいいですか？', 'オンライン授業はどのキャンパスからでも受けられます。'],
      campus: ['通えるキャンパスは？', 'オンライン授業は開講キャンパスに関係なく含めます。'],
      periods: ['授業を受けられる時限は？', '受けられない時限をタップして外してください。'],
      style: ['評価方法の好みは？', ''],
    } as Record<string, [string, string]>,
    hasClasses: '授業あり', bothCampuses: 'どちらも', noDaysOff: '休みの曜日なし', allPeriods: '時限の指定なし',
    off: (d: string) => `${d}は休み`, periodsOnly: (p: string) => `${p}限のみ`,
    unfit: (x: string) => `${x}は必修ですが、回答に合うクラスがありません：`,
    why: { day_off: '休みにした曜日に開講', period: '外した時限に開講', campus: '別キャンパスで開講', format: '授業形態が合わない' } as Record<Misfit, string>,
    hidden: (n: number) => `回答に合わない${n}クラスを除外`,
    required: '必修科目', plan: 'おすすめの組み合わせ', total: (c: number, tgt: number) => `${tgt}単位中${c}単位`,
    planAll: 'すべて計画に追加', others: 'その他のおすすめ', showMore: 'もっと見る', register: '登録', planned: '計画済み', add: '計画',
    noPlan: '今登録できる科目で条件に合うものがありません。希望を変えるか、コマから探してください。',
    status: { earned: '修得済', registered: '登録済み', available: '今学期に履修', locked: '条件未達', not_offered: '今学期は開講なし' } as Record<string, string>,
    reason: { remote: 'オンライン', in_person: '対面', assignment: '課題中心', exam: '試験中心', continues: '次のレベル', light: '負担が軽い', required: '必修', required_elective: '選択必修' } as Record<Reason, string>,
    next: (x: string) => `${x}の次`,
    refresh: '再作成', failed: 'TIPSの読み込みが完了しませんでした', signedOut: 'MacがTIPSからサインアウトしています。設定から再度サインインしてから再作成してください。', cr: '単位',
  },
};

// Answers stay on this device. The key changed with the question flow; the old one is dropped.
const ANSWERS_KEY = 'tokaihub_for_you';
interface Answers { prefs: Prefs; answered: boolean }
function loadAnswers(): Answers {
  try {
    localStorage.removeItem('tokaihub_smart_prefs');
    const x = JSON.parse(localStorage.getItem(ANSWERS_KEY) ?? 'null');
    if (x?.prefs) return { prefs: { ...DEFAULT_PREFS, ...x.prefs }, answered: !!x.answered };
  } catch { /* private mode */ }
  return { prefs: DEFAULT_PREFS, answered: false };
}

const CAMPUS: Record<string, { en: string; jp: string }> = {
  shonan: { en: 'Shonan', jp: '湘南' }, shinagawa: { en: 'Shinagawa', jp: '品川' }, takanawa: { en: 'Takanawa', jp: '高輪' },
  yoyogi: { en: 'Yoyogi', jp: '代々木' }, kumamoto: { en: 'Kumamoto', jp: '熊本' }, sapporo: { en: 'Sapporo', jp: '札幌' },
  isehara: { en: 'Isehara', jp: '伊勢原' }, shimizu: { en: 'Shimizu', jp: '清水' },
};
const campusName = (key: string, lang: Language) => CAMPUS[key]?.[lang] ?? key;
const PERIODS = [1, 2, 3, 4, 5, 6];
const DAYS = [1, 2, 3, 4, 5, 6];

const DAY = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], jp: ['日', '月', '火', '水', '木', '金', '土'] };

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode; isDark: boolean }> = ({ on, onClick, children, isDark }) => (
  <motion.button whileTap={TAP} onClick={onClick} aria-pressed={on}
    className={`min-h-11 px-3 rounded-xl text-sm font-bold flex flex-col items-center justify-center transition-colors ${on ? 'bg-brand-yellow text-brand-black' : isDark ? 'bg-gray-900 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'}`}>
    {children}
  </motion.button>
);

/** The five questions, one per screen. Every answer has a sensible default, so Next never blocks. */
function Questions({ prefs, onChange, onDone, campuses, busyDays, lang, isDark }: {
  prefs: Prefs; onChange: (p: Prefs) => void; onDone: () => void; campuses: string[]; busyDays: Set<number>; lang: Language; isDark: boolean;
}) {
  const tx = t[lang];
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  // The campus question only when there is a choice to make.
  const steps = ['days', 'format', ...(campuses.length > 1 ? ['campus'] : []), 'periods', 'style'];
  const [i, setI] = useState(0);
  const id = steps[i];
  const toggle = (list: number[], x: number) => (list.includes(x) ? list.filter(y => y !== x) : [...list, x].sort());
  const allowed = prefs.periods.length ? prefs.periods : PERIODS;
  const [title, hint] = tx.q[id];

  return (
    <section className={`rounded-3xl p-5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2">
        {i > 0 && (
          <button onClick={() => setI(i - 1)} aria-label={tx.back} className={`-ml-2 w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'hover:bg-gray-700' : 'hover:bg-white'}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <span className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}>{tx.stepOf(i + 1, steps.length)}</span>
        <div className="flex gap-1 ml-auto">
          {steps.map((s, k) => <span key={s} className={`h-1.5 rounded-full transition-all ${k <= i ? 'w-5 bg-brand-yellow' : `w-1.5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}`} />)}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2, ease: EASE }}>
          <div className="text-xl font-bold leading-tight mt-3">{title}</div>
          {hint && <div className={`text-xs font-medium mt-1 ${muted}`}>{hint}</div>}
          <div className="mt-4">
            {id === 'days' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DAYS.map(d => (
                  <Chip key={d} isDark={isDark} on={prefs.daysOff.includes(d)} onClick={() => onChange({ ...prefs, daysOff: toggle(prefs.daysOff, d) })}>
                    {DAY[lang][d]}
                    {busyDays.has(d) && <span className="text-[10px] font-semibold opacity-70">{tx.hasClasses}</span>}
                  </Chip>
                ))}
              </div>
            )}
            {id === 'format' && (
              <div className="grid grid-cols-3 gap-2">
                {([['remote', tx.remote], ['in_person', tx.inPerson], ['any', tx.any]] as [DeliveryPref, string][]).map(([v, label]) => (
                  <Chip key={v} isDark={isDark} on={prefs.delivery === v} onClick={() => onChange({ ...prefs, delivery: v })}>{label}</Chip>
                ))}
              </div>
            )}
            {id === 'campus' && (
              <div className="grid grid-cols-3 gap-2">
                {campuses.map(c => (
                  <Chip key={c} isDark={isDark} on={prefs.campuses.length === 1 && prefs.campuses[0] === c} onClick={() => onChange({ ...prefs, campuses: [c] })}>{campusName(c, lang)}</Chip>
                ))}
                <Chip isDark={isDark} on={prefs.campuses.length === 0} onClick={() => onChange({ ...prefs, campuses: [] })}>{campuses.length === 2 ? tx.bothCampuses : tx.any}</Chip>
              </div>
            )}
            {id === 'periods' && (
              <div className="grid grid-cols-3 gap-2">
                {PERIODS.map(n => (
                  <Chip key={n} isDark={isDark} on={allowed.includes(n)} onClick={() => {
                    const next = toggle(allowed, n);
                    onChange({ ...prefs, periods: next.length === PERIODS.length ? [] : next });
                  }}>
                    {lang === 'en' ? `Period ${n}` : `${n}限`}
                    <span className="text-[10px] font-semibold opacity-70">{PERIOD_TIMES[n][0]}</span>
                  </Chip>
                ))}
              </div>
            )}
            {id === 'style' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {([['assignment', tx.assignments], ['exam', tx.exams], ['any', tx.any]] as [AssessmentPref, string][]).map(([v, label]) => (
                    <Chip key={v} isDark={isDark} on={prefs.assessment === v} onClick={() => onChange({ ...prefs, assessment: v })}>{label}</Chip>
                  ))}
                </div>
                {([['continueSeries', tx.continueSeries], ['lighter', tx.lighter]] as const).map(([k, label]) => (
                  <label key={k} className="flex items-center justify-between gap-3 min-h-11 text-sm font-semibold cursor-pointer">
                    {label}
                    <input type="checkbox" checked={prefs[k]} onChange={e => onChange({ ...prefs, [k]: e.target.checked })} className="w-5 h-5 accent-black shrink-0" />
                  </label>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <motion.button whileTap={TAP} onClick={() => (i < steps.length - 1 ? setI(i + 1) : onDone())}
        className={`mt-5 w-full h-12 rounded-2xl text-sm font-bold ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'}`}>
        {i < steps.length - 1 ? tx.nextStep : tx.finish}
      </motion.button>
    </section>
  );
}

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
            {r.reasons.map(x => (
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
 * "For you": nothing is suggested until the student answers a few questions (days off, format,
 * campus, periods, grading). Then: required courses (registered ones shown as chosen), the best
 * plan for this term's credits within those answers, and more options. Data from the bridge's
 * recommender; filtering and ranking happen here, so changed answers apply instantly.
 */
export default function SmartPicks({ lang, isDark, needed, done, plannedCodes, onPlan, onPlanAll, onRegister }: {
  lang: Language; isDark: boolean; needed: Set<string>; done: Set<string>;
  plannedCodes: Set<string>; onPlan: (o: Offering) => void; onPlanAll: (os: Offering[]) => void; onRegister: (o: Offering) => void;
}) {
  const tx = t[lang];
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const [st, setSt] = useState<RecommendStatus | null>(null);
  const [answers, setAnswers] = useState<Answers>(loadAnswers);
  const [asking, setAsking] = useState(false);
  const prefs = answers.prefs;
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

  const save = (a: Answers) => { setAnswers(a); try { localStorage.setItem(ANSWERS_KEY, JSON.stringify(a)); } catch { /* private mode */ } };
  const data = st?.data ?? null;
  const plan = useMemo(() => (data ? buildPlan(data, prefs) : null), [data, prefs]);
  const others = useMemo(() => {
    if (!data || !plan) return [];
    const inPlan = new Set(plan.picks.map(p => p.o.code));
    const seen = new Set(plan.picks.map(p => p.o.title));
    return data.offerings.filter(o => usable(o) && !misfitOf(o, prefs) && !inPlan.has(o.code) && (o.section ? needed.has(o.section) || o.mark === 'elective' : false))
      .map(o => scoreOf(o, prefs)).sort((a, b) => b.score - a.score)
      .filter(r => (seen.has(r.o.title) ? false : (seen.add(r.o.title), true)));
  }, [data, plan, prefs, needed]);

  if (!data) {
    const p = st?.progress;
    return (
      <div className={`rounded-3xl p-5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-yellow" />{tx.title}</div>
        <p className={`text-sm font-medium mt-2 ${muted}`}>{st?.error === 'signed_out' ? tx.signedOut : st?.error ? `${tx.failed}: ${st.error}` : tx.building}</p>
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
  const campuses = [...new Set<string>(data.offerings.map(o => o.campus).filter(Boolean).map(campusKey))].sort();
  const busyDays = new Set<number>(data.registered.flatMap(r => r.slots.map(x => x.day)));
  const showPlan = answers.answered && !asking;
  const range = (ns: number[]) => (ns.length > 1 && ns[ns.length - 1] - ns[0] === ns.length - 1 ? `${ns[0]}–${ns[ns.length - 1]}` : ns.join(', '));
  const summary = [
    prefs.daysOff.length ? tx.off(prefs.daysOff.map(d => DAY[lang][d]).join(', ')) : tx.noDaysOff,
    prefs.delivery === 'remote' ? tx.remote : prefs.delivery === 'in_person' ? tx.inPerson : null,
    campuses.length > 1 ? (prefs.campuses.length ? prefs.campuses.map(c => campusName(c, lang)).join(', ') : null) : null,
    prefs.periods.length ? tx.periodsOnly(range(prefs.periods)) : tx.allPeriods,
    prefs.assessment === 'assignment' ? tx.assignments : prefs.assessment === 'exam' ? tx.exams : null,
    prefs.continueSeries ? tx.reason.continues : null,
    prefs.lighter ? tx.lighter : null,
  ].filter(Boolean) as string[];
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
          {c.limit !== null && <span className={`h-7 px-2.5 rounded-full text-[11px] font-bold flex items-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>{tx.cap(c.limit - c.registered)}</span>}
        </div>
      </section>

      {/* Questions, or a summary of the answers */}
      {asking ? (
        <Questions prefs={prefs} onChange={p => save({ ...answers, prefs: p })} onDone={() => { save({ prefs, answered: true }); setAsking(false); }}
          campuses={campuses} busyDays={busyDays} lang={lang} isDark={isDark} />
      ) : !answers.answered ? (
        <section className={`rounded-3xl p-5 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className="text-sm font-semibold">{tx.intro}</p>
          <motion.button whileTap={TAP} onClick={() => setAsking(true)}
            className={`mt-4 w-full h-12 rounded-2xl text-sm font-bold ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'}`}>{tx.start}</motion.button>
        </section>
      ) : (
        <section className={`rounded-3xl p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}>{tx.yourAnswers}</span>
            <button onClick={() => setAsking(true)} className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
              <Pencil className="w-3.5 h-3.5" />{tx.change}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {summary.map(x => <span key={x} className={`h-7 px-2.5 rounded-full text-[11px] font-bold flex items-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>{x}</span>)}
          </div>
        </section>
      )}

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
      {showPlan && plan && (
        <section>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}>{tx.plan}<span className="ml-2 normal-case tracking-normal">{tx.total(plan.credits, plan.target)}</span></div>
            {plan.picks.length > 0 && (
              <button onClick={() => onPlanAll(plan.picks.map(p => p.o))} className={`h-9 px-3 rounded-xl text-xs font-bold ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>{tx.planAll}</button>
            )}
          </div>
          {plan.unfit.map(u => (
            <p key={u.title} className={`mb-2 p-3 rounded-2xl text-xs font-semibold flex gap-2 ${isDark ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />{tx.unfit(tidy(u.title))} {tx.why[u.why]}
            </p>
          ))}
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
      {showPlan && others.length > 0 && (
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
      {showPlan && plan && plan.hidden > 0 && <p className={`text-center text-[11px] font-semibold ${muted}`}>{tx.hidden(plan.hidden)}</p>}
    </div>
  );
}
