import { useMemo } from 'react';
import { useTips } from './useTips';

/** Server feature `course-categories`: this student's graduation sections and curriculum. */
export interface CategorySection {
  section: string; name: string;
  required: number; earned: number; inProgress: number; remaining: number;
  items: { name: string; required: number | null; earned: number | null; inProgress: number | null; remaining: number }[];
}
export interface TipsCourseCategories {
  sections: CategorySection[];
  total: { required: number | null; earned: number | null; inProgress: number | null; remaining: number } | null;
  categories: { name: string; section: string | null }[];
  courses: { kamoku: string | null; title: string; credits: number | null; section: string | null; category: string }[];
}

/** Title key that survives TIPS's casing, full-width forms and spacing differences between pages. */
export const normTitle = (s: string) => s.normalize('NFKC').toUpperCase().replace(/[\s・･·\-_,.、。()（）「」『』:：]/g, '');

/**
 * Which graduation section a course counts toward, and which sections still need credits.
 * Both languages are loaded so a title matches whichever language the page shows (English-taught
 * courses often carry an English title on the Japanese pages too).
 */
export function useCourseCategories() {
  const ja = useTips<TipsCourseCategories>('course-categories', { lang: 'jp' });
  const en = useTips<TipsCourseCategories>('course-categories', { lang: 'en' });
  const index = useMemo(() => {
    const m = new Map<string, { section: string | null; category: string; credits: number | null }>();
    for (const d of [ja.data, en.data]) for (const c of d?.courses ?? []) {
      const k = normTitle(c.title);
      if (k && !m.has(k)) m.set(k, { section: c.section, category: c.category, credits: c.credits });
    }
    return m;
  }, [ja.data, en.data]);
  const any = ja.data ?? en.data;
  const needed = useMemo(() => new Set((any?.sections ?? []).filter(s => s.remaining > 0).map(s => s.section)), [any]);
  // Met a real requirement (sections that require nothing, such as VI, are neither).
  const done = useMemo(() => new Set((any?.sections ?? []).filter(s => s.required > 0 && s.remaining === 0).map(s => s.section)), [any]);
  return {
    ja, en,
    loading: ja.loading || en.loading,
    refresh: () => { ja.refresh(); en.refresh(); },
    sectionFor: (title: string | null | undefined) => (title ? index.get(normTitle(title)) ?? null : null),
    needed,
    done,
  };
}

/** requirement: TIPS's 必修 / 選択必修 / 選択 for the course, when known. */
export interface PlanItem { code: string; title: string; credits: number; section: string | null; requirement?: string | null }

// Graduation lines carry the requirement type in their name ("Required course · …", "選択科目 · …").
const kindOf = (s: string | null | undefined) => {
  const x = (s ?? '').normalize('NFKC');
  if (/選択必修|required elective/i.test(x)) return 'reqElective';
  if (/必修|\brequired\b/i.test(x)) return 'required';
  if (/選択|\belective\b/i.test(x)) return 'elective';
  return null;
};
// A line such as "… / Category IV surplus course" (区分Ⅳ余剰) takes another section's overflow.
const takesSurplusOf = (itemName: string, section: string) => new RegExp(`(^|[^A-Z])${section}([^A-Z]|$)`).test(itemName.normalize('NFKC'));

export interface Allocation { section: string | null; via: string | null; beyond: boolean }

/**
 * Where each planned course's credits land, following the graduation check's own lines: the
 * course fills the line of its requirement type in its section; when that line is already full,
 * the credits go to the section whose line accepts this section's surplus (as TIPS counts them).
 */
export function allocate(plan: PlanItem[], sections: CategorySection[]) {
  const itemLeft = new Map<string, number>(sections.flatMap(s => s.items.map(i => [`${s.section}|${i.name}`, i.remaining] as [string, number])));
  const out = new Map<string, Allocation>();
  const fill = (sec: CategorySection, kind: string | null, credits: number) => {
    const lines = sec.items.filter(i => !kind || kindOf(i.name) === kind || kindOf(i.name) === null);
    let need = credits;
    for (const i of lines) {
      const k = `${sec.section}|${i.name}`;
      const take = Math.min(need, itemLeft.get(k) ?? 0);
      itemLeft.set(k, (itemLeft.get(k) ?? 0) - take);
      need -= take;
    }
    return credits - need;
  };
  const room = (sec: CategorySection, kind: string | null) => sec.items
    .filter(i => !kind || kindOf(i.name) === kind || kindOf(i.name) === null)
    .reduce((a, i) => a + (itemLeft.get(`${sec.section}|${i.name}`) ?? 0), 0);
  for (const p of plan) {
    const home = sections.find(s => s.section === p.section);
    if (!home) { out.set(p.code, { section: p.section, via: null, beyond: false }); continue; }
    const kind = kindOf(p.requirement);
    if (room(home, kind) > 0) {
      const used = fill(home, kind, p.credits);
      out.set(p.code, { section: home.section, via: null, beyond: used < p.credits });
      continue;
    }
    const surplus = sections.find(s => s.section !== home.section && s.items.some(i => takesSurplusOf(i.name, home.section)));
    if (surplus && room(surplus, null) > 0) {
      const used = fill(surplus, null, p.credits);
      out.set(p.code, { section: surplus.section, via: home.section, beyond: used < p.credits });
    } else {
      out.set(p.code, { section: home.section, via: null, beyond: true });
    }
  }
  return out;
}

