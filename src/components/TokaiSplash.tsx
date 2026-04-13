import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Calendar, GraduationCap, BookOpen, Bell } from 'lucide-react';
import type { Language } from '../App';

import mascot1 from '../assets/mascots/mascot_1_1.png'; // transparent — direct ✓
import mascot2 from '../assets/mascots/mascot_1_2.png'; // white bg — glass card
import mascot3 from '../assets/mascots/mascot_0_2.png'; // user removes bg — direct
import mascot4 from '../assets/mascots/mascot_2_2.png'; // user removes bg — direct

const STORAGE_KEY = 'tokaihub_splash_seen_v1';
const BG = '#0C0C0E'; // shared deep black for all slides

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: 'welcome',
    glowColor: 'rgba(255,215,71,0.22)',
    glowPos: '50% 35%',
    mascot: mascot1,
    stage: 'direct' as const,
    eyebrow: { en: 'Welcome to TokaiHub', jp: 'TokaiHubへようこそ' },
    headline: { en: 'Your campus\nlife, unified.', jp: 'キャンパスライフを\nひとつに。' },
    sub: { en: 'Everything you need at Tokai University — schedule, grades and classes — in one app.', jp: '東海大学に必要なすべてをひとつのアプリで。' },
    chips: null as null | { icon: typeof Calendar; label: { en: string; jp: string } }[],
  },
  {
    id: 'schedule',
    glowColor: 'rgba(129,140,248,0.18)',
    glowPos: '50% 30%',
    mascot: mascot2,
    stage: 'direct' as const,
    eyebrow: { en: 'Smart Schedule', jp: 'スマートスケジュール' },
    headline: { en: 'Never miss\na class.', jp: '授業を\n見逃さない。' },
    sub: { en: 'Daily, weekly and monthly timetable views — always one tap away.', jp: '日別・週別・月別の時間割。いつでもすぐに確認できます。' },
    chips: [
      { icon: Calendar,  label: { en: 'Daily view',  jp: '日別表示' } },
      { icon: BookOpen,  label: { en: 'Weekly',      jp: '週間表示' } },
    ],
  },
  {
    id: 'grades',
    glowColor: 'rgba(52,211,153,0.15)',
    glowPos: '50% 32%',
    mascot: mascot3,
    stage: 'direct' as const,   // user will remove white bg
    eyebrow: { en: 'Academic Insights', jp: 'アカデミックインサイト' },
    headline: { en: 'Track your\nprogress.', jp: '学習状況を\n把握しよう。' },
    sub: { en: 'Monitor your cumulative GPA, credits and semester standing — always in sync.', jp: '累積GPA・単位数・学期成績をリアルタイムで管理。' },
    chips: [
      { icon: GraduationCap, label: { en: 'GPA tracker', jp: 'GPA追跡' } },
      { icon: BookOpen,      label: { en: 'Credits',     jp: '単位管理' } },
    ],
  },
  {
    id: 'notify',
    glowColor: 'rgba(251,146,60,0.16)',
    glowPos: '50% 32%',
    mascot: mascot4,
    stage: 'direct' as const,   // user will remove white bg
    eyebrow: { en: 'Stay in the loop', jp: '最新情報をキャッチ' },
    headline: { en: 'Campus news\nat your fingertips.', jp: 'キャンパスニュースを\nリアルタイムで。' },
    sub: { en: 'Deadlines, announcements and club updates — delivered right to your dashboard.', jp: '課題、お知らせ、クラブ情報をダッシュボードに届けます。' },
    chips: [
      { icon: Bell,      label: { en: 'Announcements', jp: 'お知らせ' } },
      { icon: Calendar,  label: { en: 'Deadlines',     jp: '課題管理' } },
    ],
  },
  {
    id: 'start',
    glowColor: 'rgba(255,215,71,0.26)',
    glowPos: '50% 38%',
    mascot: mascot1,
    stage: 'direct' as const,
    eyebrow: { en: "You're all set", jp: '準備完了' },
    headline: { en: "Let's get\nstarted.", jp: 'さあ、\nはじめよう。' },
    sub: { en: 'Sign in with your Tokai University account and take control of your campus life.', jp: '東海大学のアカウントでサインインして、スマートなキャンパスライフを。' },
    chips: null,
  },
];

// ─── Mascot rendering ─────────────────────────────────────────────────────────

function Mascot({ slide }: { slide: typeof SLIDES[0] }) {
  if (slide.stage === 'glass') {
    // Glass card hides white bg mascot cleanly on dark background
    return (
      <div
        style={{
          width: '78%',
          aspectRatio: '1',
          borderRadius: 36,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={slide.mascot}
          alt="mascot"
          draggable={false}
          style={{ width: '88%', height: '88%', objectFit: 'contain', mixBlendMode: 'luminosity', opacity: 0.92 }}
        />
      </div>
    );
  }

  // Direct — transparent PNG or user-removed bg
  return (
    <img
      src={slide.mascot}
      alt="mascot"
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        filter: 'drop-shadow(0 28px 56px rgba(0,0,0,0.5))',
      }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TokaiSplashProps {
  lang: Language;
  isDark: boolean;
  onDone: () => void;
}

export default function TokaiSplash({ lang, isDark: _isDark, onDone }: TokaiSplashProps) {
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
    if (dx < -55 && !isLast)  { setDir(1);  setIdx(i => i + 1); }
    if (dx >  55 && idx > 0)  { setDir(-1); setIdx(i => i - 1); }
  };

  const spring = { type: 'spring' as const, stiffness: 440, damping: 30, mass: 0.55 };
  const fastSpring = { type: 'spring' as const, stiffness: 480, damping: 32 };

  const variants = {
    enter:  (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0   }),
    center: { x: 0,  opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? '-60%' : '60%',  opacity: 0, scale: 0.96 }),
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden flex flex-col select-none"
      style={{ background: BG }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Glow — morphs between slides */}
      <motion.div
        key={`glow-${slide.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(58% 42% at ${slide.glowPos}, ${slide.glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Top bar */}
      <div
        className="relative z-20 flex items-center justify-between px-6"
        style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top,0px))', paddingBottom: '0.5rem' }}
      >
        <span className="font-bold text-[13px] tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.30)' }}>
          TOKAI<span style={{ color: '#FFD747' }}>HUB</span>
        </span>

        {!isLast && (
          <button
            onClick={() => { markSeen(); onDone(); }}
            className="font-bold text-[11px] uppercase tracking-[0.14em] px-4 py-2"
            style={{ borderRadius: 9999, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.40)' }}
          >
            {lang === 'en' ? 'Skip' : 'スキップ'}
          </button>
        )}
      </div>

      {/* Slides */}
      <AnimatePresence custom={dir} mode="wait">
        <motion.div
          key={slide.id}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={spring}
          className="relative z-10 flex-1 flex flex-col overflow-hidden"
        >
          {/* Mascot */}
          <div className="flex items-center justify-center" style={{ flex: '0 0 54%' }}>
            <motion.div
              initial={{ scale: 0.78, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.04, stiffness: 300, damping: 22, type: 'spring' }}
              style={{
                width: 'min(72vw, 290px)',
                height: 'min(72vw, 290px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mascot slide={slide} />
            </motion.div>
          </div>

          {/* Feature chips */}
          {slide.chips && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.10, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center gap-2 px-6 mb-3"
            >
              {slide.chips.map(chip => {
                const Icon = chip.icon;
                return (
                  <div
                    key={chip.label.en}
                    className="flex items-center gap-1.5 px-3.5 py-2 font-semibold"
                    style={{
                      borderRadius: 9999,
                      background: 'rgba(255,255,255,0.07)',
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: 11,
                      letterSpacing: '0.02em',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon style={{ width: 11, height: 11, color: '#FFD747' }} />
                    {chip.label[lang]}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Text */}
          <div className="flex-1 px-6 pt-2 flex flex-col justify-start">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mb-3"
            >
              <span
                className="inline-block font-bold uppercase tracking-[0.15em] px-3 py-1.5"
                style={{
                  borderRadius: 9999,
                  background: 'rgba(255,215,71,0.12)',
                  color: '#FFD747',
                  fontSize: 10,
                }}
              >
                {slide.eyebrow[lang]}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: 'clamp(34px, 9vw, 52px)',
                fontWeight: 800,
                lineHeight: 1.10,
                letterSpacing: '-0.032em',
                color: '#FFFFFF',
                whiteSpace: 'pre-line',
                marginBottom: '0.85rem',
              }}
            >
              {slide.headline[lang]}
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 14, lineHeight: 1.68, color: 'rgba(255,255,255,0.46)', fontWeight: 500 }}
            >
              {slide.sub[lang]}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar */}
      <div
        className="relative z-20 flex items-center justify-between px-6"
        style={{
          paddingTop: '1.25rem',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom,0px))',
        }}
      >
        {/* Animated dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => goTo(i)}
              animate={{ width: i === idx ? 22 : 7, opacity: i === idx ? 1 : 0.35 }}
              transition={fastSpring}
              style={{
                height: 7,
                borderRadius: 9999,
                background: i === idx ? '#FFD747' : '#FFFFFF',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={advance}
          whileTap={{ scale: 0.91 }}
          layout
          className="flex items-center justify-center gap-2 font-bold"
          style={{
            height: 52,
            paddingLeft: isLast ? 30 : 20,
            paddingRight: isLast ? 30 : 18,
            borderRadius: 9999,
            background: '#FFD747',
            color: '#1A1A1A',
            fontSize: isLast ? 15 : 14,
            letterSpacing: '-0.01em',
            boxShadow: '0 8px 32px rgba(255,215,71,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          {isLast ? (lang === 'en' ? 'Get Started' : 'はじめる') : (lang === 'en' ? 'Next' : '次へ')}
          <ChevronRight style={{ width: 18, height: 18, flexShrink: 0 }} />
        </motion.button>
      </div>
    </div>
  );
}
