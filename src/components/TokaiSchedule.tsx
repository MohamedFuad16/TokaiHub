import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SharedMenu from './SharedMenu';
import WeeklyTimetable from './WeeklyTimetable';
import { motion, AnimatePresence } from 'motion/react';
import { getClassesForDate, allItems } from '../data';
import { getSchedule } from '../lib/api';
import type { CourseItem } from '../lib/types';
import mascotIdle from '../assets/mascots/mascot_1_2.png';

const t = {
  en: {
    schedule: "Schedule",
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
    weekly: "週別",
    monthly: "月別",
    noClasses: "今日の授業はありません。",
    noClassesWeek: "今週の授業はありません。",
    classesOn: (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日の授業`,
    noCourses: "プロフィール編集で授業を選択してスケジュールを表示しましょう",
    goToEditProfile: "プロフィール編集",
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

export default function TokaiSchedule({ lang, setLang, settings, userProfile }: ScreenProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Persist view in URL so back navigation restores it
  const viewParam = searchParams.get('view') as 'weekly' | 'monthly' | null;
  const view = viewParam && ['weekly', 'monthly'].includes(viewParam) ? viewParam : 'weekly';
  const setView = useCallback((v: 'weekly' | 'monthly') => {
    setSearchParams({ view: v }, { replace: true });
  }, [setSearchParams]);
  const selectedCourseIds = userProfile?.selectedCourseIds ?? [];

  // Fetch schedule from API; fall back to local data on error
  const [scheduleItems, setScheduleItems] = useState<CourseItem[]>(allItems as CourseItem[]);
  useEffect(() => {
    const controller = new AbortController();
    getSchedule(controller.signal)
      .then(data => {
        if (data?.length) {
          const merged = data.map(apiItem => {
            const local = (allItems as CourseItem[]).find(
              item => item.id === apiItem.id || item.code === apiItem.code
            );

            // normalize dayOfWeek (fix)
            let normalizedDay = apiItem.dayOfWeek;

            // If API uses 0–6 (Sun–Sat), convert to 1–6 (Mon–Sat)
            if (normalizedDay === 0) return null; // ignore Sunday
            if (normalizedDay >= 1 && normalizedDay <= 6) {
              // OK already
            } else if (normalizedDay >= 0 && normalizedDay <= 6) {
              normalizedDay = normalizedDay === 0 ? 1 : normalizedDay;
            }

            if (!local) return { ...apiItem, dayOfWeek: normalizedDay };

            return {
              ...local,
              ...apiItem,
              dayOfWeek: normalizedDay, // ✅ FIX HERE
              title: typeof apiItem.title === 'string'
                ? { en: apiItem.title, jp: local.title.jp }
                : (apiItem.title ? { ...local.title, ...apiItem.title } : local.title),
              location: typeof apiItem.location === 'string'
                ? { en: apiItem.location, jp: local.location?.jp || '' }
                : (apiItem.location ? { ...local.location, ...apiItem.location } : local.location),
              teacher: typeof apiItem.teacher === 'string'
                ? { en: apiItem.teacher, jp: local.teacher?.jp || '' }
                : (apiItem.teacher ? { ...local.teacher, ...apiItem.teacher } : local.teacher),
            };
          }).filter(Boolean);
          setScheduleItems(merged);

        }
      })
      .catch(err => { if (err?.name !== 'AbortError') { /* keep local fallback */ } });
    return () => controller.abort();
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

      {/* Toggle Weekly/Monthly */}
      <div className="px-4 sm:px-6 mb-4 max-w-6xl">
        <div className={`flex ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full p-1 shadow-inner`}>
          {(['weekly', 'monthly'] as const).map((v) => (
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

          {/* ─── WEEKLY TIMETABLE VIEW ─── */}
          {view === 'weekly' && selectedCourseIds.length > 0 && (
            <motion.div variants={itemVariants} className="flex flex-col">
              <WeeklyTimetable 
                lang={lang}
                settings={settings}
                selectedCourseIds={selectedCourseIds}
                scheduleItems={scheduleItems}
              />
            </motion.div>
          )}


          {/* ─── MONTHLY VIEW ─── */}
          {view === 'monthly' && selectedCourseIds.length > 0 && (
            <motion.div variants={itemVariants} className="flex flex-col gap-4">
              {/* Calendar */}
              <div className="bg-white/5 rounded-[32px] p-4 sm:p-6 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="flex justify-between items-center mb-6">
                  <button onClick={handlePrevMonth} aria-label={lang === 'en' ? 'Previous month' : '前の月'} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="font-bold text-xl">
                    {lang === 'en' ? `${monthName} ${year}` : `${year}年 ${monthYear.getMonth() + 1}月`}
                  </div>
                  <button onClick={handleNextMonth} aria-label={lang === 'en' ? 'Next month' : '次の月'} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all">
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
                            <div className="font-bold text-base leading-tight truncate">{cls.title?.[lang]}</div>
                            <div className="text-sm font-medium opacity-60 truncate mt-0.5">{cls.location?.[lang]}</div>
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
              <div className={`w-20 h-20 rounded-full overflow-hidden relative ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'} scale-[1.05]`}>
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
