import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';
// mascot_1_1 is the transparent-background mascot used across the app
import mascot from '../assets/mascots/mascot_1_1.png';
import type { Language } from '../App';

// ─── Config ───────────────────────────────────────────────────────────────────

const NOTIFICATION_ID = 'maintenance-2026-04-13-v1';
const STORAGE_KEY = `tokaihub_notification_dismissed_${NOTIFICATION_ID}`;

// ─── Copy ─────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    eyebrow: 'Maintenance Notice',
    title: "We'll be down\nfor a bit tonight.",
    window: '8:00 PM – 12:00 AM  JST',
    body: "TokaiHub will be briefly offline for scheduled maintenance. We're polishing things behind the scenes — thanks for your patience!",
    dismiss: 'Got it!',
  },
  jp: {
    eyebrow: 'メンテナンス予告',
    title: '本日夜、\nメンテナンスがあります。',
    window: '20:00 〜 深夜 0:00（JST）',
    body: 'TokaiHubは本日夜、数時間のメンテナンスを予定しています。ご不便をおかけして申し訳ございませんが、より良いアプリのために取り組んでいます！',
    dismiss: '了解！',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface MaintenanceBannerProps {
  lang: Language;
  isDark: boolean;
  isAdmin?: boolean;
}

export default function MaintenanceBanner({ lang, isDark, isAdmin }: MaintenanceBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const tx = copy[lang];
  const isUser = !isAdmin;

  // -- Accent colours --
  const accentHex   = isUser ? '#FFD747' : '#3B82F6';
  const accentShadow = isUser ? 'rgba(255,215,71,0.35)' : 'rgba(59,130,246,0.35)';

  // Badge chip: yellow-tinted for users, blue-tinted for admin
  const badgeBg    = isUser
    ? (isDark ? 'rgba(255,215,71,0.12)' : 'rgba(255,215,71,0.22)')
    : (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.10)');
  const badgeColor = isUser
    ? (isDark ? '#FFD747' : '#8A6500')
    : (isDark ? '#60A5FA' : '#1D4ED8');

  // CTA button: brand-black on yellow for users (matching sidebar active state),
  //             white on blue for admin
  const btnBg   = isUser ? '#1A1A1A' : '#3B82F6';
  const btnText = '#FFFFFF';

  // Card background
  const cardBg = isDark ? '#111113' : '#FFFFFF';
  const pillBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const pillText = isDark ? 'rgba(255,255,255,0.80)' : '#1A1A1A';
  const bodyText = isDark ? 'rgba(255,255,255,0.45)' : '#6B7280';
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const closeBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const closeColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const dragPill = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="maint-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={dismiss}
            className="fixed inset-0 z-50 backdrop-blur-md"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          />

          {/* Sheet */}
          <motion.div
            key="maint-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-10 sm:w-[400px] overflow-hidden"
            style={{
              borderRadius: '30px 30px 0 0',
              background: cardBg,
              ...(typeof window !== 'undefined' && window.innerWidth >= 640 && {
                borderRadius: '30px',
              }),
            }}
          >
            {/* Accent bar */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${accentHex}99, ${accentHex}, ${accentHex}99)` }} />

            {/* Drag pill — mobile only  */}
            <div className="flex justify-center pt-3 pb-0 sm:hidden">
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: dragPill }} />
            </div>

            {/* ── Body ──────────────────────────────────────────── */}
            <div className="px-5 pt-5 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>

              {/* Row 1: eyebrow + close */}
              <div className="flex items-center justify-between mb-6">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-1.5"
                  style={{ borderRadius: 9999, background: badgeBg, color: badgeColor }}
                >
                  {tx.eyebrow}
                </span>

                <button
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className="flex items-center justify-center transition-opacity hover:opacity-70 active:scale-95"
                  style={{ width: 32, height: 32, borderRadius: 9999, background: closeBg, color: closeColor }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </div>

              {/* Row 2: title + mascot side-by-side */}
              <div className="flex items-center gap-1 mb-4">
                {/* Title */}
                <div className="flex-1">
                  <h2
                    className="font-bold"
                    style={{
                      fontSize: 26,
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                      whiteSpace: 'pre-line',
                      color: isDark ? '#FFFFFF' : '#1A1A1A',
                    }}
                  >
                    {tx.title}
                  </h2>
                </div>

                {/* Mascot — no background container */}
                <motion.img
                  src={mascot}
                  alt="TokaiHub Mascot"
                  animate={{ y: [-6, 5, -6] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: 'contain',
                    flexShrink: 0,
                    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.18))',
                  }}
                />
              </div>

              {/* Time pill */}
              <div
                className="inline-flex items-center gap-2 mb-5"
                style={{ background: pillBg, borderRadius: 14, padding: '8px 14px' }}
              >
                <Clock style={{ width: 13, height: 13, color: accentHex, flexShrink: 0 }} />
                <span className="font-bold" style={{ fontSize: 12, color: pillText }}>{tx.window}</span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: dividerColor, marginBottom: 16 }} />

              {/* Body text */}
              <p className="mb-6" style={{ fontSize: 13.5, lineHeight: 1.6, color: bodyText }}>
                {tx.body}
              </p>

              {/* CTA — premium pill button */}
              <motion.button
                onClick={dismiss}
                whileTap={{ scale: 0.97 }}
                className="w-full font-bold flex items-center justify-center"
                style={{
                  height: 56,
                  borderRadius: 18,
                  background: btnBg,
                  color: btnText,
                  fontSize: 16,
                  letterSpacing: '-0.01em',
                  boxShadow: `0 4px 20px ${accentShadow}, 0 1px 3px rgba(0,0,0,0.15)`,
                  border: isUser && !isDark ? `1.5px solid ${accentHex}` : 'none',
                }}
              >
                {tx.dismiss}
              </motion.button>

              {/* Footer */}
              <p
                className="text-center font-bold mt-4 uppercase tracking-widest"
                style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)' }}
              >
                © 2026 Mohamed Fuad™
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
