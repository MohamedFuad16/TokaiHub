import React, { useMemo } from 'react';
import { ArrowLeft, GraduationCap, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ScreenProps } from '../App';
import { allItems } from '../data';
import type { CourseItem } from '../lib/types';

const DAY_LABELS: Record<number, { en: string; jp: string }> = {
  1: { en: 'Monday', jp: '月曜日' },
  2: { en: 'Tuesday', jp: '火曜日' },
  3: { en: 'Wednesday', jp: '水曜日' },
  4: { en: 'Thursday', jp: '木曜日' },
  5: { en: 'Friday', jp: '金曜日' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export default function TokaiCredits({ lang, settings, userProfile }: ScreenProps) {
  const navigate = useNavigate();
  const isDark = settings.isDarkMode;

  const selectedCourseIds = userProfile?.selectedCourseIds ?? [];
  const selectedCourses = useMemo(() =>
    (allItems as CourseItem[]).filter(item =>
      item.type === 'Classes' &&
      (selectedCourseIds.includes(item.id) || selectedCourseIds.includes(item.code ?? ''))
    ).sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)),
    [selectedCourseIds]
  );

  const totalCredits = selectedCourses.reduce((acc, c) => acc + (c.credits ?? 0), 0);
  const maxCredits = 20;
  const progress = Math.min((totalCredits / maxCredits) * 100, 100);

  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-100';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-gray-50';

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <header
        style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top, 0px))' }}
        className={`px-4 sm:px-6 pb-4 shrink-0 border-b ${borderClass} flex items-center gap-4`}
      >
        <button
          onClick={() => navigate(-1)}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-xl tracking-tight">
            {lang === 'en' ? 'Course Credits' : '履修単位数'}
          </h1>
          <p className={`text-xs font-medium ${textMuted}`}>
            {lang === 'en' ? '5th Semester' : '5セメスター'}
          </p>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="px-4 sm:px-6 pb-12 pt-6 space-y-5"
        >
          {/* Summary card */}
          <motion.div
            variants={itemVariants}
            className={`relative overflow-hidden rounded-3xl p-6 ${isDark ? 'bg-brand-black' : 'bg-brand-black'}`}
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-brand-yellow/10 pointer-events-none" />
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
                  {lang === 'en' ? 'Total Credits' : '合計単位数'}
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-bold text-white tracking-tight leading-none">{totalCredits}</span>
                  <span className="text-gray-500 text-lg font-semibold mb-1">/ {maxCredits}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-brand-yellow/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-brand-yellow" />
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-white/10 mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                className="h-full rounded-full bg-brand-yellow"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs font-medium">
                {selectedCourses.length} {lang === 'en' ? 'courses enrolled' : '科目履修中'}
              </span>
              <span className="text-gray-400 text-xs font-semibold">{Math.round(progress)}%</span>
            </div>
          </motion.div>

          {/* Course list */}
          <motion.div variants={itemVariants}>
            <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${textMuted}`}>
              {lang === 'en' ? 'Enrolled Courses' : '履修科目一覧'}
            </h2>
            {selectedCourses.length === 0 ? (
              <div className={`rounded-3xl p-8 text-center ${cardBg}`}>
                <BookOpen className={`w-10 h-10 mx-auto mb-3 ${textMuted}`} />
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {lang === 'en' ? 'No courses selected' : '科目が選択されていません'}
                </p>
                <p className={`text-sm mt-1 ${textMuted}`}>
                  {lang === 'en' ? 'Add courses in Edit Profile' : 'プロフィール編集で科目を追加してください'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedCourses.map((course, i) => (
                  <motion.div
                    key={course.id}
                    variants={itemVariants}
                    onClick={() => navigate(`/course/${course.id}`)}
                    className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    {/* Color dot */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${course.color ?? 'bg-brand-gray'}`}>
                      <BookOpen className="w-4 h-4 text-brand-black/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-brand-black'}`}>
                        {lang === 'en' ? course.title.en : course.title.jp}
                      </div>
                      <div className={`text-xs font-medium mt-0.5 ${textMuted}`}>
                        {DAY_LABELS[course.dayOfWeek ?? 0]?.[lang] ?? ''}{course.time ? ` · ${course.time}` : ''}
                      </div>
                    </div>
                    <div className={`shrink-0 flex flex-col items-end`}>
                      <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-brand-black'}`}>
                        {course.credits ?? 0}
                      </span>
                      <span className={`text-[10px] font-semibold ${textMuted}`}>
                        {lang === 'en' ? 'cr' : '単位'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Code breakdown */}
          {selectedCourses.length > 0 && (
            <motion.div variants={itemVariants} className={`rounded-3xl p-5 ${cardBg}`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${textMuted}`}>
                {lang === 'en' ? 'Credit Breakdown' : '単位内訳'}
              </h3>
              <div className="space-y-3">
                {selectedCourses.map(course => {
                  const pct = ((course.credits ?? 0) / totalCredits) * 100;
                  return (
                    <div key={course.id}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs font-medium truncate max-w-[70%] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {lang === 'en' ? course.title.en : course.title.jp}
                        </span>
                        <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-brand-black'}`}>
                          {course.credits} {lang === 'en' ? 'cr' : '単位'}
                        </span>
                      </div>
                      <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                          className={`h-full rounded-full ${course.color ?? 'bg-brand-yellow'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
