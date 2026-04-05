import React, { useState, useMemo } from 'react';
import { ChevronLeft, Menu, Clock, MapPin } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate } from 'react-router-dom';
import SharedMenu from './SharedMenu';
import { motion, AnimatePresence } from 'motion/react';
import { getClassesForDate, allItems } from '../data';

const t = {
  en: {
    schedule: "Schedule",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    noClasses: "No classes today.",
    noClassesWeek: "No classes this week.",
    classesOn: (d: Date) => `Classes on ${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}`,
  },
  jp: {
    schedule: "スケジュール",
    daily: "日別",
    weekly: "週別",
    monthly: "月別",
    noClasses: "今日の授業はありません。",
    noClassesWeek: "今週の授業はありません。",
    classesOn: (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日の授業`,
  }
};

// Period time slots matching Japanese university schedule
const PERIODS = [
  { num: 1, time: '09:00\n10:30' },
  { num: 2, time: '10:40\n12:10' },
  { num: 3, time: '13:00\n14:30' },
  { num: 4, time: '14:40\n16:10' },
  { num: 5, time: '16:20\n17:50' },
  { num: 6, time: '18:00\n19:30' },
];

const WEEK_DAYS_JP = ['月', '火', '水', '木', '金', '土'];
const WEEK_DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// dayOfWeek values: 1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
const WEEK_DAY_NUMS = [1, 2, 3, 4, 5, 6];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiSchedule({ lang, setLang, settings, userProfile }: ScreenProps) {
  const navigate = useNavigate();
  const selectedCourseIds = userProfile?.selectedCourseIds ?? [];

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const [baseDate, setBaseDate] = useState(new Date(2026, 3, 8));
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  // Separate selected date for monthly view so calendar selection doesn't break daily
  const [monthlySelected, setMonthlySelected] = useState<Date>(new Date(2026, 3, 8));

  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-900' : 'bg-brand-black';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  const handlePrevMonth = () => {
    const d = new Date(monthlySelected.getFullYear(), monthlySelected.getMonth() - 1, 1);
    setMonthlySelected(d);
  };

  const handleNextMonth = () => {
    const d = new Date(monthlySelected.getFullYear(), monthlySelected.getMonth() + 1, 1);
    setMonthlySelected(d);
  };

  const monthYear = monthlySelected;
  const daysInMonth = new Date(monthYear.getFullYear(), monthYear.getMonth() + 1, 0).getDate();
  const firstDay = new Date(monthYear.getFullYear(), monthYear.getMonth(), 1).getDay();
  const monthName = monthYear.toLocaleString('en-US', { month: 'long' });
  const year = monthYear.getFullYear();

  // Daily View Data
  const dailyDates = useMemo(() => {
    const dates = [];
    for (let i = -2; i <= 2; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [baseDate]);

  const dailyClasses = useMemo(() => getClassesForDate(baseDate, selectedCourseIds), [baseDate, selectedCourseIds]);

  // Weekly timetable: build a Map<dayOfWeek, Map<period, item>>
  const weeklyTimetable = useMemo(() => {
    // map: dayOfWeek -> period -> item
    const map = new Map<number, Map<number, typeof allItems[0]>>();
    allItems.filter(i => i.type === 'Classes' && selectedCourseIds.includes(i.id)).forEach(item => {
      if (!map.has(item.dayOfWeek)) map.set(item.dayOfWeek, new Map());
      // For classes spanning multiple periods, register each period separately
      (item.periods || [1]).forEach(p => {
        map.get(item.dayOfWeek)!.set(p, item);
      });
    });
    return map;
  }, [selectedCourseIds]);

  const shortDaysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shortDaysOfWeekJp = ['日', '月', '火', '水', '木', '金', '土'];

  // Selected day classes for monthly view
  const monthlySelectedClasses = useMemo(() => {
    if (!monthlySelected) return [];
    return getClassesForDate(monthlySelected, selectedCourseIds);
  }, [monthlySelected, selectedCourseIds]);

  // Actual selected date (highlighted in calendar)
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date>(new Date(2026, 3, 8));

  const handleCalendarDayClick = (date: Date) => {
    setCalendarSelectedDate(date);
    setMonthlySelected(date);
  };

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 sm:p-6 pt-8 sm:pt-12 lg:pt-8 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`w-10 h-10 rounded-full border ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} flex items-center justify-center transition-colors lg:hidden`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold tracking-tight">{t[lang].schedule}</h1>
        </div>
      </header>

      {/* Toggle Daily/Weekly/Monthly */}
      <div className="px-4 sm:px-6 mb-4 max-w-2xl">
        <div className={`flex ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full p-1 shadow-inner`}>
          {(['daily', 'weekly', 'monthly'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-75 active:scale-95 ${
                view === v
                  ? (isDark ? 'bg-gray-700 text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)]' : 'bg-white text-brand-black shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)]')
                  : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-brand-black')
              }`}
            >
              {t[lang][v]}
            </button>
          ))}
        </div>
      </div>

      {/* Dark Container */}
      <div className={`flex-1 ${bgClass} rounded-t-[40px] lg:rounded-t-[32px] p-4 sm:p-6 pt-6 sm:pt-8 flex flex-col overflow-y-auto overflow-x-hidden`}>
        <motion.div variants={containerVariants} initial="hidden" animate="show" key={view} className="pb-8 max-w-4xl w-full mx-auto min-h-0">

          {/* ─── DAILY VIEW ─── */}
          {view === 'daily' && (
            <>
              <motion.div variants={itemVariants} className="flex justify-between gap-2 overflow-x-auto no-scrollbar mb-8 shrink-0">
                {dailyDates.map((d, i) => {
                  const isSelected = d.getDate() === baseDate.getDate() && d.getMonth() === baseDate.getMonth();
                  return (
                    <div
                      key={i}
                      onClick={() => setBaseDate(new Date(d))}
                      className={`flex flex-col items-center justify-center min-w-[60px] lg:min-w-[80px] h-[80px] lg:h-[90px] rounded-[24px] cursor-pointer transition-all duration-75 active:scale-95 ${
                        isSelected
                          ? 'bg-brand-yellow text-brand-black shadow-[inset_3px_3px_6px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <span className="text-sm font-medium mb-1">{lang === 'en' ? shortDaysOfWeekEn[d.getDay()] : shortDaysOfWeekJp[d.getDay()]}</span>
                      <span className="text-xl font-bold">{d.getDate()}</span>
                    </div>
                  );
                })}
              </motion.div>

              <div className="space-y-0 relative min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={baseDate.toISOString()}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-0"
                  >
                    {dailyClasses.length > 0 && dailyClasses.map((item, i) => (
                  <motion.div variants={itemVariants} key={i} className="flex gap-4 group cursor-pointer" onClick={() => setTimeout(() => navigate(`/course/${item.id}`), 150)}>
                    <div className="flex flex-col items-center w-16 shrink-0">
                      <span className="text-white font-bold text-sm mt-4">{item.time.split(' ')[0]}</span>
                      {i !== dailyClasses.length - 1 && (
                        <div className="w-0.5 h-full bg-white/20 my-2 rounded-full" />
                      )}
                    </div>
                    <div className={`flex-1 ${item.color} rounded-3xl p-5 mb-4 group-hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}>
                      <h3 className="font-bold text-lg sm:text-xl text-brand-black leading-tight mb-2">{item.title[lang]}</h3>
                      <div className="flex items-center gap-2 text-brand-black/80 font-medium text-sm">
                        <MapPin className="w-4 h-4" />
                        {item.location[lang]}
                      </div>
                    </div>
                  </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
                {dailyClasses.length === 0 && (
                  <div className="text-center text-white/50 py-8 absolute inset-0 flex items-center justify-center">{t[lang].noClasses}</div>
                )}
              </div>
            </>
          )}

          {/* ─── WEEKLY TIMETABLE VIEW ─── */}
          {view === 'weekly' && (
            <motion.div variants={itemVariants} className="flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 shrink-0">
                <button onClick={() => setCurrentWeekOffset(p => p - 1)} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div className="font-bold text-base text-white">
                  {lang === 'en' ? '2026 — 1st Semester' : '2026年 1学期'}
                </div>
                <button onClick={() => setCurrentWeekOffset(p => p + 1)} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all">
                  <ChevronLeft className="w-5 h-5 text-white rotate-180" />
                </button>
              </div>

              {/* Single CSS Grid timetable — scrolls horizontally on mobile */}
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <div
                  style={{
                    display: 'grid',
                    // Col 1 = period labels, Cols 2-7 = Mon-Sat (6 days)
                    gridTemplateColumns: '38px repeat(6, minmax(62px, 1fr))',
                    // Row 1 = day headers, Rows 2-7 = Periods 1-6
                    gridTemplateRows: 'auto repeat(6, 96px)',
                    gap: '3px',
                    minWidth: '430px',
                    padding: '0 16px',
                  }}
                >
                  {/* ── Day header cells (Row 1) ── */}
                  <div style={{ gridRow: 1, gridColumn: 1 }} />
                  {(lang === 'en' ? WEEK_DAYS_EN : WEEK_DAYS_JP).map((day, i) => (
                    <div
                      key={day}
                      style={{ gridRow: 1, gridColumn: i + 2 }}
                      className="text-center text-xs font-bold text-white/50 pb-2 pt-1"
                    >
                      {day}
                    </div>
                  ))}

                  {/* ── Period label cells (Col 1, Rows 2-7) ── */}
                  {PERIODS.map((period, pIdx) => (
                    <div
                      key={`pl-${period.num}`}
                      style={{ gridRow: pIdx + 2, gridColumn: 1 }}
                      className="flex flex-col items-center justify-start pt-2 pr-1"
                    >
                      <span className="text-brand-yellow font-bold text-sm leading-none">{period.num}</span>
                      <span className="text-white/25 text-[8px] leading-tight mt-1 text-center whitespace-pre-line">{period.time}</span>
                    </div>
                  ))}

                  {/* ── Class cards — placed with gridColumn + gridRow span ── */}
                  {allItems
                    .filter(item => item.type === 'Classes')
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
                          className={`${item.color} rounded-xl p-1.5 sm:p-2 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all flex flex-col justify-between overflow-hidden`}
                        >
                          <div className="font-bold text-brand-black text-[10px] sm:text-[11px] leading-tight line-clamp-3 overflow-hidden text-ellipsis">
                            {item.title[lang]}
                          </div>
                          <div className="mt-1 pt-1 overflow-hidden shrink-0">
                            <span className="text-[8px] font-semibold text-brand-black/60 bg-white/40 rounded px-1 py-0.5 block text-center truncate">
                              {item.location[lang].replace('品川キャンパス ', '').replace('Shinagawa ', '')}
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
                          className="rounded-xl bg-white/[0.03] border border-white/[0.06]"
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}


          {/* ─── MONTHLY VIEW ─── */}
          {view === 'monthly' && (
            <motion.div variants={itemVariants} className="flex flex-col gap-4">
              {/* Calendar */}
              <div className="bg-white/5 rounded-[32px] p-4 sm:p-6 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="flex justify-between items-center mb-6">
                  <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="font-bold text-xl">
                    {lang === 'en' ? `${monthName} ${year}` : `${year}年 ${monthYear.getMonth() + 1}月`}
                  </div>
                  <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all">
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                  </button>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-xs font-bold text-white/40">{d}</div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dateNum = i + 1;
                    const thisDate = new Date(monthYear.getFullYear(), monthYear.getMonth(), dateNum);
                    const hasClass = getClassesForDate(thisDate).length > 0;
                    const isSelected =
                      calendarSelectedDate.getDate() === dateNum &&
                      calendarSelectedDate.getMonth() === monthYear.getMonth() &&
                      calendarSelectedDate.getFullYear() === monthYear.getFullYear();

                    return (
                      <div key={i} className="flex flex-col items-center justify-center h-10 sm:h-12">
                        <button
                          onClick={() => handleCalendarDayClick(thisDate)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-75 active:scale-90 ${
                            isSelected
                              ? 'bg-brand-yellow text-brand-black'
                              : 'hover:bg-white/20'
                          }`}
                        >
                          {dateNum}
                        </button>
                        {hasClass && (
                          <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-brand-pink'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Classes for selected date */}
              <div className="bg-white/5 rounded-[32px] p-4 sm:p-5 text-white">
                <h3 className="font-bold text-base mb-4 text-white/80">
                  {lang === 'en'
                    ? t.en.classesOn(calendarSelectedDate)
                    : t.jp.classesOn(calendarSelectedDate)}
                </h3>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={calendarSelectedDate.toISOString()}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {monthlySelectedClasses.length > 0 ? (
                      monthlySelectedClasses.map((cls) => (
                        <div
                          key={cls.id}
                          onClick={() => setTimeout(() => navigate(`/course/${cls.id}`), 150)}
                          className={`${cls.color} rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_2px_8px_rgba(0,0,0,0.15)]`}
                        >
                          <div className="bg-white/40 rounded-xl px-2.5 py-1.5 font-bold text-xs text-brand-black shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {cls.time.split(' ')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-brand-black text-sm leading-tight truncate">{cls.title[lang]}</div>
                            <div className="text-brand-black/70 text-xs mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {cls.location[lang]}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-white/40 text-sm font-medium text-center py-4">
                        {t[lang].noClasses}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>

      <SharedMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        
        lang={lang}
        setLang={setLang}
        settings={settings}
      />
    </div>
  );
}
