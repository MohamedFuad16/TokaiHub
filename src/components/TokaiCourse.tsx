import React from 'react';
import { ChevronLeft, Clock, BookOpen, Award, CheckCircle } from 'lucide-react';
import { ScreenProps } from '../App';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { allItems } from '../data';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiCourse({ lang, settings }: ScreenProps) {
  const navigate = useNavigate();
  const goBack = () => navigate(-1);
  const { id } = useParams();
  const params = { id };
  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const textNormal = isDark ? 'text-gray-300' : 'text-gray-600';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  const courseId = params?.id || 'mon-1-2';
  const course = allItems.find(item => item.id === courseId) || allItems[0];

  const t = {
    en: {
      title: course.title.en,
      code: course.code || "TTK000",
      status: "Confirmed",
      time: course.time,
      credits: `${course.credits || 2} Credits`,
      field: "Information Systems",
      evalTitle: "Evaluation",
      evaluation: course.evaluation?.en || "Attendance/Lab 40% + Report 60%",
      overviewTitle: "Overview",
      overview: course.overview?.en || "Course overview not available."
    },
    jp: {
      title: course.title.jp,
      code: course.code || "TTK000",
      status: "確定",
      time: course.time,
      credits: `${course.credits || 2} 単位`,
      field: "情報システム",
      evalTitle: "評価方法",
      evaluation: course.evaluation?.jp || "出席・実験40%＋レポート60%",
      overviewTitle: "概要",
      overview: course.overview?.jp || "概要は利用できません。"
    }
  };

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 sm:p-6 pt-8 sm:pt-12 lg:pt-8 shrink-0 max-w-4xl w-full mx-auto">
        <div className="font-bold text-2xl tracking-tighter">
          {t[lang].code}
        </div>
        <button 
          onClick={() => setTimeout(goBack, 150)}
          className={`w-12 h-12 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} active:scale-95`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="pb-12 max-w-4xl w-full mx-auto">
          
          {/* Title */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-2 shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-brand-black text-white text-xs font-bold px-3 py-1.5 rounded-full">{t[lang].code}</span>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5"/> {t[lang].status}
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] font-bold leading-[1.1] tracking-tight whitespace-pre-line">
              {t[lang].title}
            </h1>
          </motion.div>

          {/* Details Grid */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-8 grid grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
            <div className={`${bgClass} p-5 rounded-3xl`}>
              <Clock className="w-6 h-6 text-brand-black mb-3" />
              <div className={`text-xs ${textMuted} font-bold mb-1`}>Time</div>
              <div className="font-bold text-sm">{t[lang].time}</div>
            </div>
            <div className={`${bgClass} p-5 rounded-3xl`}>
              <Award className="w-6 h-6 text-brand-black mb-3" />
              <div className={`text-xs ${textMuted} font-bold mb-1`}>Credits</div>
              <div className="font-bold text-sm">{t[lang].credits}</div>
            </div>
            <div className={`${bgClass} p-5 rounded-3xl col-span-2 lg:col-span-1 flex items-center gap-4`}>
              <div className={`w-12 h-12 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded-full flex items-center justify-center shrink-0`}>
                <BookOpen className="w-6 h-6 text-brand-black" />
              </div>
              <div>
                <div className={`text-xs ${textMuted} font-bold mb-1`}>Field</div>
                <div className="font-bold text-base">{t[lang].field}</div>
              </div>
            </div>
          </motion.div>

          {/* Overview & Evaluation — side by side on desktop */}
          <motion.div variants={itemVariants} className="px-4 sm:px-6 mt-8 lg:grid lg:grid-cols-2 lg:gap-8 space-y-8 lg:space-y-0">
            <div>
              <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-pink"></span>
                {t[lang].overviewTitle}
              </h3>
              <p className={`${textNormal} text-base leading-relaxed font-medium ${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-5 rounded-3xl`}>
                {t[lang].overview}
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
                {t[lang].evalTitle}
              </h3>
              <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-6 rounded-3xl space-y-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]`}>
                {course.evaluationBreakdown?.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span className={textNormal}>{item.label[lang]}</span>
                      <span className="text-brand-black dark:text-white">{item.percentage}%</span>
                    </div>
                    <div className={`w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-3 overflow-hidden shadow-inner`}>
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${item.percentage}%` }} 
                        transition={{ duration: 1, delay: 0.2 + (idx * 0.1), ease: [0.22, 1, 0.36, 1] }} 
                        className={`${item.color} h-full rounded-full`}
                      />
                    </div>
                  </div>
                ))}
                {(!course.evaluationBreakdown || course.evaluationBreakdown.length === 0) && (
                  <div className="text-sm font-medium">{t[lang].evaluation}</div>
                )}
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
