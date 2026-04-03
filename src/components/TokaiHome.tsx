import React, { useState } from 'react';
import { Menu, BookOpen, ArrowRight, Calendar, Users, Clock, MapPin, User, Bell, ChevronRight, X, ChevronLeft, GraduationCap, Target, AlertCircle } from 'lucide-react';
import { ScreenProps } from '../App';
import SharedMenu from './SharedMenu';
import { motion, AnimatePresence } from 'motion/react';
import { allItems, getClassesForDate } from '../data';

const t = {
  en: {
    welcome: "Welcome,\nMohamed",
    studentId: "ID: 4CJE1108",
    all: "All",
    classes: "Classes",
    events: "Events",
    clubs: "Clubs",
    allActivities: "All Activities",
    todays: "Today's",
    schedule: "Schedule",
    classesToday: "Classes Today",
    noItems: "No items found for this category.",
    otherInfo: "Campus News",
    gpa: "Cumulative GPA",
    lastSem: "Last Sem: 3.73",
    credits: "Total Credits",
    onTrack: "On Track",
    deadlines: "Upcoming Deadlines",
    dueIn: "Due in",
    days: "days"
  },
  jp: {
    welcome: "ようこそ、\nモハメドさん",
    studentId: "学籍番号: 4CJE1108",
    all: "すべて",
    classes: "授業",
    events: "イベント",
    clubs: "クラブ",
    allActivities: "すべてのアクティビティ",
    todays: "今日の",
    schedule: "スケジュール",
    classesToday: "今日の授業",
    noItems: "このカテゴリのアイテムはありません。",
    otherInfo: "キャンパスニュース",
    gpa: "累積 GPA",
    lastSem: "前学期: 3.73",
    credits: "修得単位数",
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
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiHome({ onNavigate, lang, setLang, settings }: ScreenProps) {
  const [activeCategory, setActiveCategory] = useState('Classes');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
  const [isCalendarSheetOpen, setIsCalendarSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const filteredItems = activeCategory === 'All'
    ? allItems
    : allItems.filter(item => item.type === activeCategory);

  const isDark = settings.isDarkMode;
  const cardBg = isDark ? 'bg-gray-800' : 'bg-brand-gray';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className="h-full relative flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pt-12 shrink-0">
        <div className="font-bold text-xl tracking-tighter leading-none">
          TOKAI<br/>HUB
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className={`w-12 h-12 rounded-full border ${borderClass} flex items-center justify-center transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="pb-32">
          
          {/* Title */}
          <motion.div variants={itemVariants} className="px-6 mt-2">
            <h1 className="text-[40px] font-bold leading-[1.1] tracking-tight whitespace-pre-line">
              {t[lang].welcome}
            </h1>
            <p className={`${textMuted} font-bold mt-2`}>{t[lang].studentId}</p>
          </motion.div>

          {/* Academic Overview (GPA & Credits) */}
          <motion.div variants={itemVariants} className="px-6 mt-8 grid grid-cols-2 gap-4">
            <div className={`p-5 rounded-[28px] ${cardBg} shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className={`w-4 h-4 ${textMuted}`} />
                <div className={`text-xs font-bold ${textMuted}`}>{t[lang].gpa}</div>
              </div>
              <div className="text-4xl font-bold tracking-tight">3.66</div>
              <div className="text-xs font-bold text-green-500 mt-2 bg-green-500/10 inline-block px-2 py-1 rounded-md">
                {t[lang].lastSem}
              </div>
            </div>
            <div className={`p-5 rounded-[28px] ${cardBg} shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className={`w-4 h-4 ${textMuted}`} />
                <div className={`text-xs font-bold ${textMuted}`}>{lang === 'en' ? 'Credits (5th Sem)' : '履修単位数 (5セメ)'}</div>
              </div>
              <div className="text-4xl font-bold tracking-tight">
                {allItems.filter(item => item.type === 'Classes').reduce((acc, curr) => acc + (curr.credits || 0), 0)}
              </div>
              <div className={`text-xs font-bold mt-2 inline-block px-2 py-1 rounded-md ${isDark ? 'text-blue-400 bg-blue-500/20' : 'text-blue-600 bg-blue-100'}`}>
                {lang === 'en' ? 'Selected' : '履修中'}
              </div>
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div variants={itemVariants} className="flex gap-4 px-6 mt-10 overflow-x-auto no-scrollbar pb-4 relative">
            {['All', 'Classes', 'Events', 'Clubs'].map(cat => {
              const catLabel = cat === 'All' ? t[lang].all : cat === 'Classes' ? t[lang].classes : cat === 'Events' ? t[lang].events : t[lang].clubs;
              return (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition-all duration-75 active:scale-95 ${
                    activeCategory === cat 
                      ? 'text-white' 
                      : `border ${borderClass} shadow-[0_2px_5px_rgba(0,0,0,0.05)] active:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] ${isDark ? 'hover:bg-gray-800 bg-gray-900' : 'hover:bg-gray-50 bg-white'}`
                  }`}
                >
                  {activeCategory === cat && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-brand-black rounded-full shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]"
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {activeCategory === cat && <span className="w-2 h-2 rounded-full bg-brand-yellow shadow-[0_0_4px_rgba(250,204,21,0.8)]"></span>}
                    {catLabel}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* Collections Title */}
          <motion.div variants={itemVariants} className="px-6 mt-4 flex items-center gap-2">
            <h2 className="text-xl font-bold">
              {activeCategory === 'All' ? t[lang].allActivities : `${t[lang].todays} ${activeCategory === 'Classes' ? t[lang].classes : activeCategory === 'Events' ? t[lang].events : t[lang].clubs}`}
            </h2>
            <ArrowRight className="w-5 h-5" />
          </motion.div>

          {/* Horizontal Cards */}
          <motion.div variants={itemVariants} className="flex gap-6 px-6 mt-2 overflow-x-auto overflow-y-visible no-scrollbar py-6 snap-x snap-mandatory">
            {filteredItems.length > 0 ? filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.id}
                  onClick={() => setTimeout(() => onNavigate(item.action as Screen, { id: item.id }), 150)}
                  className="w-[280px] h-[320px] shrink-0 snap-center bg-[#1e1e20] rounded-[32px] p-3.5 flex flex-col gap-3 relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_10px_25px_rgba(0,0,0,0.15),inset_0_0_2px_rgba(0,0,0,0.8)] border border-white/5"
                >
                  {/* Screen Layer (Top ~60%) */}
                  <div className="relative w-full flex-1 rounded-[20px] overflow-hidden bg-[#0a0a0c] shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_-1px_2px_rgba(0,0,0,0.5)]">
                    {/* Image / Neon Content */}
                    <img 
                      src={item.image} 
                      alt="Course visual" 
                      className="absolute inset-0 w-full h-full object-cover opacity-70 saturate-150 contrast-125"
                    />
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                    
                    {/* Content inside screen */}
                    <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${item.color} text-brand-black shadow-sm`}>
                          {item.time}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {item.title[lang]}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Buttons (Bottom) */}
                  <div className="flex gap-[1px] h-[72px] shrink-0 bg-[#0a0a0c] rounded-[18px] p-[1px] shadow-[0_1px_1px_rgba(255,255,255,0.05)]">
                    <div className="flex-1 bg-[#1e1e20] rounded-l-[17px] rounded-r-[4px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_3px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center hover:bg-[#222224] active:bg-[#18181a] active:shadow-[inset_4px_6px_10px_rgba(0,0,0,0.6),inset_-2px_-2px_4px_rgba(255,255,255,0.02)] transition-all duration-75 group">
                      <div className="flex flex-col items-center gap-1.5 group-active:translate-y-[2px] group-active:opacity-60 transition-all duration-75 w-full">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate w-full text-center px-1">{item.location[lang]}</span>
                      </div>
                    </div>
                    <div className="flex-1 bg-[#1e1e20] rounded-[4px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_3px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center hover:bg-[#222224] active:bg-[#18181a] active:shadow-[inset_4px_6px_10px_rgba(0,0,0,0.6),inset_-2px_-2px_4px_rgba(255,255,255,0.02)] transition-all duration-75 group">
                      <div className="flex flex-col items-center gap-1.5 group-active:translate-y-[2px] group-active:opacity-60 transition-all duration-75 w-full">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate w-full text-center px-1">{item.teacher[lang]}</span>
                      </div>
                    </div>
                    <div 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setTimeout(() => onNavigate(item.action as Screen, { id: item.id }), 150); 
                      }}
                      className="flex-1 bg-[#1e1e20] rounded-r-[17px] rounded-l-[4px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_3px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center hover:bg-[#222224] active:bg-[#18181a] active:shadow-[inset_4px_6px_10px_rgba(0,0,0,0.6),inset_-2px_-2px_4px_rgba(255,255,255,0.02)] transition-all duration-75 group"
                    >
                      <div className="flex flex-col items-center gap-1.5 group-active:translate-y-[2px] group-active:opacity-60 transition-all duration-75 w-full">
                        <Icon className="w-5 h-5 text-white" />
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">Open</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className={`${textMuted} font-medium py-8`}>{t[lang].noItems}</div>
            )}
          </motion.div>

          {/* Deadlines Section */}
          <motion.div variants={itemVariants} className="px-6 mt-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-brand-yellow" />
              {t[lang].deadlines}
            </h2>
            <div className="space-y-3">
              {deadlines.map(deadline => (
                <div key={deadline.id} onClick={() => setTimeout(() => onNavigate('assignments'), 150)} className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} flex items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform`}>
                  <div>
                    <h3 className="font-bold text-sm">{deadline.title[lang]}</h3>
                    <p className={`text-xs ${textMuted} mt-1`}>{deadline.course[lang]}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl ${deadline.color} text-brand-black font-bold text-xs shadow-sm`}>
                    {t[lang].dueIn} {deadline.daysLeft} {t[lang].days}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Other Information Section */}
          <motion.div variants={itemVariants} className="px-6 mt-4">
            <h2 className="text-xl font-bold mb-4">{t[lang].otherInfo}</h2>
            <div className="space-y-3">
              <div className={`${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors`}>
                <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-brand-black" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{lang === 'en' ? 'Tuition Fee Deadline' : '授業料納入期限について'}</h3>
                  <p className={`text-xs ${textMuted} mt-1`}>{lang === 'en' ? 'Due by April 15th' : '4月15日までにお願いします'}</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${textMuted}`} />
              </div>
              <div className={`${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors`}>
                <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-brand-black" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{lang === 'en' ? 'Library Maintenance' : '図書館メンテナンス'}</h3>
                  <p className={`text-xs ${textMuted} mt-1`}>{lang === 'en' ? 'Closed this weekend' : '今週末は閉館します'}</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${textMuted}`} />
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* Floating Schedule Bar */}
      <div className="absolute bottom-8 left-6 right-6 z-20">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setIsScheduleSheetOpen(true)}
          className="bg-brand-black rounded-[40px] p-2 flex items-center justify-between cursor-pointer shadow-2xl hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-4 pl-2">
            <div className="w-12 h-12 bg-brand-yellow rounded-full flex items-center justify-center font-bold text-lg text-brand-black">
              {getClassesForDate(new Date()).length}
            </div>
            <div className="text-white">
              <div className="font-bold text-lg leading-tight">{t[lang].schedule}</div>
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
              transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
              className={`absolute bottom-0 left-0 right-0 ${isDark ? 'bg-gray-900' : 'bg-white'} rounded-t-[40px] z-50 p-6 flex flex-col max-h-[80%]`}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold">{t[lang].classesToday}</h2>
                <button onClick={() => setIsScheduleSheetOpen(false)} className={`w-10 h-10 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-8">
                {getClassesForDate(new Date()).map(cls => (
                  <div key={cls.id} className={`p-4 rounded-3xl ${cls.color} text-brand-black flex gap-4 items-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform`} onClick={() => setTimeout(() => onNavigate('course'), 150)}>
                     <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                       {cls.time.split(' ')[0]}
                     </div>
                     <div>
                       <div className="font-bold text-lg leading-tight">{cls.title[lang]}</div>
                       <div className="text-sm font-medium opacity-80">{cls.location[lang]}</div>
                     </div>
                  </div>
                ))}
                {getClassesForDate(new Date()).length === 0 && (
                  <div className={`${textMuted} font-medium`}>{t[lang].noItems}</div>
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
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute bottom-0 left-0 right-0 ${isDark ? 'bg-gray-900' : 'bg-white'} rounded-t-[40px] z-50 p-6 flex flex-col max-h-[90%]`}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold">{lang === 'en' ? 'Calendar' : 'カレンダー'}</h2>
                <button onClick={() => setIsCalendarSheetOpen(false)} className={`w-10 h-10 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                {/* Calendar UI */}
                <div className="mb-6">
                   <div className="flex justify-between items-center mb-4">
                     <button onClick={handlePrevMonth} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                     <div className="font-bold text-lg">
                       {lang === 'en' 
                         ? currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' }) 
                         : `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月`}
                     </div>
                     <button onClick={handleNextMonth} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="w-5 h-5"/></button>
                   </div>
                   <div className="grid grid-cols-7 gap-2 text-center mb-2">
                     {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className={`text-xs font-bold ${textMuted}`}>{d}</div>)}
                   </div>
                   <div className="grid grid-cols-7 gap-2 text-center">
                     {Array.from({length: firstDayOfMonth}).map((_, i) => <div key={`empty-${i}`} />)}
                     {Array.from({length: daysInMonth}).map((_, i) => {
                       const dateNum = i + 1;
                       const isSelected = selectedDate.getDate() === dateNum && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                       return (
                         <button 
                           key={i} 
                           onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dateNum))}
                           className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? 'bg-brand-black text-white dark:bg-white dark:text-brand-black' : (isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-brand-black')}`}
                         >
                           {dateNum}
                         </button>
                       );
                     })}
                   </div>
                </div>

                {/* Classes for selected date */}
                <h3 className="font-bold text-lg mb-4">
                  {lang === 'en' 
                    ? `Classes on ${selectedDate.toLocaleString('en-US', { month: 'long' })} ${selectedDate.getDate()}` 
                    : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日の授業`}
                </h3>
                <motion.div layout className="relative min-h-[200px]">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={selectedDate.toISOString()}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      {getClassesForDate(selectedDate).map(cls => (
                        <div key={cls.id} className={`p-4 rounded-3xl ${cls.color} text-brand-black flex gap-4 items-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform`} onClick={() => setTimeout(() => onNavigate('course', { id: cls.id }), 150)}>
                           <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                             {cls.time.split(' ')[0]}
                           </div>
                           <div>
                             <div className="font-bold text-lg leading-tight">{cls.title[lang]}</div>
                             <div className="text-sm font-medium opacity-80">{cls.location[lang]}</div>
                           </div>
                        </div>
                      ))}
                      {getClassesForDate(selectedDate).length === 0 && (
                        <div className={`${textMuted} font-medium`}>{t[lang].noItems}</div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
