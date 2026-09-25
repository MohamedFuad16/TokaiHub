/** Real class dates for the active term (see classDateIndex). Month-scoped for the current term. */
import { useMemo } from 'react';
import { useTips } from './useTips';
import { useTimetable } from './useTerm';
import { classDateIndex, academicYearOf } from './tipsAdapters';
import type { TipsAttendanceCourse, TipsChange } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;

export function useClassCalendar(month: Date) {
  const tt = useTimetable();
  const year = tt.timetable?.year ?? academicYearOf(new Date());
  const term = tt.timetable?.term ?? '1';
  const isCurrent = !!tt.timetable && tt.timetable.term === tt.currentTerm && tt.items.length > 0;
  const attendance = useTips<{ courses: TipsAttendanceCourse[] }>('attendance', { year, term }, { enabled: !!tt.timetable && tt.items.length > 0 });
  const from = ymd(new Date(month.getFullYear(), month.getMonth(), 1));
  const to = ymd(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const schedule = useTips<{ items: TipsChange[] }>('changes', { from, to, all: 1 }, { enabled: isCurrent });
  const index = useMemo(
    () => classDateIndex(year, term, attendance.data?.courses, schedule.data?.items),
    [year, term, attendance.data, schedule.data],
  );
  const refresh = () => { if (tt.timetable && tt.items.length) attendance.refresh(); if (isCurrent) schedule.refresh(); };
  return { index, items: tt.items, year, courses: attendance.data?.courses, changes: schedule.data?.items, loading: attendance.loading || schedule.loading, refresh };
}
