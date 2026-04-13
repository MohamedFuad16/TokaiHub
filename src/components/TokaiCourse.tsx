import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Clock, BookOpen, Award, CheckCircle, FileText, Calendar, User } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { allItems } from '../data';
import { getCourseDetails } from '../lib/api';
import type { CourseItem } from '../lib/types';

// 🔹 Local JP fallback
const courseFallbacks: Record<string, { jp?: { overview?: string; evaluation?: string } }> = {
  TTK000: {
    jp: {
      overview: "概要はまだありません。",
      evaluation: "評価方法は未定です。"
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

const SEMESTER_START = new Date(2026, 3, 8); // April 8, 2026
const SEMESTER_END = new Date(2026, 6, 21);   // July 21, 2026

const AttendanceTracker = ({ courseId, courseDay, isDark, lang }: { courseId: string; courseDay: string; isDark: boolean; lang: string }) => {
  const daysMap: Record<string, number> = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0 };
  const targetDay = daysMap[courseDay?.toLowerCase()] ?? 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem(`attendance_${courseId}`);
    return stored ? JSON.parse(stored) : {};
  });

  const classDates = useMemo(() => {
    const dates: Date[] = [];
    let current = new Date(SEMESTER_START);
    while (current.getDay() !== targetDay && current <= SEMESTER_END) {
      current.setDate(current.getDate() + 1);
    }
    while (current <= SEMESTER_END) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return dates;
  }, [targetDay]);

  const { attendedCount, totalCount, percentage } = useMemo(() => {
    const attended = classDates.filter(d => attendance[d.toISOString().split('T')[0]]).length;
    const total = classDates.length;
    return { attendedCount: attended, totalCount: total, percentage: Math.round((attended / total) * 100) };
  }, [classDates, attendance]);

  const toggleAttendance = useCallback((dateStr: string) => {
    setAttendance(prev => {
      const next = { ...prev, [dateStr]: !prev[dateStr] };
      localStorage.setItem(`attendance_${courseId}`, JSON.stringify(next));
      return next;
    });
  }, [courseId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
            {lang === 'en' ? 'Attendance Tracker' : '出席トラッカー'}
          </h3>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold tracking-tight leading-none ${isDark ? 'text-brand-yellow' : 'text-brand-black'}`}>
            {attendedCount} <span className="text-sm font-medium text-gray-400">/ {totalCount}</span>
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {lang === 'en' ? 'Classes Attended' : '出席済み'}
          </div>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-6 rounded-3xl border ${isDark ? 'border-gray-700' : 'border-transparent'} shadow-sm`}>
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2 px-1">
             <span className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-brand-black'}`}>{lang === 'en' ? 'Semester Progress' : '学期出席率'}</span>
             <span className={`text-xs font-black tracking-tighter ${isDark ? 'text-brand-yellow' : 'text-brand-yellow'} opacity-90`}>{percentage}%</span>
          </div>
          <div className={`h-3 w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden shadow-inner`}>
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${percentage}%` }}
               className={`h-full ${percentage === 100 ? 'bg-brand-green' : 'bg-brand-yellow'} rounded-full`}
               transition={{ type: 'spring', stiffness: 50, damping: 15 }}
             />
          </div>
        </div>

        {/* Scrollable Date Section */}
        <div className="flex gap-3 overflow-x-auto pb-6 pt-2 -mx-2 px-2 no-scrollbar snap-x">
          {classDates.map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            const isAttended = attendance[dateStr];
            const isToday = date.getTime() === today.getTime();
            const isPast = date < today;

            return (
              <button
                key={dateStr}
                onClick={() => toggleAttendance(dateStr)}
                className={`flex-shrink-0 w-16 h-24 rounded-3xl flex flex-col items-center justify-center gap-1.5 border-2 transition-all snap-start relative
                  ${isToday 
                      ? 'border-brand-yellow bg-brand-yellow/10 shadow-inner scale-[1.02]' 
                      : isAttended
                          ? (isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50')
                          : (isDark ? 'border-gray-700 bg-gray-900/50' : 'border-transparent bg-white shadow-sm')}
                `}
              >
                <span className={`text-[9px] uppercase font-bold tracking-widest ${isToday ? 'text-brand-yellow' : 'text-gray-400'}`}>
                  {date.toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', { month: 'short' })}
                </span>
                <span className={`text-xl font-bold tracking-tighter ${isToday ? 'text-brand-yellow' : isDark ? 'text-gray-200' : 'text-brand-black'}`}>
                  {date.getDate()}
                </span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all
                  ${isAttended 
                    ? 'bg-brand-black border-brand-black'
                    : isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}
                `}>
                  {isAttended && <CheckCircle className="w-5 h-5 text-brand-yellow" />}
                </div>
                {isToday && <div className="absolute -top-2.5 px-2.5 py-0.5 bg-brand-yellow text-brand-black text-[8px] font-black rounded-full shadow-md uppercase tracking-wider">{lang === 'en' ? 'TODAY' : '今日'}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TokaiCourse = React.memo(function TokaiCourse({ lang, settings }: ScreenProps) {
  const navigate = useNavigate();
  const goBack = useCallback(() => navigate(-1), [navigate]);
  const { id } = useParams();

  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const textNormal = isDark ? 'text-gray-300' : 'text-gray-600';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  const courseId = id || '';
  // Use local item only as a metadata seed (colors, credits); API overwrites everything
  const localSeed = allItems.find(item => item.id === courseId || item.code === courseId) ?? null;
  const [course, setCourse] = useState<CourseItem | null>(localSeed);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    // Try the courseId directly, then its code equivalent
    const apiId = localSeed?.code ?? courseId;

    getCourseDetails(apiId, controller.signal)
      .then(data => {
        const { overview, evaluation, title, teacher, location, ...rest } = data;
        setCourse(prev => {
          const base = prev ?? {} as CourseItem;
          const safeTitle = typeof title === 'string'
            ? { en: title, jp: (base.title?.jp ?? title) }
            : (title ? { ...base.title, ...title } : base.title);

          const safeTeacher = typeof teacher === 'string'
            ? { en: teacher, jp: base.teacher?.jp ?? '' }
            : (teacher ? { ...base.teacher, ...teacher } : base.teacher);

          const safeLocation = typeof location === 'string'
            ? { en: location, jp: base.location?.jp ?? '' }
            : (location ? { ...base.location, ...location } : base.location);

          return {
            ...base,
            ...rest,
            title: safeTitle,
            teacher: safeTeacher,
            location: safeLocation,
            overview: typeof overview === 'string'
              ? { ...(base.overview ?? {}), en: overview }
              : (overview ? { ...(base.overview ?? {}), ...overview } : base.overview),
            evaluation: typeof evaluation === 'string'
              ? { ...(base.evaluation ?? {}), en: evaluation }
              : (evaluation ? { ...(base.evaluation ?? {}), ...evaluation } : base.evaluation),
          };
        });
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          setLoadError('Failed to load course details.');
        }
      });
    return () => controller.abort();
  }, [courseId, localSeed?.code]);

  // UI text
  const t = {
    en: {
      status: "Confirmed",
      credits: "Credits",
      field: "Information Systems",
      evalTitle: "Evaluation",
      overviewTitle: "Overview",
      fallbackOverview: "Course overview not available.",
      fallbackEvaluation: "Attendance/Lab 40% + Report 60%"
    },
    jp: {
      status: "確定",
      credits: "単位",
      field: "情報システム",
      evalTitle: "評価方法",
      overviewTitle: "概要",
      fallbackOverview: "概要は利用できません。",
      fallbackEvaluation: "出席・実験40%＋レポート60%"
    }
  };

  // Show loading/error state when course hasn't loaded from API yet
  if (!course) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        {loadError ? (
          <p className="text-sm text-red-400 font-medium">{loadError}</p>
        ) : (
          <p className={`text-sm font-medium ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            {lang === 'en' ? 'Loading course…' : 'ロード中…'}
          </p>
        )}
      </div>
    );
  }

  const apiCourseId = course.code || "TTK000";
  const fallback = courseFallbacks[apiCourseId];

  // Overview logic
  const overviewText =
    lang === "jp"
      ? fallback?.jp?.overview || course.overview?.jp
      : course.overview?.en;

  const finalOverview = overviewText || t[lang].fallbackOverview;

  // Evaluation logic
  const evaluationText =
    lang === "jp"
      ? fallback?.jp?.evaluation || course.evaluation?.jp
      : course.evaluation?.en;

  const finalEvaluation = evaluationText || t[lang].fallbackEvaluation;

  return (
    <div className="h-full relative flex flex-col">

      {/* Header */}
      <header 
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
        className="flex justify-between items-center p-4 sm:p-6 shrink-0 max-w-4xl w-full mx-auto"
      >
        <div className="font-bold text-2xl tracking-tighter">
          {course.code}
        </div>
        <button
          onClick={() => setTimeout(goBack, 150)}
          className={`w-12 h-12 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} active:scale-95`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="pb-12 max-w-4xl w-full mx-auto"
        >

          {/* Title */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-brand-black text-white text-xs font-bold px-3 py-1.5 rounded-full">
                {course.code}
              </span>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {t[lang].status}
              </span>
            </div>

            <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] font-bold leading-[1.1] tracking-tight whitespace-pre-line">
              {course.title[lang]}
            </h1>
          </motion.div>

          {/* Grid */}
          <motion.div
            variants={itemVariants}
            className="px-4 sm:px-6 mt-8 grid grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div className={`${bgClass} p-5 rounded-3xl`}>
              <Clock className={`w-6 h-6 mb-3 ${isDark ? 'text-brand-yellow' : 'text-brand-black'}`} />
              <div className={`text-xs ${textMuted} font-bold mb-1`}>
                {lang === 'en' ? 'Time' : '時間'}
              </div>
              <div className="font-bold text-sm">{course.time}</div>
            </div>

            <div className={`${bgClass} p-5 rounded-3xl`}>
              <Award className={`w-6 h-6 mb-3 ${isDark ? 'text-brand-yellow' : 'text-brand-black'}`} />
              <div className={`text-xs ${textMuted} font-bold mb-1`}>
                {t[lang].credits}
              </div>
              <div className="font-bold text-sm">
                {course.credits || 2} {t[lang].credits}
              </div>
            </div>

            <div className={`${bgClass} p-5 rounded-3xl flex items-center gap-4`}>
              <div className={`w-12 h-12 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded-full flex items-center justify-center shrink-0`}>
                <Calendar className={`${isDark ? 'text-brand-yellow' : 'text-brand-black'} w-6 h-6`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xs ${textMuted} font-bold mb-1`}>
                  {lang === 'en' ? 'Weekly' : '毎週'}
                </div>
                <div className="font-bold text-[14px] uppercase truncate">
                   {lang === 'en' 
                     ? (course.day || courseId.split('-')[0])?.toUpperCase() 
                     : (course.day === 'mon' || courseId.startsWith('mon') ? '月曜日' : 
                        course.day === 'tue' || courseId.startsWith('tue') ? '火曜日' : 
                        course.day === 'wed' || courseId.startsWith('wed') ? '水曜日' : 
                        course.day === 'thu' || courseId.startsWith('thu') ? '木曜日' : 
                        course.day === 'fri' || courseId.startsWith('fri') ? '金曜日' : 
                        course.day === 'sat' || courseId.startsWith('sat') ? '土曜日' : '日曜日')}
                </div>
              </div>
            </div>

            <div className={`${bgClass} p-5 rounded-3xl flex items-center gap-4`}>
              <div className={`w-12 h-12 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded-full flex items-center justify-center shrink-0`}>
                <User className={`${isDark ? 'text-brand-yellow' : 'text-brand-black'} w-6 h-6`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xs ${textMuted} font-bold mb-1`}>
                  {lang === 'en' ? 'Teacher' : '担当教員'}
                </div>
                <div className="font-bold text-[13.5px] leading-snug line-clamp-2">
                   {course.teacher?.[lang] || (lang === 'en' ? 'Staff' : '担当者')}
                </div>
              </div>
            </div>

            <div className={`${bgClass} p-5 rounded-3xl col-span-2 lg:col-span-1 flex items-center gap-4`}>
              <div className={`w-12 h-12 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded-full flex items-center justify-center shrink-0`}>
                <BookOpen className={`${isDark ? 'text-brand-yellow' : 'text-brand-black'} w-6 h-6`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xs ${textMuted} font-bold mb-1`}>
                  {lang === 'en' ? 'Field' : '分野'}
                </div>
                <div className="font-bold text-[14px] truncate">
                  {t[lang].field}
                </div>
              </div>
            </div>
          </motion.div>
          {/* Syllabus Button (Coming Soon) */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-6">
            <div className={`p-4 rounded-[28px] ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border-2 border-dashed ${isDark ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between group cursor-not-allowed opacity-80 shadow-sm`}>
              <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-700' : 'bg-white'} flex items-center justify-center`}>
                   <FileText className="w-5 h-5 text-gray-400" />
                 </div>
                 <div>
                   <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-brand-black'}`}>
                     {lang === 'en' ? 'Syllabus PDF' : 'シラバス PDF'}
                   </div>
                   <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">
                      {lang === 'en' ? 'Available Soon' : '近日公開予定'}
                   </div>
                 </div>
              </div>
              <div className={`px-2.5 py-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-tighter`}>
                 Pending
              </div>
            </div>
          </motion.div>

          {/* Overview + Evaluation */}
          <motion.div
            variants={itemVariants}
            className="px-4 sm:px-6 mt-8 lg:grid lg:grid-cols-2 lg:gap-8 space-y-8 lg:space-y-0"
          >
            {/* Overview */}
            <div>
              <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
                {t[lang].overviewTitle}
              </h3>
              <p className={`${textNormal} text-base leading-relaxed font-medium ${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-5 rounded-3xl`}>
                {finalOverview}
              </p>
            </div>

            {/* Evaluation */}
            <div>
              <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
                {t[lang].evalTitle}
              </h3>
              <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-6 rounded-3xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]`}>
                {course.evaluationBreakdown && course.evaluationBreakdown.length > 0 ? (
                  <div className="space-y-6">
                    {course.evaluationBreakdown.map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-end px-1">
                          <span className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-brand-black'}`}>
                            {item.label[lang]}
                          </span>
                          <span className={`text-xs font-black tracking-tighter ${isDark ? 'text-brand-yellow' : 'text-brand-black'} opacity-80`}>
                            {item.percentage}%
                          </span>
                        </div>
                        <div className={`h-3 w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden shadow-inner`}>
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${item.percentage}%` }}
                            viewport={{ once: true }}
                            transition={{ 
                              type: 'spring', 
                              stiffness: 100, 
                              damping: 20, 
                              delay: 0.1 + (idx * 0.1) 
                            }}
                            className={`h-full ${item.color} rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)]`}
                          />
                        </div>
                      </div>
                    ))}
                    {/* Bars ONLY — redundant text removed */}
                  </div>
                ) : (
                  <div className={`${textNormal} text-base leading-relaxed font-medium`}>
                    {finalEvaluation}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Attendance Tracker */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-8">
            <AttendanceTracker courseId={courseId} courseDay={course.day} isDark={isDark} lang={lang} />
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
});

export default TokaiCourse;