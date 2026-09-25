import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SharedMenu from './SharedMenu';
import WeeklyTimetable from './WeeklyTimetable';
import { motion, AnimatePresence } from 'motion/react';
import { useTimetable } from '../lib/useTerm';
import { termLabel, academicYearOf } from '../lib/tipsAdapters';
import { useClassCalendar } from '../lib/useCalendar';
import RegistrationPlanner from './RegistrationPlanner';
import { CONTAINER, Pill, RefreshButton, LoadError, TAP, EASE } from './ScreenHeader';
import { DayClassCard } from './DayClassCard';
import type { Term } from '../lib/types';
import mascotIdle from '../assets/mascots/mascot_1_2.webp';

const t = {
  en: {
    schedule: "Schedule",
    weekly: "Weekly",
    monthly: "Monthly",
    noClasses: "No classes on this day.",
    classesOn: (d: Date) => `Classes on ${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}`,
    loading: "Loading your timetable from TIPS…",
    noCourses: "No registered courses for this term.",
    spring: "Spring",
    regOpen: (d: string) => `Registration is open until ${d}. Pick this term's classes below; only courses TIPS lets you take are listed.`,
    autumn: "Fall",
  },
  jp: {
    schedule: "スケジュール",
    weekly: "週別",
    monthly: "月別",
    noClasses: "この日の授業はありません。",
    classesOn: (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日の授業`,
    loading: "TIPSから時間割を読み込み中…",
    noCourses: "この学期の履修登録はありません。",
    spring: "春学期",
    regOpen: (d: string) => `履修登録期間中です（${d}まで）。下の時間割から今学期の科目を選べます。表示されるのはTIPSで履修できる科目のみです。`,
    autumn: "秋学期",
  }
};

const SHORT_DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_DAYS_JP = ['日', '月', '火', '水', '木', '金', '土'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiSchedule({ lang, setLang, settings }: ScreenProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Persist view in URL so back navigation restores it
  const viewParam = searchParams.get('view') as 'weekly' | 'monthly' | null;
  const view = viewParam && ['weekly', 'monthly'].includes(viewParam) ? viewParam : 'weekly';
  const setView = useCallback((v: 'weekly' | 'monthly') => {
    setSearchParams({ view: v }, { replace: true });
  }, [setSearchParams]);
  const tt = useTimetable();
  const scheduleItems = tt.items;
  const refreshLabel = lang === 'en' ? 'Refresh from TIPS' : 'TIPSから更新';
  const selectedCourseIds = scheduleItems.map(c => c.id);
  const term: Term = tt.timetable?.term ?? '1';
  const termYear = tt.timetable?.year ?? academicYearOf(new Date());
  const planning = view === 'weekly' && !!tt.timetable && tt.timetable.term === tt.currentTerm && tt.timetable.registrationOpen;

  const [monthlySelected, setMonthlySelected] = useState<Date>(new Date());
  
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

  const cal = useClassCalendar(monthlySelected);
  // Refresh asks TIPS for the timetable and, for the calendar, attendance and class changes.
  const refresh = () => { tt.refresh(); cal.refresh(); };
  const daysWithClasses = useMemo(() => {
    const year = monthlySelected.getFullYear();
    const month = monthlySelected.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    const s = new Set<number>();
    for (let d = 1; d <= count; d++) {
      const date = new Date(year, month, d);
      if (cal.index.has(date)) s.add(d);
    }
    return s;
  }, [monthlySelected, cal.index]);

  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date>(new Date());

  const handleCalendarDayClick = useCallback((date: Date) => {
    setCalendarSelectedDate(date);
    setMonthlySelected(date);
  }, []);

  const monthlySelectedClasses = useMemo(() => cal.index.on(calendarSelectedDate, scheduleItems), [calendarSelectedDate, scheduleItems, cal.index]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-900' : 'bg-brand-black';

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header
        style={{ paddingTop: 'calc(1.75rem + env(safe-area-inset-top, 0px))' }}
        className={`${CONTAINER} flex justify-between items-center pb-4 shrink-0`}
      >
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={TAP}
            onClick={() => setIsMenuOpen(true)}
            aria-label={lang === 'en' ? 'Open menu' : 'メニューを開く'}
            className={`w-10 h-10 rounded-full border ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} flex items-center justify-center transition-colors lg:hidden`}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t[lang].schedule}</h1>
        </div>
        <RefreshButton onClick={refresh} refreshing={tt.loading || cal.loading} label={refreshLabel}
          className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`} />
      </header>

      {/* Toggle Weekly/Monthly */}
      <div className={`${CONTAINER} mb-4`}>
        <div className={`flex ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full p-1`}>
          {(['weekly', 'monthly'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`relative isolate flex-1 h-10 rounded-full text-xs font-bold transition-colors ${view === v
                ? (isDark ? 'text-white' : 'text-brand-black')
                : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-brand-black')
                }`}
            >
              {/* The white thumb slides between Weekly and Monthly. */}
              {view === v && <motion.span layoutId="schedule-view" transition={{ type: 'spring', stiffness: 500, damping: 40 }} className={`absolute inset-0 -z-10 rounded-full ${isDark ? 'bg-gray-700' : 'bg-white shadow-sm'}`} />}
              {t[lang][v]}
            </button>
          ))}
        </div>
      </div>

      {/* Term: follows TIPS by default, or pin spring/autumn */}
      <div className={`${CONTAINER} mb-4 flex items-center gap-2`}>
        {(['1', '2'] as Term[]).map(tm => (
          <Pill key={tm} layoutId="schedule-term" active={term === tm} isDark={isDark} onClick={() => tt.setChoice(tm)}>
            {tm === '1' ? t[lang].spring : t[lang].autumn}
          </Pill>
        ))}
        {tt.choice !== 'auto' && (
          <button onClick={() => tt.setChoice('auto')} className={`h-10 px-1 text-[11px] font-bold underline underline-offset-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {lang === 'en' ? 'Follow TIPS' : 'TIPSに合わせる'}
          </button>
        )}
        {tt.timetable && <span className={`ml-auto text-[11px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{termLabel(term, termYear, lang)}</span>}
      </div>

      {/* Registration open for the term being viewed: plan and register right here. */}
      {planning && tt.timetable && (
        <div className="flex-1 overflow-y-auto pb-32">
          <div className={CONTAINER}>
            <p className={`mb-4 p-4 rounded-2xl bg-green-500/10 text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{t[lang].regOpen(tt.timetable.registrationStatus ?? '')}</p>
            <RegistrationPlanner lang={lang} isDark={isDark} />
          </div>
        </div>
      )}

      {/* Dark Container */}
      {!planning && <div className={`flex-1 ${bgClass} rounded-t-[40px] lg:rounded-t-[32px] p-4 sm:p-6 pt-6 sm:pt-8 flex flex-col overflow-y-auto overflow-x-hidden`}>
        <motion.div variants={containerVariants} initial="hidden" animate="show" key={view} className="pb-32 max-w-4xl w-full mx-auto min-h-0">

          {/* ─── NO COURSES REGISTERED (monthly only; weekly shows the empty grid) ─── */}
          {view === 'monthly' && selectedCourseIds.length === 0 && !!tt.timetable && (
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="w-24 h-24 relative scale-[1.15] drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center justify-center">
                <img
                  src={mascotIdle}
                  alt="Tokai Mascot"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-white/70 text-sm font-medium max-w-[260px]">{t[lang].noCourses}</p>
            </motion.div>
          )}

          {!tt.timetable && (tt.error
            ? <motion.div variants={itemVariants}><LoadError error={tt.error} isDark lang={lang} onRetry={tt.refresh} /></motion.div>
            : <motion.p variants={itemVariants} role="status" className="text-shimmer text-sm font-medium text-white/60 py-6 text-center">{t[lang].loading}</motion.p>)}

          {/* ─── WEEKLY TIMETABLE VIEW ─── */}
          {view === 'weekly' && !!tt.timetable && (
            <motion.div variants={itemVariants} className="bg-white/5 pt-5 lg:pt-6 pb-2 sm:pb-3 rounded-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden relative">
              <WeeklyTimetable 
                lang={lang}
                settings={settings}
                selectedCourseIds={selectedCourseIds}
                scheduleItems={scheduleItems}
                forceDark={true}
                semesterLabel={termLabel(term, termYear, lang)}
                grid={tt.timetable?.grid}
              />
            </motion.div>
          )}


          {/* ─── MONTHLY VIEW ─── */}
          {view === 'monthly' && selectedCourseIds.length > 0 && (
            <motion.div variants={itemVariants} className="flex flex-col gap-4">
              {/* Calendar */}
              <div className="bg-white/5 rounded-[32px] p-4 sm:p-6 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="flex justify-between items-center mb-6">
                  <button onClick={handlePrevMonth} aria-label={lang === 'en' ? 'Previous month' : '前の月'} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full active:scale-95 transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="font-bold text-xl">
                    {lang === 'en' ? `${monthName} ${year}` : `${year}年 ${monthYear.getMonth() + 1}月`}
                  </div>
                  <button onClick={handleNextMonth} aria-label={lang === 'en' ? 'Next month' : '次の月'} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full active:scale-95 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {(lang === 'en' ? SHORT_DAYS_EN : SHORT_DAYS_JP).map((d, i) => (
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
                      <div key={i} className="relative flex flex-col items-center justify-center h-12">
                        <button
                          onClick={() => handleCalendarDayClick(thisDate)}
                          aria-pressed={isSelected}
                          className={`relative isolate w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors active:scale-90 ${isSelected ? 'text-brand-black' : 'hover:bg-white/20'}`}
                        >
                          {isSelected && <motion.span layoutId="schedule-day" transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="absolute inset-0 -z-10 rounded-full bg-brand-yellow" />}
                          {dateNum}
                        </button>
                        {hasClass && (
                          <div className={`absolute bottom-0 w-1 h-1 rounded-full ${isSelected ? 'bg-brand-yellow' : 'bg-brand-pink'}`} />
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
                    transition={{ duration: 0.18, ease: EASE }}
                    className="space-y-3"
                  >
                    {monthlySelectedClasses.length > 0 ? (
                      monthlySelectedClasses.map(({ item: cls, status }) => (
                        <DayClassCard key={cls.id} item={cls} status={status} lang={lang} onOpen={() => setTimeout(() => navigate(`/course/${cls.id}`), 150)} />
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
      </div>}

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
