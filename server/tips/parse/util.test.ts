import { describe, expect, it } from 'vitest';
import { cellText, lines, load } from './util';

describe('text of an HTML fragment', () => {
  // An LMS label: the content sits in two nested divs. The text must come out once.
  const html = '<div id="c"><div class="no-overflow"><div class="no-overflow"><p>First line<br>second</p><p>Third</p></div></div></div>';
  it('cellText reads nested divs once', () => {
    const $ = load(html);
    expect(cellText($, $('#c'))).toBe('First line\nsecond\nThird');
  });
  it('lines reads nested divs once', () => {
    const $ = load(html);
    expect(lines($, $('#c').get(0)).filter(l => l.includes('Third'))).toHaveLength(1);
  });
});
