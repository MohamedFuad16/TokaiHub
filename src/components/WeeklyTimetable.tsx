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

export default function WeeklyTimetable({
  scheduleItems,
  selectedCourseIds,
  lang,
  settings,
  forceDark,
}: WeeklyTimetableProps) {
  const navigate = useNavigate();
  const isDark = forceDark || settings.isDarkMode;

  /**
   * 🔥 SINGLE SOURCE OF TRUTH
   * - filters
   * - deduplicates
   * - builds occupied slots
   */
  const { filteredItems, occupiedSlots } = React.useMemo(() => {
    const seen = new Map<string, CourseItem>();
    const occupied = new Set<string>();

    if (!Array.isArray(scheduleItems)) {
      return { filteredItems: [], occupiedSlots: occupied };
    }

    scheduleItems.forEach((item) => {
      if (
        !item ||
        item.type !== 'Classes' ||
        (!selectedCourseIds.includes(item.id) &&
          !selectedCourseIds.includes(item.code ?? ''))
      ) {
        return;
      }

      // dedupe by id
      if (!seen.has(item.id)) {
        seen.set(item.id, item);
      }

      // mark ALL occupied periods
      const periods = Array.isArray(item.periods) ? item.periods : [1];
      periods.forEach((p) => {
        const periodNum = Number(p);
        if (!isNaN(periodNum)) {
          occupied.add(`${item.dayOfWeek}-${periodNum}`);
        }
      });
    });

    return {
      filteredItems: Array.from(seen.values()),
      occupiedSlots: occupied,
    };
  }, [scheduleItems, selectedCourseIds]);

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="flex justify-center items-center mb-4 shrink-0">
        <div
          className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
        >
          {lang === 'en' ? '2026 — 1st Semester' : '2026年 1学期'}
        </div>
      </div>

      {/* Grid wrapper */}
      <div className="overflow-x-auto w-full no-scrollbar">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'min-content repeat(6, minmax(100px, 1fr))',
            gridTemplateRows:
              'auto repeat(6, minmax(90px, auto))',
            gap: '4px',
            padding: '4px 8px 12px 4px',
            minWidth: '700px', // 🔥 prevents squeeze
          }}
        >
          {/* Day headers */}
          <div />
          {(lang === 'en' ? WEEK_DAYS_EN : WEEK_DAYS_JP).map(
            (day, i) => {
              const isToday =
                settings.enableEnhancedUI &&
                WEEK_DAY_NUMS[i] === new Date().getDay();

              return (
                <div
                  key={day}
                  className={`text-center text-xs font-bold pb-2 pt-1 uppercase ${isToday
                      ? 'text-brand-yellow'
                      : isDark
                        ? 'text-white/30'
                        : 'text-gray-400'
                    }`}
                >
                  {day}
                </div>
              );
            }
          )}

          {/* Period labels */}
          {PERIODS.map((period, pIdx) => (
            <div
              key={period.num}
              style={{ gridRow: pIdx + 2, gridColumn: 1 }}
              className="flex flex-col items-center pt-2 pr-1"
            >
              <span className="text-brand-yellow font-bold text-sm">
                {period.num}
              </span>
              <span
                className={`text-[10px] whitespace-pre-line text-center ${isDark ? 'text-white/60' : 'text-gray-500'
                  }`}
              >
                {period.time}
              </span>
            </div>
          ))}

          {/* 🔥 CLASS CARDS (single render) */}
          {filteredItems.map((item) => {
            const colIdx = WEEK_DAY_NUMS.indexOf(item.dayOfWeek);
            if (colIdx === -1) return null;

            const rowStart = (item.periods?.[0] ?? 1) + 1;
            const rowSpan = item.periods?.length ?? 1;

            return (
              <div
                key={item.id}
                style={{
                  gridRow: `${rowStart} / span ${rowSpan}`,
                  gridColumn: colIdx + 2,
                }}
                onClick={() =>
                  setTimeout(() => navigate(`/course/${item.id}`), 100)
                }
                className={`${item.color || (isDark ? 'bg-white/10' : 'bg-gray-100')
                  } rounded-xl p-2 cursor-pointer shadow-sm flex flex-col gap-1`}
              >
                <div className="text-xs font-semibold text-center line-clamp-3">
                  {item.title?.[lang]}
                </div>

                <div className="mt-auto text-[10px] text-center opacity-70">
                  {(item.location?.[lang] ?? '').replace(
                    'Shinagawa ',
                    ''
                  )}
                </div>
              </div>
            );
          })}

          {/* 🔥 EMPTY CELLS (corrected logic) */}
          {PERIODS.map((period, pIdx) =>
            WEEK_DAY_NUMS.map((dayNum, dIdx) => {
              if (occupiedSlots.has(`${dayNum}-${period.num}`)) {
                return null;
              }

              return (
                <div
                  key={`empty-${period.num}-${dayNum}`}
                  style={{
                    gridRow: pIdx + 2,
                    gridColumn: dIdx + 2,
                  }}
                  className={`rounded-lg border border-dashed ${isDark
                      ? 'bg-white/[0.02] border-white/[0.08]'
                      : 'bg-transparent border-black/[0.08]'
                    }`}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}