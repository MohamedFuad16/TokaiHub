/**
 * Timetable slots from TIPS's slot text ("月2", "Thu1 Thu2"). A module of its own, without the
 * app's image imports, so the bridge can use it too.
 */
const DAY_JP: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
const DAY_EN: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function parseSlots(text: string): { day: number; period: number }[] {
  const out: { day: number; period: number }[] = [];
  for (const m of text.matchAll(/([日月火水木金土])[^\d,\s]*\s*(\d+)/g)) out.push({ day: DAY_JP[m[1]], period: Number(m[2]) });
  if (!out.length) for (const m of text.matchAll(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)[a-z]*\s*(\d+)/gi)) out.push({ day: DAY_EN[m[1].toLowerCase()], period: Number(m[2]) });
  return out;
}
