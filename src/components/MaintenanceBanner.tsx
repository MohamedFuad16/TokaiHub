import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock } from 'lucide-react';
import mascot from '../assets/mascots/mascot_1_2.png';
import type { Language } from '../App';

// ─── Config ───────────────────────────────────────────────────────────────────

const NOTIFICATION_ID = 'maintenance-2026-04-13-v1';
const STORAGE_KEY = `tokaihub_notification_dismissed_${NOTIFICATION_ID}`;

// ─── Copy ─────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    title: 'Maintenance Notice',
    timeLabel: 'Tonight',
    timeValue: '8:00 PM – 12:00 AM JST',
    status: 'Scheduled',
    body: "TokaiHub will be briefly offline tonight for scheduled maintenance. We're polishing things behind the scenes — thanks for your patience!",
    dismiss: 'Got it!',
  },
  jp: {
    title: 'メンテナンス予告',
    timeLabel: '本日',
    timeValue: '20:00 〜 深夜 0:00（JST）',
    status: '予定',
    body: 'TokaiHubは本日夜、数時間のメンテナンスを予定しています。ご不便をおかけして申し訳ございませんが、より快適なアプリのために取り組んでいます！',
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

  // Yellow for regular users, blue for admin
  const accentColor = isAdmin ? 'bg-blue-100' : 'bg-brand-yellow';
  const accentText  = isAdmin ? 'text-blue-900' : 'text-brand-black';
  const btnBg       = isAdmin ? 'bg-blue-500'   : 'bg-brand-black';
  const btnText     = isAdmin ? 'text-white'     : 'text-white';

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop — exactly matches TokaiHome sheet backdrop */}
          <motion.div
            key="maint-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Sheet — exactly matches TokaiHome Classes Today sheet */}
          <motion.div
            key="maint-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.7 }}
            className={`
              absolute bottom-0 left-0 right-0 z-50
              ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
              rounded-t-[40px] p-6 flex flex-col
              lg:max-w-2xl lg:mx-auto lg:rounded-[40px] lg:bottom-8 lg:left-auto lg:right-8
            `}
          >
            {/* Header — title + close button, identical to Classes Today */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-2xl font-bold">{tx.title}</h2>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className={`w-10 h-10 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time row — styled like a class card (same p-5 rounded-[32px] pattern) */}
            <div
              className={`p-5 rounded-[32px] ${accentColor} ${accentText} flex gap-4 items-center mb-4
                shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(255,255,255,0.4)] border border-black/5`}
            >
              {/* Time bubble — same as the time circle in class cards */}
              <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg leading-tight">{tx.timeLabel}</div>
                <div className="text-sm font-medium opacity-80">{tx.timeValue}</div>
              </div>
              {/* Mascot — floated to the right, without any background box */}
              <motion.img
                src={mascot}
                alt="TokaiHub Mascot"
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 object-contain shrink-0"
                style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' }}
              />
            </div>

            {/* Body text */}
            <p className={`text-sm font-medium leading-relaxed mb-6 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {tx.body}
            </p>

            {/* CTA — same pill style as the edit-profile button in the empty state */}
            <motion.button
              onClick={dismiss}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-4 rounded-[22px] ${btnBg} ${btnText} font-bold text-[15px] tracking-tight
                transition-all active:scale-95 hover:brightness-95`}
            >
              {tx.dismiss}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
