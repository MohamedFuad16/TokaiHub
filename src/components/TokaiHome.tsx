import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Menu, Calendar, User, Bell, ChevronRight, X, ChevronLeft, GraduationCap, Target, AlertCircle, Check } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate } from 'react-router-dom';
import SharedMenu from './SharedMenu';
import WeeklyTimetable from './WeeklyTimetable';
import { motion, AnimatePresence } from 'motion/react';
import { allItems, getClassesForDate } from '../data';
import { getDashboard } from '../lib/api';
import type { CourseItem, Assignment } from '../lib/types';
import mascotIdle from '../assets/mascots/mascot_1_2.png';
import mascotLogo from '../assets/mascots/mascot_1_1.png';

const t = {
  en: {
    all: "All",
    classes: "Classes",
    events: "Events",
    clubs: "Clubs",
    allActivities: "All Activities",
    todays: "Today's",
    schedule: "Schedule",
    classesToday: "Classes Today",
    noItems: "No items found for this category.",
    noCourses: "Select your courses in Edit Profile to see your schedule.",
    otherInfo: "Campus News",
    gpa: "Cumulative GPA",
    credits: "Credits (5th Sem)",
    onTrack: "On Track",
    deadlines: "Upcoming Deadlines",
    dueIn: "Due in",
    days: "days"
  },
  jp: {
    all: "すべて",
    classes: "授業",
    events: "イベント",
    clubs: "クラブ",
    allActivities: "すべてのアクティビティ",
    todays: "今日の",
    schedule: "スケジュール",
    classesToday: "今日の授業",
    noItems: "このカテゴリのアイテムはありません。",
    noCourses: "プロフィール編集で履修科目を選択してください。",
    otherInfo: "キャンパスニュース",
    gpa: "累積 GPA",
    credits: "履修単位数 (5セメ)",
    onTrack: "順調",
    deadlines: "直近の課題",
    dueIn: "残り",
    days: "日"
  }
};

const deadlines = [
  { id: 1, title: { en: 'VR Project Draft', jp: 'VRプロジェクト草案' }, course: { en: 'CG & Virtual Reality', jp: 'CGとバーチャルリアリティ' }, daysLeft: 2, color: 'bg-brand-yellow' },
  { id: 2, title: { en: 'Cloud Architecture Essay', jp: 'クラウドアーキテクチャレポート' }, course: { en: 'Cloud Computing', jp: 'クラウドコンピューティング' }, daysLeft: 5, color: 'bg-brand-pink' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiHome({ lang, setLang, settings, userProfile, setUserProfile }: ScreenProps) {
  const navigate = useNavigate();

  // API-fetched data — falls back to local data on error
  const [courseItems, setCourseItems] = useState<CourseItem[]>(allItems as CourseItem[]);
  const [assignments, setAssignments] = useState<Assignment[]>(deadlines as unknown as Assignment[]);

  useEffect(() => {
    const controller = new AbortController();

    getDashboard(controller.signal)
      .then(data => {
        console.log("🔥 DASHBOARD RESPONSE:", data);

        // ✅ Merge courses
        if (data.courses?.length) {
          const mergedCourses = data.courses.map(apiCourse => {
            const local = (allItems as CourseItem[]).find(
              item => item.id === apiCourse.id || item.code === apiCourse.code
            );
            if (!local) return apiCourse;

            return {
              ...apiCourse,
              title: typeof apiCourse.title === 'string'
                ? { en: apiCourse.title, jp: local.title.jp }
                : (apiCourse.title ? { ...local.title, ...apiCourse.title } : local.title),
              location: typeof apiCourse.location === 'string'
                ? { en: apiCourse.location, jp: local.location?.jp || '' }
                : (apiCourse.location ? { ...local.location, ...apiCourse.location } : local.location),
              teacher: typeof apiCourse.teacher === 'string'
                ? { en: apiCourse.teacher, jp: local.teacher?.jp || '' }
                : (apiCourse.teacher ? { ...local.teacher, ...apiCourse.teacher } : local.teacher),
            };
          });

          setCourseItems(mergedCourses as CourseItem[]);
        }

        // ✅ Assignments
        if (data.assignments?.length) {
          setAssignments(data.assignments);
        }

        // ✅ Normalize ALL possible API shapes
        const profile =
          data.profile ??
          data.user ??
          data.Item ??   // DynamoDB
          data;

        console.log("✅ NORMALIZED PROFILE:", profile);

        // ✅ Update user profile safely
        if (setUserProfile) {
          setUserProfile(prev => {
            const current = prev || {
              name: '',
              email: '',
              studentId: '',
              campus: '',
              selectedCourseIds: [],
              cumulativeGpa: 0,
              lastSemGpa: 0
            };

            const safeCumGpa = Number(profile?.cumulativeGpa ?? (data as any)?.cumulativeGpa) || 0;
            const safeLastSemGpa = Number(profile?.lastSemGpa ?? (data as any)?.lastSemGpa) || 0;

            return {
              ...current,

              selectedCourseIds:
                current.selectedCourseIds?.length
                  ? current.selectedCourseIds
                  : (data.enrolledCourseIds ?? current.selectedCourseIds),

              cumulativeGpa: isNaN(rawCum) ? current.cumulativeGpa : rawCum,
              lastSemGpa: isNaN(rawLast) ? current.lastSemGpa : rawLast,
            };
          });
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.error("❌ DASHBOARD ERROR:", err);
        }
      });

    return () => controller.abort();
  }, [setUserProfile]);

  // Derive live values from userProfile
  const firstName = userProfile?.name?.split(' ')[0] ?? 'Student';
  const studentIdDisplay = userProfile?.studentId ?? '—';
  const cumGpa = userProfile?.cumulativeGpa ?? 0;
  const lastSemGpa = userProfile?.lastSemGpa ?? 0;
  const selectedCourseIds = userProfile?.selectedCourseIds ?? [];
  const selectedCredits = useMemo(() =>
    courseItems
      .filter(item => selectedCourseIds.includes(item.id) || selectedCourseIds.includes(item.code ?? ''))
      .reduce((acc, item) => acc + (item.credits || 0), 0),
    [selectedCourseIds, courseItems]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isCalendarSheetOpen, setIsCalendarSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [selectedNews, setSelectedNews] = useState<{ title: string; detail: string; icon: any; color: string } | null>(null);

  const handleImageLoad = useCallback((id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  }, []);
  const handleMenuClose = useCallback(() => setIsMenuOpen(false), []);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const isEnrolled = useCallback((item: CourseItem) =>
    selectedCourseIds.includes(item.id) || selectedCourseIds.includes(item.code ?? ''),
    [selectedCourseIds]);


  const todayClasses = useMemo(() => getClassesForDate(new Date(), selectedCourseIds, courseItems), [selectedCourseIds, courseItems]);
  const calendarClasses = useMemo(() => getClassesForDate(selectedDate, selectedCourseIds, courseItems), [selectedDate, selectedCourseIds, courseItems]);

  const isDark = settings.isDarkMode;
  const todayLabel = useMemo(() => new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), [lang]);
  const cardBg = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const pageBg = isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';

  return (
    <div className={`h-full relative flex flex-col ${pageBg}`}>
      {/* Header */}
      <header
        style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top, 0px))' }}
        className={`flex justify-between items-center px-4 sm:px-6 pb-4 sm:pb-6 shrink-0 border-b ${borderClass}`}
      >
        <div className="flex items-center gap-1 lg:hidden">
          <div className={`font-bold text-xl tracking-tighter leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
            TOKAI<br /><span className="text-brand-yellow">HUB</span>
          </div>
          <img src={mascotLogo} alt="Tokai Mascot" className="w-auto h-10 object-contain ml-0.5 drop-shadow-sm hover:rotate-6 hover:scale-105 transition-all cursor-pointer" />
        </div>
        <div className="hidden lg:block">
          <h2 className={`text-sm font-semibold ${textMuted}`}>{todayLabel}</h2>
        </div>
        <button
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open navigation menu"
          className={`w-10 h-10 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-50 text-gray-900'} lg:hidden`}
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="pb-48 lg:pb-32">

          {/* Title + Student ID badge */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-6">
            <h1 className={`text-[32px] sm:text-[40px] lg:text-[48px] xl:text-[56px] font-bold leading-[1.1] tracking-tight whitespace-pre-line ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {lang === 'en' ? `Welcome,\n${firstName}` : `ようこそ、\n${firstName}さん`}
            </h1>
            {/* Student ID — styled as subtle badge */}
            <div className="mt-3 inline-flex items-center gap-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>
                {lang === 'en' ? 'Student ID' : '学籍番号'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                {studentIdDisplay}
              </span>
            </div>
          </motion.div>

          {/* Weekly Schedule Section */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Calendar className="w-5 h-5 text-brand-yellow" />
                {lang === 'en' ? "Weekly Schedule" : "週間スケジュール"}
              </h2>
              <button 
                onClick={() => navigate('/schedule')}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {lang === 'en' ? "Full View →" : "詳細を表示 →"}
              </button>
            </div>
            
            <div className={`pt-5 lg:pt-6 pb-2 sm:pb-3 rounded-[32px] sm:rounded-[40px] shadow-[0_8px_30px_rgba(0,0,0,0.1)] border ${isDark ? 'border-gray-800 bg-[#121214]' : 'border-black/5 bg-[#0a0a0c]'} overflow-hidden relative`}>
              <WeeklyTimetable 
                lang={lang}
                settings={settings}
                selectedCourseIds={selectedCourseIds}
                scheduleItems={courseItems}
                forceDark={true}
              />
            </div>
            
            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => navigate('/class')}
                className={`flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-2xl bg-brand-yellow text-brand-black hover:brightness-95 active:scale-95 transition-all shadow-lg shadow-yellow-500/10`}
              >
                <Target className="w-4 h-4" />
                {lang === 'en' ? 'Explore More Classes' : '他の授業を探す'}
              </button>
            </div>
          </motion.div>

          {/* Two-column layout for Deadlines + News on desktop */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-6 px-4 sm:px-6 mt-8">
            {/* Deadlines Section */}
            <motion.div variants={itemVariants} className="mb-6 lg:mb-0">
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <AlertCircle className="w-4 h-4 text-brand-yellow" />
                {t[lang].deadlines}
              </h2>
              <div className="space-y-3">
                {assignments.map(assignment => (
                  <motion.div
                    key={assignment.id}
                    onClick={() => setTimeout(() => navigate('/assignments'), 150)}
                    whileHover={{ y: -2, scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} flex items-center justify-between gap-3 cursor-pointer shadow-sm`}
                  >
                    <div className="min-w-0">
                      <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{assignment.title[lang]}</h3>
                      <p className={`text-xs ${textMuted} mt-0.5 truncate`}>{assignment.course[lang]}</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg ${assignment.color} text-brand-black font-semibold text-xs shadow-sm shrink-0`}>
                      {t[lang].dueIn} {assignment.daysLeft} {t[lang].days}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Campus News Section */}
            <motion.div variants={itemVariants}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t[lang].otherInfo}</h2>
              <div className="space-y-3">
                <motion.div
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedNews({
                    title: lang === 'en' ? 'Tuition Fee Deadline' : '授業料納入期限について',
                    detail: lang === 'en' ? 'The deadline for the first semester tuition fees is April 15th. Please ensure payment is processed through the university portal or designated bank branches.' : '第1セメスターの授業料納入期限は4月15日です。大学ポータルまたは指定の銀行窓口にてお手続きをお願いいたします。',
                    icon: Bell,
                    color: 'bg-brand-yellow'
                  })}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-2xl p-4 flex items-center gap-4 cursor-pointer shadow-sm border border-transparent hover:border-brand-yellow/30`}
                >
                  <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-brand-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-brand-black'}`}>{lang === 'en' ? 'Tuition Fee Deadline' : '授業料納入期限について'}</h3>
                    <p className={`text-xs ${textMuted} mt-0.5`}>{lang === 'en' ? 'Due by April 15th' : '4月15日までにお願いします'}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${textMuted} shrink-0`} />
                </motion.div>
                <motion.div
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedNews({
                    title: lang === 'en' ? 'Library Maintenance' : '図書館メンテナンス',
                    detail: lang === 'en' ? 'The main campus library will be closed this weekend for system upgrades and shelf maintenance. Online resources remain accessible 24/7.' : '今週末、システムアップデートと書架メンテナンスのため、本館は休館いたします。オンラインリソースは通常通りご利用いただけます。',
                    icon: Calendar,
                    color: 'bg-brand-green'
                  })}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-2xl p-4 flex items-center gap-4 cursor-pointer shadow-sm border border-transparent hover:border-brand-green/30`}
                >
                  <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-brand-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-brand-black'}`}>{lang === 'en' ? 'Library Maintenance' : '図書館メンテナンス'}</h3>
                    <p className={`text-xs ${textMuted} mt-0.5`}>{lang === 'en' ? 'Closed this weekend' : '今週末は閉館します'}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${textMuted} shrink-0`} />
                </motion.div>
              </div>
            </motion.div>
          </div>

        </motion.div>
      </div>

      <div className="absolute left-4 right-4 sm:left-6 sm:right-6 z-20 lg:hidden text-brand-black" style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8, delay: 0.4 }}
          onClick={() => setIsScheduleSheetOpen(true)}
          className="bg-brand-black rounded-[40px] p-2 flex items-center justify-between cursor-pointer shadow-2xl"
        >
          <div className="flex items-center gap-4 pl-2">
            <div className="w-12 h-12 bg-brand-yellow rounded-full flex items-center justify-center font-bold text-lg text-brand-black">
              {todayClasses.length}
            </div>
            <div className="text-white">
              <div className="font-bold text-base leading-tight">{t[lang].schedule}</div>
              <div className="text-xs opacity-60 font-medium">{t[lang].classesToday}</div>
            </div>
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); setIsCalendarSheetOpen(true); }}
            className="w-14 h-14 bg-white rounded-full p-2 flex items-center justify-center text-brand-black hover:bg-gray-100 transition-colors"
          >
            <Calendar className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Schedule Sheet (Today's Classes) */}
      <AnimatePresence>
        {isScheduleSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduleSheetOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.7 }}
              className={`absolute bottom-0 left-0 right-0 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-t-[40px] z-50 p-6 flex flex-col max-h-[80%] lg:max-w-2xl lg:mx-auto lg:rounded-[40px] lg:bottom-8 lg:left-auto lg:right-8`}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold">{t[lang].classesToday}</h2>
                <button
                  onClick={() => setIsScheduleSheetOpen(false)}
                  aria-label={lang === 'en' ? 'Close schedule' : 'スケジュールを閉じる'}
                  className={`w-10 h-10 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-8">
                {todayClasses.map(cls => (
                  <motion.div
                    key={cls.id}
                    whileTap={{ scale: 0.98 }}
                    className={`p-5 rounded-[32px] ${cls.color} text-brand-black flex gap-4 items-center cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(255,255,255,0.4)] border border-black/5 hover:translate-y-[-2px]`}
                    onClick={() => setTimeout(() => navigate(`/course/${cls.id}`), 150)}
                  >
                    <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                      {cls.time.split(' ')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg leading-tight truncate">{cls.title?.[lang]}</div>
                      <div className="text-sm font-medium opacity-80 truncate">{cls.location?.[lang]}</div>
                    </div>
                  </motion.div>
                ))}
                {todayClasses.length === 0 && (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-inner">
                      <img
                        src={mascotIdle}
                        alt="No classes"
                        className="w-full h-full object-contain mix-blend-multiply opacity-100"
                      />
                    </div>
                    <p className={`text-sm font-medium ${textMuted}`}>
                      {selectedCourseIds.length === 0 ? t[lang].noCourses : t[lang].noItems}
                    </p>
                    {selectedCourseIds.length === 0 && (
                      <button
                        onClick={() => { setIsScheduleSheetOpen(false); setTimeout(() => navigate('/editProfile'), 200); }}
                        className="px-6 py-3 rounded-2xl bg-brand-yellow text-brand-black font-bold text-sm hover:brightness-95 transition-all active:scale-95"
                      >
                        {lang === 'en' ? 'Edit Profile' : 'プロフィール編集'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Calendar Sheet */}
      <AnimatePresence>
        {isCalendarSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalendarSheetOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.7 }}
              className={`absolute bottom-0 left-0 right-0 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-t-[40px] z-50 p-6 flex flex-col max-h-[90%] lg:max-w-2xl lg:mx-auto lg:rounded-[40px] lg:bottom-8 lg:left-auto lg:right-8`}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold">{lang === 'en' ? 'Calendar' : 'カレンダー'}</h2>
                <button
                  onClick={() => setIsCalendarSheetOpen(false)}
                  aria-label="Close calendar"
                  className={`w-10 h-10 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center transition-transform active:scale-95`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                {/* Calendar UI */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <button
                      onClick={handlePrevMonth}
                      aria-label="Previous month"
                      className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="font-bold text-lg" aria-live="polite">
                      {lang === 'en'
                        ? currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })
                        : `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`}
                    </div>
                    <button
                      onClick={handleNextMonth}
                      aria-label="Next month"
                      className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={i} className={`text-xs font-semibold ${textMuted}`}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dateNum = i + 1;
                      const isSelected = selectedDate.getDate() === dateNum && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dateNum))}
                          aria-label={`${dateNum} ${currentMonth.toLocaleString('en-US', { month: 'long' })}`}
                          aria-pressed={isSelected}
                          className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-semibold text-sm transition-all active:scale-95 ${isSelected
                            ? (isDark ? 'bg-white text-brand-black shadow-lg shadow-white/10' : 'bg-[#0B1F3A] text-white shadow-lg shadow-black/20')
                            : (isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-900')
                            }`}
                        >
                          {dateNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Classes for selected date */}
                <h3 className={`font-semibold text-base mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {lang === 'en'
                    ? `Classes on ${selectedDate.toLocaleString('en-US', { month: 'long' })} ${selectedDate.getDate()}`
                    : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日の授業`}
                </h3>
                <div className="relative min-h-[200px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedDate.toISOString()}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {calendarClasses.map(cls => (
                        <motion.div
                          key={cls.id}
                          whileTap={{ scale: 0.98 }}
                          className={`p-5 rounded-[32px] ${cls.color} text-brand-black flex gap-4 items-center cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(255,255,255,0.4)] border border-black/5 hover:translate-y-[-2px]`}
                          onClick={() => setTimeout(() => navigate(`/course/${cls.id}`), 150)}
                        >
                          <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                            {cls.time.split(' ')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg leading-tight truncate">{cls.title[lang]}</div>
                            <div className="text-sm font-medium opacity-80 truncate">{cls.location[lang]}</div>
                          </div>
                        </motion.div>
                      ))}
                      {calendarClasses.length === 0 && (
                        <div className="flex flex-col items-center gap-4 py-8 text-center">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-inner">
                            <img
                              src={mascotIdle}
                              alt="No classes"
                              className="w-full h-full object-contain mix-blend-multiply opacity-100"
                            />
                          </div>
                          <p className={`text-sm font-medium ${textMuted}`}>
                            {selectedCourseIds.length === 0 ? t[lang].noCourses : t[lang].noItems}
                          </p>
                          {selectedCourseIds.length === 0 && (
                            <button
                              onClick={() => { setIsCalendarSheetOpen(false); setTimeout(() => navigate('/editProfile'), 200); }}
                              className="px-6 py-3 rounded-2xl bg-brand-yellow text-brand-black font-bold text-sm hover:brightness-95 transition-all active:scale-95"
                            >
                              {lang === 'en' ? 'Edit Profile' : 'プロフィール編集'}
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* News Modal */}
      <AnimatePresence>
        {selectedNews && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNews(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg ${isDark ? 'bg-gray-900' : 'bg-white'} rounded-[40px] z-[101] p-8 shadow-2xl`}
            >
              <div className={`w-16 h-16 ${selectedNews.color} rounded-full flex items-center justify-center mb-6`}>
                <selectedNews.icon className="w-8 h-8 text-white shadow-sm" />
              </div>
              <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-brand-black'}`}>{selectedNews.title}</h2>
              <p className={`text-base leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-8`}>{selectedNews.detail}</p>
              <button
                onClick={() => setSelectedNews(null)}
                className={`w-full py-4 rounded-2xl font-bold bg-[#0B1F3A] text-white hover:brightness-110 active:scale-95 transition-all`}
              >
                {lang === 'en' ? 'Close' : '閉じる'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <SharedMenu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        lang={lang}
        setLang={setLang}
        settings={settings}
      />
    </div>
  );
}
