/**
 * Class meetings with real dates, from data the app already loads: TIPS's attendance page lists
 * every planned session per course (month, day, period), and the class-changes feed marks
 * cancellations, room changes and make-ups. Used for the "next class" strip on Home and the
 * calendar export. Times are Japan time whatever the phone's time zone.
 */
import { PERIOD_TIMES } from '../config/periods';
import type { TipsAttendanceCourse, TipsChange } from './types';

export interface ClassMeeting {
  code: string;
  start: Date;
  end: Date;
  period: number;
  /** Set when TIPS moved the class to another room, or for a make-up class. */
  room: string | null;
  status: 'normal' | 'roomChange' | 'makeup';
  /** How many periods in a row, after blocks(). */
  periods?: number;
}

const monthDayOf = (s: string) => /(\d{1,2})\/(\d{1,2})/.exec(s);
const periodOf = (p: string | number | null | undefined) =>
  typeof p === 'number' ? p : Number(/\d+/.exec(String(p ?? '').normalize('NFKC'))?.[0]);

/** Calendar day number in Japan time. */
const jstDay = (d: Date) => Math.floor((d.getTime() + 9 * 3_600_000) / 86_400_000);

// Japan has no daylight saving time: JST is always UTC+9.
function jst(year: number, month: number, day: number, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, h - 9, m));
}

/** Start and end of a period on a date of academic year `year` (January to March are the next calendar year). */
export function periodTimes(year: number, month: number, day: number, period: number): [Date, Date] | null {
  const t = PERIOD_TIMES[period];
  if (!t) return null;
  const y = month < 4 ? year + 1 : year;
  return [jst(y, month, day, t[0]), jst(y, month, day, t[1])];
}

/** Every planned meeting of the term, with TIPS's known cancellations removed and make-ups added. */
export function meetings(year: number, courses: TipsAttendanceCourse[] = [], changes: TipsChange[] = []): ClassMeeting[] {
  const key = (code: string, m: number, d: number, p: number) => `${code}|${m}/${d}|${p}`;
  const changed = new Map<string, TipsChange>();
  for (const c of changes) {
    const x = monthDayOf(c.date);
    const p = periodOf(c.period);
    if (x && p) changed.set(key(c.code, Number(x[1]), Number(x[2]), p), c);
  }
  const out: ClassMeeting[] = [];
  for (const c of courses) {
    for (const s of c.sessions ?? []) {
      if (!s.period || s.status === 'cancelled') continue;
      const ch = changed.get(key(c.code, s.month, s.day, s.period));
      if (ch?.status === 'cancelled' || ch?.status === 'cancelledMakeup') continue;
      const times = periodTimes(year, s.month, s.day, s.period);
      if (!times) continue;
      const moved = ch?.status === 'roomChange';
      out.push({ code: c.code, start: times[0], end: times[1], period: s.period, room: moved ? ch.room || null : null, status: moved ? 'roomChange' : 'normal' });
    }
  }
  for (const ch of changes) {
    if (ch.status !== 'makeup') continue;
    const x = monthDayOf(ch.date);
    const p = periodOf(ch.period);
    const times = x && p ? periodTimes(year, Number(x[1]), Number(x[2]), p) : null;
    if (times) out.push({ code: ch.code, start: times[0], end: times[1], period: p, room: ch.room || null, status: 'makeup' });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Back-to-back periods of one course on one day (1限 + 2限) as a single meeting. */
export function blocks(list: ClassMeeting[]): ClassMeeting[] {
  const out: ClassMeeting[] = [];
  for (const m of list) {
    const prev = out.find(x => x.code === m.code && jstDay(x.start) === jstDay(m.start) && x.period + (x.periods ?? 1) === m.period);
    if (prev) { prev.end = m.end; prev.periods = (prev.periods ?? 1) + 1; } else out.push({ ...m });
  }
  return out;
}

/** The class in progress, or the next one to start. */
export const nextMeeting = (list: ClassMeeting[], now: Date) => list.find(m => m.end > now) ?? null;


/** "now", "in 25 min", "in 3 h", "tomorrow", "in 4 days". */
export function untilLabel(start: Date, now: Date, lang: 'en' | 'jp'): string {
  const min = Math.round((start.getTime() - now.getTime()) / 60_000);
  if (min <= 0) return lang === 'en' ? 'now' : '授業中';
  if (min < 60) return lang === 'en' ? `in ${min} min` : `${min}分後`;
  const days = jstDay(start) - jstDay(now);
  if (days === 0) return lang === 'en' ? `in ${Math.round(min / 60)} h` : `${Math.round(min / 60)}時間後`;
  if (days === 1) return lang === 'en' ? 'tomorrow' : '明日';
  return lang === 'en' ? `in ${days} days` : `${days}日後`;
}

/** TIPS's registration deadline text ("2026/10/7 23:59"), as Japan time. */
export function parseDeadline(text: string | null | undefined): Date | null {
  const m = /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/.exec(text ?? '');
  return m ? jst(Number(m[1]), Number(m[2]), Number(m[3]), `${m[4]}:${m[5]}`) : null;
}

/** "closes in 11 days" / "closes in 5 h" / "closes in 40 min", or null once past. */
export function closesIn(deadline: Date | null, now: Date, lang: 'en' | 'jp'): string | null {
  if (!deadline) return null;
  const min = Math.floor((deadline.getTime() - now.getTime()) / 60_000);
  if (min <= 0) return null;
  const [n, en, jp] = min < 60 ? [min, 'min', '分'] : min < 48 * 60 ? [Math.floor(min / 60), 'h', '時間'] : [Math.floor(min / 1440), 'days', '日'];
  return lang === 'en' ? `closes in ${n} ${n === 1 && en === 'days' ? 'day' : en}` : `締切まであと${n}${jp}`;
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, m => `\\${m}`).replace(/\n/g, '\\n');
const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** An .ics file of the term's classes, which Calendar on iPhone and Mac imports. */
export function toIcs(list: ClassMeeting[], info: (code: string) => { title: string; room?: string; teacher?: string }, stamp: Date): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TokaiHub//Classes//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:TokaiHub classes'];
  for (const m of list) {
    const i = info(m.code);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.code}-${icsTime(m.start)}@tokaihub`,
      `DTSTAMP:${icsTime(stamp)}`,
      `DTSTART:${icsTime(m.start)}`,
      `DTEND:${icsTime(m.end)}`,
      `SUMMARY:${icsText(i.title)}`,
      ...(m.room || i.room ? [`LOCATION:${icsText((m.room || i.room)!)}`] : []),
      `DESCRIPTION:${icsText([m.code, i.teacher].filter(Boolean).join(' · '))}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
