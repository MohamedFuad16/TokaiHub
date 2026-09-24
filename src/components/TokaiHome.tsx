import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Menu, Calendar, Bell, ChevronRight, X, ChevronLeft, GraduationCap, Target, AlertCircle, UserCheck, Megaphone } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate } from 'react-router-dom';
import SharedMenu from './SharedMenu';
import WeeklyTimetable from './WeeklyTimetable';
import { motion, AnimatePresence } from 'motion/react';
import { useTips } from '../lib/useTips';
import { useTimetable } from '../lib/useTerm';
import { termLabel, academicYearOf, pct } from '../lib/tipsAdapters';
import { useClassCalendar } from '../lib/useCalendar';
import type { TipsAttendanceCourse, TipsBulletins, TipsCabinetFile, TipsCabinetFolder, TipsChange, TipsGraduation } from '../lib/types';
import { FileRow } from './TokaiCabinet';
import { Fresh, CONTAINER, TAP, EASE, RefreshButton, Skeleton } from './ScreenHeader';
import type { TipsGrades } from '../lib/types';
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
    noCourses: "No registered courses for this term yet.",
    otherInfo: "Bulletins",
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
    noCourses: "この学期の履修登録はまだありません。",
    otherInfo: "掲示",
    gpa: "累積 GPA",
    credits: "履修単位数 (5セメ)",
    onTrack: "順調",
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } }
};

export default function TokaiHome({ lang, setLang, settings, userProfile }: ScreenProps) {
  const navigate = useNavigate();

  // TIPS data: timetable for the active term, plus the small summaries shown on the dashboard.
  const tt = useTimetable();
  const courseItems = tt.items;
  const termYear = tt.timetable?.year ?? academicYearOf(new Date());
  const term = tt.timetable?.term ?? '1';
  const attendance = useTips<{ courses: TipsAttendanceCourse[] }>('attendance', { year: termYear, term });
  const graduation = useTips<TipsGraduation>('graduation');
  const bulletins = useTips<TipsBulletins>('bulletins');
  const changes = useTips<{ items: TipsChange[] }>('changes');
  const grades = useTips<TipsGrades>('grades');
  const isDataLoaded = !!tt.timetable || !!tt.error;

  // Derive live values from userProfile
  const firstName = userProfile?.givenName || (lang === 'en' ? 'Student' : '学生');
  const studentIdDisplay = userProfile?.studentId ?? '—';
  const cumGpa = userProfile?.cumulativeGpa ?? 0;
  const selectedCourseIds = useMemo(() => courseItems.map(c => c.id), [courseItems]);
  const creditsEarned = graduation.data?.total?.earned ?? userProfile?.creditsEarned ?? 0;
  const creditsNeeded = graduation.data?.total?.required ?? null;
  const attendanceRate = useMemo(() => {
    const cs = attendance.data?.courses ?? [];
    const att = cs.reduce((a, c) => a + (c.attended ?? 0), 0);
    const abs = cs.reduce((a, c) => a + (c.absent ?? 0), 0);
    return att + abs ? Math.round((att / (att + abs)) * 100) : null;
  }, [attendance.data]);
  const alerts = (changes.data?.items ?? []).filter(c => c.status !== 'normal');
  const latestPosts = (bulletins.data?.posts ?? []).slice(0, 3);
  // Newest cabinet files across all folders ("2025年9月19日 07:29:41" / "2025/09/19 07:29:41").
  const cabinet = useTips<{ folders: TipsCabinetFolder[] }>('cabinet');
  // Everything the dashboard shows, asked from TIPS again (the header refresh button).
  const refreshAll = () => { tt.refresh(); attendance.refresh(); graduation.refresh(); bulletins.refresh(); changes.refresh(); cabinet.refresh(); grades.refresh(); };
  const refreshing = tt.loading || attendance.loading || graduation.loading || bulletins.loading || changes.loading || cabinet.loading || grades.loading;
  const recentFiles = useMemo(() => {
    const all: TipsCabinetFile[] = [];
    const walk = (fs: TipsCabinetFolder[]) => fs.forEach(f => { all.push(...f.files); walk(f.children); });
    walk(cabinet.data?.folders ?? []);
    const key = (d: string) => (d.match(/\d+/g) ?? []).map(n => n.padStart(2, '0')).join('');
    return all.sort((a, b) => key(b.date).localeCompare(key(a.date))).slice(0, 4);
  }, [cabinet.data]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isCalendarSheetOpen, setIsCalendarSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const handleMenuClose = useCallback(() => setIsMenuOpen(false), []);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  // Real class dates: attendance sessions (past terms) or TIPS's class schedule (current term).
  const todayCal = useClassCalendar(new Date());
  const sheetCal = useClassCalendar(currentMonth);
  const todayClasses = useMemo(() => todayCal.index.on(new Date(), courseItems).map(x => x.item), [todayCal.index, courseItems]);
  const calendarClasses = useMemo(() => sheetCal.index.on(selectedDate, courseItems).map(x => x.item), [sheetCal.index, selectedDate, courseItems]);

  const isDark = settings.isDarkMode;
  const todayLabel = useMemo(() => new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), [lang]);
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  const pageBg = isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';

  if (!isDataLoaded) {
    // Same frame as the loaded dashboard, so nothing jumps when TIPS answers.
    return (
      <div className={`h-full w-full overflow-hidden ${pageBg}`} aria-busy="true">
        <div className={CONTAINER} style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top, 0px))' }}>
          <Skeleton isDark={isDark} className="h-10 w-32 rounded-xl" />
          <Skeleton isDark={isDark} className="mt-10 h-24 w-3/4 max-w-md rounded-2xl" />
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => <Skeleton key={i} isDark={isDark} className="h-28 rounded-3xl" />)}
          </div>
          <Skeleton isDark={isDark} className="mt-10 h-80 rounded-[32px]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full relative flex flex-col ${pageBg}`}>
      {/* Header */}
      <header
        style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top, 0px))' }}
        className={`shrink-0 pb-4 sm:pb-6 border-b ${borderClass}`}
      >
        <div className={`${CONTAINER} flex justify-between items-center gap-3`}>
        <div className="flex items-center gap-1 lg:hidden">
          <div className={`font-bold text-xl tracking-tighter leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
            TOKAI<br /><span className="text-brand-yellow">HUB</span>
          </div>
          <img src={mascotLogo} alt="Tokai Mascot" className="w-auto h-10 object-contain ml-0.5 drop-shadow-sm hover:rotate-6 hover:scale-105 transition-all cursor-pointer" />
        </div>
        <div className="hidden lg:block">
          <h2 className={`text-sm font-semibold ${textMuted}`}>{todayLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={refreshAll} refreshing={refreshing} label={lang === 'en' ? 'Refresh from TIPS' : 'TIPSから更新'}
            className={`w-10 h-10 rounded-full border ${borderClass} flex items-center justify-center shrink-0 transition-colors ${isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-50 text-gray-900'}`} />
          <motion.button
            whileTap={TAP}
            onClick={() => setIsMenuOpen(true)}
            aria-label={lang === 'en' ? 'Open menu' : 'メニューを開く'}
            className={`w-10 h-10 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-50 text-gray-900'} lg:hidden`}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="pb-48 lg:pb-32">

          {/* Title + Student ID badge */}
          <motion.div variants={itemVariants} className={`${CONTAINER} mt-6`}>
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

          {/* At-a-glance: GPA, credits toward graduation, attendance this term */}
          <motion.div variants={itemVariants} className={`${CONTAINER} mt-8 grid grid-cols-3 gap-2.5 sm:gap-3`}>
            <motion.div role="button" tabIndex={0} whileHover={{ y: -2 }} whileTap={TAP} onClick={() => navigate('/grades')} className={`min-w-0 p-3.5 sm:p-5 rounded-3xl cursor-pointer shadow-sm ${isDark ? 'bg-gray-800' : 'bg-brand-black'}`}>
              <div className="flex items-center gap-1.5 mb-3"><GraduationCap className="w-4 h-4 text-brand-yellow" /><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GPA</span></div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white"><Fresh value={cumGpa}>{cumGpa ? cumGpa.toFixed(2) : '—'}</Fresh></div>
              <div className="text-[10px] font-bold text-gray-500 mt-1">{t[lang].gpa}</div>
            </motion.div>
            <motion.div role="button" tabIndex={0} whileHover={{ y: -2 }} whileTap={TAP} onClick={() => navigate('/grades')} className={`min-w-0 p-3.5 sm:p-5 rounded-3xl cursor-pointer shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-1.5 mb-3"><Target className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /><span className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{lang === 'en' ? 'Credits' : '単位'}</span></div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight"><Fresh value={creditsEarned}>{creditsEarned}</Fresh>{creditsNeeded !== null && <span className={`text-sm font-semibold ${textMuted}`}> / {creditsNeeded}</span>}</div>
              <div className={`mt-2 h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}><div className={`h-full rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(pct(creditsEarned, creditsNeeded), 100)}%` }} /></div>
            </motion.div>
            <motion.div role="button" tabIndex={0} whileHover={{ y: -2 }} whileTap={TAP} onClick={() => navigate('/attendance')} className={`min-w-0 p-3.5 sm:p-5 rounded-3xl cursor-pointer shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-1.5 mb-3"><UserCheck className={`w-4 h-4 ${isDark ? 'text-brand-green' : 'text-green-600'}`} /><span className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{lang === 'en' ? 'Attendance' : '出席率'}</span></div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight"><Fresh value={attendanceRate ?? -1}>{attendanceRate === null ? '—' : `${attendanceRate}%`}</Fresh></div>
              <div className={`text-[10px] font-bold mt-1 ${textMuted}`}>{termLabel(term, termYear, lang)}</div>
            </motion.div>
          </motion.div>

          {/* Class changes (cancellations, room changes, make-ups) for the next two weeks */}
          {alerts.length > 0 && (
            <motion.div variants={itemVariants} className={`${CONTAINER} mt-6 space-y-2`}>
              {alerts.slice(0, 3).map((a, i) => (
                <div key={i} className={`flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="text-sm font-semibold min-w-0 truncate">
                    {a.date}({a.weekday}) {a.period} · {a.title} · {{ cancelled: lang === 'en' ? 'Cancelled' : '休講', makeup: lang === 'en' ? 'Make-up class' : '補講', roomChange: lang === 'en' ? `Room → ${a.room}` : `教室変更 → ${a.room}`, cancelledMakeup: lang === 'en' ? 'Cancelled / make-up' : '休講・補講', normal: '' }[a.status]}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Weekly Schedule Section */}
          <motion.div variants={itemVariants} className={`${CONTAINER} mt-10`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Calendar className="w-5 h-5 text-brand-yellow" />
                {lang === 'en' ? "Weekly Schedule" : "週間スケジュール"}
              </h2>
              <button
                onClick={() => navigate('/schedule')}
                className={`h-10 text-xs font-bold px-4 rounded-full transition-colors active:scale-95 ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {lang === 'en' ? "Full View →" : "詳細を表示 →"}
              </button>
            </div>

            {tt.timetable?.registrationOpen && tt.timetable.term === tt.currentTerm && (
              <button onClick={() => navigate('/registration')} className={`w-full mb-4 flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 text-left active:scale-[0.99] transition-transform ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                <Target className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-sm font-semibold">
                  {lang === 'en'
                    ? `${termLabel(term, termYear, 'en')} registration is open until ${tt.timetable.registrationStatus}. Plan your classes.`
                    : `${termLabel(term, termYear, 'jp')}の履修登録期間中です（${tt.timetable.registrationStatus}まで）。科目を選びましょう。`}
                </span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            )}

            {tt.isFallback && (
              <p className={`text-xs font-semibold mb-3 ${textMuted}`}>
                {lang === 'en'
                  ? `No courses registered for ${termLabel(tt.currentTerm, termYear, 'en')} yet. Showing ${termLabel(term, termYear, 'en')}.`
                  : `${termLabel(tt.currentTerm, termYear, 'jp')}の履修登録はまだありません。${termLabel(term, termYear, 'jp')}を表示しています。`}
              </p>
            )}

            <div className="pt-5 lg:pt-6 pb-2 sm:pb-3 rounded-[32px] sm:rounded-[40px] overflow-hidden relative" style={{ background: '#0C0C0E' }}>
              <WeeklyTimetable
                lang={lang}
                settings={settings}
                selectedCourseIds={selectedCourseIds}
                scheduleItems={courseItems}
                semesterLabel={termLabel(term, termYear, lang)}
                grid={tt.timetable?.grid}
                forceDark
              />
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => navigate('/class')}
                className={`flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-2xl bg-brand-yellow text-brand-black hover:brightness-95 active:scale-95 transition-all shadow-lg shadow-yellow-500/10`}
              >
                <Target className="w-4 h-4" />
                {lang === 'en' ? 'Courses & Syllabus' : '履修科目・シラバス'}
              </button>
            </div>
          </motion.div>

          {/* Latest bulletins and cabinet files from TIPS */}
          <div className={`${CONTAINER} mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8`}>
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t[lang].otherInfo}</h2>
                <button onClick={() => navigate('/bulletins')} className={`h-10 text-xs font-bold px-4 rounded-full transition-colors active:scale-95 ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{lang === 'en' ? 'All posts →' : 'すべて →'}</button>
              </div>
              <div className="space-y-3">
                {latestPosts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.05, ease: EASE } }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate(`/bulletins/${post.id}`)}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-2xl p-4 flex items-center gap-4 cursor-pointer shadow-sm border border-transparent ${i % 2 ? 'hover:border-brand-green/30' : 'hover:border-brand-yellow/30'}`}
                  >
                    <div className={`w-10 h-10 ${i % 2 ? 'bg-brand-green' : 'bg-brand-yellow'} rounded-full flex items-center justify-center shrink-0`}>
                      {i % 2 ? <Megaphone className="w-5 h-5 text-brand-black" /> : <Bell className="w-5 h-5 text-brand-black" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-brand-black'}`}>{post.title}</h3>
                      <p className={`text-xs ${textMuted} mt-0.5 truncate`}>{post.genre} · {post.postedAt}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${textMuted} shrink-0`} />
                  </motion.div>
                ))}
                {!latestPosts.length && (bulletins.loading
                  ? [0, 1, 2].map(i => <Skeleton key={i} isDark={isDark} className="h-[72px] rounded-2xl" />)
                  : <p className={`text-sm font-medium ${textMuted}`}>{lang === 'en' ? 'No bulletins.' : '掲示はありません。'}</p>)}
              </div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{lang === 'en' ? 'Cabinet · recently added' : 'キャビネット・新着資料'}</h2>
                <button onClick={() => navigate('/cabinet')} className={`h-10 text-xs font-bold px-4 rounded-full transition-colors active:scale-95 ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{lang === 'en' ? 'All files →' : 'すべて →'}</button>
              </div>
              <div className={`rounded-2xl p-1 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                {recentFiles.map((f, i) => <FileRow key={`${f.name}-${i}`} f={f} isDark={isDark} lang={lang} />)}
                {!recentFiles.length && (cabinet.loading
                  ? <div className="space-y-1 p-1">{[0, 1, 2].map(i => <Skeleton key={i} isDark={isDark} className="h-14 rounded-xl" />)}</div>
                  : <p className={`p-3 text-sm font-medium ${textMuted}`}>{lang === 'en' ? 'No files.' : '資料はありません。'}</p>)}
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
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8, delay: 0.4 }}
          onClick={() => setIsScheduleSheetOpen(true)}
          role="button"
          aria-label={`${t[lang].classesToday}: ${todayClasses.length}`}
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
          <motion.button
            whileTap={TAP}
            onClick={(e) => { e.stopPropagation(); setIsCalendarSheetOpen(true); }}
            aria-label={lang === 'en' ? 'Open calendar' : 'カレンダーを開く'}
            className="w-14 h-14 bg-white rounded-full p-2 flex items-center justify-center text-brand-black hover:bg-gray-100 transition-colors"
          >
            <Calendar className="w-6 h-6" />
          </motion.button>
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
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
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
                      {(cls.time ?? '').split(' ')[0]}
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
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
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
                            {(cls.time ?? '').split(' ')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg leading-tight truncate">{cls.title?.[lang]}</div>
                            <div className="text-sm font-medium opacity-80 truncate">{cls.location?.[lang]}</div>
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
