import React, { useRef } from 'react';
import { useInView } from 'motion/react';
import { Monitor, Users, Shuffle } from 'lucide-react';
import { useTips } from '../lib/useTips';
import type { Language } from '../App';
import type { TipsSyllabus } from '../lib/types';

/**
 * Course delivery (授業形態: 面接 / 遠隔 / …) from the course's TIPS syllabus, as a chip.
 * Uses the same cached syllabus the course page reads, so opening the course is instant.
 * It loads only once on screen, and as a background request (bg=1), because a slot can list a
 * dozen courses and TIPS answers one request at a time: a register click must not wait on chips.
 */
export default function DeliveryChip({ code, year, lang, isDark = false }: { code: string; year?: string | number | null; lang: Language; isDark?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '200px' });
  const syl = useTips<TipsSyllabus>('syllabus', { code, year: year ?? undefined, bg: 1 }, { enabled: seen });
  const d = syl.data?.delivery;
  const label = d ? (lang === 'en' ? d.en || d.jp : d.jp) : '';
  if (!label) return !seen || syl.loading ? <span ref={ref} aria-hidden className={`inline-block h-5 w-16 rounded-full ${isDark ? 'skeleton-dark' : 'skeleton'}`} /> : null;
  const jp = d?.jp ?? '';
  const online = /遠隔|オンライン|オンデマンド/.test(jp);
  const mixed = /併用|ハイブリッド|混合/.test(jp);
  const Icon = mixed ? Shuffle : online ? Monitor : Users;
  // The -700 text shades are unreadable on the dark cards; dark mode uses the -300 shades.
  const cls = mixed ? `bg-purple-500/15 ${isDark ? 'text-purple-300' : 'text-purple-700'}` : online ? `bg-blue-500/15 ${isDark ? 'text-blue-300' : 'text-blue-700'}` : `bg-green-500/15 ${isDark ? 'text-green-300' : 'text-green-700'}`;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}><Icon className="w-3 h-3" />{label}</span>;
}
