import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';
import mascotWorking from '../assets/mascots/mascot_0_2.png';
import type { Language } from '../App';

// ─── Config ───────────────────────────────────────────────────────────────────

const NOTIFICATION_ID = 'maintenance-2026-04-13-v1';
const STORAGE_KEY = `tokaihub_notification_dismissed_${NOTIFICATION_ID}`;

// ─── Copy ─────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    eyebrow: 'Maintenance Notice',
    title: 'We\'ll be down\nfor a bit tonight.',
    window: '8:00 PM – 12:00 AM  JST',
    body: 'TokaiHub will be briefly offline for scheduled maintenance. We\'re polishing things behind the scenes — thanks for your patience!',
    dismiss: 'Got it!',
  },
  jp: {
    eyebrow: 'メンテナンス予告',
    title: '本日夜、\nメンテナンスがあります。',
    window: '20:00 〜 深夜 0:00（JST）',
    body: 'TokaiHubは本日夜、数時間のメンテナンスを予定しています。ご不便をおかけして申し訳ございません。より快適なアプリのために取り組んでいます！',
    dismiss: '了解！',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MaintenanceBannerProps {
  lang: Language;
  isDark: boolean;
  isAdmin?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MaintenanceBanner({ lang, isDark, isAdmin }: MaintenanceBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const tx = copy[lang];

  // Yellow for regular users, blue for admin — expressed as raw values
  // so they work both in inline styles and Tailwind classes
  const isProd = !isAdmin;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ── Backdrop ───────────────────────────────────────────────── */}
          <motion.div
            key="maint-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismiss}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* ── Sheet ──────────────────────────────────────────────────── */}
          <motion.div
            key="maint-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            className={`
              fixed z-50 inset-x-0 bottom-0
              sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-8
              sm:w-[420px] sm:pb-0
              rounded-t-[32px] sm:rounded-[32px]
              overflow-hidden
              ${isDark ? 'bg-gray-900' : 'bg-white'}
            `}
          >
            {/* Accent bar */}
            <div
              className="h-[3px] w-full"
              style={{
                background: isProd
                  ? 'linear-gradient(90deg, #F5C800, #FFD747, #F5C800)'
                  : 'linear-gradient(90deg, #2563EB, #3B82F6, #2563EB)',
              }}
            />

            {/* Drag pill */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            </div>

            {/* Content */}
            <div className="px-6 pt-5 pb-2">

              {/* Top row: eyebrow + dismiss */}
              <div className="flex items-center justify-between mb-5">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full"
                  style={{
                    background: isProd ? 'rgba(255,215,71,0.18)' : 'rgba(59,130,246,0.12)',
                    color: isProd ? (isDark ? '#FFD747' : '#7A5C00') : (isDark ? '#60A5FA' : '#2563EB'),
                  }}
                >
                  {tx.eyebrow}
                </span>

                <button
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                    ${isDark ? 'bg-gray-800 text-gray-500 hover:bg-gray-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mascot + Title row */}
              <div className="flex items-end gap-4 mb-5">
                <motion.img
                  src={mascotWorking}
                  alt="TokaiHub Mascot"
                  animate={{ y: [-6, 6, -6] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-[90px] h-[90px] object-contain shrink-0 drop-shadow-lg"
                />

                <div className="min-w-0 pb-1">
                  <h2
                    className="font-bold leading-[1.2] mb-3"
                    style={{ fontSize: '22px', whiteSpace: 'pre-line' }}
                  >
                    {tx.title}
                  </h2>

                  {/* Time pill */}
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl
                      ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                  >
                    <Clock
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: isProd ? '#FFD747' : '#3B82F6' }}
                    />
                    <span className={`text-xs font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      {tx.window}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className={`h-px mb-5 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />

              {/* Body */}
              <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {tx.body}
              </p>

              {/* CTA */}
              <motion.button
                onClick={dismiss}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-bold text-[15px] tracking-tight transition-all active:scale-95"
                style={{
                  background: isProd ? '#FFD747' : '#3B82F6',
                  color: isProd ? '#1A1A1A' : '#FFFFFF',
                  boxShadow: isProd
                    ? '0 8px 24px -4px rgba(255,215,71,0.45)'
                    : '0 8px 24px -4px rgba(59,130,246,0.45)',
                }}
              >
                {tx.dismiss}
              </motion.button>

              {/* Footer */}
              <p className={`text-center text-[10px] font-bold tracking-widest uppercase mt-4
                ${isDark ? 'text-gray-800' : 'text-gray-300'}`}
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
