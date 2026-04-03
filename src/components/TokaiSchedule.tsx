import React, { useState, useMemo } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, Menu, Clock, MapPin } from 'lucide-react';
import { ScreenProps } from '../App';
import SharedMenu from './SharedMenu';
import { motion } from 'motion/react';
import { getClassesForDate } from '../data';

const t = {
  en: {
    schedule: "Schedule",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    noClasses: "No classes today."
  },
  jp: {
    schedule: "スケジュール",
    daily: "日別",
    weekly: "週別",
    monthly: "月別",
    noClasses: "今日の授業はありません。"
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

export default function TokaiSchedule({ onNavigate, lang, setLang, settings }: ScreenProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Use a single base date for all views to keep them somewhat synced, or separate ones.
  const [baseDate, setBaseDate] = useState(new Date(2026, 3, 8)); // Start at April 8th, 2026
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const isDark = settings.isDarkMode;
  const bgClass = isDark ? 'bg-gray-900' : 'bg-brand-black';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  const handlePrevMonth = () => {
    setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, baseDate.getDate()));
  };

  const handleNextMonth = () => {
    setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, baseDate.getDate()));
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(baseDate.getFullYear(), baseDate.getMonth());
  const firstDay = getFirstDayOfMonth(baseDate.getFullYear(), baseDate.getMonth());
  const monthName = baseDate.toLocaleString('en-US', { month: 'long' });
  const year = baseDate.getFullYear();

  // Daily View Data
  const dailyDates = useMemo(() => {
    const dates = [];
    for (let i = -2; i <= 2; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [baseDate]);

  const dailyClasses = useMemo(() => getClassesForDate(baseDate), [baseDate]);

  // Weekly View Data
  const weeklyDates = useMemo(() => {
    const dates = [];
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(baseDate.getDate() - baseDate.getDay() + 1 + (currentWeekOffset * 7)); // Start on Monday
    for (let i = 0; i < 5; i++) { // Mon-Fri
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [baseDate, currentWeekOffset]);

  const daysOfWeekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysOfWeekJp = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const shortDaysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shortDaysOfWeekJp = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pt-12 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className={`w-10 h-10 rounded-full border ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} flex items-center justify-center transition-colors`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-[28px] font-bold tracking-tight">{t[lang].schedule}</h1>
        </div>
      </header>

      {/* Toggle Daily/Weekly/Monthly */}
      <div className="px-6 mb-4">
        <div className={`flex ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full p-1 shadow-inner`}>
          {['daily', 'weekly', 'monthly'].map((v) => (
            <button 
              key={v}
              onClick={() => setView(v as any)} 
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-75 active:scale-95 ${view === v ? (isDark ? 'bg-gray-700 text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)]' : 'bg-white text-brand-black shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)]') : (isDark ? 'text-gray-400 hover:text-white active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)]' : 'text-gray-500 hover:text-brand-black active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)]')}`}
            >
              {t[lang][v as keyof typeof t['en']]}
            </button>
          ))}
        </div>
      </div>

      {/* Dark Container */}
      <div className={`flex-1 ${bgClass} rounded-t-[40px] p-6 pt-8 flex flex-col overflow-y-auto overflow-x-hidden`}>
        <motion.div variants={containerVariants} initial="hidden" animate="show" key={view} className="pb-8">
          
          {view === 'daily' && (
            <>
              {/* Horizontal Date Selector */}
              <motion.div variants={itemVariants} className="flex justify-between gap-2 overflow-x-auto no-scrollbar mb-8 shrink-0">
                {dailyDates.map((d, i) => {
                  const isSelected = d.getDate() === baseDate.getDate() && d.getMonth() === baseDate.getMonth();
                  return (
                    <div 
                      key={i} 
                      onClick={() => setBaseDate(d)}
                      className={`flex flex-col items-center justify-center min-w-[60px] h-[80px] rounded-[24px] cursor-pointer transition-all duration-75 active:scale-95 ${isSelected ? 'bg-brand-yellow text-brand-black shadow-[inset_3px_3px_6px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]' : 'bg-white/10 text-white hover:bg-white/20 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3)]'}`}
                    >
                      <span className="text-sm font-medium mb-1">{lang === 'en' ? shortDaysOfWeekEn[d.getDay()] : shortDaysOfWeekJp[d.getDay()]}</span>
                      <span className="text-xl font-bold">{d.getDate()}</span>
                    </div>
                  );
                })}
              </motion.div>

              {/* Timeline */}
              <div className="space-y-0 relative shrink-0">
                {dailyClasses.length > 0 ? dailyClasses.map((item, i) => (
                  <motion.div variants={itemVariants} key={i} className="flex gap-4 group cursor-pointer" onClick={() => setTimeout(() => onNavigate('course', { id: item.id }), 150)}>
                    {/* Time Column */}
                    <div className="flex flex-col items-center w-16 shrink-0">
                      <span className="text-white font-bold text-sm mt-4">{item.time.split(' ')[0]}</span>
                      {i !== dailyClasses.length - 1 && (
                        <div className="w-0.5 h-full bg-white/20 my-2 rounded-full"></div>
                      )}
                    </div>
                    {/* Event Card */}
                    <div className={`flex-1 ${item.color} rounded-3xl p-5 mb-4 group-hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}>
                      <h3 className="font-bold text-xl text-brand-black leading-tight mb-2">{item.title[lang]}</h3>
                      <div className="flex items-center gap-2 text-brand-black/80 font-medium text-sm">
                        <MapPin className="w-4 h-4" />
                        {item.location[lang]}
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="text-center text-white/50 py-8">{t[lang].noClasses}</div>
                )}
              </div>
            </>
          )}

          {view === 'weekly' && (
            <div className="space-y-6 shrink-0">
              <div className="flex justify-between items-center mb-2">
                <button onClick={() => setCurrentWeekOffset(prev => prev - 1)} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all"><ChevronLeft className="w-5 h-5 text-white"/></button>
                <div className="font-bold text-lg text-white">
                  {lang === 'en' ? `Week of ${weeklyDates[0].toLocaleString('en-US', { month: 'short' })} ${weeklyDates[0].getDate()}` : `${weeklyDates[0].getMonth() + 1}月${weeklyDates[0].getDate()}日の週`}
                </div>
                <button onClick={() => setCurrentWeekOffset(prev => prev + 1)} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all"><ChevronLeft className="w-5 h-5 text-white rotate-180"/></button>
              </div>
              {weeklyDates.map((d, i) => {
                const dayClasses = getClassesForDate(d);
                if (dayClasses.length === 0) return null;
                return (
                  <motion.div variants={itemVariants} key={i} className="bg-white/5 rounded-[32px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    <h3 className="text-white font-bold text-lg mb-4 border-b border-white/10 pb-2">{lang === 'en' ? daysOfWeekEn[d.getDay()] : daysOfWeekJp[d.getDay()]}</h3>
                    <div className="space-y-3">
                      {dayClasses.map((cls, j) => (
                        <div key={j} className={`flex items-center gap-4 ${cls.color} rounded-2xl p-3 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_2px_8px_rgba(0,0,0,0.1)]`} onClick={() => setTimeout(() => onNavigate('course', { id: cls.id }), 150)}>
                          <div className="bg-white/40 rounded-xl px-3 py-1 font-bold text-sm text-brand-black shrink-0 flex items-center gap-1 shadow-sm">
                            <Clock className="w-3 h-3" /> {cls.time.split(' ')[0]}
                          </div>
                          <div className="font-bold text-brand-black truncate">
                            {cls.title[lang]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {view === 'monthly' && (
            <motion.div variants={itemVariants} className="bg-white/5 rounded-[32px] p-6 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <div className="flex justify-between items-center mb-6">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all"><ChevronLeft className="w-5 h-5"/></button>
                <div className="font-bold text-xl">{lang === 'en' ? `${monthName} ${year}` : `${year}年 ${baseDate.getMonth() + 1}月`}</div>
                <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all"><ChevronLeft className="w-5 h-5 rotate-180"/></button>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center mb-4">
                {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-xs font-bold text-white/50">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center">
                {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({length: daysInMonth}).map((_, i) => {
                  const dateNum = i + 1;
                  const currentDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), dateNum);
                  const hasClass = getClassesForDate(currentDate).length > 0;
                  const isSelected = baseDate.getDate() === dateNum;
                  
                  return (
                    <div key={i} className="flex flex-col items-center justify-center h-12">
                      <button 
                        onClick={() => setBaseDate(currentDate)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-75 active:scale-90 ${isSelected ? 'bg-brand-yellow text-brand-black shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-1px_-1px_2px_rgba(255,255,255,0.5)]' : 'hover:bg-white/20 active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]'}`}
                      >
                        {dateNum}
                      </button>
                      {hasClass && <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-brand-pink'}`}></div>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

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
