import React, { useEffect, useState } from 'react';
import { ChevronLeft, Clock, BookOpen, Award, CheckCircle, FileText, Calendar } from 'lucide-react';
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

const AttendanceTracker = ({ courseId, courseDay, isDark, lang }: { courseId: string; courseDay: string; isDark: boolean; lang: string }) => {
  const daysMap: Record<string, number> = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0 };
  const targetDay = daysMap[courseDay?.toLowerCase()] ?? 1;
  const semesterStart = new Date(2026, 3, 8); // April 8, 2026
  const semesterEnd = new Date(2026, 6, 21); // July 21, 2026
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem(`attendance_${courseId}`);
    return stored ? JSON.parse(stored) : {};
  });

  const classDates = React.useMemo(() => {
    const dates: Date[] = [];
    let current = new Date(semesterStart);
    while (current.getDay() !== targetDay && current <= semesterEnd) {
      current.setDate(current.getDate() + 1);
    }
    while (current <= semesterEnd) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return dates;
  }, [targetDay]);

  const attendedCount = classDates.filter(d => attendance[d.toISOString().split('T')[0]]).length;
  const totalCount = classDates.length;
  const percentage = Math.round((attendedCount / totalCount) * 100);

  const toggleAttendance = (dateStr: string) => {
    const newAttendance = { ...attendance, [dateStr]: !attendance[dateStr] };
    setAttendance(newAttendance);
    localStorage.setItem(`attendance_${courseId}`, JSON.stringify(newAttendance));
  };

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-6 rounded-[32px] shadow-sm`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-green"></span>
            {lang === 'en' ? 'Attendance Tracker' : '出席トラッカー'}
          </h3>
          <p className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            {lang === 'en' ? 'Track your semester progress' : '今学期の出席状況を管理しましょう'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-tight text-brand-black dark:text-brand-yellow">
            {attendedCount} / {totalCount}
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {lang === 'en' ? 'Classes Attended' : '出席済み'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2 px-1">
           <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{lang === 'en' ? 'Completion' : '達成率'}</span>
           <span className={`text-[11px] font-black ${percentage === 100 ? 'text-green-500' : 'text-brand-black dark:text-brand-yellow'}`}>{percentage}%</span>
        </div>
        <div className={`h-2.5 w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${percentage}%` }}
             className={`h-full ${percentage === 100 ? 'bg-green-500' : 'bg-brand-green'} rounded-full`}
             transition={{ type: 'spring', stiffness: 50, damping: 15 }}
           />
        </div>
      </div>

      {/* Scrollable Date Section */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide snap-x">
        {classDates.map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const isAttended = attendance[dateStr];
          const isToday = date.getTime() === today.getTime();
          const isPast = date < today;

          return (
            <button
              key={dateStr}
              onClick={() => toggleAttendance(dateStr)}
              className={`flex-shrink-0 w-16 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all snap-start shadow-sm
                ${isAttended 
                  ? 'border-brand-green bg-brand-green/10' 
                  : isToday 
                    ? 'border-brand-yellow bg-brand-yellow/5' 
                    : isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-white'}
                ${!isPast && !isToday ? 'opacity-50' : 'opacity-100'}
              `}
            >
              <span className={`text-[10px] uppercase font-black tracking-tighter ${isToday ? 'text-brand-black dark:text-brand-yellow' : 'text-gray-400'}`}>
                {date.toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', { month: 'short' })}
              </span>
              <span className="text-xl font-black tracking-tighter">
                {date.getDate()}
              </span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all
                ${isAttended 
                  ? 'bg-brand-green border-brand-green' 
                  : isDark ? 'border-gray-700' : 'border-gray-200'}
              `}>
                {isAttended && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              {isToday && <div className="absolute -top-1 px-2 py-0.5 bg-brand-yellow text-brand-black text-[8px] font-black rounded-full shadow-sm">{lang === 'en' ? 'TODAY' : '今日'}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TokaiCourse = React.memo(function TokaiCourse({ lang, settings }: ScreenProps) {
  const navigate = useNavigate();
  const goBack = () => navigate(-1);
  const { id } = useParams();

  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const textNormal = isDark ? 'text-gray-300' : 'text-gray-600';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  const courseId = id || 'mon-1-2';
  const localCourse = allItems.find(item => item.id === courseId) || allItems[0];
  const [course, setCourse] = useState<CourseItem>(localCourse);

  useEffect(() => {
    const apiCourseId = localCourse.code ?? courseId;

    getCourseDetails(apiCourseId)
      .then(data => {
        const { overview, evaluation, title, teacher, location, ...rest } = data;

        setCourse(prev => {
          const safeTitle = typeof title === 'string' 
            ? { en: title, jp: prev.title.jp } 
            : { ...prev.title, ...title };
            
          const safeTeacher = typeof teacher === 'string'
            ? { en: teacher, jp: prev.teacher?.jp || '' }
            : (teacher ? { ...prev.teacher, ...teacher } : prev.teacher);

          const safeLocation = typeof location === 'string'
            ? { en: location, jp: prev.location?.jp || '' }
            : (location ? { ...prev.location, ...location } : prev.location);

          return {
            ...prev,
            ...rest,
            title: safeTitle,
            teacher: safeTeacher,
            location: safeLocation,
            overview: typeof overview === "string"
              ? { ...prev.overview, en: overview }
              : (overview ? { ...prev.overview, ...overview } : prev.overview),
            evaluation: typeof evaluation === "string"
              ? { ...prev.evaluation, en: evaluation }
              : (evaluation ? { ...prev.evaluation, ...evaluation } : prev.evaluation),
          };
        });
      })
      .catch(() => { });
  }, [courseId, localCourse.code]);

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
      <header className="flex justify-between items-center p-4 sm:p-6 pt-8 sm:pt-12 lg:pt-8 shrink-0 max-w-4xl w-full mx-auto">
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
              <div className={`w-12 h-12 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded-full flex items-center justify-center`}>
                <Calendar className={`${isDark ? 'text-brand-yellow' : 'text-brand-black'} w-6 h-6`} />
              </div>
              <div>
                <div className={`text-xs ${textMuted} font-bold mb-1`}>
                  {lang === 'en' ? 'Weekly' : '毎週'}
                </div>
                <div className="font-bold text-base uppercase">
                   {lang === 'en' ? course.day?.toUpperCase() : (course.day === 'mon' ? '月曜日' : course.day === 'tue' ? '火曜日' : course.day === 'wed' ? '水曜日' : course.day === 'thu' ? '木曜日' : course.day === 'fri' ? '金曜日' : course.day === 'sat' ? '土曜日' : '日曜日')}
                </div>
              </div>
            </div>

            <div className={`${bgClass} p-5 rounded-3xl col-span-2 lg:col-span-1 flex items-center gap-4`}>
              <div className={`w-12 h-12 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded-full flex items-center justify-center`}>
                <BookOpen className={`${isDark ? 'text-brand-yellow' : 'text-brand-black'} w-6 h-6`} />
              </div>
              <div>
                <div className={`text-xs ${textMuted} font-bold mb-1`}>
                  {lang === 'en' ? 'Field' : '分野'}
                </div>
                <div className="font-bold text-base">
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
                <span className="w-2 h-2 rounded-full bg-brand-pink"></span>
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