/**
 * Syllabus text arrives with the line breaks of the form it was typed into ("skills for ICT
 * graduate students,\nwith a focus on"), so printing it as-is breaks sentences mid-line.
 * reflow() joins wrapped lines back into paragraphs and turns ・/• lines into list items.
 */
export type TextBlock = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

const BULLET = /^(?:[・•●○◆◇■□▪*]|[-–]\s|[①-⑳])\s*/;
// Lines that start their own paragraph: numbered items ("1.", "(1)", "1)"), labelled items
// ("「知識・理解」…", "【注意】…"), and a bare address on its own line.
const STARTS_NEW = /^(?:\d{1,2}[.．)）]|[(（]\d{1,2}[)）]|【|「[^」]{1,12}」|https?:\/\/|www\.|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$)/;
// A line ending like this finishes a sentence; anything else may have been wrapped mid-sentence.
const ENDS = /[。．.!?！？:：)）」』】%％]$/;
// A line that ends in an address is a line of its own (contact lists: "name mail@x.jp").
const ENDS_IN_ADDRESS = /(?:https?:\/\/\S+|\S+@\S+\.[A-Za-z]{2,})$/;
const CJK = /[　-ヿ㐀-鿿＀-￯]/;
const join = (a: string, b: string) => (CJK.test(a.slice(-1)) || CJK.test(b[0]) ? a + b : `${a} ${b}`);
/** Rough display width: CJK characters take two columns. */
const width = (s: string) => [...s].reduce((n, ch) => n + (CJK.test(ch) ? 2 : 1), 0);

export function reflow(text: string): TextBlock[] {
  const rawLines = text.replace(/\r/g, '').split('\n').map(l => l.trim());
  // Lines wrapped by the form come close to its width; a clearly shorter line was ended on
  // purpose ("品川キャンパス" / "1423研究室"), so it is not joined to the next one. A text whose
  // longest line is short was typed line by line (an office and a room per teacher).
  const formWidth = Math.max(0, ...rawLines.map(width));
  const wrapped = (line: string) => formWidth >= 60 && !ENDS.test(line) && !ENDS_IN_ADDRESS.test(line) && width(line) >= formWidth * 0.5;
  // An English line that starts in lower case continues the previous one even in a narrow
  // class-plan cell (~35 columns), and even after "vs." or "e.g.".
  const continues = (prev: string, line: string) => !STARTS_NEW.test(line)
    && (wrapped(prev) || (/^[a-z]/.test(line) && !/[。！？!?:：]$/.test(prev) && !ENDS_IN_ADDRESS.test(prev)));
  const blocks: TextBlock[] = [];
  let para = '';
  let list: string[] | null = null;
  let prev = ''; // previous raw line, for continues()
  const flushPara = () => { if (para) blocks.push({ kind: 'p', text: para }); para = ''; };
  const flushList = () => { if (list?.length) blocks.push({ kind: 'ul', items: list }); list = null; };
  for (const line of rawLines) {
    const joins = !!prev && continues(prev, line);
    prev = line;
    if (!line) { flushPara(); flushList(); continue; }
    const bullet = BULLET.exec(line);
    if (bullet) {
      flushPara();
      (list ??= []).push(line.slice(bullet[0].length));
      continue;
    }
    if (list) {
      if (joins) { list[list.length - 1] = join(list[list.length - 1], line); continue; }
      flushList();
    }
    if (para && joins) { para = join(para, line); continue; }
    flushPara();
    para = line;
  }
  flushPara();
  flushList();
  return blocks;
}

/** Pieces of a text with web addresses and e-mail addresses marked, for rendering as links. */
export type TextPiece = { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string };

// Scheme URLs, bare www. hosts, and e-mail addresses. Only ASCII URL characters, so a URL that
// runs straight into Japanese text ("…/support/を参照") stops at the Japanese.
const ADDRESS = /\b(?:https?:\/\/|www\.)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Sentence punctuation that follows an address is not part of it.
const TRAILING = /[.,;:!?'"\]]+$/;

export function linkify(text: string): TextPiece[] {
  const out: TextPiece[] = [];
  let last = 0;
  for (const m of text.matchAll(ADDRESS)) {
    let addr = m[0].replace(TRAILING, '');
    // Keep a closing bracket only when the address opened one ("…/wiki/X_(Y)").
    while (addr.endsWith(')') && (addr.match(/\(/g) ?? []).length < (addr.match(/\)/g) ?? []).length) addr = addr.slice(0, -1).replace(TRAILING, '');
    if (!addr) continue;
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: 'text', text: text.slice(last, start) });
    const email = !/^(?:https?:\/\/|www\.)/i.test(addr);
    out.push({ kind: 'link', text: addr, href: email ? `mailto:${addr}` : /^www\./i.test(addr) ? `https://${addr}` : addr });
    last = start + addr.length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/**
 * The half of a bilingual TIPS value for the UI language: "有(Yes)" → 有 / Yes, "講義科目 Lectures"
 * → 講義科目 / Lectures. Anything else comes back unchanged.
 */
export function pickLang(value: string, lang: 'en' | 'jp'): string {
  const v = value.trim();
  const jp = CJK.source;
  const m = new RegExp(`^(.*${jp}.*?)\\s*[(（]([A-Za-z][^()（）]*)[)）]$`).exec(v)
    ?? new RegExp(`^([^A-Za-z]*${jp}[^A-Za-z]*?)\\s+([A-Za-z].*)$`).exec(v);
  if (!m) return v;
  return lang === 'en' ? m[2].trim() : m[1].trim();
}

/**
 * Weighted parts of a grading rule ("Class Activity: 30%", "中間試験50%・期末試験50%").
 * Returns null unless the parts add up to about 100%, so conditions such as "80% attendance or
 * more" are not drawn as if they were weights.
 */
// Segments that state a grade band or a condition, not a weight ("90%以上でS", "出席率が66%以下").
const NOT_A_WEIGHT = /以上|以下|未満|超|[〜~～]|出席|欠席|attend|absen|\d\s*[%％]\s*[:：]\s*[SABCDE]\b/i;
const NUMBERING = /^\s*(?:\d{1,2}[\s.)）]\s*|[(（]\d{1,2}[)）]\s*|[①-⑳]\s*|[・•*\-–]\s*)/;

export function gradingWeights(text: string): { label: string; pct: number }[] | null {
  const parts: { label: string; pct: number }[] = [];
  const re = /([^%％\d]*?)[\s:：(（=＝]*(\d{1,3}(?:\.\d+)?)\s*[%％]\s*[)）]?/g;
  const clean = (l: string) => l.replace(/^[\s・•*\-–:：、,とおよび及び]+|[\s:：(（=＝、,]+$/g, '').replace(/^(?:and|&)\s+/i, '').trim();
  const take = (seg: string) => {
    if (NOT_A_WEIGHT.test(seg)) return;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(seg))) {
      const label = clean(m[1]);
      const pct = Number(m[2]);
      if (label && label.length <= 40 && pct > 0 && pct <= 100) parts.push({ label, pct });
    }
  };
  for (const line of text.split('\n')) {
    const count = (line.match(/\d\s*[%％]/g) ?? []).length;
    // A line with one weight is one component, even if its description contains commas
    // ("1 グループワークに参加し、他者と関係を築く(50%)").
    if (count === 1 && !NOT_A_WEIGHT.test(line)) {
      const m = /^(.*?)[\s:：(（=＝]*(\d{1,3}(?:\.\d+)?)\s*[%％]\s*[)）]?(.*)$/.exec(line.replace(NUMBERING, ''));
      const label = m ? clean(m[1]) : '';
      if (m && label && label.length <= 60 && Number(m[2]) > 0) { parts.push({ label, pct: Number(m[2]) }); continue; }
    }
    for (const seg of line.split(/[・、，,;；/／]|(?<=[%％)）])\s*(?:と|及び|および|and|\+)\s*/)) take(seg);
  }
  const sum = parts.reduce((a, p) => a + p.pct, 0);
  if (parts.length === 0 || sum < 95 || sum > 105) return null;
  return parts;
}

/** The grading text without lines that only state a weight (the chart already shows those). */
export function withoutWeightLines(text: string) {
  return text.split('\n').filter(line => {
    const rest = line.replace(/[^%％\n]*?[\s:：(（=＝]*\d{1,3}(?:\.\d+)?\s*[%％]\s*[)）]?/g, '').replace(/[\s・,、，;；/／.。]/g, '');
    return !(rest === '' && /\d\s*[%％]/.test(line));
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
