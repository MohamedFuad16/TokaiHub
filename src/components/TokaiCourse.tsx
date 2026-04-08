import React, { useEffect, useState } from 'react';
import { ChevronLeft, Clock, BookOpen, Award, CheckCircle } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { allItems } from '../data';
import { getCourseDetails } from '../lib/api';
import type { CourseItem } from '../lib/types';

// 🔹 Optional: local JP fallback (you can expand this later)
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
        const { overview, evaluation, ...rest } = data;

        setCourse(prev => ({
          ...prev,
          ...rest,

          // ✅ Normalize overview (string → object)
          overview: typeof overview === "string"
            ? { en: overview }
            : overview || prev.overview,

          // ✅ Normalize evaluation
          evaluation: typeof evaluation === "string"
            ? { en: evaluation }
            : evaluation || prev.evaluation,
        }));
      })
      .catch(() => { });
  }, [courseId, localCourse.code]);

  // 🔹 UI TEXT ONLY (no dynamic data here)
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

  // ✅ FINAL OVERVIEW LOGIC
  const overviewText =
    lang === "jp"
      ? fallback?.jp?.overview || course.overview?.jp
      : course.overview?.en;

  const finalOverview =
    overviewText || t[lang].fallbackOverview;

  // ✅ FINAL EVALUATION LOGIC
  const evaluationText =
    lang === "jp"
      ? fallback?.jp?.evaluation || course.evaluation?.jp
      : course.evaluation?.en;

  const finalEvaluation =
    evaluationText || t[lang].fallbackEvaluation;

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
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="pb-12 max-w-4xl w-full mx-auto">

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

            <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] font-bold leading-[1.1] tracking-tight">
              {course.title[lang]}
            </h1>
          </motion.div>

          {/* Grid */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-8 grid grid-cols-2 lg:grid-cols-3 gap-4">

            <div className={`${bgClass} p-5 rounded-3xl`}>
              <Clock className="w-6 h-6 mb-3" />
              <div className={`text-xs ${textMuted} font-bold mb-1`}>
                {lang === 'en' ? 'Time' : '時間'}
              </div>
              <div className="font-bold text-sm">{course.time}</div>
            </div>

            <div className={`${bgClass} p-5 rounded-3xl`}>
              <Award className="w-6 h-6 mb-3" />
              <div className={`text-xs ${textMuted} font-bold mb-1`}>
                {t[lang].credits}
              </div>
              <div className="font-bold text-sm">
                {course.credits || 2} {t[lang].credits}
              </div>
            </div>

            <div className={`${bgClass} p-5 rounded-3xl col-span-2 lg:col-span-1`}>
              <BookOpen className="w-6 h-6 mb-3" />
              <div className={`text-xs ${textMuted} font-bold mb-1`}>
                {lang === 'en' ? 'Field' : '分野'}
              </div>
              <div className="font-bold text-base">
                {t[lang].field}
              </div>
            </div>
          </motion.div>

          {/* Overview */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-8">
            <h3 className="font-bold text-xl mb-3">
              {t[lang].overviewTitle}
            </h3>
            <p className={`${textNormal} p-5 rounded-3xl`}>
              {finalOverview}
            </p>
          </motion.div>

          {/* Evaluation */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-6">
            <h3 className="font-bold text-xl mb-3">
              {t[lang].evalTitle}
            </h3>
            <div className="p-5 rounded-3xl">
              {finalEvaluation}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
});

export default TokaiCourse;