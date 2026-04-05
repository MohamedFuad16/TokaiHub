import React, { useState } from 'react';
import { Menu, Plus, Calendar as CalendarIcon, BookOpen, ChevronLeft } from 'lucide-react';
import { ScreenProps } from '../App';
import SharedMenu from './SharedMenu';
import { motion } from 'motion/react';

const t = {
  en: {
    assignments: "Assignments",
    addAssignment: "Add Assignment",
    title: "Title",
    course: "Course",
    dueDate: "Due Date",
    description: "Description",
    submit: "Add to Schedule",
    placeholderTitle: "e.g., Lab Report 3",
    placeholderDesc: "Add any notes or requirements...",
    back: "Back"
  },
  jp: {
    assignments: "課題",
    addAssignment: "課題を追加",
    title: "タイトル",
    course: "授業",
    dueDate: "期限",
    description: "説明",
    submit: "スケジュールに追加",
    placeholderTitle: "例：ラボレポート 3",
    placeholderDesc: "メモや要件を追加...",
    back: "戻る"
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiAssignments({ onNavigate, goBack, lang, setLang, settings }: ScreenProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 sm:p-6 pt-8 sm:pt-12 lg:pt-8 shrink-0 max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className={`w-10 h-10 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} lg:hidden`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight">{t[lang].assignments}</h1>
        </div>
        <button 
          onClick={() => setTimeout(goBack, 150)}
          className="w-10 h-10 rounded-full bg-brand-yellow flex items-center justify-center hover:bg-yellow-400 transition-colors active:scale-95 lg:hidden"
        >
          <ChevronLeft className="w-5 h-5 text-brand-black" />
        </button>
      </header>

      {/* Form Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pt-2">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className={`${bgClass} rounded-[40px] p-4 sm:p-6 max-w-3xl w-full mx-auto`}>
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-brand-black text-white rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">{t[lang].addAssignment}</h2>
          </motion.div>

          <motion.form variants={itemVariants} className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0" onSubmit={(e) => { e.preventDefault(); onNavigate('schedule'); }}>
            
            {/* Title — spans full width on desktop */}
            <div className="space-y-2 lg:col-span-2">
              <label className="font-bold text-sm ml-2">{t[lang].title}</label>
              <input 
                type="text" 
                required
                placeholder={t[lang].placeholderTitle}
                className={`w-full ${inputBg} rounded-2xl px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all`}
              />
            </div>

            {/* Course Selection */}
            <div className="space-y-2">
              <label className="font-bold text-sm ml-2">{t[lang].course}</label>
              <div className="relative">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select className={`w-full ${inputBg} rounded-2xl pl-12 pr-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all appearance-none`}>
                  <option>CGとバーチャルリアリティ</option>
                  <option>技術英語</option>
                  <option>クラウドコンピューティング</option>
                  <option>モバイルアプリケーション開発</option>
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <label className="font-bold text-sm ml-2">{t[lang].dueDate}</label>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="date" 
                  required
                  className={`w-full ${inputBg} rounded-2xl pl-12 pr-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all`}
                />
              </div>
            </div>

            {/* Description — spans full width */}
            <div className="space-y-2 lg:col-span-2">
              <label className="font-bold text-sm ml-2">{t[lang].description}</label>
              <textarea 
                rows={4}
                placeholder={t[lang].placeholderDesc}
                className={`w-full ${inputBg} rounded-2xl px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-brand-yellow transition-all resize-none`}
              ></textarea>
            </div>

            {/* Submit Button — spans full width */}
            <button 
              type="submit"
              className="w-full lg:col-span-2 bg-brand-black text-white rounded-full py-4 font-bold text-lg hover:bg-gray-800 transition-colors mt-4 lg:mt-0 shadow-xl"
            >
              {t[lang].submit}
            </button>
          </motion.form>
        </motion.div>
      </div>

      <SharedMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onNavigate={onNavigate} 
        lang={lang} 
        setLang={setLang} 
        settings={settings}
      />
    </div>
  );
}
