import React, { useMemo, useState } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ScreenProps } from '../App';
import PageShell, { Card, Pill, Select, Skeleton, Empty, Fresh, since, EASE } from './ScreenHeader';
import { useTips } from '../lib/useTips';
import { useTimetable } from '../lib/useTerm';
import { termLabel, academicYearOf, colorFor, tidy } from '../lib/tipsAdapters';
import type { AttendanceStatus, Term, TipsAttendanceCourse } from '../lib/types';

const t = {
  en: {
    title: 'Attendance', overall: 'Overall attendance', attended: 'Attended', absent: 'Absent', low: 'Below 80%',
    byTime: 'Timetable order', byRate: 'Lowest rate first', spring: 'Spring', fall: 'Fall', none: 'No attendance records for this term.',
    loading: 'Loading attendance from TIPS (about 15 seconds the first time)…', sessions: (a: number, r: number) => `${a} of ${r} classes`,
    legend: { present: 'Present', absent: 'Absent', other: 'Cancelled, notice or not recorded' },
  },
  jp: {
    title: '出欠状況', overall: '全体の出席率', attended: '出席', absent: '欠席', low: '80%未満',
    byTime: '時間割順', byRate: '出席率が低い順', spring: '春学期', fall: '秋学期', none: 'この学期の出欠記録はありません。',
    loading: 'TIPSから出欠を取得中（初回は約15秒）…', sessions: (a: number, r: number) => `${r}回中${a}回出席`,
    legend: { present: '出席', absent: '欠席', other: '休講・欠席届・未登録' },
  },
};

const dot = (s: AttendanceStatus, isDark: boolean) =>
  s === 'present' ? 'bg-blue-500' : s === 'absent' ? 'bg-red-500' : s === 'late' || s === 'early' ? 'bg-orange-400' : isDark ? 'bg-gray-700' : 'bg-gray-200';

export default function TokaiAttendance(props: ScreenProps) {
  const { lang, settings } = props;
  const tx = t[lang];
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const [sort, setSort] = useState<'time' | 'rate'>('time');
  const tt = useTimetable();
  const year = tt.timetable?.year ?? academicYearOf(new Date());
  const term: Term = tt.timetable?.term ?? '1';
  const att = useTips<{ courses: TipsAttendanceCourse[] }>('attendance', { year, term }, { enabled: !!tt.timetable && tt.items.length > 0 });

  const rows = useMemo(() => {
    const list = (att.data?.courses ?? []).map(c => {
      const recorded = (c.attended ?? 0) + (c.absent ?? 0);
      return { c, recorded, rate: recorded ? Math.round(((c.attended ?? 0) / recorded) * 100) : null, item: tt.items.find(i => i.code === c.code) };
    });
    return sort === 'rate' ? [...list].sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101)) : list;
  }, [att.data, tt.items, sort]);
  const totals = rows.reduce((a, r) => ({ att: a.att + (r.c.attended ?? 0), abs: a.abs + (r.c.absent ?? 0) }), { att: 0, abs: 0 });
  const overall = totals.att + totals.abs ? Math.round((totals.att / (totals.att + totals.abs)) * 100) : null;
  const lowCount = rows.filter(r => r.rate !== null && r.rate < 80).length;
  const days = tt.timetable?.grid.days ?? [];

  return (
    <PageShell {...props} title={tx.title} subtitle={[termLabel(term, year, lang), since(att.cachedAt, lang)].filter(Boolean).join(' · ')} onRefresh={att.refresh} refreshing={att.loading}>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['1', '2'] as Term[]).map(tm => <Pill key={tm} layoutId="attendance-term" active={term === tm} isDark={isDark} onClick={() => tt.setChoice(tm)}>{tm === '1' ? tx.spring : tx.fall}</Pill>)}
        <span className="flex-1" />
        <Select value={sort} onChange={v => setSort(v as 'time' | 'rate')} isDark={isDark} label={tx.byTime}>
          <option value="time">{tx.byTime}</option>
          <option value="rate">{tx.byRate}</option>
        </Select>
      </div>

      {tt.timetable && tt.items.length === 0 && <Empty text={tx.none} isDark={isDark} />}
      {tt.items.length > 0 && !att.data && (
        <div role="status" aria-live="polite">
          <p className={`text-shimmer text-sm font-medium mb-3 ${muted}`}>{tx.loading}</p>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
            <Skeleton isDark={isDark} className="col-span-3 md:col-span-1 h-[104px] rounded-3xl" />
            {[0, 1, 2].map(i => <Skeleton key={i} isDark={isDark} className="h-[104px] rounded-3xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} isDark={isDark} className="h-40 rounded-3xl" />)}
          </div>
        </div>
      )}

      {att.data && rows.length > 0 && (
        <>
          {/* Phone: overall on its own row, the three counts share the next (no orphan card). */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
            <div className="col-span-3 md:col-span-1 rounded-3xl p-5 bg-brand-black text-white">
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{tx.overall}</div>
              <div className="text-4xl font-bold mt-1"><Fresh value={overall ?? -1}>{overall === null ? '—' : `${overall}%`}</Fresh></div>
            </div>
            <Card isDark={isDark} className="p-4 sm:p-5 min-w-0"><div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate ${muted}`}>{tx.attended}</div><div className="text-2xl sm:text-3xl font-bold mt-1"><Fresh value={totals.att}>{totals.att}</Fresh></div></Card>
            <Card isDark={isDark} className="p-4 sm:p-5 min-w-0"><div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate ${muted}`}>{tx.absent}</div><div className="text-2xl sm:text-3xl font-bold mt-1"><Fresh value={totals.abs}>{totals.abs}</Fresh></div></Card>
            <Card isDark={isDark} className="p-4 sm:p-5 min-w-0"><div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate ${muted}`}>{tx.low}</div><div className={`text-2xl sm:text-3xl font-bold mt-1 ${lowCount ? 'text-red-500' : ''}`}>{lowCount}</div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.map(({ c, recorded, rate, item }, i) => (
              // layout: rows glide to their new place when the sort order changes.
              <motion.div key={c.code} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.28, delay: Math.min(i * 0.035, 0.28), ease: EASE } }} transition={{ layout: { type: 'spring', stiffness: 400, damping: 40 } }}>
                <Card isDark={isDark} className="p-5" onClick={() => navigate(`/course/${c.code}`)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-1.5 self-stretch rounded-full ${colorFor(c.code)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15px] leading-snug line-clamp-2">{item?.title[lang] ?? tidy(c.title)}</div>
                      <div className={`text-xs font-medium mt-0.5 truncate ${muted}`}>
                        {[c.code, item ? `${days[(item.dayOfWeek ?? 1) - 1] ?? ''} ${item.periods?.join('・')}` : c.slotText, tidy(c.teacher ?? '')].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-bold leading-none flex items-center gap-1 justify-end ${rate !== null && rate < 80 ? 'text-red-500' : ''}`}>
                        {rate !== null && rate < 80 && <AlertTriangle className="w-4 h-4" />}{rate === null ? '—' : `${rate}%`}
                      </div>
                      <div className={`text-[11px] font-semibold mt-1 ${muted}`}>{tx.sessions(c.attended ?? 0, recorded)}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 mt-1 shrink-0 ${muted}`} />
                  </div>
                  <div className={`mt-4 h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${rate ?? 0}%` }} transition={{ duration: 0.6, ease: EASE }} className={`h-full rounded-full ${rate !== null && rate < 80 ? 'bg-red-500' : 'bg-blue-500'}`} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(c.sessions ?? []).map(s => <span key={`${s.no}-${s.period}`} title={`${s.month}/${s.day} ${s.mark}`} className={`w-3 h-3 rounded-[4px] ${dot(s.status, isDark)}`} />)}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className={`mt-6 flex flex-wrap gap-4 text-[11px] font-semibold ${muted}`}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" />{tx.legend.present}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" />{tx.legend.absent}</span>
            <span className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />{tx.legend.other}</span>
          </div>
        </>
      )}
    </PageShell>
  );
}
