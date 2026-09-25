import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Search, X, Loader2, BookOpenText, ChevronRight, ChevronDown, GraduationCap, ListPlus, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import type { Language } from '../App';
import { Card, SectionTitle, Loading, Empty, Pill, EASE, TAP } from './ScreenHeader';
import { useTips, invalidate } from '../lib/useTips';
import { runAction } from '../lib/api';
import { colorFor, tidy, parseSlots } from '../lib/tipsAdapters';
import { PERIOD_TIMES } from '../config/periods';
import DeliveryChip from './DeliveryChip';
import CreditsNeeded, { SectionChip, type PlanItem } from './CreditsNeeded';
import SmartPicks from './SmartPicks';
import type { Offering } from '../lib/recommendTypes';
import { useCourseCategories } from '../lib/courseCategories';
import type { TipsActionResult, TipsCandidate, TipsGrades, TipsProfile, TipsSyllabusOptions, TipsSyllabusResult, TipsTimetable, TipsTimetableCourse } from '../lib/types';

const t = {
  en: {
    forYou: 'For you', bySlot: 'By slot', byCurriculum: 'My curriculum', byCode: 'By code',
    pick: 'Tap an empty slot to see the courses your department can take there.',
    curriculumHint: 'Courses in your curriculum, from TIPS. Pick a category, then a course to see its sections.',
    code: 'Timetable code (e.g. TTX040)', find: 'Find', campus: 'Campus', offered: (s: string) => `Offered in ${s}`,
    byCodeTitle: (c: string) => `Course ${c}`, none: 'No courses offered here for your department.', register: 'Register', drop: 'Drop',
    syllabus: 'Syllabus', loading: 'Loading from TIPS…', confirmAdd: 'Register this course?', confirmDrop: 'Drop this course?',
    confirmBody: 'This changes your registration on TIPS. TIPS checks eligibility, the registration period and your credit limit, and will tell you if it refuses.',
    cancel: 'Cancel', yes: 'Yes, continue', working: 'Sending to TIPS…', reply: 'TIPS replied', noReply: 'TIPS showed no message. Check the timetable for the result.',
    cr: 'cr', registered: 'Registered', earned: 'Already earned', notThisTerm: 'Not offered this term', slotsWeek: (n: number) => `${n}× per week`,
    intensive: 'Intensive', prereq: 'Prerequisite', sections: 'Sections', noSections: 'No sections open for registration.',
    earnedBlock: 'You have already passed this course, so it cannot be registered again.',
    overCap: (limit: number) => `This would take you over your ${limit}-credit limit for this term.`,
    conflict: (title: string) => `Clashes with ${title}, already registered in this slot.`,
    ownDept: 'Your department', others: 'Other courses in this slot', othersHint: 'University-wide electives, languages and other faculties, from the TIPS syllabus. Check shows whether TIPS lets you register.',
    check: 'Check & register', notOffered: 'TIPS does not offer this course for your registration.', filter: 'Filter courses…', hideEarned: 'Hide already earned',
    plan: 'Plan', planned: 'Planned', onlyNeeded: 'Only what I still need',
  },
  jp: {
    forYou: 'おすすめ', bySlot: 'コマから', byCurriculum: 'カリキュラムから', byCode: '時間割番号',
    pick: '空いているコマを選ぶと、所属学科で履修できる開講科目が表示されます。',
    curriculumHint: 'TIPSのカリキュラム科目です。科目区分を選び、科目を選ぶと開講クラスが表示されます。',
    code: '時間割番号（例: TTX040）', find: '検索', campus: '校舎', offered: (s: string) => `${s}の開講科目`,
    byCodeTitle: (c: string) => `科目 ${c}`, none: 'このコマに所属学科の開講科目はありません。', register: '登録', drop: '削除',
    syllabus: 'シラバス', loading: 'TIPSから読み込み中…', confirmAdd: 'この科目を登録しますか？', confirmDrop: 'この科目を削除しますか？',
    confirmBody: 'TIPSの履修登録が変更されます。履修資格・登録期間・上限単位はTIPSが確認し、受け付けられない場合はメッセージが表示されます。',
    cancel: 'キャンセル', yes: '実行する', working: 'TIPSに送信中…', reply: 'TIPSからの応答', noReply: 'TIPSからメッセージはありませんでした。時間割で結果を確認してください。',
    cr: '単位', registered: '登録済み', earned: '修得済み', notThisTerm: '今学期は開講なし', slotsWeek: (n: number) => `週${n}コマ`,
    intensive: '集中', prereq: '先修条件', sections: '開講クラス', noSections: '登録できる開講クラスはありません。',
    earnedBlock: 'この科目はすでに合格しているため、再度登録することはできません。',
    overCap: (limit: number) => `今学期の登録上限（${limit}単位）を超えます。`,
    conflict: (title: string) => `同じコマに登録済みの「${title}」と重なります。`,
    ownDept: '所属学科の科目', others: 'このコマのその他の科目', othersHint: '全学共通科目・語学・他学部の科目（TIPSシラバスより）。「確認して登録」でTIPS上の登録可否を確認できます。',
    check: '確認して登録', notOffered: 'この科目はTIPSで登録対象になっていません。', filter: '科目を絞り込む…', hideEarned: '修得済みを隠す',
    plan: '計画', planned: '計画済み', onlyNeeded: '必要な区分のみ',
  },
};

type Ctx = Record<string, string>;

/** A recommender offering in the shape the register dialog and plan use. */
const offeringCandidate = (o: Offering): TipsCandidate => ({
  code: o.code, number: '', title: o.title, teacher: o.teacher, requirement: o.requirement, credits: o.credits,
  campus: o.campus, slotText: o.slotText, jscd: o.jscd, year: o.year, canRegister: o.canRegister,
});
type Pending = { kind: 'register'; c: TipsCandidate; ctx: Ctx } | { kind: 'drop'; c: TipsTimetableCourse };
type Cat = { d: string; s: string; m: string; name: string; rawName: string };
type CurCourse = { kamoku: string | null; number: string; title: string; credits: number | null; spring: number | null; springIntensive: number | null; fall: number | null; fallIntensive: number | null; prerequisite: string | null };

type CatInfo = { section: string | null; category: string; needed: boolean; done: boolean } | null;

const CandidateCard: React.FC<{ c: TipsCandidate; ctx: Ctx; lang: Language; isDark: boolean; taken: boolean; blocked?: string[]; onRegister: (c: TipsCandidate, ctx: Ctx) => void; cat?: CatInfo; planned?: boolean; onTogglePlan?: (c: TipsCandidate) => void }> = ({ c, ctx, lang, isDark, taken, blocked = [], onRegister, cat, planned, onTogglePlan }) => {
  const tx = t[lang];
  const navigate = useNavigate();
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  return (
    <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-900' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black">{c.code}<span className={`ml-2 font-bold ${muted}`}>{c.slotText}</span></div>
          <div className="font-bold text-sm leading-snug mt-0.5">{tidy(c.title)}</div>
          <div className={`text-xs font-medium mt-1 ${muted}`}>{[tidy(c.teacher), c.requirement, tidy(c.campus)].filter(Boolean).join(' · ')}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <SectionChip section={cat?.section} needed={!!cat?.needed} done={!!cat?.done} category={cat?.category} isDark={isDark} lang={lang} />
            <DeliveryChip code={c.code} year={c.year} lang={lang} isDark={isDark} />
          </div>
        </div>
        <div className="text-right shrink-0"><div className="text-lg font-bold leading-none">{c.credits ?? '—'}</div><div className={`text-[10px] font-bold ${muted}`}>{tx.cr}</div></div>
      </div>
      {blocked.length > 0 && !taken && (
        <div className="mt-3 space-y-1">{blocked.map((b, i) => <p key={i} className="text-xs font-semibold text-red-500">{b}</p>)}</div>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={() => navigate(`/course/${c.code}${c.year ? `?year=${c.year}` : ''}`)} className={`h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
          <BookOpenText className="w-3.5 h-3.5" />{tx.syllabus}
        </button>
        {!taken && onTogglePlan && c.credits !== null && blocked.length === 0 && (
          <motion.button whileTap={TAP} onClick={() => onTogglePlan(c)} aria-pressed={planned}
            className={`h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${planned ? 'bg-brand-yellow text-brand-black' : isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {planned ? <ListChecks className="w-3.5 h-3.5" /> : <ListPlus className="w-3.5 h-3.5" />}{planned ? tx.planned : tx.plan}
          </motion.button>
        )}
        {taken
          ? <span className="h-10 px-3 rounded-xl text-xs font-bold bg-green-500/10 text-green-600 flex items-center">{tx.registered}</span>
          : <motion.button whileTap={TAP} disabled={!c.canRegister || blocked.length > 0} onClick={() => onRegister(c, ctx)} className={`flex-1 h-10 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-40 ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-brand-black text-white'}`}><Plus className="w-3.5 h-3.5" />{tx.register}</motion.button>}
      </div>
    </div>
  );
};

/**
 * Registration tool: the current term's grid plus three ways to find courses (slot,
 * curriculum, code). Everything listed comes from TIPS's own registration screens, so it is
 * limited to what TIPS lets this student take. Writes go through a confirmation dialog.
 */
export default function RegistrationPlanner({ lang, isDark }: { lang: Language; isDark: boolean }) {
  const tx = t[lang];
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const tt = useTips<TipsTimetable>('timetable');
  const profile = useTips<TipsProfile>('profile');
  const options = useTips<TipsSyllabusOptions>('syllabus-options');
  const grades = useTips<TipsGrades>('grades');
  const data = tt.data;

  const defaultCampus = useMemo(
    () => data?.campusCode || options.data?.campuses.find(c => c.value && c.label === profile.data?.campus)?.value || '',
    [data, options.data, profile.data],
  );
  const [campus, setCampus] = useState('');
  const campusCode = campus || defaultCampus;
  const [mode, setMode] = useState<'smart' | 'slot' | 'curriculum' | 'code'>('smart');
  const [slot, setSlot] = useState<{ day: number; period: number } | null>(null);
  const [codeDraft, setCodeDraft] = useState('');
  const [code, setCode] = useState('');
  const [cat, setCat] = useState<Cat | null>(null);
  const [openKamoku, setOpenKamoku] = useState<string | null>(null);

  const slotParams = mode === 'slot' && slot ? { day: slot.day, period: slot.period, campus: campusCode } : mode === 'code' && code ? { code } : undefined;
  const slotCands = useTips<{ candidates: TipsCandidate[]; messages: string[] }>('registration-candidates', slotParams, { enabled: !!slotParams });
  const cats = useTips<Cat[]>('registration-curriculum', undefined, { enabled: mode === 'curriculum' });
  const catParams = cat ? { d: cat.d, s: cat.s, m: cat.m, name: cat.rawName } : undefined;
  const courses = useTips<CurCourse[]>('registration-curriculum-courses', catParams, { enabled: !!cat });
  const secParams = cat && openKamoku ? { ...catParams!, kamoku: openKamoku } : undefined;
  const sections = useTips<{ candidates: TipsCandidate[]; messages: string[] }>('registration-candidates', secParams, { enabled: !!secParams });

  // Syllabus search for everything else in the selected slot (same term, day, period, campus).
  const termRe = data?.term === '2' ? /秋|autumn|fall/i : /春|spring/i;
  const termOpt = options.data?.terms.find(o => o.value && termRe.test(o.label))?.value ?? '';
  const othersParams = mode === 'slot' && slot && termOpt ? { year: data?.year ?? '', term: termOpt, day: slot.day, period: slot.period, campus: campusCode } : undefined;
  const others = useTips<{ results: TipsSyllabusResult[] }>('syllabus-search', othersParams, { enabled: !!othersParams });
  const [checkCode, setCheckCode] = useState<string | null>(null);
  const checked = useTips<{ candidates: TipsCandidate[]; messages: string[] }>('registration-candidates', checkCode ? { code: checkCode } : undefined, { enabled: !!checkCode });
  const [curFilter, setCurFilter] = useState('');
  const [hideEarned, setHideEarned] = useState(true);

  // Graduation sections still short, and the student's plan for this term (kept on the device).
  const grad = useCourseCategories();
  const planKey = `tokaihub_plan:${data?.year ?? ''}:${data?.term ?? ''}`;
  const [plan, setPlan] = useState<PlanItem[]>([]);
  useEffect(() => {
    try { setPlan(JSON.parse(localStorage.getItem(planKey) ?? '[]')); } catch { setPlan([]); }
  }, [planKey]);
  const savePlan = (next: PlanItem[]) => {
    setPlan(next);
    try { localStorage.setItem(planKey, JSON.stringify(next)); } catch { /* private mode */ }
  };
  const catOf = (title: string): CatInfo => {
    const hit = grad.sectionFor(title);
    return hit ? { section: hit.section, category: hit.category, needed: !!hit.section && grad.needed.has(hit.section), done: !!hit.section && grad.done.has(hit.section) } : null;
  };
  const togglePlan = (c: TipsCandidate) => savePlan(plan.some(p => p.code === c.code)
    ? plan.filter(p => p.code !== c.code)
    : [...plan, { code: c.code, title: c.title, credits: c.credits ?? 0, section: catOf(c.title)?.section ?? null, requirement: c.requirement }]);
  const [onlyNeeded, setOnlyNeeded] = useState(false);

  const [pending, setPending] = useState<Pending | null>(null);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const days = data?.grid.days ?? [];
  const periods = data?.grid.periods ?? [];
  const term = data?.term;
  const cellOf = (day: number, period: number) => data?.courses.find(c => c.day === day && c.periods.includes(period));
  const registeredCodes = new Set((data?.courses ?? []).map(c => c.code));
  const earnedTitles = useMemo(() => new Set((grades.data?.courses ?? []).filter(c => c.passed).map(c => c.title)), [grades.data]);

  // Pre-checks from the handbook's registration rules (TIPS still has the final say).
  const blockers = (c: { code: string; title: string; credits: number | null; slotText: string }) => {
    const out: string[] = [];
    if (earnedTitles.has(c.title)) out.push(tx.earnedBlock);
    const limit = data?.credits.limit ?? null;
    if (limit !== null && (data?.credits.registered ?? 0) + (c.credits ?? 0) > limit) out.push(tx.overCap(limit));
    for (const sl of parseSlots(c.slotText)) {
      const other = cellOf(sl.day, sl.period);
      if (other && other.code !== c.code) { out.push(tx.conflict(tidy(other.title))); break; }
    }
    return out;
  };

  const pickSlot = (day: number, period: number) => {
    setMode('slot'); setCode(''); setSlot({ day, period });
    if (window.matchMedia('(max-width: 1279px)').matches) setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const confirm = async () => {
    if (!pending) return;
    setWorking(true);
    try {
      const body = pending.kind === 'register'
        ? { ...pending.ctx, year: pending.c.year ?? String(data?.year ?? ''), jscd: pending.c.jscd ?? '', code: pending.c.code, lang }
        : { year: pending.c.drop!.year, jscd: pending.c.drop!.jscd, code: pending.c.drop!.code, day: pending.c.drop!.day, period: pending.c.drop!.period, lang };
      const r = await runAction<TipsActionResult>(pending.kind, body);
      setResult({ ok: true, lines: r.messages.length ? r.messages : [tx.noReply] });
    } catch (e) {
      setResult({ ok: false, lines: [(e as Error).message] });
    } finally {
      setWorking(false);
      setPending(null);
      invalidate('timetable');
      invalidate('registration-candidates');
      invalidate('course-categories');
      tt.refresh();
      grad.refresh();
    }
  };

  if (!data) return <Loading text={tx.loading} isDark={isDark} />;

  const livePlan = plan.filter(p => !registeredCodes.has(p.code));
  const cardProps = (c: TipsCandidate) => ({ cat: catOf(c.title), planned: plan.some(p => p.code === c.code), onTogglePlan: togglePlan });
  const slotLabel = slot ? `${days[slot.day - 1] ?? ''} ${periods[slot.period - 1] ?? ''}` : '';
  const offeredThisTerm = (x: CurCourse) => (term === '2' ? (x.fall ?? 0) + (x.fallIntensive ?? 0) : (x.spring ?? 0) + (x.springIntensive ?? 0)) > 0;

  return (
    <div className="space-y-5">
      <CreditsNeeded lang={lang} isDark={isDark} cats={grad} plan={livePlan} onRemove={code => savePlan(plan.filter(p => p.code !== code))} />

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`relative p-4 pr-10 rounded-2xl text-sm ${result.ok ? (isDark ? 'bg-gray-800' : 'bg-blue-50') : 'bg-red-500/10 text-red-600'}`}>
            <div className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{tx.reply}</div>
            {result.lines.map((l, i) => <div key={i} className="font-medium">{l}</div>)}
            <button onClick={() => setResult(null)} aria-label={lang === 'en' ? 'Close' : '閉じる'} className="absolute top-1 right-1 w-10 h-10 flex items-center justify-center"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6">
        {/* Grid */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid gap-1.5 min-w-[620px]" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div />
            {days.map(d => <div key={d} className={`text-center text-xs font-bold pb-1 ${muted}`}>{d}</div>)}
            {periods.map((p, pi) => (
              <React.Fragment key={p}>
                <div className="flex flex-col justify-center text-[11px] font-bold pr-1">
                  <span>{p}</span>
                  {PERIOD_TIMES[pi + 1] && <span className={`text-[10px] font-medium ${muted}`}>{PERIOD_TIMES[pi + 1][0]}</span>}
                </div>
                {days.map((_, di) => {
                  const day = di + 1, period = pi + 1;
                  const c = cellOf(day, period);
                  const selected = mode === 'slot' && slot?.day === day && slot?.period === period;
                  if (c) {
                    return (
                      <div key={di} className={`${colorFor(c.code)} rounded-xl p-2 h-[84px] text-brand-black flex flex-col overflow-hidden`}>
                        <div className="text-[10px] font-black opacity-70">{c.code}</div>
                        <div className="text-[11px] font-bold leading-tight line-clamp-2">{tidy(c.title)}</div>
                        {c.drop && (
                          <button onClick={() => setPending({ kind: 'drop', c })} className="relative mt-auto self-start text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/80 text-white flex items-center gap-1 after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']"><Trash2 className="w-3 h-3" />{tx.drop}</button>
                        )}
                      </div>
                    );
                  }
                  const open = data.openSlots.some(o => o.day === day && o.period === period);
                  return (
                    <button key={di} onClick={() => pickSlot(day, period)} aria-label={`${days[di]} ${p}`}
                      className={`rounded-xl h-[84px] border-2 border-dashed flex items-center justify-center transition-colors ${selected ? 'border-brand-yellow bg-brand-yellow/10' : isDark ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'} ${open ? '' : 'opacity-60'}`}>
                      <Plus className={`w-4 h-4 ${muted}`} />
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Finder */}
        <div ref={listRef} className="scroll-mt-4 min-w-0">
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <Pill layoutId="planner-mode" active={mode === 'smart'} isDark={isDark} onClick={() => setMode('smart')}>{tx.forYou}</Pill>
            <Pill layoutId="planner-mode" active={mode === 'slot'} isDark={isDark} onClick={() => setMode('slot')}>{tx.bySlot}</Pill>
            <Pill layoutId="planner-mode" active={mode === 'curriculum'} isDark={isDark} onClick={() => setMode('curriculum')}>{tx.byCurriculum}</Pill>
            <Pill layoutId="planner-mode" active={mode === 'code'} isDark={isDark} onClick={() => setMode('code')}>{tx.byCode}</Pill>
          </div>

          {mode === 'smart' && (
            <SmartPicks lang={lang} isDark={isDark} needed={grad.needed} done={grad.done}
              plannedCodes={new Set(plan.map(p => p.code))}
              onPlan={o => togglePlan(offeringCandidate(o))}
              onPlanAll={os => savePlan([...plan, ...os.filter(o => !plan.some(p => p.code === o.code)).map(o => ({ code: o.code, title: o.title, credits: o.credits, section: o.section, requirement: o.requirement }))])}
              onRegister={o => setPending({ kind: 'register', c: offeringCandidate(o), ctx: { code: o.code } })} />
          )}

          {mode === 'slot' && (
            <>
              <label className="flex items-center gap-2 mb-3 text-xs font-bold">
                <span className={muted}>{tx.campus}</span>
                <select value={campusCode} onChange={e => setCampus(e.target.value)} className={`flex-1 h-10 rounded-xl px-3 text-sm font-semibold appearance-none ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  {(options.data?.campuses ?? []).filter(c => c.value).map(c => <option key={c.value} value={c.value}>{tidy(c.label)}</option>)}
                </select>
              </label>
              {!slot && <Empty text={tx.pick} isDark={isDark} />}
              {slot && (
                <>
                  <SectionTitle>{tx.offered(slotLabel)}</SectionTitle>
                  <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>{tx.ownDept}</div>
                  {slotCands.loading && !slotCands.data && <Loading text={tx.loading} isDark={isDark} />}
                  {slotCands.data && slotCands.data.candidates.length === 0 && <Empty text={tx.none} isDark={isDark} />}
                  <div className="space-y-2">
                    {slotCands.data?.candidates.map(c => <CandidateCard key={c.code} c={c} ctx={{ day: String(slot.day), period: String(slot.period), campus: campusCode }} lang={lang} isDark={isDark} taken={registeredCodes.has(c.code)} blocked={blockers(c)} onRegister={(c, ctx) => setPending({ kind: 'register', c, ctx })} {...cardProps(c)} />)}
                  </div>

                  <div className={`text-[11px] font-bold uppercase tracking-wider mt-6 mb-1 ${muted}`}>{tx.others}</div>
                  <p className={`text-xs mb-2 ${muted}`}>{tx.othersHint}</p>
                  {grad.needed.size > 0 && (
                    <label className="flex items-center gap-1.5 mb-2 h-10 text-xs font-bold cursor-pointer">
                      <input type="checkbox" checked={onlyNeeded} onChange={e => setOnlyNeeded(e.target.checked)} className="accent-black w-4 h-4" />{tx.onlyNeeded} ({[...grad.needed].join(', ')})
                    </label>
                  )}
                  {others.loading && !others.data && <Loading text={tx.loading} isDark={isDark} />}
                  <div className="space-y-2">
                    {(others.data?.results ?? [])
                      .filter(r => r.ref && !slotCands.data?.candidates.some(c => c.code === r.ref!.code))
                      .filter(r => !onlyNeeded || !!catOf(r.title)?.needed)
                      .map(r => {
                        const code = r.ref!.code;
                        const earned = earnedTitles.has(r.title);
                        const open = checkCode === code;
                        return (
                          <div key={code} className={`rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} ${earned ? 'opacity-60' : ''}`}>
                            <div className="p-4 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-black">{code}<span className={`ml-2 font-bold ${muted}`}>{r.slotText}</span></div>
                                <div className="font-bold text-sm leading-snug mt-0.5">{tidy(r.title)}</div>
                                <div className={`text-xs font-medium mt-1 ${muted}`}>{[tidy(r.teacher), tidy(r.campus)].filter(Boolean).join(' · ')}</div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <SectionChip section={catOf(r.title)?.section} needed={!!catOf(r.title)?.needed} done={!!catOf(r.title)?.done} category={catOf(r.title)?.category} isDark={isDark} lang={lang} />
                                  <DeliveryChip code={code} year={r.ref?.year ?? data?.year} lang={lang} isDark={isDark} />
                                </div>
                                {earned && <p className="text-xs font-semibold text-red-500 mt-2">{tx.earnedBlock}</p>}
                              </div>
                              {!earned && (
                                <button onClick={() => setCheckCode(open ? null : code)} aria-expanded={open} className={`shrink-0 h-10 px-3 rounded-xl text-xs font-bold ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>{tx.check}</button>
                              )}
                            </div>
                            {open && (
                              <div className="px-3 pb-3 space-y-2">
                                {checked.loading && !checked.data && <Loading text={tx.loading} isDark={isDark} rows={1} />}
                                {checked.data && checked.data.candidates.length === 0 && <p className="text-xs font-semibold px-1 text-red-500">{tx.notOffered}</p>}
                                {checked.data?.candidates.map(c => <CandidateCard key={c.code} c={c} ctx={{ code }} lang={lang} isDark={isDark} taken={registeredCodes.has(c.code)} blocked={blockers(c)} onRegister={(c, ctx) => setPending({ kind: 'register', c, ctx })} {...cardProps(c)} />)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'code' && (
            <>
              <form onSubmit={e => { e.preventDefault(); setCode(codeDraft.trim().toUpperCase()); }} className="flex gap-2 mb-3">
                <div className={`flex-1 flex items-center rounded-2xl px-3 py-2.5 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Search className={`w-4 h-4 mr-2 ${muted}`} />
                  <input value={codeDraft} onChange={e => setCodeDraft(e.target.value)} placeholder={tx.code} className="bg-transparent outline-none w-full text-sm font-medium placeholder:text-gray-400" />
                </div>
                <button type="submit" className={`px-4 rounded-2xl text-sm font-bold ${isDark ? 'bg-brand-yellow text-brand-black' : 'bg-[#0B1F3A] text-white'}`}>{tx.find}</button>
              </form>
              {code && (
                <>
                  <SectionTitle>{tx.byCodeTitle(code)}</SectionTitle>
                  {slotCands.loading && !slotCands.data && <Loading text={tx.loading} isDark={isDark} />}
                  {slotCands.data && slotCands.data.candidates.length === 0 && <Empty text={tx.none} isDark={isDark} />}
                  <div className="space-y-2">
                    {slotCands.data?.candidates.map(c => <CandidateCard key={c.code} c={c} ctx={{ code }} lang={lang} isDark={isDark} taken={registeredCodes.has(c.code)} blocked={blockers(c)} onRegister={(c, ctx) => setPending({ kind: 'register', c, ctx })} {...cardProps(c)} />)}
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'curriculum' && (
            <>
              {!cat && (
                <>
                  <p className={`text-xs font-medium mb-3 ${muted}`}>{tx.curriculumHint}</p>
                  {!cats.data && <Loading text={tx.loading} isDark={isDark} />}
                  <div className="space-y-2">
                    {cats.data?.map(x => (
                      <Card key={x.m} isDark={isDark} onClick={() => { setCat(x); setOpenKamoku(null); }} className="flex items-center gap-3 p-4">
                        <GraduationCap className="w-5 h-5 text-brand-yellow shrink-0" />
                        <span className="flex-1 font-semibold text-sm">{tidy(x.name)}</span>
                        {(() => {
                          // Same TIPS list, same order, whichever language each copy is in.
                          const i = cats.data?.findIndex(k => k.m === x.m) ?? -1;
                          const sec = (grad.ja.data ?? grad.en.data)?.categories[i]?.section ?? null;
                          return <SectionChip section={sec} needed={!!sec && grad.needed.has(sec)} done={!!sec && grad.done.has(sec)} isDark={isDark} lang={lang} />;
                        })()}
                        <ChevronRight className={`w-4 h-4 ${muted}`} />
                      </Card>
                    ))}
                  </div>
                </>
              )}
              {cat && (
                <>
                  <button onClick={() => setCat(null)} className={`mb-1 h-10 text-xs font-bold flex items-center gap-1 ${muted}`}><ChevronRight className="w-3.5 h-3.5 rotate-180" />{tidy(cat.name)}</button>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`flex-1 flex items-center rounded-xl px-3 h-10 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <Search className={`w-4 h-4 mr-2 ${muted}`} />
                      <input value={curFilter} onChange={e => setCurFilter(e.target.value)} placeholder={tx.filter} className="bg-transparent outline-none w-full text-sm font-medium placeholder:text-gray-400" />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer">
                      <input type="checkbox" checked={hideEarned} onChange={e => setHideEarned(e.target.checked)} className="accent-black" />{tx.hideEarned}
                    </label>
                  </div>
                  {!courses.data && <Loading text={tx.loading} isDark={isDark} />}
                  <div className="space-y-2">
                    {[...(courses.data ?? [])]
                      .filter(x => (!hideEarned || !earnedTitles.has(x.title)) && (!curFilter || tidy(x.title).toLowerCase().includes(curFilter.toLowerCase()) || x.title.includes(curFilter)))
                      .sort((a, b) => Number(offeredThisTerm(b)) - Number(offeredThisTerm(a))).map(x => {
                      const earned = earnedTitles.has(x.title);
                      const offered = offeredThisTerm(x);
                      const open = openKamoku === x.kamoku;
                      const weekly = term === '2' ? x.fall : x.spring;
                      const intensive = term === '2' ? x.fallIntensive : x.springIntensive;
                      return (
                        <div key={x.kamoku ?? x.title} className={`rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} ${offered && !earned ? '' : 'opacity-60'}`}>
                          <button disabled={!x.kamoku || !offered} onClick={() => setOpenKamoku(open ? null : x.kamoku)} className="w-full text-left p-4 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm leading-snug">{tidy(x.title)}</div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <SectionChip section={catOf(x.title)?.section} needed={!!catOf(x.title)?.needed} done={!!catOf(x.title)?.done} isDark={isDark} lang={lang} />
                                {earned && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">{tx.earned}</span>}
                                {!offered && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>{tx.notThisTerm}</span>}
                                {offered && weekly ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-yellow/30">{tx.slotsWeek(weekly)}</span> : null}
                                {offered && intensive ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-yellow/30">{tx.intensive}</span> : null}
                                {x.prerequisite && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>{tx.prereq}: {x.prerequisite}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0"><div className="text-base font-bold leading-none">{x.credits ?? '—'}</div><div className={`text-[10px] font-bold ${muted}`}>{tx.cr}</div></div>
                            {offered && x.kamoku && <ChevronDown className={`w-4 h-4 mt-0.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${muted}`} />}
                          </button>
                          <AnimatePresence initial={false}>
                          {open && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: EASE }} className="overflow-hidden">
                            <div className="px-3 pb-3 space-y-2">
                              {!sections.data && <Loading text={tx.loading} isDark={isDark} rows={1} />}
                              {sections.data && sections.data.candidates.length === 0 && <p className={`text-xs px-1 ${muted}`}>{tx.noSections}</p>}
                              {sections.data?.candidates.map(c => <CandidateCard key={c.code} c={c} ctx={{ ...catParams!, kamoku: x.kamoku! }} lang={lang} isDark={isDark} taken={registeredCodes.has(c.code)} blocked={blockers(c)} onRegister={(c, ctx) => setPending({ kind: 'register', c, ctx })} {...cardProps(c)} />)}
                            </div>
                            </motion.div>
                          )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {pending && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !working && setPending(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
            <motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: 'spring', stiffness: 500, damping: 36 }} className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md z-[101] rounded-[32px] p-6 shadow-2xl ${isDark ? 'bg-gray-900 text-white' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-3">{pending.kind === 'register' ? tx.confirmAdd : tx.confirmDrop}</h2>
              <div className={`rounded-2xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="text-xs font-black">{pending.c.code}</div>
                <div className="font-bold">{tidy(pending.c.title)}</div>
                {pending.kind === 'register' && <div className={`text-xs mt-1 ${muted}`}>{[pending.c.slotText, tidy(pending.c.teacher), pending.c.credits !== null ? `${pending.c.credits} ${tx.cr}` : ''].filter(Boolean).join(' · ')}</div>}
              </div>
              <p className={`text-sm mb-6 ${muted}`}>{tx.confirmBody}</p>
              <div className="flex gap-2">
                <button disabled={working} onClick={() => setPending(null)} className={`flex-1 py-3 rounded-2xl font-bold ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>{tx.cancel}</button>
                <button disabled={working} onClick={confirm} className={`flex-1 py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 ${pending.kind === 'drop' ? 'bg-red-600' : 'bg-brand-black'}`}>
                  {working ? <><Loader2 className="w-4 h-4 animate-spin" />{tx.working}</> : tx.yes}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
