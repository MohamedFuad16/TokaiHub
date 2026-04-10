import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { CourseItem } from '../lib/types';
import { AppSettings, Language } from '../App';

interface WeeklyTimetableProps {
  scheduleItems: CourseItem[];
  selectedCourseIds: string[];
  lang: Language;
  settings: AppSettings;
  forceDark?: boolean;
}

const PERIODS = [
  { num: 1, time: '09:00\n10:40' },
  { num: 2, time: '10:55\n12:35' },
  { num: 3, time: '13:25\n15:05' },
  { num: 4, time: '15:20\n17:00' },
  { num: 5, time: '17:15\n18:55' },
  { num: 6, time: '19:05\n20:45' },
];

const WEEK_DAYS_JP = ['月', '火', '水', '木', '金', '土'];
const WEEK_DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_DAY_NUMS = [1, 2, 3, 4, 5, 6];

export default function WeeklyTimetable({ scheduleItems, selectedCourseIds, lang, settings, forceDark }: WeeklyTimetableProps) {
  const navigate = useNavigate();
  const isDark = forceDark || settings.isDarkMode;

  const weeklyTimetable = React.useMemo(() => {
    const map = new Map<number, Map<number, CourseItem>>();
    scheduleItems.filter(i => i.type === 'Classes' && (selectedCourseIds.includes(i.id) || selectedCourseIds.includes(i.code ?? ''))).forEach(item => {
      if (!map.has(item.dayOfWeek)) map.set(item.dayOfWeek, new Map());
      (item.periods || [1]).forEach(p => {
        map.get(item.dayOfWeek)!.set(p, item);
      });
    });
    return map;
  }, [selectedCourseIds, scheduleItems]);

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="flex justify-center items-center mb-4 shrink-0">
        <div className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {lang === 'en' ? '2026 — 1st Semester' : '2026年 1学期'}
        </div>
      </div>

      {/* Single CSS Grid timetable — scrolls horizontally on mobile */}
      <div className="overflow-x-auto no-scrollbar w-full" style={{ containerType: 'inline-size' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'min-content repeat(6, minmax(calc((100cqw - 45px) / 5.2), 1fr))',
            gridTemplateRows: 'auto repeat(6, minmax(75px, auto))',
            gap: '3px',
            minWidth: 'max-content',
            padding: '0 12px 8px 12px',
          }}
        >
          {/* ── Period header cells (Row 1) ── */}
          <div style={{ gridRow: 1, gridColumn: 1 }} />
          {PERIODS.map((period, pIdx) => (
            <div
              key={`ph-${period.num}`}
              style={{ gridRow: 1, gridColumn: pIdx + 2 }}
              className="flex flex-col items-center justify-center pb-2 pt-1"
            >
              <span className="text-brand-yellow font-bold text-sm leading-none">{period.num}</span>
              <span className={`text-[8px] leading-tight mt-1 text-center whitespace-pre-line ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{period.time}</span>
            </div>
          ))}

          {/* ── Day label cells (Col 1, Rows 2-7) ── */}
          {(lang === 'en' ? WEEK_DAYS_EN : WEEK_DAYS_JP).map((day, dIdx) => {
            const isToday = settings.enableEnhancedUI && WEEK_DAY_NUMS[dIdx] === new Date().getDay();
            return (
              <div
                key={day}
                style={{ gridRow: dIdx + 2, gridColumn: 1 }}
                className={`flex flex-col items-center justify-center pr-3 py-4 ${isToday ? 'text-brand-yellow' : isDark ? 'text-white/30' : 'text-gray-400'}`}
              >
                <div className="text-[12px] font-bold uppercase tracking-widest leading-none text-center">
                  {day}
                </div>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-brand-yellow mx-auto mt-1.5" />}
              </div>
            );
          })}

          {/* ── Class cards — placed with gridColumn + gridRow span ── */}
          {scheduleItems
            .filter(item =>
              item.type === 'Classes' &&
              (selectedCourseIds.includes(item.id) ||
                selectedCourseIds.includes(item.code ?? ''))
            )
            .map(item => {
              const rowIdx = WEEK_DAY_NUMS.indexOf(item.dayOfWeek);
              if (rowIdx === -1) return null;
              const colStart = (item.periods?.[0] ?? 1) + 1; // +1 because col 1 = header
              const colSpan = item.periods?.length ?? 1;
              return (
                <div
                  key={item.id}
                  style={{
                    gridRow: rowIdx + 2,
                    gridColumn: `${colStart} / span ${colSpan}`,
                  }}
                  onClick={() => setTimeout(() => navigate(`/course/${item.id}`), 150)}
                  className={`${item.color} rounded-xl p-2 sm:p-3 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all flex flex-col justify-between overflow-hidden shadow-sm`}
                >
                  <div className="font-bold text-brand-black text-[10px] sm:text-xs leading-tight line-clamp-3 overflow-hidden text-ellipsis">
                    {item.title?.[lang]}
                  </div>
                  <div className="mt-1.5 pt-1 overflow-hidden shrink-0">
                    <span className="text-[9px] font-bold text-brand-black/50 bg-black/10 rounded-full px-2 py-0.5 inline-block text-center truncate max-w-full">
                      {(item.location?.[lang] ?? '').replace('品川キャンパス ', '').replace('Shinagawa ', '')}
                    </span>
                  </div>
                </div>
              );
            })}

          {/* ── Empty background cells — skip positions occupied by classes ── */}
          {WEEK_DAY_NUMS.map((dayNum, dIdx) =>
            PERIODS.map((period, pIdx) => {
              // Skip if ANY class occupies this period for this day
              const dayMap = weeklyTimetable.get(dayNum);
              if (dayMap?.has(period.num)) return null;
              return (
                <div
                  key={`empty-${dayNum}-${period.num}`}
                  style={{ gridRow: dIdx + 2, gridColumn: pIdx + 2 }}
                  className={`rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-100'}`}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
