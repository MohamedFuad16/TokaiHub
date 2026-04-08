import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SharedMenu from './SharedMenu';
import { motion, AnimatePresence } from 'motion/react';
import { getClassesForDate, allItems } from '../data';
import { getSchedule } from '../lib/api';
import type { CourseItem } from '../lib/types';
import mascotIdle from '../assets/mascots/mascot_1_2.png';

const t = {
  en: {
    schedule: "Schedule",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    noClasses: "No classes today.",
    noClassesWeek: "No classes this week.",
    classesOn: (d: Date) => `Classes on ${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}`,
    noCourses: "Select your courses in Edit Profile to see your schedule",
    goToEditProfile: "Edit Profile",
  },
  jp: {
    schedule: "スケジュール",
    daily: "日別",
    weekly: "週別",
    monthly: "月別",
    noClasses: "今日の授業はありません。",
    noClassesWeek: "今週の授業はありません。",
    classesOn: (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日の授業`,
    noCourses: "プロフィール編集で授業を選択してスケジュールを表示しましょう",
    goToEditProfile: "プロフィール編集",
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
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiSchedule({ lang, setLang, settings, userProfile }: ScreenProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCourseIds = userProfile?.selectedCourseIds ?? [];

  // Fetch schedule from API; fall back to local data on error
  const [scheduleItems, setScheduleItems] = useState<CourseItem[]>(allItems as CourseItem[]);
  useEffect(() => {
    getSchedule()
      .then(data => { if (data?.length) setScheduleItems(data); })
      .catch(() => { /* keep local fallback */ });
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Persist view in URL so back navigation restores it
  const viewParam = searchParams.get('view') as 'daily' | 'weekly' | 'monthly' | null;
  const view = viewParam && ['daily', 'weekly', 'monthly'].includes(viewParam) ? viewParam : 'daily';
  const setView = useCallback((v: 'daily' | 'weekly' | 'monthly') => {
    setSearchParams({ view: v }, { replace: true });
  }, [setSearchParams]);

  const [baseDate, setBaseDate] = useState(new Date());
  // Separate selected date for monthly view so calendar selection doesn't break daily
  const [monthlySelected, setMonthlySelected] = useState<Date>(new Date());

  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-900' : 'bg-brand-black';

  const handlePrevMonth = useCallback(() => {
    setMonthlySelected(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonthlySelected(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

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

  const dailyClasses = useMemo(() => getClassesForDate(baseDate, selectedCourseIds, scheduleItems), [baseDate, selectedCourseIds, scheduleItems]);

  // Weekly timetable: build a Map<dayOfWeek, Map<period, item>>
  const weeklyTimetable = useMemo(() => {
    // map: dayOfWeek -> period -> item
    const map = new Map<number, Map<number, CourseItem>>();
    scheduleItems.filter(i => i.type === 'Classes' && (selectedCourseIds.includes(i.id) || selectedCourseIds.includes(i.code ?? ''))).forEach(item => {
      if (!map.has(item.dayOfWeek)) map.set(item.dayOfWeek, new Map());
      // For classes spanning multiple periods, register each period separately
      (item.periods || [1]).forEach(p => {
        map.get(item.dayOfWeek)!.set(p, item);
      });
    });
    return map;
  }, [selectedCourseIds, scheduleItems]);

  const shortDaysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shortDaysOfWeekJp = ['日', '月', '火', '水', '木', '金', '土'];

  // Selected day classes for monthly view
  const monthlySelectedClasses = useMemo(() => {
    if (!monthlySelected) return [];
    return getClassesForDate(monthlySelected, selectedCourseIds, scheduleItems);
  }, [monthlySelected, selectedCourseIds, scheduleItems]);

  // Precompute which day-numbers in the visible month have classes.
  // Avoids 31 separate getClassesForDate calls during calendar grid render.
  const daysWithClasses = useMemo(() => {
    const year = monthlySelected.getFullYear();
    const month = monthlySelected.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    const s = new Set<number>();
    for (let d = 1; d <= count; d++) {
      const date = new Date(year, month, d);
      if (getClassesForDate(date, selectedCourseIds, scheduleItems).length > 0) s.add(d);
    }
    return s;
  }, [monthlySelected, selectedCourseIds, scheduleItems]);

  // Actual selected date (highlighted in calendar)
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date>(new Date());

  const handleCalendarDayClick = useCallback((date: Date) => {
    setCalendarSelectedDate(date);
    setMonthlySelected(date);
  }, []);

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 sm:p-6 pt-8 sm:pt-12 lg:pt-8 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMenuOpen(true)}
            aria-label={lang === 'en' ? 'Open menu' : 'メニューを開く'}
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
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-75 active:scale-95 ${view === v
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
        <motion.div variants={containerVariants} initial="hidden" animate="show" key={view} className="pb-32 max-w-4xl w-full mx-auto min-h-0">

          {/* ─── NO COURSES SELECTED ─── */}
          {selectedCourseIds.length === 0 && (
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden relative bg-white scale-[1.05] shadow-inner">
                <img
                  src={mascotIdle}
                  alt="No classes"
                  className="w-full h-full object-contain mix-blend-multiply opacity-100"
                />
              </div>
              <p className="text-white/70 text-sm font-medium max-w-[260px]">{t[lang].noCourses}</p>
              <button
                onClick={() => navigate('/editProfile')}
                className="px-6 py-3 rounded-2xl bg-brand-yellow text-brand-black font-bold text-sm hover:brightness-95 transition-all active:scale-95"
              >
                {t[lang].goToEditProfile}
              </button>
            </motion.div>
          )}

          {/* ─── DAILY VIEW ─── */}
          {view === 'daily' && selectedCourseIds.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-8">
                <motion.div variants={itemVariants} className="flex justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 flex-1">
                  {dailyDates.map((d, i) => {
                    const isSelected = d.getDate() === baseDate.getDate() && d.getMonth() === baseDate.getMonth();
                    return (
                      <div
                        key={i}
                        onClick={() => setBaseDate(new Date(d))}
                        className={`flex flex-col items-center justify-center min-w-[60px] lg:min-w-[80px] h-[80px] lg:h-[90px] rounded-[24px] cursor-pointer transition-all duration-75 active:scale-95 ${isSelected
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
                {(settings as any).enableEnhancedUI && (
                  <button
                    onClick={() => setBaseDate(new Date())}
                    className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 active:scale-95 transition-all shrink-0"
                  >
                    {lang === 'en' ? 'Today' : '今日'}
                  </button>
                )}
              </div>

              <div className="space-y-0 relative min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={baseDate.toISOString()}
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.06 } }
                    }}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-0"
                  >
                    {dailyClasses.length > 0 && (
                      <>
                        {dailyClasses.map((item) => (
                          <motion.div
                            key={item.id}
                            variants={itemVariants}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setTimeout(() => navigate(`/course/${item.id}`), 150)}
                            className={`p-4 rounded-[28px] ${item.color} text-brand-black flex gap-4 items-center cursor-pointer transition-all shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(255,255,255,0.5)] border border-black/5 hover:translate-y-[-2px] mb-3`}
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setTimeout(() => navigate(`/course/${item.id}`), 150)}
                          >
                            <div className="w-12 h-12 bg-black/15 rounded-[14px] flex items-center justify-center font-bold text-sm shrink-0">
                              {item.time.split(' ')[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-base leading-tight truncate">{item.title[lang]}</div>
                              <div className="text-sm font-medium opacity-60 truncate mt-0.5">{item.location[lang]}</div>
                            </div>
                            {(settings as any).enableEnhancedUI && (
                              <span className="text-[9px] font-bold text-brand-black/40 bg-black/10 rounded-full px-2 py-1 shrink-0">
                                P{(item.periods ?? [1]).join('-')}
                              </span>
                            )}
                          </motion.div>
                        ))}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
                {dailyClasses.length === 0 && (
                  <div className="flex flex-col items-center gap-4 py-8 text-center absolute inset-0 justify-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden relative bg-white scale-[1.05] shadow-inner">
                      <img
                        src={mascotIdle}
                        alt="No classes"
                        className="w-full h-full object-contain mix-blend-multiply opacity-100"
                      />
                    </div>
                    <p className="text-white/50 text-sm font-medium">
                      {selectedCourseIds.length === 0 ? t[lang].noCourses : t[lang].noClasses}
                    </p>
                    {selectedCourseIds.length === 0 && (
                      <button
                        onClick={() => navigate('/editProfile')}
                        className="px-6 py-3 rounded-2xl bg-brand-yellow text-brand-black font-bold text-sm hover:brightness-95 transition-all active:scale-95"
                      >
                        {t[lang].goToEditProfile}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── WEEKLY TIMETABLE VIEW ─── */}
          {view === 'weekly' && selectedCourseIds.length > 0 && (
            <motion.div variants={itemVariants} className="flex flex-col">
              {/* Header */}
              <div className="flex justify-center items-center mb-4 shrink-0">
                <div className="font-bold text-base text-white">
                  {lang === 'en' ? '2026 — 1st Semester' : '2026年 1学期'}
                </div>
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
                  {(lang === 'en' ? WEEK_DAYS_EN : WEEK_DAYS_JP).map((day, i) => {
                    const isToday = (settings as any).enableEnhancedUI && WEEK_DAY_NUMS[i] === new Date().getDay();
                    return (
                      <div
                        key={day}
                        style={{ gridRow: 1, gridColumn: i + 2 }}
                        className={`text-center text-xs font-bold pb-2 pt-1 ${isToday ? 'text-brand-yellow' : 'text-white/50'}`}
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
                      <span className="text-brand-yellow font-bold text-sm leading-none">{period.num}</span>
                      <span className="text-white/25 text-[8px] leading-tight mt-1 text-center whitespace-pre-line">{period.time}</span>
                    </div>
                  ))}

                  {/* ── Class cards — placed with gridColumn + gridRow span ── */}
                  {scheduleItems
                    .filter(item => item.type === 'Classes' && selectedCourseIds.includes(item.id))
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
                            <span className="text-[8px] font-semibold text-brand-black/60 bg-black/10 rounded-full px-1.5 py-0.5 block text-center truncate">
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
          {view === 'monthly' && selectedCourseIds.length > 0 && (
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
                  {(lang === 'en' ? shortDaysOfWeekEn : shortDaysOfWeekJp).map((d, i) => (
                    <div key={i} className="text-xs font-bold text-white/40">{d}</div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dateNum = i + 1;
                    const thisDate = new Date(monthYear.getFullYear(), monthYear.getMonth(), dateNum);
                    const hasClass = daysWithClasses.has(dateNum);
                    const isSelected =
                      calendarSelectedDate.getDate() === dateNum &&
                      calendarSelectedDate.getMonth() === monthYear.getMonth() &&
                      calendarSelectedDate.getFullYear() === monthYear.getFullYear();

                    return (
                      <div key={i} className="flex flex-col items-center justify-center h-10 sm:h-12">
                        <button
                          onClick={() => handleCalendarDayClick(thisDate)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-75 active:scale-90 ${isSelected
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    {monthlySelectedClasses.length > 0 ? (
                      monthlySelectedClasses.map((cls) => (
                        <motion.div
                          key={cls.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setTimeout(() => navigate(`/course/${cls.id}`), 150)}
                          className={`p-4 rounded-[28px] ${cls.color} text-brand-black flex gap-4 items-center cursor-pointer transition-all shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(255,255,255,0.5)] border border-black/5 hover:translate-y-[-2px] mb-3`}
                          tabIndex={0}
                        >
                          <div className="w-12 h-12 bg-black/15 rounded-[14px] flex items-center justify-center font-bold text-sm shrink-0">
                            {cls.time.split(' ')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-base leading-tight truncate">{cls.title[lang]}</div>
                            <div className="text-sm font-medium opacity-60 truncate mt-0.5">{cls.location[lang]}</div>
                          </div>
                        </motion.div>
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

          {/* Empty state for weekly/monthly when no courses selected */}
          {(view === 'weekly' || view === 'monthly') && selectedCourseIds.length === 0 && (
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 py-16 text-center">
              <div className={`w-20 h-20 rounded-full overflow-hidden relative ${isDark ? 'bg-[#1A1A1A]' : 'bg-[#1A1A1A]'} scale-[1.05]`}>
                <img
                  src={mascotIdle}
                  alt="No courses"
                  className={`w-full h-full object-contain mix-blend-multiply ${isDark ? 'brightness-125 contrast-110' : 'opacity-70'}`}
                />
              </div>
              <p className="text-white/50 text-sm font-medium">{t[lang].noCourses}</p>
              <button
                onClick={() => navigate('/editProfile')}
                className="px-4 py-2 rounded-xl bg-brand-yellow text-brand-black font-bold text-sm active:scale-95 transition-transform"
              >
                {t[lang].goToEditProfile}
              </button>
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
