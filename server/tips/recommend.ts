/**
 * Course recommender, bridge side: gathers what the app needs to suggest this term's courses.
 *
 *   TIPS: graduation check + curriculum (course-categories), grades, timetable, profile,
 *         each candidate course's sections (registration-candidates: slots, eligibility),
 *         each section's syllabus (delivery, grading, summary)
 *   handbook (handbook.ts): required / elective marks and prerequisites
 *   Jev (jev.ts, optional): grading style, remote or not, continuation of a passed course,
 *         workload, where the syllabus text alone is not enough
 *
 * Every TIPS read goes through the feature queue as background work (bg=1), one request at a
 * time, so the student's own taps still go first. A build takes minutes the first time and is
 * cached for six hours; the app re-ranks it instantly against the student's preferences.
 */
import * as cache from './cache';
import { handbookFor, normTitle, type HandbookCourse } from './handbook';
import { evaluate, jevEnabled, type Question } from './jev';
import { parseSlots } from '../../src/lib/slots';
import { assessmentOf, continuesFrom, deliveryKind, styleOf, type Assessment } from '../../src/lib/courseFeatures';
import type { Offering, RecommendData, RecommendStatus, RequiredCourse } from '../../src/lib/recommendTypes';

type Lang = 'en' | 'jp';
const KEY = (lang: Lang) => `recommend:v1@${lang}`;
const FRESH_MS = 6 * 60 * 60_000;

const state: Record<Lang, { building: Promise<void> | null; progress: RecommendStatus['progress']; error: string | null; failedAt: number }> = {
  en: { building: null, progress: null, error: null, failedAt: 0 },
  jp: { building: null, progress: null, error: null, failedAt: 0 },
};

export function recommendStatus(lang: Lang): RecommendStatus {
  const s = state[lang];
  return { building: !!s.building, progress: s.progress, error: s.error, data: cache.read<RecommendData>(KEY(lang))?.data ?? null };
}

/** Starts a build unless one is running or the saved one is still fresh (force skips that). */
export function ensureBuilt(lang: Lang, force = false) {
  const s = state[lang];
  if (s.building) return;
  const saved = cache.read<RecommendData>(KEY(lang));
  if (!force && saved && Date.now() - saved.cachedAt < FRESH_MS) return;
  // A failed build is not retried on every poll for a minute, so the app sees why it failed.
  if (!force && s.error && Date.now() - s.failedAt < 60_000) return;
  s.error = null;
  s.building = build(lang)
    .then(data => { cache.write(KEY(lang), data); })
    .catch(e => { s.error = (e as Error).message.split('\n')[0]; s.failedAt = Date.now(); console.error('[recommend]', s.error); })
    .finally(() => { s.building = null; s.progress = null; });
}

type Envelope<T> = { data: T };

async function build(lang: Lang): Promise<RecommendData> {
  const { handle } = await import('./routes');
  const s = state[lang];
  const step = (label: string, done: number, total: number) => { s.progress = { step: label, done, total }; };
  const q = <T>(feature: string, params: Record<string, string> = {}) =>
    handle(feature, { lang, bg: '1', ...params }) as Promise<Envelope<T>>;

  step('records', 0, 1);
  let cc = await q<any>('course-categories');
  // Saved before course-categories carried term availability: rebuild it once.
  if (cc.data.courses.length && cc.data.courses[0].fall === undefined) cc = await q<any>('course-categories', { refresh: '1' });
  const ccJa = lang === 'jp' ? cc : await q<any>('course-categories', { lang: 'jp' });
  const grades = await q<any>('grades');
  const tt = await q<any>('timetable');
  const profile = await q<any>('profile');

  const year: number | null = tt.data.year ?? null;
  const term: string | null = tt.data.term ?? null;
  const semester = Number(profile.data.semester) || null;
  const entryYear = year && Number(profile.data.year) ? year - (Number(profile.data.year) - 1) : null;
  const dept = /^\d[A-Z]([A-Z]{2})\d/.exec(profile.data.studentId ?? '')?.[1] ?? null;
  const earned: number = cc.data.total?.earned ?? 0;
  const hb = handbookFor(entryYear, dept);

  const passedCourses = (grades.data.courses ?? []).filter((c: any) => c.passed);
  const passed = new Set<string>(passedCourses.map((c: any) => normTitle(c.title)));
  const passedTitles: string[] = passedCourses.map((c: any) => c.title);
  const registered = (tt.data.courses ?? []).map((c: any) => ({ code: c.code, title: c.title, slots: (c.periods ?? []).map((p: number) => ({ day: c.day, period: p })) }));
  const registeredTitles = new Set(registered.map((r: any) => normTitle(r.title)));

  // Curriculum rows in both languages line up (same TIPS lists, same order).
  const jaTitleOf = (i: number) => ccJa.data.courses[i]?.title ?? cc.data.courses[i].title;
  const hbRow = (i: number): HandbookCourse | undefined => hb.get(normTitle(jaTitleOf(i)));
  const hbByNumber = new Map([...hb.values()].map(r => [r.number, r]));

  const sections = cc.data.sections as RecommendData['sections'];
  const needed = new Set(sections.filter(x => x.remaining > 0).map(x => x.section));
  // A section whose surplus another needed section accepts ("Category IV surplus") still helps.
  const helps = (sec: string | null) => !!sec && (needed.has(sec) || sections.some(t => needed.has(t.section) && t.items.some(i => new RegExp(`(^|[^A-Z])${sec}([^A-Z]|$)`).test(i.name.normalize('NFKC')))));
  const offeredNow = (c: any) => (term === '2' ? c.fall + c.intensive.fall : c.spring + c.intensive.spring) > 0;

  const prereqOf = (row: HandbookCourse | undefined): { ok: boolean; note: string | null; later: boolean } => {
    if (!row) return { ok: true, note: null, later: false };
    const notes: string[] = [];
    let later = false;
    if (row.prereq.semester && semester && semester < row.prereq.semester) { notes.push(lang === 'en' ? `Semester ${row.prereq.semester}+` : `${row.prereq.semester}セメ以降`); later = true; }
    if (row.prereq.credits && earned < row.prereq.credits) notes.push(lang === 'en' ? `${row.prereq.credits}+ credits` : `${row.prereq.credits}単位以上`);
    for (const n of row.prereq.courses) {
      const need = hbByNumber.get(n);
      if (need && !passed.has(normTitle(need.title))) notes.push(lang === 'en' ? `after ${need.title}` : `${need.title}の修得後`);
    }
    return { ok: notes.length === 0, note: notes.join(' · ') || null, later };
  };

  // 1) Which curriculum courses are worth looking at this term.
  const picks = cc.data.courses.map((c: any, i: number) => ({ c, i, row: hbRow(i) }))
    .filter(({ c, row }: any) => helps(c.section) && !passed.has(normTitle(c.title)) && !registeredTitles.has(normTitle(c.title)) && !row?.closed && c.kamoku);

  // 2) Required courses and their state, from the handbook (TIPS does not mark them).
  const required: RequiredCourse[] = [];
  cc.data.courses.forEach((c: any, i: number) => {
    const row = hbRow(i);
    if (row?.mark !== 'required' || !helps(c.section)) return;
    const pre = prereqOf(row);
    const status = passed.has(normTitle(c.title)) ? 'earned' : registeredTitles.has(normTitle(c.title)) ? 'registered'
      : !pre.ok ? 'locked' : offeredNow(c) ? 'available' : 'not_offered';
    required.push({ title: c.title, number: row.number, section: c.section, credits: c.credits ?? row.credits, status, reason: pre.note, offerings: [] });
  });
  // TIPS's curriculum lists leave out passed courses; the handbook still names them.
  const listed = new Set(required.map(r => normTitle(r.title)));
  for (const row of hb.values()) {
    if (row.mark !== 'required' || listed.has(normTitle(row.title)) || !passed.has(normTitle(row.title))) continue;
    const sec = /^(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ)/.exec(row.number)?.[1];
    const section = sec ? ({ Ⅰ: 'I', Ⅱ: 'II', Ⅲ: 'III', Ⅳ: 'IV', Ⅴ: 'V', Ⅵ: 'VI' } as Record<string, string>)[sec] : null;
    if (helps(section)) required.push({ title: row.title, number: row.number, section, credits: row.credits, status: 'earned', reason: null, offerings: [] });
  }
  const frozen = required.filter(r => r.status === 'locked' && prereqOf(hbRow(cc.data.courses.findIndex((c: any) => c.title === r.title))).later)
    .map(r => ({ title: r.title, credits: r.credits, reason: r.reason ?? '' }));

  // 3) Sections of each course offered now: slots and TIPS's own eligibility.
  const now = picks.filter(({ c }: any) => offeredNow(c));
  const offerings: Offering[] = [];
  for (let k = 0; k < now.length; k++) {
    const { c, row } = now[k];
    step('sections', k, now.length);
    const pre = prereqOf(row);
    // Not takeable yet by the handbook's rules: no need to ask TIPS for its sections.
    if (!pre.ok) continue;
    let found: any;
    try { found = await q<any>('registration-candidates', { d: c.cat.d, s: c.cat.s, m: c.cat.m, name: c.cat.name, kamoku: c.kamoku }); }
    catch { continue; }
    for (const x of found.data.candidates ?? []) {
      const slots = parseSlots(x.slotText ?? '');
      const clashWith = registered.find((r: any) => r.slots.some((y: any) => slots.some(z => z.day === y.day && z.period === y.period)));
      offerings.push({
        code: x.code, year: x.year, jscd: x.jscd, kamoku: c.kamoku, title: c.title, section: c.section, category: c.category,
        credits: x.credits ?? c.credits ?? row?.credits ?? 0, mark: row?.mark ?? null, requirement: x.requirement ?? '',
        slots, slotText: x.slotText ?? '', teacher: x.teacher ?? '', campus: x.campus ?? '', canRegister: !!x.canRegister,
        clash: clashWith?.title ?? null,
        prereq: { ok: pre.ok, note: pre.note },
        delivery: { kind: 'unknown', label: '' },
        assessment: { style: 'unknown', examShare: 0, assignmentShare: 0, source: 'none' },
        continues: continuesFrom(c.title, passedTitles), workload: null,
      });
      const req = required.find(r => normTitle(r.title) === normTitle(c.title));
      if (req) req.offerings.push(x.code);
    }
  }

  // 4) Syllabus of each registrable section: delivery and how it is graded.
  const detail = offerings.filter(o => o.canRegister && !o.clash && o.prereq.ok);
  const texts = new Map<string, { grading: string; summary: string }>();
  for (let k = 0; k < detail.length; k++) {
    const o = detail[k];
    step('syllabus', k, detail.length);
    try {
      const syl = await q<any>('syllabus', { code: o.code, year: o.year ?? String(year), lang: 'jp' });
      const section = (jp: string) => syl.data.sections?.find((x: any) => x.label?.jp === jp)?.value ?? '';
      const label = syl.data.delivery?.jp ?? '';
      o.delivery = { kind: deliveryKind(label), label: lang === 'en' ? syl.data.delivery?.en || label : label };
      const grading = section('成績評価の基準・方法');
      o.assessment = assessmentOf(grading);
      texts.set(o.code, { grading, summary: section('科目の要旨・概要') });
    } catch { /* keep what the course list gave */ }
  }

  // 5) Jev, where the text alone left the answer open. Cached per course and passed set.
  const model = jevEnabled();
  if (model) {
    const passedKey = normTitle(passedTitles.join('|')).length.toString(36);
    const todo = detail.filter(o => texts.has(o.code));
    let doneCount = 0;
    const work = async (o: Offering) => {
      const k = `jev:v1:${o.year}:${o.code}:${passedKey}`;
      let ans = cache.read<any>(k)?.data;
      if (!ans) {
        const t = texts.get(o.code)!;
        const questions: Record<string, Question> = {
          assessment: {
            type: 'choice', instructions: 'How is the final grade of this course mostly decided?',
            criteria: {
              assignment_based: 'Mostly assignments, reports, projects or presentations',
              exam_based: 'Mostly exams: midterm, final or quizzes',
              mixed: 'Exams and coursework both carry a large share',
              participation_based: 'Mostly participation, discussion or in-class activity',
            },
          },
          workload: { type: 'score', instructions: 'How heavy is the workload for a student?', criteria: ['Light', 'Moderate', 'Heavy'] },
        };
        if (o.delivery.kind === 'unknown' || o.delivery.kind === 'hybrid') {
          questions.remote = { type: 'noul', instructions: 'Is this course taught online or on-demand rather than in a classroom?' };
        }
        if (!o.continues && passedTitles.length) {
          questions.continues = {
            type: 'noul',
            instructions: { passed_courses: passedTitles.slice(0, 120), question: 'Is this course the next level or a direct continuation of a course in `passed_courses` (same subject, e.g. the next level of the same language)?' },
          };
        }
        ans = await evaluate({ course: o.title, credits: o.credits, delivery: o.delivery.label, grading: t.grading.slice(0, 1500), summary: t.summary.slice(0, 800) }, questions);
        if (ans) cache.write(k, ans);
      }
      if (ans) {
        const a = ans.assessment?.probabilities as Record<string, number> | undefined;
        if (a && (o.assessment.source !== 'stated' || o.assessment.style === 'unknown')) {
          const examShare = (a.exam_based ?? 0) + (a.mixed ?? 0) / 2, assignmentShare = (a.assignment_based ?? 0) + (a.mixed ?? 0) / 2;
          o.assessment = { style: styleOf(examShare, assignmentShare), examShare, assignmentShare, source: 'model' } as Assessment;
        }
        if (typeof ans.workload?.score === 'number') o.workload = ans.workload.score;
        if (typeof ans.remote?.noul === 'number' && o.delivery.kind === 'unknown') o.delivery.kind = ans.remote.noul > 0.6 ? 'online' : ans.remote.noul < 0.4 ? 'in_person' : 'unknown';
        if (!o.continues && typeof ans.continues?.noul === 'number' && ans.continues.noul > 0.7) o.continues = lang === 'en' ? 'a course you passed' : '修得済みの科目';
      }
      step('model', ++doneCount, todo.length);
    };
    // A few at a time; the API asks for backoff on 429, which evaluate() does.
    for (let k = 0; k < todo.length; k += 4) await Promise.all(todo.slice(k, k + 4).map(work));
  }

  const remaining = cc.data.total?.remaining ?? sections.reduce((a, x) => a + x.remaining, 0);
  const frozenCredits = frozen.reduce((a, f) => a + f.credits, 0);
  const limit = tt.data.credits?.limit ?? null;
  const reg = tt.data.credits?.registered ?? 0;
  return {
    builtAt: Date.now(), year, term, semester, dept, entryYear, handbook: hb.size > 0, model,
    credits: {
      limit, registered: reg, remaining, frozen,
      target: Math.max(0, Math.min(remaining - frozenCredits, limit !== null ? limit - reg : Infinity)),
    },
    sections, required, offerings, registered,
  };
}
