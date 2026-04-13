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
// Column index 0 = Monday (day 1), ..., 5 = Saturday (day 6)
const WEEK_DAY_NUMS = [1, 2, 3, 4, 5, 6];

const DAY_MAP: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

/** Convert string ("MON") or raw number to a JS day-of-week number (1=Mon…6=Sat). */
function toNumericDay(raw: unknown): number {
  if (typeof raw === 'string') {
    const mapped = DAY_MAP[raw.toUpperCase()];
    return mapped !== undefined ? mapped : (parseInt(raw, 10) || 1);
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 1;
}

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
   * Single pass:
   * 1. filter to enrolled Classes
   * 2. deduplicate by id (keep first occurrence)
   * 3. build a set of "col-row" keys for occupied slots (to skip empty cell render)
   */
  const { cards, occupied } = React.useMemo(() => {
    const seen = new Map<string, CourseItem>();
    const occupiedSet = new Set<string>();

    if (!Array.isArray(scheduleItems)) return { cards: [], occupied: occupiedSet };

    for (const item of scheduleItems) {
      if (!item || item.type !== 'Classes') continue;
      if (!selectedCourseIds.includes(item.id) && !selectedCourseIds.includes(item.code ?? '')) continue;

      const day = toNumericDay(item.dayOfWeek);
      const colIdx = WEEK_DAY_NUMS.indexOf(day); // 0-based column index
      if (colIdx === -1) continue;

      // deduplicate — keep first
      if (!seen.has(item.id)) {
        seen.set(item.id, { ...item, dayOfWeek: day }); // store normalized day
      }

      // mark all periods this course occupies as taken
      const periods = Array.isArray(item.periods) ? item.periods.map(Number).filter(Number.isFinite) : [1];
      for (const p of periods) {
        occupiedSet.add(`${colIdx}-${p}`); // use colIdx so both loops share the same key format
      }
    }

    return { cards: Array.from(seen.values()), occupied: occupiedSet };
  }, [scheduleItems, selectedCourseIds]);

  const dayLabels = lang === 'en' ? WEEK_DAYS_EN : WEEK_DAYS_JP;
  const today = new Date().getDay(); // 0=Sun … 6=Sat

  return (
    <div className="flex flex-col w-full">
      {/* Semester header */}
      <div className="flex justify-center items-center mb-3 shrink-0">
        <span className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {lang === 'en' ? '2026 — 1st Semester' : '2026年 1学期'}
        </span>
      </div>

      {/* Scrollable grid — minWidth forces proper column widths on small screens */}
      <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div
          style={{
            display: 'grid',
            /* period-label col + 6 day cols, each at least 80px wide */
            gridTemplateColumns: '44px repeat(6, minmax(80px, 1fr))',
            gridTemplateRows: 'auto repeat(6, minmax(88px, auto))',
            gap: '4px',
            padding: '0 8px 16px 4px',
            minWidth: '560px',
          }}
        >
          {/* ── Row 1: corner spacer + day headers ── */}
          <div /> {/* corner */}
          {dayLabels.map((label, i) => {
            const isToday = settings.enableEnhancedUI && WEEK_DAY_NUMS[i] === today;
            return (
              <div
                key={label}
                className={`text-center text-[11px] font-bold pb-1 pt-0.5 uppercase tracking-wider
                  ${isToday ? 'text-brand-yellow' : isDark ? 'text-white/30' : 'text-gray-400'}`}
              >
                {label}
                {isToday && <div className="w-1 h-1 rounded-full bg-brand-yellow mx-auto mt-0.5" />}
              </div>
            );
          })}

          {/* ── Col 1: period labels ── */}
          {PERIODS.map((p, pIdx) => (
            <div
              key={p.num}
              style={{ gridRow: pIdx + 2, gridColumn: 1 }}
              className="flex flex-col items-center justify-start pt-2 pr-1 shrink-0"
            >
              <span className="text-brand-yellow font-bold text-sm leading-none">{p.num}</span>
              <span className={`text-[9px] leading-tight mt-0.5 text-center whitespace-pre-line ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                {p.time}
              </span>
            </div>
          ))}

          {/* ── Empty background cells ── rendered for every slot NOT occupied by a class ── */}
          {PERIODS.map((p, pIdx) =>
            WEEK_DAY_NUMS.map((_dayNum, colIdx) => {
              if (occupied.has(`${colIdx}-${p.num}`)) return null;
              return (
                <div
                  key={`empty-${colIdx}-${p.num}`}
                  style={{ gridRow: pIdx + 2, gridColumn: colIdx + 2 }}
                  className={`rounded-xl border border-dashed ${isDark ? 'bg-white/[0.02] border-white/[0.07]' : 'bg-transparent border-black/[0.07]'}`}
                />
              );
            })
          )}

          {/* ── Class cards ── rendered on top of empty cells via grid placement ── */}
          {cards.map((item) => {
            const day = toNumericDay(item.dayOfWeek);
            const colIdx = WEEK_DAY_NUMS.indexOf(day);
            if (colIdx === -1) return null;

            const periods = (Array.isArray(item.periods) ? item.periods : [1])
              .map(Number)
              .filter(Number.isFinite)
              .sort((a, b) => a - b);
            const firstPeriod = periods[0] ?? 1;
            const lastPeriod = periods[periods.length - 1] ?? firstPeriod;

            const gridRow = firstPeriod + 1; // row 1 = header, row 2 = period 1
            const gridSpan = lastPeriod - firstPeriod + 1;

            const hasColor = !!item.color;
            const textCls = hasColor || !isDark ? 'text-[#0a0a0c]' : 'text-white';
            const mutedCls = hasColor || !isDark ? 'text-[#0a0a0c]/55' : 'text-white/55';
            const room = (item.location?.[lang] ?? '')
              .replace('品川キャンパス ', '')
              .replace('Shinagawa Campus ', '')
              .replace('Shinagawa ', '');

            return (
              <div
                key={item.id}
                style={{
                  gridRow: `${gridRow} / span ${gridSpan}`,
                  gridColumn: colIdx + 2,
                  zIndex: 1, // sit above empty cells
                }}
                onClick={() => navigate(`/course/${item.id}`)}
                className={`
                  ${item.color || (isDark ? 'bg-white/10' : 'bg-gray-100')}
                  rounded-xl p-1.5 cursor-pointer
                  hover:brightness-95 active:scale-[0.97]
                  transition-all shadow-sm
                  flex flex-col justify-between
                  overflow-hidden
                  border ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}
                `}
              >
                <p className={`text-[10px] font-semibold text-center leading-snug line-clamp-3 ${textCls}`}>
                  {item.title?.[lang]}
                </p>
                {room ? (
                  <p className={`text-[8px] font-bold text-center truncate mt-1 ${mutedCls}`}>
                    {room}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}