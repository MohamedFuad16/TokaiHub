import React, { useState, useMemo, useCallback } from 'react';
import { Menu, ArrowRight, MapPin, User, Check, Search, Filter, BookOpen } from 'lucide-react';
import { ScreenProps, preloadRoutes } from '../App';
import { useNavigate } from 'react-router-dom';
import SharedMenu from './SharedMenu';
import { motion } from 'motion/react';
import { allItems } from '../data';
import type { CourseItem } from '../lib/types';
import mascotIdle from '../assets/mascots/mascot_1_2.png';

const t = {
  en: {
    classes: "Classes",
    all: "All",
    events: "Events",
    clubs: "Clubs",
    allActivities: "All Activities",
    todays: "Today's",
    noItems: "No items found for this category.",
    searchPlaceholder: "Search courses, teachers...",
  },
  jp: {
    classes: "授業",
    all: "すべて",
    events: "イベント",
    clubs: "クラブ",
    allActivities: "すべてのアクティビティ",
    todays: "今日の",
    noItems: "このカテゴリのアイテムはありません。",
    searchPlaceholder: "授業名、講師で検索...",
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

export default function TokaiClass({ lang, setLang, settings, userProfile }: ScreenProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const isDark = settings.isDarkMode;
  const selectedCourseIds = userProfile?.selectedCourseIds ?? [];
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-100';
  const pageBg = isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900';

  const isEnrolled = useCallback((item: CourseItem) =>
    selectedCourseIds.includes(item.id) || selectedCourseIds.includes(item.code ?? ''),
    [selectedCourseIds]);

  const filteredItems = useMemo(() => {
    let items = allItems as CourseItem[];
    
    if (activeCategory !== 'All') {
      if (activeCategory === 'Classes') {
        items = items.filter(item => item.type === 'Classes' && isEnrolled(item));
      } else {
        items = items.filter(item => item.type === activeCategory);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.title?.[lang]?.toLowerCase().includes(q) || 
        item.teacher?.[lang]?.toLowerCase().includes(q) ||
        item.location?.[lang]?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [activeCategory, searchQuery, isEnrolled, lang]);

  const handleImageLoad = (id: string) => setLoadedImages(prev => new Set(prev).add(id));

  return (
    <div className={`h-full relative flex flex-col ${pageBg}`}>
      {/* Header */}
      <header
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
        className="flex justify-between items-center px-4 sm:px-6 pb-4 shrink-0"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`w-10 h-10 rounded-full border ${borderClass} flex items-center justify-center lg:hidden`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t[lang].classes}</h1>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 sm:px-6 mb-6">
        <div className={`relative flex items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-2xl px-4 py-3 shadow-inner`}>
          <Search className={`w-5 h-5 ${textMuted} mr-3`} />
          <input 
            type="text" 
            placeholder={t[lang].searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 sm:gap-3 px-4 sm:px-6 overflow-x-auto no-scrollbar pb-4 shrink-0">
        {(['All', 'Classes', 'Events', 'Clubs'] as const).map(cat => {
          const catLabel = cat === 'All' ? t[lang].all : cat === 'Classes' ? t[lang].classes : cat === 'Events' ? t[lang].events : t[lang].clubs;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`relative px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 whitespace-nowrap transition-all duration-200 active:scale-95 shrink-0 ${isActive
                ? 'bg-[#0B1F3A] text-white shadow-md'
                : `border ${borderClass} ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabClass"
                  className="absolute inset-0 bg-[#0B1F3A] rounded-full"
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow shadow-[0_0_4px_rgba(250,204,21,0.8)]" />}
                {catLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className="px-4 sm:px-6 pb-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {filteredItems.map((item) => {
            const Icon = item.icon || BookOpen;
            const enrolled = isEnrolled(item);
            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                onClick={() => setTimeout(() => navigate(`/${item.action}/${item.id}`), 150)}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`h-[340px] bg-[#1e1e20] rounded-[32px] p-3.5 flex flex-col gap-3 relative cursor-pointer shadow-xl border ${enrolled ? 'border-green-500/30' : 'border-white/5'}`}
              >
                  {/* Reuse your premium card logic here */}
                  <div className="relative w-full flex-1 rounded-[20px] overflow-hidden bg-[#0a0a0c]">
                    {!loadedImages.has(item.id) && <div className="absolute inset-0 shimmer-light" />}
                    <img
                      src={item.image || mascotIdle}
                      alt=""
                      onLoad={() => handleImageLoad(item.id)}
                      className={`absolute inset-0 w-full h-full object-cover saturate-150 transition-opacity duration-500 ${loadedImages.has(item.id) ? 'opacity-70' : 'opacity-0'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          {enrolled && (
                            <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-green-400 text-brand-black flex items-center gap-1 shadow-sm">
                              <Check className="w-2.5 h-2.5" />Enrolled
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-white/70 bg-black/30 px-2 py-1 rounded-lg backdrop-blur-sm ml-auto">
                            {item.time}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white drop-shadow-md line-clamp-2 uppercase">
                          {item.title?.[lang]}
                        </h3>
                    </div>
                  </div>

                  <div className="flex gap-[1px] h-[70px] shrink-0 bg-[#0a0a0c] rounded-[18px] p-[1px]">
                     <div className="flex-[2] bg-[#1e1e20] rounded-l-[17px] rounded-r-[4px] flex flex-col items-center justify-center px-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 mb-1" />
                        <span className="text-[8px] font-bold text-gray-500 text-center line-clamp-2 uppercase">{item.location?.[lang]}</span>
                     </div>
                     <div className="flex-[1.5] bg-[#1e1e20] rounded-[4px] flex flex-col items-center justify-center px-1">
                        <User className="w-3.5 h-3.5 text-gray-500 mb-1" />
                        <span className="text-[8px] font-bold text-gray-500 text-center line-clamp-2 uppercase">{item.teacher?.[lang]}</span>
                     </div>
                     <div className="flex-1 bg-[#1e1e20] rounded-r-[17px] rounded-l-[4px] flex flex-col items-center justify-center">
                        <Icon className="w-4 h-4 text-white" />
                     </div>
                  </div>
              </motion.div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center text-center gap-4">
              <img src={mascotIdle} alt="" className="w-24 h-24 object-contain opacity-50" />
              <p className={textMuted}>{t[lang].noItems}</p>
            </div>
          )}
        </motion.div>
      </div>

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
