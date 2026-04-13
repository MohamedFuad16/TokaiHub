import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import type { Language } from '../App';

// Mascots — mix-blend-multiply keeps them clean on any background
import mascotMain   from '../assets/mascots/mascot_1_1.png'; // main full-body mascot
import mascotIdle   from '../assets/mascots/mascot_1_2.png'; // sitting idle
import mascotWork   from '../assets/mascots/mascot_0_2.png'; // working
import mascotCover  from '../assets/mascots/mascot_2_2.png'; // covering / surprised

const STORAGE_KEY = 'tokaihub_splash_seen_v1';

// ─── Slide Definitions ───────────────────────────────────────────────────────

interface Slide {
  id: string;
  bg: string;         // background colour (light-mode card bg)
  bgDark: string;     // dark-mode card bg
  mascot: string;
  mascotBlend: boolean; // use mix-blend-multiply
  eyebrow: { en: string; jp: string };
  headline: { en: string; jp: string };
  sub: { en: string; jp: string };
  accentDot: string;  // progress dot colour
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    bg: '#1A1A1A',
    bgDark: '#1A1A1A',
    mascot: mascotMain,
    mascotBlend: false,
    eyebrow: { en: 'Welcome to TokaiHub', jp: 'TokaiHubへようこそ' },
    headline: { en: 'Your campus\nlife, unified.', jp: 'キャンパスライフを\nひとつに。' },
    sub: {
      en:  'Everything you need at Tokai University — schedule, grades, classes and more — all in one place.',
      jp:  '時間割、成績、授業情報など、東海大学に必要なすべてをひとつのアプリで。',
    },
    accentDot: '#FFD747',
  },
  {
    id: 'schedule',
    bg: '#FFD747',
    bgDark: '#3D2F00',
    mascot: mascotIdle,
    mascotBlend: true,
    eyebrow: { en: 'Smart Schedule', jp: 'スマートスケジュール' },
    headline: { en: 'Never miss\na class.', jp: '授業を\n見逃さない。' },
    sub: {
      en:  'Daily, weekly and monthly schedule views. Your timetable always one swipe away.',
      jp:  '日別・週別・月別の時間割ビュー。いつでもすぐにスケジュールを確認できます。',
    },
    accentDot: '#1A1A1A',
  },
  {
    id: 'grades',
    bg: '#EBF2D9',
    bgDark: '#1E2B10',
    mascot: mascotWork,
    mascotBlend: true,
    eyebrow: { en: 'Academic Insights', jp: 'アカデミックインサイト' },
    headline: { en: 'Track your\nprogress.', jp: '学習状況を\n把握する。' },
    sub: {
      en:  'Monitor your cumulative GPA, credits and semester standing. Stay on track every step of the way.',
      jp:  '累積GPA、単位数、学期ごとの成績を管理。常に自分の位置を把握できます。',
    },
    accentDot: '#1A1A1A',
  },
  {
    id: 'start',
    bg: '#1A1A1A',
    bgDark: '#1A1A1A',
    mascot: mascotCover,
    mascotBlend: false,
    eyebrow: { en: 'Ready to go', jp: '準備完了' },
    headline: { en: "Let's get\nstarted.", jp: 'さあ、\nはじめよう。' },
    sub: {
      en:  'Sign in with your Tokai University account and take control of your campus life.',
      jp:  '東海大学のアカウントでサインインして、キャンパスライフをもっとスマートに。',
    },
    accentDot: '#FFD747',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useLocalStorageOnce(key: string) {
  const [seen] = useState(() => !!localStorage.getItem(key));
  const markSeen = useCallback(() => localStorage.setItem(key, 'true'), [key]);
  return { seen, markSeen };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TokaiSplashProps {
  lang: Language;
  isDark: boolean;
  onDone: () => void;
}

export default function TokaiSplash({ lang, isDark, onDone }: TokaiSplashProps) {
  const { seen, markSeen } = useLocalStorageOnce(STORAGE_KEY);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number>(0);

  if (seen) return null;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const bg = isDark ? slide.bgDark : slide.bg;

  // text colour per slide
  const isDarkSlide = slide.bg === '#1A1A1A';
  const textPrimary = isDarkSlide ? '#FFFFFF' : '#1A1A1A';
  const textSub     = isDarkSlide ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)';
  const eyebrowBg   = isDarkSlide ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const eyebrowText = isDarkSlide ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.50)';

  const goNext = () => {
    if (isLast) { markSeen(); onDone(); return; }
    setDirection(1);
    setIndex(i => i + 1);
  };

  const goTo = (i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  };

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50 && !isLast) { setDirection(1);  setIndex(i => i + 1); }
    if (dx >  50 && index > 0) { setDirection(-1); setIndex(i => i - 1); }
  };

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ background: bg, transition: 'background 0.5s ease' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip button — top right */}
      {!isLast && (
        <button
          onClick={() => { markSeen(); onDone(); }}
          className="absolute top-[calc(1.5rem+env(safe-area-inset-top,0px))] right-5 z-20
                     text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full"
          style={{ background: eyebrowBg, color: eyebrowText }}
        >
          {lang === 'en' ? 'Skip' : 'スキップ'}
        </button>
      )}

      {/* Slide content */}
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.8 }}
          className="absolute inset-0 flex flex-col"
        >
          {/* ── Mascot area ── */}
          <div className="flex-1 flex items-end justify-center pb-4 relative overflow-hidden">
            {/* Subtle radial glow behind mascot */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-20"
              style={{ background: isDarkSlide ? '#FFD747' : '#1A1A1A' }}
            />
            <motion.img
              src={slide.mascot}
              alt="TokaiHub Mascot"
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
              className="relative z-10 w-64 h-64 object-contain"
              style={{
                mixBlendMode: slide.mascotBlend ? 'multiply' : 'normal',
                filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.22))',
              }}
            />
          </div>

          {/* ── Text area ── */}
          <div
            className="shrink-0 px-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"
            style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-[0.16em] px-3 py-1.5 rounded-full mb-4"
                style={{ background: eyebrowBg, color: eyebrowText }}
              >
                {slide.eyebrow[lang]}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="font-bold mb-4"
              style={{
                fontSize: 'clamp(34px, 9vw, 52px)',
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                color: textPrimary,
                whiteSpace: 'pre-line',
              }}
            >
              {slide.headline[lang]}
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="font-medium leading-relaxed"
              style={{ fontSize: 14, color: textSub }}
            >
              {slide.sub[lang]}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom bar: dots + CTA ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))', paddingTop: '1.5rem' }}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className="transition-all rounded-full"
              style={{
                width: i === index ? 24 : 8,
                height: 8,
                background: i === index
                  ? slide.accentDot
                  : isDarkSlide
                    ? 'rgba(255,255,255,0.20)'
                    : 'rgba(0,0,0,0.15)',
              }}
            />
          ))}
        </div>

        {/* CTA button */}
        <motion.button
          onClick={goNext}
          whileTap={{ scale: 0.94 }}
          className="flex items-center gap-2 font-bold rounded-full"
          style={{
            background: slide.accentDot,
            color: isDarkSlide ? '#1A1A1A' : '#FFFFFF',
            paddingLeft: isLast ? 28 : 22,
            paddingRight: isLast ? 28 : 20,
            paddingTop: 14,
            paddingBottom: 14,
            fontSize: isLast ? 15 : 14,
            letterSpacing: '-0.01em',
            boxShadow: `0 8px 28px ${slide.accentDot}55`,
          }}
        >
          {isLast
            ? (lang === 'en' ? 'Get Started' : 'はじめる')
            : (lang === 'en' ? 'Next' : '次へ')}
          <ChevronRight style={{ width: 18, height: 18 }} />
        </motion.button>
      </div>
    </div>
  );
}
