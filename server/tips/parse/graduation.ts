/** 自己判定 (HTW0001000): graduation requirement check (JP/EN). Rows use rowspans. */
import { load, clean, num } from './util';

const ROMAN = /^(I|II|III|IV|V|VI|VII|VIII)$/; // NFKC folds Ⅳ to IV
const isNum = (s: string) => /^-?\d+(\.\d+)?$/.test(s);

export function parse(html: string) {
  const $ = load(html);
  const table = $('table').filter((_, t) => $(t).find('th.hantei-head').length > 0).last();
  const groups: { section: string; name: string; items: { name: string; required: number | null; earned: number | null; inProgress: number | null; shortfall: number | null }[] }[] = [];
  let total: { required: number | null; earned: number | null; inProgress: number | null; shortfall: number | null } | null = null;
  let subgroup = '';
  table.find('tr').slice(1).each((_, tr) => {
    const isTotal = $(tr).children('th').length > 0;
    const cells = $(tr).children('td,th').toArray().map(c => clean($(c).text())).filter((v, i, a) => v || i < a.length);
    const texts = cells.filter(Boolean);
    if (!texts.length) return;
    const nums = texts.slice(-4);
    const hasNums = nums.length === 4 && nums.every(isNum);
    if (isTotal && hasNums) {
      total = { required: num(nums[0]), earned: num(nums[1]), inProgress: num(nums[2]), shortfall: num(nums[3]) };
      return;
    }
    let labels = hasNums ? texts.slice(0, -4) : texts;
    if (ROMAN.test(labels[0] ?? '')) {
      groups.push({ section: labels[0], name: labels[1] ?? '', items: [] });
      labels = labels.slice(2);
      subgroup = '';
    }
    const g = groups[groups.length - 1];
    if (!g) return;
    // Section IV rows carry a sub-group ("必修科目") before the line item ("学部共通科目").
    if (labels.length === 2) subgroup = labels[0];
    const leaf = labels[labels.length - 1] ?? '';
    const name = labels.length === 2 || (subgroup && g.section === 'IV') ? `${subgroup} · ${leaf}` : leaf;
    if (hasNums) g.items.push({ name: name || g.name, required: num(nums[0]), earned: num(nums[1]), inProgress: num(nums[2]), shortfall: num(nums[3]) });
    else if (g.items.length && leaf) g.items[g.items.length - 1].name += ` / ${leaf}`;
  });
  return { groups, total };
}
