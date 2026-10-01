import React from 'react';
import { FileText, ClipboardCheck, Link2, MessagesSquare, Folder, FileQuestion, BookOpen, Box } from 'lucide-react';
import type { Language } from '../App';
import { useTips } from '../lib/useTips';
import { academicYearOf } from '../lib/tipsAdapters';
import { groupSubjects, splitByTerm, termCategory, type LmsCourse } from '../lib/lms';
import type { TipsTimetable } from '../lib/types';

/** Shared bits of the LMS screens: data hooks, module icons, dates. */
export function useLmsSubjects() {
  const courses = useTips<{ courses: LmsCourse[] }>('lms-courses');
  // This term = the codes registered in TIPS for the current term (not the term on screen).
  const tt = useTips<TipsTimetable>('timetable');
  const year = tt.data?.year ?? academicYearOf(new Date());
  const term = (tt.data?.term ?? (new Date().getMonth() + 1 >= 9 || new Date().getMonth() + 1 <= 2 ? '2' : '1')) as '1' | '2';
  const registered = new Set((tt.data?.courses ?? []).map(c => c.code).filter(Boolean) as string[]);
  const subjects = courses.data ? groupSubjects(courses.data.courses) : [];
  return { ...splitByTerm(subjects, registered, termCategory(year, term)), courses, year, term };
}

const ICONS: Record<string, React.ElementType> = {
  resource: FileText, assign: ClipboardCheck, url: Link2, forum: MessagesSquare, folder: Folder,
  quiz: FileQuestion, page: BookOpen,
};
export const ModuleIcon = ({ module, className }: { module: string; className?: string }) => {
  const Icon = ICONS[module] ?? Box;
  return <Icon className={className} />;
};

const DAY = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], jp: ['日', '月', '火', '水', '木', '金', '土'] };
export const slotsLabel = (slots: { day: number; period: number }[], lang: Language) => {
  if (!slots.length) return '';
  const day = DAY[lang][slots[0].day];
  return lang === 'en' ? `${day} ${slots.map(s => s.period).join('・')}` : `${day}${slots.map(s => s.period).join('・')}限`;
};

/** "グローバルビジネス英語 火 3 （17TTX00500）" → "グローバルビジネス英語". */
export const courseTitle = (fullname: string) =>
  fullname.normalize('NFKC').replace(/\s*[日月火水木金土他]\s*\d?\s*\([0-9A-Z]+\)\s*$/, '').replace(/\s*\([0-9A-Z]+\)\s*$/, '').trim();

/** "Thu 10/1 23:59" in Japan time. */
export const dueText = (unix: number, lang: Language) =>
  new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ja-JP', { timeZone: 'Asia/Tokyo', weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(unix * 1000));

/** "in 4 h", "in 3 days", "2 days ago". */
export function dueIn(unix: number, lang: Language, now = Date.now()) {
  const min = Math.round((unix * 1000 - now) / 60_000);
  const abs = Math.abs(min);
  const [n, en, jp] = abs < 60 ? [abs, 'min', '分'] : abs < 48 * 60 ? [Math.round(abs / 60), 'h', '時間'] : [Math.round(abs / 1440), 'days', '日'];
  if (min < 0) return lang === 'en' ? `${n} ${en} ago` : `${n}${jp}前`;
  return lang === 'en' ? `in ${n} ${en}` : `あと${n}${jp}`;
}
