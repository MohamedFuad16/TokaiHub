export const LMS_ORIGIN = 'https://tlms.tsc.u-tokai.ac.jp';

/**
 * LMS courses as the app shows them: two-period classes (…00, …01 on the LMS) merged into one
 * subject, and this term picked by the codes registered in TIPS rather than by LMS dates.
 */
export interface LmsCourse {
  id: number; title: string; fullname: string; code: string | null; tipsCode: string | null;
  day: number | null; period: number | null; category: string; start: number | null; end: number | null;
}
export interface LmsSubject { key: string; title: string; tipsCode: string | null; ids: number[]; slots: { day: number; period: number }[]; category: string }

export function groupSubjects(courses: LmsCourse[]): LmsSubject[] {
  const by = new Map<string, LmsSubject>();
  for (const c of courses) {
    // Same subject = same TIPS code in the same term category.
    const key = c.tipsCode ? `${c.category}|${c.tipsCode}` : `id:${c.id}`;
    const s = by.get(key) ?? { key, title: c.title, tipsCode: c.tipsCode, ids: [], slots: [], category: c.category };
    s.ids.push(c.id);
    if (c.day !== null && c.period !== null) s.slots.push({ day: c.day, period: c.period });
    by.set(key, s);
  }
  return [...by.values()].map(s => ({ ...s, slots: s.slots.sort((a, b) => a.day - b.day || a.period - b.period) }));
}

/** "2026秋" for year 2026, term 2: LMS categories for the term start with it ("2026秋1"). */
export const termCategory = (year: number, term: '1' | '2') => `${year}${term === '2' ? '秋' : '春'}`;

/**
 * This term's subjects: the ones whose TIPS code is registered now (`mine`), and other courses
 * filed under this term (guidance and the like). Everything else is past.
 */
export function splitByTerm(subjects: LmsSubject[], registered: Set<string>, term: string) {
  const mine = subjects.filter(s => s.tipsCode && registered.has(s.tipsCode) && s.category.startsWith(term));
  const other = subjects.filter(s => !mine.includes(s) && s.category.startsWith(term));
  const past = subjects.filter(s => !mine.includes(s) && !other.includes(s));
  return { mine, other, past };
}
