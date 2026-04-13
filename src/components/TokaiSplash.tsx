import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Calendar, GraduationCap, BookOpen } from 'lucide-react';
import type { Language } from '../App';

// Mascots
import mascot1 from '../assets/mascots/mascot_1_1.png'; // transparent bg ✓
import mascot2 from '../assets/mascots/mascot_1_2.png'; // white bg (multiply on yellow ✓)
import mascot3 from '../assets/mascots/mascot_0_2.png'; // white bg (yellow circle stage ✓)
import mascot4 from '../assets/mascots/mascot_2_2.png'; // white bg (yellow circle stage ✓)

const STORAGE_KEY = 'tokaihub_splash_seen_v1';

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: 'welcome',
    bg: '#0C0C0E',
    glowColor: '#FFD747',
    accentColor: '#FFD747',
    mascot: mascot1,
    mascotStage: 'none' as const,        // transparent — no container needed
    textColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.50)',
    eyebrowBg: 'rgba(255,255,255,0.08)',
    eyebrowColor: 'rgba(255,255,255,0.55)',
    dotActive: '#FFD747',
    dotInactive: 'rgba(255,255,255,0.18)',
    btnBg: '#FFD747',
    btnText: '#1A1A1A',
    eyebrow: { en: 'Welcome to TokaiHub', jp: 'TokaiHubへようこそ' },
    headline: { en: 'Your campus\nlife, unified.', jp: 'キャンパスライフを\nひとつに。' },
    sub: { en: 'Everything you need at Tokai University — schedule, grades, classes and more.', jp: '東海大学に必要なすべてをひとつのアプリで管理できます。' },
    chips: null,
  },
  {
    id: 'schedule',
    bg: '#FFD747',
    glowColor: '#F5C000',
    accentColor: '#1A1A1A',
    mascot: mascot2,
    mascotStage: 'direct' as const,      // multiply on yellow bg removes white box ✓
    textColor: '#1A1A1A',
    subColor: 'rgba(0,0,0,0.48)',
    eyebrowBg: 'rgba(0,0,0,0.09)',
    eyebrowColor: 'rgba(0,0,0,0.50)',
    dotActive: '#1A1A1A',
    dotInactive: 'rgba(0,0,0,0.18)',
    btnBg: '#1A1A1A',
    btnText: '#FFFFFF',
    eyebrow: { en: 'Smart Schedule', jp: 'スマートスケジュール' },
    headline: { en: 'Never miss\na class.', jp: '授業を\n見逃さない。' },
    sub: { en: 'Daily, weekly and monthly timetable views — always one tap away.', jp: '日別・週別・月別の時間割。いつでもすぐに確認できます。' },
    chips: [
      { icon: Calendar, label: { en: 'Daily View', jp: '日別表示' } },
      { icon: BookOpen, label: { en: 'Weekly', jp: '週間表示' } },
    ],
  },
  {
    id: 'grades',
    bg: '#0F172A',
    glowColor: '#FFD747',
    accentColor: '#FFD747',
    mascot: mascot3,
    mascotStage: 'yellow-circle' as const, // white bg masked by yellow circle ✓
    textColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.48)',
    eyebrowBg: 'rgba(255,255,255,0.08)',
    eyebrowColor: 'rgba(255,255,255,0.55)',
    dotActive: '#FFD747',
    dotInactive: 'rgba(255,255,255,0.18)',
    btnBg: '#FFD747',
    btnText: '#1A1A1A',
    eyebrow: { en: 'Academic Insights', jp: 'アカデミックインサイト' },
    headline: { en: 'Track your\nprogress.', jp: '学習状況を\n把握しよう。' },
    sub: { en: 'Monitor your cumulative GPA, credits and semester standing — always in sync.', jp: '累積GPA、単位数、学期成績をリアルタイムで管理。' },
    chips: [
      { icon: GraduationCap, label: { en: 'GPA Tracker', jp: 'GPA追跡' } },
      { icon: BookOpen,      label: { en: 'Credits',    jp: '単位管理' } },
    ],
  },
  {
    id: 'start',
    bg: '#0C0C0E',
    glowColor: '#FFD747',
    accentColor: '#FFD747',
    mascot: mascot4,
    mascotStage: 'yellow-circle' as const, // covering mascot on yellow circle = no white box ✓
    textColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.50)',
    eyebrowBg: 'rgba(255,255,255,0.08)',
    eyebrowColor: 'rgba(255,255,255,0.55)',
    dotActive: '#FFD747',
    dotInactive: 'rgba(255,255,255,0.18)',
    btnBg: '#FFD747',
    btnText: '#1A1A1A',
    eyebrow: { en: 'Ready to go', jp: '準備完了' },
    headline: { en: "Let's get\nstarted.", jp: 'さあ、\nはじめよう。' },
    sub: { en: 'Sign in with your Tokai University account and take control of your campus life.', jp: '東海大学のアカウントでサインインして、キャンパスライフをスマートに。' },
    chips: null,
  },
];

// ─── Mascot Stage ─────────────────────────────────────────────────────────────

function MascotStage({ slide }: { slide: typeof SLIDES[0] }) {
  const imgBase = "object-contain select-none pointer-events-none";

  if (slide.mascotStage === 'none') {
    // Transparent PNG — render directly, large
    return (
      <img
        src={slide.mascot}
        alt="mascot"
        draggable={false}
        className={imgBase}
        style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.30))' }}
      />
    );
  }

  if (slide.mascotStage === 'direct') {
    // multiply on yellow bg: white of PNG becomes transparent ✓
    return (
      <img
        src={slide.mascot}
        alt="mascot"
        draggable={false}
        className={imgBase}
        style={{ width: '100%', height: '100%', mixBlendMode: 'multiply', filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.12))' }}
      />
    );
  }

  // yellow-circle: round yellow stage — multiply inside turns white → yellow (invisible) ✓
  return (
    <div
      style={{
        width: '82%',
        aspectRatio: '1',
        borderRadius: '50%',
        background: '#FFD747',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(255,215,71,0.30)',
      }}
    >
      <img
        src={slide.mascot}
        alt="mascot"
        draggable={false}
        className={imgBase}
        style={{ width: '90%', height: '90%', mixBlendMode: 'multiply' }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TokaiSplashProps {
  lang: Language;
  isDark: boolean;
  onDone: () => void;
}

export default function TokaiSplash({ lang, isDark, onDone }: TokaiSplashProps) {
  const seen = !!localStorage.getItem(STORAGE_KEY);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const touchX = useRef(0);

  const markSeen = useCallback(() => localStorage.setItem(STORAGE_KEY, 'true'), []);

  if (seen) return null;

  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  const advance = () => {
    if (isLast) { markSeen(); onDone(); return; }
    setDir(1); setIdx(i => i + 1);
  };
  const goTo = (i: number) => { setDir(i > idx ? 1 : -1); setIdx(i); };

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -60 && !isLast)  { setDir(1);  setIdx(i => i + 1); }
    if (dx >  60 && idx > 0)  { setDir(-1); setIdx(i => i - 1); }
  };

  const variants = {
    enter:  (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden flex flex-col"
      style={{
        background: slide.bg,
        transition: 'background 0.55s cubic-bezier(0.22,1,0.36,1)',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Radial glow ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(55% 45% at 50% 38%, ${slide.glowColor}28 0%, transparent 70%)`,
          transition: 'background 0.55s ease',
        }}
      />

      {/* ── Top bar: logo + skip ── */}
      <div
        className="relative z-20 flex items-center justify-between px-6"
        style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.5rem' }}
      >
        {/* Wordmark */}
        <span
          className="font-bold text-[13px] tracking-[0.16em] uppercase"
          style={{ color: slide.eyebrowColor }}
        >
          TOKAI<span style={{ color: slide.accentColor }}>HUB</span>
        </span>

        {!isLast && (
          <button
            onClick={() => { markSeen(); onDone(); }}
            className="font-bold text-[11px] uppercase tracking-[0.14em] px-4 py-2"
            style={{ borderRadius: 9999, background: slide.eyebrowBg, color: slide.eyebrowColor }}
          >
            {lang === 'en' ? 'Skip' : 'スキップ'}
          </button>
        )}
      </div>

      {/* ── Slide content ── */}
      <AnimatePresence custom={dir} mode="wait">
        <motion.div
          key={slide.id}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 310, damping: 33, mass: 0.75 }}
          className="relative z-10 flex-1 flex flex-col overflow-hidden"
        >
          {/* Mascot area — top 55% */}
          <div className="flex items-center justify-center" style={{ flex: '0 0 55%' }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 240, damping: 22 }}
              style={{
                width: 'min(72vw, 300px)',
                height: 'min(72vw, 300px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MascotStage slide={slide} />
            </motion.div>
          </div>

          {/* Feature chips (slides 2 & 3) */}
          {slide.chips && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.4 }}
              className="flex justify-center gap-2 px-6 mb-4"
            >
              {slide.chips.map((chip) => {
                const Icon = chip.icon;
                return (
                  <div
                    key={chip.label.en}
                    className="flex items-center gap-1.5 px-3.5 py-2 font-bold"
                    style={{
                      borderRadius: 9999,
                      background: slide.eyebrowBg,
                      color: slide.eyebrowColor,
                      fontSize: 11,
                      letterSpacing: '0.03em',
                    }}
                  >
                    <Icon style={{ width: 12, height: 12 }} />
                    {chip.label[lang]}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Text block — bottom area */}
          <div className="flex-1 flex flex-col justify-start px-6 pt-2">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.38 }}
              className="mb-3"
            >
              <span
                className="inline-block font-bold uppercase tracking-[0.15em] px-3 py-1.5"
                style={{ borderRadius: 9999, background: slide.eyebrowBg, color: slide.eyebrowColor, fontSize: 10 }}
              >
                {slide.eyebrow[lang]}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: 'clamp(36px, 9.5vw, 54px)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.032em',
                color: slide.textColor,
                whiteSpace: 'pre-line',
                marginBottom: '0.85rem',
              }}
            >
              {slide.headline[lang]}
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 14, lineHeight: 1.65, color: slide.subColor, fontWeight: 500 }}
            >
              {slide.sub[lang]}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom bar: dots + button ── */}
      <div
        className="relative z-20 flex items-center justify-between px-6"
        style={{ paddingTop: '1.25rem', paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => goTo(i)}
              animate={{ width: i === idx ? 24 : 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                height: 8,
                borderRadius: 9999,
                background: i === idx ? slide.dotActive : slide.dotInactive,
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={advance}
          whileTap={{ scale: 0.93 }}
          layout
          className="flex items-center justify-center gap-2 font-bold"
          style={{
            height: 52,
            paddingLeft: isLast ? 32 : 20,
            paddingRight: isLast ? 32 : 18,
            borderRadius: 9999,
            background: slide.btnBg,
            color: slide.btnText,
            fontSize: isLast ? 15 : 14,
            letterSpacing: '-0.01em',
            boxShadow: `0 8px 32px ${slide.btnBg}55`,
            whiteSpace: 'nowrap',
          }}
        >
          {isLast
            ? (lang === 'en' ? 'Get Started' : 'はじめる')
            : (lang === 'en' ? 'Next' : '次へ')}
          <ChevronRight style={{ width: 18, height: 18, flexShrink: 0 }} />
        </motion.button>
      </div>
    </div>
  );
}
