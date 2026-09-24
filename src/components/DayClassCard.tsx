import React from 'react';
import { motion } from 'motion/react';
import type { Language } from '../App';
import type { CourseItem, TipsChange } from '../lib/types';
import { TAP } from './ScreenHeader';

const STATUS = {
  en: { cancelled: 'Cancelled', makeup: 'Make-up', roomChange: 'Room change', cancelledMakeup: 'Cancelled / make-up' },
  jp: { cancelled: '休講', makeup: '補講', roomChange: '教室変更', cancelledMakeup: '休講・補講' },
};

/**
 * A class on a given day (Home's today and calendar sheets, Schedule's month view), in the
 * course's colour, with TIPS's cancellation / make-up / room-change note when there is one.
 */
export const DayClassCard: React.FC<{ item: CourseItem; status?: TipsChange['status']; lang: Language; onOpen: () => void }> = ({ item, status, lang, onOpen }) => (
  <motion.div
    role="button"
    tabIndex={0}
    whileTap={{ scale: 0.98, transition: TAP.transition }}
    onClick={onOpen}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    className={`p-4 rounded-[28px] ${item.color} text-brand-black flex gap-4 items-center cursor-pointer transition-transform shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(255,255,255,0.4)] border border-black/5 hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow`}
  >
    <div className="w-12 h-12 bg-white/40 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0">
      {(item.time ?? '').split(' ')[0] || `P${item.periods?.[0] ?? '?'}`}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-bold text-base leading-tight truncate">{item.title[lang]}</div>
      <div className="text-sm font-medium opacity-70 truncate mt-0.5">{item.location?.[lang]}</div>
      {status && status !== 'normal' && (
        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/80 text-white">{STATUS[lang][status]}</span>
      )}
    </div>
  </motion.div>
);
