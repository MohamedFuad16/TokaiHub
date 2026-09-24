import React from 'react';
import { Monitor, Users, Shuffle } from 'lucide-react';
import { useTips } from '../lib/useTips';
import type { Language } from '../App';
import type { TipsSyllabus } from '../lib/types';

/**
 * Course delivery (授業形態: 面接 / 遠隔 / …) from the course's TIPS syllabus, as a chip.
 * Uses the same cached syllabus the course page reads, so opening the course is instant.
 */
export default function DeliveryChip({ code, year, lang }: { code: string; year?: string | number | null; lang: Language }) {
  const syl = useTips<TipsSyllabus>('syllabus', { code, year: year ?? undefined });
  const d = syl.data?.delivery;
  const label = d ? (lang === 'en' ? d.en || d.jp : d.jp) : '';
  if (!label) return syl.loading ? <span className="inline-block h-5 w-16 rounded-full bg-gray-200/60 animate-pulse" /> : null;
  const jp = d?.jp ?? '';
  const online = /遠隔|オンライン|オンデマンド/.test(jp);
  const mixed = /併用|ハイブリッド|混合/.test(jp);
  const Icon = mixed ? Shuffle : online ? Monitor : Users;
  const cls = mixed ? 'bg-purple-500/15 text-purple-700' : online ? 'bg-blue-500/15 text-blue-700' : 'bg-green-500/15 text-green-700';
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}><Icon className="w-3 h-3" />{label}</span>;
}
