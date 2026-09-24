/**
 * Syllabus text arrives with the line breaks of the form it was typed into ("skills for ICT
 * graduate students,\nwith a focus on"), so printing it as-is breaks sentences mid-line.
 * reflow() joins wrapped lines back into paragraphs and turns ・/• lines into list items.
 */
export type TextBlock = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

const BULLET = /^(?:[・•●○◆◇■□▪*]|[-–]\s|[①-⑳])\s*/;
// A line ending like this finishes a sentence; anything else was wrapped mid-sentence.
const ENDS = /[。．.!?！？:：)）」』】%％]$/;
const CJK = /[　-ヿ㐀-鿿＀-￯]/;
const join = (a: string, b: string) => (CJK.test(a.slice(-1)) || CJK.test(b[0]) ? a + b : `${a} ${b}`);

export function reflow(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let para = '';
  let list: string[] | null = null;
  const flushPara = () => { if (para) blocks.push({ kind: 'p', text: para }); para = ''; };
  const flushList = () => { if (list?.length) blocks.push({ kind: 'ul', items: list }); list = null; };
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    const bullet = BULLET.exec(line);
    if (bullet) { flushPara(); (list ??= []).push(line.slice(bullet[0].length)); continue; }
    if (list) {
      const last = list.length - 1;
      if (!ENDS.test(list[last])) { list[last] = join(list[last], line); continue; }
      flushList();
    }
    if (para && !ENDS.test(para)) para = join(para, line);
    else { flushPara(); para = line; }
  }
  flushPara();
  flushList();
  return blocks;
}

/**
 * Weighted parts of a grading rule ("Class Activity: 30%", "中間試験50%・期末試験50%").
 * Returns null unless the parts add up to about 100%, so conditions such as "80% attendance or
 * more" are not drawn as if they were weights.
 */
export function gradingWeights(text: string): { label: string; pct: number }[] | null {
  const parts: { label: string; pct: number }[] = [];
  for (const seg of text.split(/[\n・、，,;；/／]|(?<=[%％)）])\s*(?:と|及び|および|and|\+)\s*/)) {
    const re = /([^%％\d]*?)[\s:：(（=＝]*(\d{1,3}(?:\.\d+)?)\s*[%％]\s*[)）]?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(seg))) {
      const label = m[1].replace(/^[\s・•*\-–:：、,とおよび及び]+|[\s:：(（=＝]+$/g, '').replace(/^(?:and|&)\s+/i, '').trim();
      const pct = Number(m[2]);
      if (label && label.length <= 40 && pct > 0 && pct <= 100) parts.push({ label, pct });
    }
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
  }).join('\n').trim();
}
