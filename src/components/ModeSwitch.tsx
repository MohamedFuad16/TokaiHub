import React from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isLmsPath } from '../lib/nav';

/** TIPS | LMS: the two halves of the app. Switching opens that side's home screen. */
export default function ModeSwitch({ isDark, id, compact = false }: { isDark: boolean; id: string; compact?: boolean }) {
  const navigate = useNavigate();
  const lms = isLmsPath(useLocation().pathname);
  const options = [['tips', 'TIPS', '/'], ['lms', 'LMS', '/lms']] as const;
  return (
    <div role="tablist" aria-label="TIPS / LMS" className={`flex p-1 rounded-2xl ${compact ? 'flex-col gap-1' : ''} ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
      {options.map(([key, label, path]) => {
        const on = (key === 'lms') === lms;
        return (
          <button key={key} role="tab" aria-selected={on} onClick={() => !on && navigate(path)}
            className={`relative isolate flex-1 ${compact ? 'h-9 text-[10px]' : 'h-10 text-sm'} rounded-xl font-bold transition-colors ${on ? 'text-brand-black' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {on && <motion.span layoutId={`mode-${id}`} transition={{ type: 'spring', stiffness: 500, damping: 40 }} className="absolute inset-0 -z-10 rounded-xl bg-brand-yellow" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
