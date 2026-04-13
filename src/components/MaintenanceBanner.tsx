import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Wrench } from 'lucide-react';
import mascotWorking from '../assets/mascots/mascot_0_2.png';
import type { Language } from '../App';

// ─── Config ───────────────────────────────────────────────────────────────────

/** Update this ID to re-show the banner to all users after they've already dismissed it */
const NOTIFICATION_ID = 'maintenance-2026-04-13-v1';
const STORAGE_KEY = `tokaihub_notification_dismissed_${NOTIFICATION_ID}`;

// ─── Copy ─────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    badge: 'Maintenance Notice',
    title: 'Scheduled Maintenance',
    window: 'Tonight  8:00 PM – 12:00 AM JST',
    body: 'TokaiHub will be briefly offline for a few hours tonight. We're polishing things up behind the scenes — thank you for your patience!',
    dismiss: 'Got it!',
  },
  jp: {
    badge: 'メンテナンス予告',
    title: 'メンテナンスのお知らせ',
    window: '本日 20:00 〜 深夜 0:00（JST）',
    body: '本日夜、TokaiHubは数時間のメンテナンスを予定しています。この時間帯はアプリが一時的にご利用いただけない場合がございます。ご不便をおかけして申し訳ございませんが、より快適にご利用いただけるよう努めております。',
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
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const tx = copy[lang];

  // Accent color tokens — yellow for users, blue for admin
  const accent      = isAdmin ? '#3B82F6' : '#FFD747';
  const accentDark  = isAdmin ? '#2563EB' : '#F5C800';
  const accentText  = isAdmin ? 'text-blue-500'  : 'text-brand-black';
  const accentBg    = isAdmin ? 'bg-blue-500'    : 'bg-brand-yellow';
  const accentRing  = isAdmin ? 'ring-blue-500/20'  : 'ring-brand-yellow/20';
  const badgeBg     = isAdmin
    ? (isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600')
    : (isDark ? 'bg-brand-yellow/15 text-brand-yellow' : 'bg-brand-yellow/20 text-brand-black');

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="maintenance-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleDismiss}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md"
          />

          {/* Card */}
          <motion.div
            key="maintenance-modal"
            initial={{ opacity: 0, y: 60, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`
              fixed z-50
              inset-x-4 bottom-8
              sm:inset-auto sm:left-1/2 sm:-translate-x-1/2
              sm:top-1/2 sm:-translate-y-1/2
              sm:w-[380px]
              rounded-[28px] overflow-hidden
              ring-1 ${accentRing}
              ${isDark ? 'bg-gray-900' : 'bg-white'}
              shadow-[0_32px_64px_-8px_rgba(0,0,0,0.4)]
            `}
          >
            {/* Accent bar — matching theme color */}
            <div
              className="h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${accentDark}, ${accent}, ${accentDark})` }}
            />

            {/* Inner padding */}
            <div className="px-6 pt-6 pb-7">

              {/* Header row */}
              <div className="flex items-start justify-between mb-5">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${badgeBg}`}>
                  <Wrench className="w-3 h-3" />
                  {tx.badge}
                </span>
                <button
                  onClick={handleDismiss}
                  aria-label="Dismiss"
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
                    ${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mascot + title row */}
              <div className="flex items-center gap-4 mb-5">
                {/* Floating mascot */}
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="shrink-0"
                >
                  <img
                    src={mascotWorking}
                    alt="TokaiHub Mascot"
                    className="w-[80px] h-[80px] object-contain drop-shadow-sm"
                  />
                </motion.div>

                {/* Title + time pill */}
                <div className="min-w-0">
                  <h2 className={`text-[19px] font-bold tracking-tight leading-tight mb-2 ${isDark ? 'text-white' : 'text-brand-black'}`}>
                    {tx.title}
                  </h2>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                    ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-brand-black'}`}
                  >
                    <Clock className="w-3 h-3 shrink-0" style={{ color: accent }} />
                    <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">{tx.window}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className={`h-px w-full mb-5 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />

              {/* Body */}
              <p className={`text-[13px] leading-relaxed mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {tx.body}
              </p>

              {/* CTA button */}
              <motion.button
                onClick={handleDismiss}
                whileTap={{ scale: 0.96 }}
                className={`w-full py-3.5 rounded-2xl font-bold text-[15px] tracking-tight transition-all active:scale-95
                  ${accentBg} ${accentText}`}
                style={{ boxShadow: `0 8px 24px -4px ${accent}55` }}
              >
                {tx.dismiss}
              </motion.button>

              {/* Footer */}
              <p className={`text-center text-[10px] font-bold mt-4 tracking-widest uppercase
                ${isDark ? 'text-gray-700' : 'text-gray-300'}`}
              >
                TokaiHub v1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
