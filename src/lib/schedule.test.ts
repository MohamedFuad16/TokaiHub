import { describe, expect, it } from 'vitest';
import { blocks, closesIn, meetings, nextMeeting, parseDeadline, toIcs, untilLabel } from './schedule';
import type { TipsAttendanceCourse, TipsChange } from './types';

const session = (month: number, day: number, period: number) => ({ no: 1, month, day, period, mark: '/', status: 'unrecorded' as const });
const course = (code: string, sessions: ReturnType<typeof session>[]): TipsAttendanceCourse => ({ code, title: code, slotText: '', offering: '', slots: [], sessions });
const change = (over: Partial<TipsChange>): TipsChange => ({ campus: '', term: '', date: '', weekday: '', period: '', code: '', title: '', teacher: '', room: '', status: 'normal', ...over });

describe('meetings', () => {
  const courses = [course('A', [session(9, 29, 2), session(10, 6, 2)]), course('B', [session(9, 30, 1), session(1, 12, 3)])];
  it('orders the term in Japan time, January in the next year', () => {
    const list = meetings(2026, courses);
    expect(list.map(m => m.code)).toEqual(['A', 'B', 'A', 'B']);
    expect(list[0].start.toISOString()).toBe('2026-09-29T01:55:00.000Z'); // 10:55 JST
    expect(list[3].start.getUTCFullYear()).toBe(2027);
  });
  it('drops cancellations, applies room changes and adds make-ups', () => {
    const list = meetings(2026, courses, [
      change({ code: 'A', date: '9/29(火)', period: '2限', status: 'cancelled' }),
      change({ code: 'B', date: '9/30(水)', period: '1限', status: 'roomChange', room: '4103' }),
      change({ code: 'A', date: '10/3(土)', period: '3限', status: 'makeup', room: '2B201' }),
    ]);
    expect(list.map(m => `${m.code}:${m.status}:${m.room ?? ''}`)).toEqual(['B:roomChange:4103', 'A:makeup:2B201', 'A:normal:', 'B:normal:']);
  });
  it('gives the class in progress, then the next one', () => {
    const list = meetings(2026, courses);
    expect(nextMeeting(list, new Date('2026-09-29T02:30:00Z'))?.code).toBe('A'); // 11:30 JST, during period 2
    expect(nextMeeting(list, new Date('2026-09-29T04:00:00Z'))?.code).toBe('B');
  });
});

describe('blocks', () => {
  it('joins back-to-back periods of one course on one day', () => {
    const list = blocks(meetings(2026, [course('W', [session(10, 1, 1), session(10, 1, 2), session(10, 8, 1)]), course('X', [session(10, 1, 3)])]));
    expect(list.map(m => `${m.code}:${m.periods ?? 1}`)).toEqual(['W:2', 'X:1', 'W:1']);
    expect(list[0].end.toISOString()).toBe('2026-10-01T03:35:00.000Z'); // 12:35 JST
  });
});

describe('labels', () => {
  const now = new Date('2026-09-29T00:00:00Z'); // 9:00 JST
  it('counts down to a class', () => {
    expect(untilLabel(new Date('2026-09-29T00:25:00Z'), now, 'en')).toBe('in 25 min');
    expect(untilLabel(new Date('2026-09-29T05:00:00Z'), now, 'en')).toBe('in 5 h');
    expect(untilLabel(new Date('2026-09-30T00:00:00Z'), now, 'en')).toBe('tomorrow');
    expect(untilLabel(new Date('2026-10-02T00:00:00Z'), now, 'jp')).toBe('3日後');
  });
  it('reads the registration deadline as Japan time', () => {
    const d = parseDeadline('2026/10/7 23:59');
    expect(d?.toISOString()).toBe('2026-10-07T14:59:00.000Z');
    expect(closesIn(d, now, 'en')).toBe('closes in 8 days');
    expect(closesIn(d, new Date('2026-10-07T14:00:00Z'), 'en')).toBe('closes in 59 min');
    expect(closesIn(d, new Date('2026-10-08T00:00:00Z'), 'en')).toBeNull();
  });
});

describe('toIcs', () => {
  it('writes one UTC event per class with escaped text', () => {
    const ics = toIcs(meetings(2026, [course('A', [session(9, 29, 2)])]), () => ({ title: 'Mobile, Computing', room: '4103' }), new Date('2026-09-26T00:00:00Z'));
    expect(ics).toContain('DTSTART:20260929T015500Z');
    expect(ics).toContain('DTEND:20260929T033500Z');
    expect(ics).toContain('SUMMARY:Mobile\\, Computing');
    expect(ics).toContain('LOCATION:4103');
    expect(ics.split('\r\n').filter(l => l === 'BEGIN:VEVENT')).toHaveLength(1);
  });
});
