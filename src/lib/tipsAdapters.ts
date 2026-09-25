/**
 * Converts TIPS data into the shapes the UI components render. Everything shown comes from
 * TIPS; the only local inputs are the period clock times (config/periods.ts) and the
 * decorative course artwork, picked from src/assets/courses by course code.
 */
import { PERIOD_TIMES } from '../config/periods';
import type { CourseItem, LocalizedString, Term, TipsAttendanceCourse, TipsChange, TipsProfile, TipsTimetable, TipsTimetableCourse } from './types';


export function academicYearOf(date: Date) {
  return date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear();
}

const PALETTE = ['bg-brand-pink', 'bg-brand-yellow', 'bg-brand-green', 'bg-blue-200', 'bg-purple-300', 'bg-orange-200', 'bg-green-300', 'bg-brand-gray'];
const ARTWORK = Object.values(import.meta.glob('../assets/courses/*.webp', { eager: true, import: 'default' })) as string[];
function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
export const colorFor = (code: string) => PALETTE[hash(code) % PALETTE.length];
const artworkFor = (code: string) => ARTWORK[hash(code) % ARTWORK.length];

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i;
/**
 * TIPS's English mode writes titles and names in capitals ("CLOUD COMPUTING"). Show them in
 * title case; mixed-case or Japanese text is returned unchanged.
 */
export function tidy(s: string) {
  // Leave Japanese text (kana/kanji) and anything already mixed-case alone.
  if (!s || /[\u3040-\u30fb\u30fd-\u30ff\u3400-\u9fff]/.test(s) || /[a-z]/.test(s) || !/[A-Z]{2}/.test(s)) return s;
  return s.toLowerCase().split(/(\s+|[-/(])/).map((w, i) => {
    if (!/[a-z]/.test(w)) return w;
    if (ROMAN.test(w)) return w.toUpperCase();
    if (i > 0 && SMALL.has(w)) return w;
    // Two-letter words that are not joining words are acronyms in course titles (IT, AI, 3D).
    if (w.length <= 2 && !SMALL.has(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join('');
}

function periodTime(periods: number[]) {
  const sorted = [...periods].sort((a, b) => a - b);
  const start = PERIOD_TIMES[sorted[0]]?.[0];
  const end = PERIOD_TIMES[sorted[sorted.length - 1]]?.[1];
  return start && end ? `${start} - ${end}` : undefined;
}

/** TIPS already answered in the UI language, so jp and en carry the same string. */
function toCourseItem(c: TipsTimetableCourse): CourseItem {
  const same = (s: string) => ({ jp: tidy(s), en: tidy(s) });
  return {
    id: c.code,
    code: c.code,
    type: 'Classes',
    title: same(c.title),
    teacher: same(c.teacher),
    location: same([c.campus, c.room].filter(Boolean).join(' ')),
    dayOfWeek: c.day,
    periods: [...c.periods].sort((a, b) => a - b),
    time: periodTime(c.periods),
    color: colorFor(c.code),
    image: artworkFor(c.code),
  };
}

export const toCourseItems = (t?: TipsTimetable) => (t?.courses ?? []).map(toCourseItem);

const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * Real class dates. Past terms: the attendance record's session dates. Current term: TIPS's
 * class schedule (授業スケジュール), which also carries cancellations and make-ups.
 */
export function classDateIndex(year: number, term: Term, attendance?: TipsAttendanceCourse[], schedule?: TipsChange[]) {
  const idx = new Map<string, { code: string; period: number | null; status?: TipsChange['status'] }[]>();
  const add = (d: Date, v: { code: string; period: number | null; status?: TipsChange['status'] }) => {
    const k = dateKey(d);
    const list = idx.get(k) ?? [];
    if (!list.some(x => x.code === v.code && x.period === v.period)) list.push(v);
    idx.set(k, list);
  };
  for (const c of attendance ?? []) for (const s of c.sessions ?? []) {
    const y = term === '2' && s.month < 4 ? year + 1 : year;
    add(new Date(y, s.month - 1, s.day), { code: c.code, period: s.period });
  }
  for (const s of schedule ?? []) {
    const m = /(\d+)\/(\d+)/.exec(s.date);
    if (!m) continue;
    const month = Number(m[1]);
    add(new Date(term === '2' && month < 4 ? year + 1 : year, month - 1, Number(m[2])), { code: s.code, period: Number(s.period.match(/\d+/)?.[0]) || null, status: s.status });
  }
  return {
    has: (d: Date) => idx.has(dateKey(d)),
    on: (d: Date, items: CourseItem[]) => {
      const entries = idx.get(dateKey(d)) ?? [];
      const codes = [...new Set(entries.map(e => e.code))];
      return codes.map(code => ({ item: items.find(i => i.code === code), status: entries.find(e => e.code === code && e.status && e.status !== 'normal')?.status }))
        .filter((x): x is { item: CourseItem; status: TipsChange['status'] | undefined } => !!x.item)
        .sort((a, b) => (a.item.periods?.[0] ?? 0) - (b.item.periods?.[0] ?? 0));
    },
  };
}

/**
 * A class's day and periods in a few characters, so it fits a chip on a phone: "Thu 1・2" /
 * "木 1・2限". `day` is TIPS's grid header for that day ("Thursday" / "木曜日").
 */
export const slotLabel = (day: string | undefined, periods: number[] | undefined, lang: 'en' | 'jp') =>
  [day ? (lang === 'en' ? day.slice(0, 3) : day.charAt(0)) : '', periods?.length ? `${periods.join('・')}${lang === 'en' ? '' : '限'}` : '']
    .filter(Boolean).join(' ');

export const termLabel = (term: Term | null | undefined, year: number | null | undefined, lang: 'en' | 'jp') =>
  term ? (lang === 'en' ? `${year ?? ''} ${term === '1' ? 'Spring' : 'Fall'} Semester` : `${year ?? ''}年度 ${term === '1' ? '春学期' : '秋学期'}`) : '';

/**
 * Display names. TIPS lists names family-first in both kana and English; the Hub greets by
 * the given name (last English token, or last two when the name has four or more tokens).
 */
export function displayName(p: TipsProfile | undefined, lang: 'en' | 'jp'): LocalizedString & { given: string } {
  const en = p?.nameEn ?? '';
  const jp = p?.name ?? '';
  const tokens = en.split(' ').filter(Boolean);
  const givenEn = tokens.length >= 4 ? tokens.slice(-2).join(' ') : tokens[tokens.length - 1] ?? '';
  const givenJp = jp.split(' ').slice(-1)[0] ?? '';
  return { en, jp, given: lang === 'en' ? (givenEn || givenJp) : (givenJp || givenEn) };
}

export const pct = (a?: number | null, b?: number | null) => (a && b ? Math.round((a / b) * 100) : 0);

const DAY_JP: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
const DAY_EN: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
/** TIPS slot text ("水3 水4", "Wed3 Wed4", "月／Mon 2") → [{day, period}] */
export function parseSlots(text: string): { day: number; period: number }[] {
  const out: { day: number; period: number }[] = [];
  for (const m of text.matchAll(/([日月火水木金土])[^\d,\s]*\s*(\d+)/g)) out.push({ day: DAY_JP[m[1]], period: Number(m[2]) });
  if (!out.length) for (const m of text.matchAll(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)[a-z]*\s*(\d+)/gi)) out.push({ day: DAY_EN[m[1].toLowerCase()], period: Number(m[2]) });
  return out;
}
