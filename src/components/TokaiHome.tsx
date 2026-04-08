import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Menu, ArrowRight, Calendar, MapPin, User, Bell, ChevronRight, X, ChevronLeft, GraduationCap, Target, AlertCircle, Check } from 'lucide-react';
import { ScreenProps, preloadRoutes } from '../App';
import { useNavigate } from 'react-router-dom';
import SharedMenu from './SharedMenu';
import { motion, AnimatePresence } from 'motion/react';
import { allItems, getClassesForDate } from '../data';
import { getDashboard } from '../lib/api';
import type { CourseItem, Assignment } from '../lib/types';
import mascotIdle from '../assets/mascots/mascot_1_2.png';

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
    getDashboard()
      .then(data => {
        // Safely merge API courses with local localized strings
        if (data.courses?.length) {
          const mergedCourses = data.courses.map(apiCourse => {
            const local = (allItems as CourseItem[]).find(item => item.id === apiCourse.id || item.code === apiCourse.code);
            if (!local) return apiCourse;

            // If API title is a string, wrap it but keep local JP
            return {
              ...apiCourse,
              title: typeof apiCourse.title === 'string'
                ? { en: apiCourse.title, jp: local.title.jp }
                : { ...local.title, ...apiCourse.title },
              teacher: typeof apiCourse.teacher === 'string'
                ? { en: apiCourse.teacher, jp: local.teacher?.jp || '' }
                : (apiCourse.teacher ? { ...local.teacher, ...apiCourse.teacher } : local.teacher)
            };
          });
          setCourseItems(mergedCourses as CourseItem[]);
        }

        if (data.assignments?.length) setAssignments(data.assignments);

        // If selectedCourseIds is empty (e.g. fresh login, localStorage cleared),
        // restore from enrolledCourseIds returned by the dashboard Lambda.
        // Translate API course codes → local data IDs so filtering works correctly.
        if (data.enrolledCourseIds?.length && userProfile && setUserProfile) {
          const current = userProfile.selectedCourseIds ?? [];
          if (current.length === 0) {
            const localIds = data.enrolledCourseIds.map(apiId => {
              const localItem = (allItems as CourseItem[]).find(item => item.code === apiId);
              return localItem ? localItem.id : apiId;
            });
            setUserProfile({ ...userProfile, selectedCourseIds: localIds });
          }
        }
      })
      .catch(() => { /* keep local fallback */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    [courseItems, selectedCourseIds]);

  const [activeCategory, setActiveCategory] = useState('Classes');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isCalendarSheetOpen, setIsCalendarSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [selectedNews, setSelectedNews] = useState<{ title: string; detail: string; icon: any; color: string } | null>(null);

  const handleImageLoad = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id));
  };

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

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') {
      return courseItems;
    }
    if (activeCategory === 'Classes') {
      // Show only ENROLLED classes when "Classes" is selected
      return courseItems.filter(item => item.type === 'Classes' && isEnrolled(item));
    }
    return courseItems.filter(item => item.type === activeCategory);
  }, [activeCategory, courseItems, isEnrolled]);

  const todayClasses = useMemo(() => getClassesForDate(new Date(), selectedCourseIds, courseItems), [selectedCourseIds, courseItems]);
  const calendarClasses = useMemo(() => getClassesForDate(selectedDate, selectedCourseIds, courseItems), [selectedDate, selectedCourseIds, courseItems]);

  const isDark = settings.isDarkMode;
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
        <div className={`font-bold text-xl tracking-tighter leading-none lg:hidden ${isDark ? 'text-white' : 'text-gray-900'}`}>
          TOKAI<br /><span className="text-brand-yellow">HUB</span>
        </div>
        <div className="hidden lg:block">
          <h2 className={`text-sm font-semibold ${textMuted}`}>{new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
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

          {/* Academic Overview (GPA & Credits) — label → value → sublabel hierarchy */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cumulative GPA */}
            <motion.div
              whileHover={{ y: -2, scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`p-5 rounded-2xl ${cardBg} shadow-sm`}
            >
              <div className={`flex items-center gap-1.5 mb-3`}>
                <Target className={`w-3.5 h-3.5 ${textMuted}`} />
                <span className={`text-xs font-medium ${textMuted}`}>{t[lang].gpa}</span>
              </div>
              <div className={`text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{cumGpa.toFixed(2)}</div>
              <div className="mt-2.5 inline-flex items-center px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-xs font-semibold">
                {lang === 'en' ? `Last Sem: ${lastSemGpa.toFixed(2)}` : `前学期: ${lastSemGpa.toFixed(2)}`}
              </div>
            </motion.div>
            {/* Selected Credits */}
            <motion.div
              whileHover={{ y: -2, scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`p-5 rounded-2xl ${cardBg} shadow-sm`}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <GraduationCap className={`w-3.5 h-3.5 ${textMuted}`} />
                <span className={`text-xs font-medium ${textMuted}`}>{t[lang].credits}</span>
              </div>
              <div className={`text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedCredits}</div>
              <div className={`mt-2.5 inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${isDark ? 'text-blue-400 bg-blue-500/20' : 'text-blue-600 bg-blue-100'}`}>
                {lang === 'en' ? 'Selected' : '履修中'}
              </div>
            </motion.div>
            {/* Classes Today (desktop only) */}
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsScheduleSheetOpen(true)}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`hidden lg:block p-5 rounded-2xl ${cardBg} shadow-sm cursor-pointer border border-transparent hover:border-brand-yellow/30`}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Calendar className={`w-3.5 h-3.5 ${textMuted}`} />
                <span className={`text-xs font-medium ${textMuted}`}>{lang === 'en' ? 'Classes Today' : '今日の授業'}</span>
              </div>
              <div className={`text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{todayClasses.length}</div>
              <div
                onClick={(e) => { e.stopPropagation(); navigate('/schedule'); }}
                className={`mt-2.5 inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold hover:brightness-110 active:scale-95 transition-all ${isDark ? 'text-purple-400 bg-purple-500/20' : 'text-purple-600 bg-purple-100'}`}
              >
                {lang === 'en' ? "Today's Classes →" : "今日の授業 →"}
              </div>
            </motion.div>
            {/* Due Soon (desktop only) */}
            <motion.div
              whileHover={{ y: -2, scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`hidden lg:block p-5 rounded-2xl ${cardBg} shadow-sm`}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <AlertCircle className={`w-3.5 h-3.5 ${textMuted}`} />
                <span className={`text-xs font-medium ${textMuted}`}>{lang === 'en' ? 'Due Soon' : '締切間近'}</span>
              </div>
              <div className={`text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{assignments.length}</div>
              <div
                onClick={(e) => { e.stopPropagation(); navigate('/assignments'); }}
                className="mt-2.5 inline-flex items-center px-2 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-semibold hover:bg-orange-500/20 cursor-pointer active:scale-95 transition-all"
              >
                {lang === 'en' ? 'This Week →' : '今週の締切 →'}
              </div>
            </motion.div>
          </motion.div>

          {/* Category Filter Pills */}
          <motion.div variants={itemVariants} className="flex gap-2 sm:gap-3 px-4 sm:px-6 mt-10 overflow-x-auto no-scrollbar pb-1">
            {(['All', 'Classes', 'Events', 'Clubs'] as const).map(cat => {
              const catLabel = cat === 'All' ? t[lang].all : cat === 'Classes' ? t[lang].classes : cat === 'Events' ? t[lang].events : t[lang].clubs;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-4 sm:px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition-all duration-200 active:scale-95 shrink-0 ${isActive
                    ? 'bg-[#0B1F3A] text-white shadow-md'
                    : `border ${borderClass} ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-[#0B1F3A] rounded-full"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow shadow-[0_0_4px_rgba(250,204,21,0.8)]" />
                    )}
                    {catLabel}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* Collections Title */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-6 flex items-center gap-2">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {activeCategory === 'All' ? t[lang].allActivities : `${t[lang].todays} ${activeCategory === 'Classes' ? t[lang].classes : activeCategory === 'Events' ? t[lang].events : t[lang].clubs}`}
            </h2>
            <ArrowRight className={`w-4 h-4 ${textMuted}`} />
          </motion.div>

          {/* Cards — horizontal scroll on mobile with snap, wrapping grid on desktop */}
          {filteredItems.length > 0 ? (
            <motion.div
              variants={itemVariants}
              className="flex lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 px-4 sm:px-6 mt-4 overflow-x-auto lg:overflow-x-visible overflow-y-visible no-scrollbar py-4 snap-x snap-mandatory lg:snap-none scroll-pl-4"
            >
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const enrolled = isEnrolled(item);
                return (
                  <motion.div
                    key={item.id}
                    onMouseEnter={() => preloadRoutes()}
                    onClick={() => setTimeout(() => navigate(`/${item.action}/${item.id}`), 150)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${item.title[lang]}${item.teacher ? ` by ${item.teacher[lang]}` : ''}. Time: ${item.time}. Location: ${item.location?.[lang] ?? ''}.`}
                    onKeyDown={(e) => e.key === 'Enter' && setTimeout(() => navigate(`/${item.action}/${item.id}`), 150)}
                    whileHover={{ y: -2, scale: 1.005 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`w-[272px] lg:w-full h-[320px] shrink-0 lg:shrink snap-start bg-[#1e1e20] rounded-[32px] p-3.5 flex flex-col gap-3 relative cursor-pointer active:scale-[0.98] shadow-[0_10px_25px_rgba(0,0,0,0.15),inset_0_0_2px_rgba(0,0,0,0.8)] ${enrolled ? 'border border-green-500/40' : 'border border-white/5'}`}
                  >
                    {/* Screen Layer (Top ~60%) */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setTimeout(() => navigate(`/${item.action}/${item.id}`), 100);
                      }}
                      className="relative w-full flex-1 rounded-[20px] overflow-hidden bg-[#0a0a0c] shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_-1px_2px_rgba(0,0,0,0.5)] cursor-pointer group/image"
                    >
                      {/* Image / Neon Content */}
                      {!loadedImages.has(item.id) && (
                        <div className={`absolute inset-0 z-0 ${isDark ? 'shimmer' : 'shimmer-light'}`} />
                      )}
                      <img
                        src={item.image}
                        alt="Course visual"
                        onLoad={() => handleImageLoad(item.id)}
                        loading="lazy"
                        className={`absolute inset-0 w-full h-full object-cover saturate-150 contrast-125 transition-all duration-500 group-hover/image:scale-105 group-hover/image:opacity-80 ${loadedImages.has(item.id) ? 'opacity-70' : 'opacity-0'}`}
                      />
                      {/* Glossy overlay */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                      {/* Content inside screen */}
                      <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-1">
                            {enrolled && (
                              <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-400 text-brand-black flex items-center gap-1 w-fit shadow-sm">
                                <Check className="w-2.5 h-2.5" />Enrolled
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-white/70 bg-black/30 px-2 py-1 rounded-lg backdrop-blur-sm">
                            {item.time}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-white leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                            {item.title[lang]}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Hardware Buttons (Bottom) */}
                    <div className="flex gap-[1px] h-[76px] shrink-0 bg-[#0a0a0c] rounded-[18px] p-[1px] shadow-[0_1px_1px_rgba(255,255,255,0.05)]">
                      {/* Location — widest */}
                      <div className="flex-[2] min-w-0 bg-[#1e1e20] rounded-l-[17px] rounded-r-[4px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_3px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center hover:bg-[#222224] active:bg-[#18181a] transition-all duration-75 group px-2">
                        <div className="flex flex-col items-center gap-1 group-active:translate-y-[1px] group-active:opacity-60 transition-all duration-75 w-full">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-[8px] font-medium text-gray-400 leading-tight text-center line-clamp-2 w-full">{item.location[lang]}</span>
                        </div>
                      </div>
                      {/* Teacher */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimeout(() => navigate(`/${item.action}/${item.id}`), 100);
                        }}
                        className="flex-[1.5] min-w-0 bg-[#1e1e20] rounded-[4px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_3px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center hover:bg-[#2a2a2c] active:bg-brand-yellow/20 transition-all duration-75 group px-1 cursor-pointer"
                      >
                        <div className="flex flex-col items-center gap-1 group-active:translate-y-[1px] group-active:opacity-60 transition-all duration-75 w-full">
                          <User className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-white" />
                          <span className="text-[8px] font-medium text-gray-400 leading-tight text-center line-clamp-2 w-full group-hover:text-white">{item.teacher[lang]}</span>
                        </div>
                      </div>
                      {/* Open */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimeout(() => navigate(`/${item.action}/${item.id}`), 100);
                        }}
                        className="flex-1 bg-[#1e1e20] rounded-r-[17px] rounded-l-[4px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_3px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center hover:bg-[#2a2a2c] active:bg-brand-yellow/20 transition-all duration-75 group cursor-pointer"
                      >
                        <div className="flex flex-col items-center gap-1 group-active:translate-y-[2px] transition-all duration-75">
                          <Icon className={`w-4 h-4 text-white group-active:text-brand-yellow`} />
                          <span className={`text-[9px] font-bold text-white uppercase tracking-wider group-active:text-brand-yellow`}>{lang === 'en' ? 'Open' : '開く'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            /* Empty state */
            <motion.div
              variants={itemVariants}
              className={`mx-4 sm:mx-6 mt-4 rounded-2xl p-8 flex flex-col items-center gap-4 text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white shadow-inner">
                <img
                  src={mascotIdle}
                  alt="Mascot — nothing here"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {lang === 'en' ? 'Nothing here yet' : 'まだ何もありません'}
                </p>
                <p className={`text-xs mt-1 ${textMuted}`}>{t[lang].noItems}</p>
              </div>
            </motion.div>
          )}

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

      <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom, 0px))] left-4 right-4 sm:left-6 sm:right-6 z-20 lg:hidden text-brand-black">
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
                      <div className="font-bold text-lg leading-tight truncate">{cls.title[lang]}</div>
                      <div className="text-sm font-medium opacity-80 truncate">{cls.location[lang]}</div>
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
        onClose={() => setIsMenuOpen(false)}
        lang={lang}
        setLang={setLang}
        settings={settings}
      />
    </div>
  );
}
