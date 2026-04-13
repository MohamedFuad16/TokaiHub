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
    
    // Safety check for scheduleItems being an array
    if (!Array.isArray(scheduleItems)) return map;

    scheduleItems.filter(i => 
      i && 
      i.type === 'Classes' && 
      (selectedCourseIds.includes(i.id) || selectedCourseIds.includes(i.code ?? ''))
    ).forEach(item => {
      const day = item.dayOfWeek ?? 1;
      if (!map.has(day)) map.set(day, new Map());
      
      // Defensively handle periods in case normalization missed something
      const periods = Array.isArray(item.periods) ? item.periods : [1];
      periods.forEach(p => {
        const periodNum = Number(p);
        if (!isNaN(periodNum)) {
          map.get(day)!.set(periodNum, item);
        }
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
            gridTemplateColumns: 'min-content repeat(6, 18%)',
            gridTemplateRows: 'auto repeat(6, minmax(85px, auto))',
            gap: '2px',
            padding: '0 4px 8px 4px',
          }}
        >
          {/* ── Day header cells (Row 1) ── */}
          <div style={{ gridRow: 1, gridColumn: 1 }} />
          {(lang === 'en' ? WEEK_DAYS_EN : WEEK_DAYS_JP).map((day, i) => {
            const isToday = settings.enableEnhancedUI && WEEK_DAY_NUMS[i] === new Date().getDay();
            return (
              <div
                key={day}
                style={{ gridRow: 1, gridColumn: i + 2 }}
                className={`text-center text-[11px] sm:text-xs font-bold pb-2 pt-1 uppercase tracking-widest ${isToday ? 'text-brand-yellow' : isDark ? 'text-white/30' : 'text-gray-400'}`}
              >
                {day}
                {isToday && <div className="w-1 h-1 rounded-full bg-brand-yellow mx-auto mt-0.5" />}
              </div>
            );
          })}

          {/* ── Period label cells (Col 1, Rows 2-7) ── */}
          {PERIODS.map((period, pIdx) => (
            <div
              key={`pl-${period.num}`}
              style={{ gridRow: pIdx + 2, gridColumn: 1 }}
              className="flex flex-col items-center justify-start pt-2 pr-1"
            >
              <span className="text-brand-yellow font-bold text-[13px] sm:text-sm leading-none">{period.num}</span>
              <span className={`text-[9px] leading-tight mt-1 text-center whitespace-pre-line ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{period.time}</span>
            </div>
          ))}

          {/* ── Class cards — placed with gridColumn + gridRow span ── */}
          {scheduleItems
            .filter(item =>
              item.type === 'Classes' &&
              (selectedCourseIds.includes(item.id) ||
                selectedCourseIds.includes(item.code ?? ''))
            )
            .map(item => {
              const colIdx = WEEK_DAY_NUMS.indexOf(item.dayOfWeek);
              if (colIdx === -1) return null;
              const rowStart = (item.periods?.[0] ?? 1) + 1; // +1 because row 1 = header
              const rowSpan = item.periods?.length ?? 1;
              return (
                <div
                  key={item.id}
                  style={{
                    gridRow: `${rowStart} / span ${rowSpan}`,
                    gridColumn: colIdx + 2,
                  }}
                  onClick={() => setTimeout(() => navigate(`/course/${item.id}`), 150)}
                  className={`${item.color} rounded-xl px-0.5 py-1.5 sm:p-1.5 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all flex flex-col justify-between shadow-sm min-h-0 relative`}
                >
                  <div className="font-bold text-brand-black text-[9.5px] @[400px]:text-[10.5px] sm:text-xs leading-tight tracking-tight break-words hyphens-auto w-full text-center">
                    {item.title?.[lang]}
                  </div>
                  <div className="mt-1.5 pt-1 shrink-0 flex flex-wrap gap-1">
                    <span className="text-[8.5px] font-bold text-brand-black/60 bg-black/[0.08] rounded-md px-1.5 py-0.5 inline-block truncate max-w-full">
                      {(item.location?.[lang] ?? '').replace('品川キャンパス ', '').replace('Shinagawa ', '')}
                    </span>
                  </div>
                </div>
              );
            })}

          {/* ── Empty background cells — skip positions occupied by classes ── */}
          {PERIODS.map((period, pIdx) =>
            WEEK_DAY_NUMS.map((dayNum, dIdx) => {
              // Skip if ANY class occupies this period for this day
              const dayMap = weeklyTimetable.get(dayNum);
              if (dayMap?.has(period.num)) return null;
              return (
                <div
                  key={`empty-${period.num}-${dayNum}`}
                  style={{ gridRow: pIdx + 2, gridColumn: dIdx + 2 }}
                  className={`rounded-[14px] border border-dashed ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-transparent border-black/[0.08]'}`}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
