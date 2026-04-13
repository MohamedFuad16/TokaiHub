import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Wrench } from 'lucide-react';
import mascotWorking from '../assets/mascots/mascot_0_2.png';
import type { Language } from '../App';

// ─── Config ──────────────────────────────────────────────────────────────────

/** Change this ID whenever you want to show a NEW notification (old dismissed ones won't block it) */
const NOTIFICATION_ID = 'maintenance-2026-04-13-v1';
const STORAGE_KEY = `tokaihub_notification_dismissed_${NOTIFICATION_ID}`;

// ─── Copy ─────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    badge: 'Scheduled Maintenance',
    title: 'Heads up! 🔧',
    window: '8:00 PM – 12:00 AM JST tonight',
    body: 'TokaiHub will be undergoing scheduled maintenance for a few hours tonight. The app may be briefly unavailable during this window. We apologize for any inconvenience — we\'re working hard to keep things running smoothly for you!',
    dismiss: 'Got it, thanks!',
  },
  jp: {
    badge: 'メンテナンス予告',
    title: 'お知らせ 🔧',
    window: '本日 20:00 〜 深夜 0:00（JST）',
    body: '本日夜、TokaiHubは数時間のメンテナンスを予定しています。この時間帯にアプリが一時的にご利用いただけない場合がございます。ご不便をおかけして申し訳ございませんが、より快適にご利用いただけるよう鋭意取り組んでおります。',
    dismiss: '了解しました！',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface MaintenanceBannerProps {
  lang: Language;
  isDark: boolean;
}

export default function MaintenanceBanner({ lang, isDark }: MaintenanceBannerProps) {
  const [visible, setVisible] = useState(false);

  // Only show if the user hasn't dismissed this exact notification yet
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const tx = copy[lang];

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
            transition={{ duration: 0.3 }}
            onClick={handleDismiss}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal card */}
          <motion.div
            key="maintenance-modal"
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className={`
              fixed z-50 inset-x-4 bottom-6 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2
              sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2
              sm:w-full sm:max-w-sm
              rounded-3xl shadow-2xl overflow-hidden
              ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-100'}
            `}
          >
            {/* Top accent strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors
                ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pb-6 pt-5 flex flex-col items-center text-center">

              {/* Mascot */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-3"
              >
                <img
                  src={mascotWorking}
                  alt="TokaiHub Mascot"
                  className="w-28 h-28 object-contain drop-shadow-md"
                />
              </motion.div>

              {/* Badge */}
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3
                ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
              >
                <Wrench className="w-3 h-3" />
                {tx.badge}
              </span>

              {/* Title */}
              <h2 className="text-xl font-bold tracking-tight mb-2">{tx.title}</h2>

              {/* Time window pill */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl mb-4
                ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="font-bold text-sm">{tx.window}</span>
              </div>

              {/* Body text */}
              <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {tx.body}
              </p>

              {/* Dismiss button */}
              <motion.button
                onClick={handleDismiss}
                whileTap={{ scale: 0.96 }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
              >
                {tx.dismiss}
              </motion.button>

              {/* Footer note */}
              <p className={`text-[10px] font-medium mt-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
                TokaiHub — Scheduled maintenance notice
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
