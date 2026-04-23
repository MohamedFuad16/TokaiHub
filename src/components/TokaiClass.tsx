import React, { useState, useMemo, useCallback } from 'react';
import { Menu, Check, Search } from 'lucide-react';
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
            const enrolled = isEnrolled(item);
            // Derive a per-card accent colour from the item's color token
            const cardBg = '#1A1D24'; // sleek dark slate
            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                onClick={() => setTimeout(() => navigate(`/${item.action}/${item.id}`), 150)}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full overflow-hidden rounded-[32px] cursor-pointer"
                style={{ background: cardBg, boxShadow: '0 20px 50px -12px rgba(0,0,0,0.35)' }}
              >
                {/* ── Image Section ── */}
                <div className="relative h-[200px] w-full">
                  {/* Shimmer placeholder */}
                  {!loadedImages.has(item.id) && (
                    <div className="absolute inset-0 shimmer-light rounded-t-[32px]" />
                  )}
                  <motion.img
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    src={item.image || mascotIdle}
                    alt={item.title?.[lang] ?? ''}
                    onLoad={() => handleImageLoad(item.id)}
                    className={`h-full w-full object-cover transition-opacity duration-500 ${loadedImages.has(item.id) ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {/* Gradient blending image into card background */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#1A1D24] via-[#1A1D24]/80 via-40% to-transparent pointer-events-none"
                  />

                  {/* Enrolled badge */}
                  {enrolled && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-400 text-brand-black flex items-center gap-1 shadow-md">
                      <Check className="w-2.5 h-2.5" />Enrolled
                    </span>
                  )}

                  {/* Pagination dots */}
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 space-x-1.5 pointer-events-none">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  </div>
                </div>

                {/* ── Content Section ── */}
                <div className="flex flex-col px-5 pb-5 pt-1">

                  {/* Title + Credits pill */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-[18px] font-bold tracking-tight text-white leading-tight line-clamp-2 flex-1">
                      {item.title?.[lang]}
                    </h2>
                    {item.credits != null && (
                      <motion.div
                        whileHover={{ scale: 1.08 }}
                        className="shrink-0 rounded-full bg-black/40 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur-sm"
                      >
                        {item.credits} {lang === 'jp' ? '単位' : 'cr'}
                      </motion.div>
                    )}
                  </div>

                  {/* Teacher as description */}
                  <p className="mb-4 text-[13px] leading-[1.4] text-white/65 line-clamp-1">
                    {item.teacher?.[lang] ?? (lang === 'jp' ? '担当教員未定' : 'Instructor TBD')}
                  </p>

                  {/* Tags: day + time */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {item.time && (
                      <motion.span
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                        className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white transition-colors"
                      >
                        {item.time}
                      </motion.span>
                    )}
                    {item.location?.[lang] && (
                      <motion.span
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                        className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white transition-colors line-clamp-1 max-w-[160px]"
                      >
                        {item.location?.[lang]}
                      </motion.span>
                    )}
                  </div>

                  {/* CTA Button */}
                  <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: '#f9fafb' }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-full bg-white py-3 text-[14px] font-bold text-black transition-all"
                  >
                    {lang === 'jp' ? '詳細を見る' : 'View Course'}
                  </motion.button>

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
