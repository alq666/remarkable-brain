import { expect, test } from 'vitest';
import { parsePageOrder, sanitizeSvg } from '../src/sync/render.js';

test('parsePageOrder reads cPages.pages order (formatVersion 2)', () => {
  const content = JSON.stringify({
    formatVersion: 2,
    cPages: { pages: [{ id: 'aaa' }, { id: 'bbb' }, { id: 'ccc' }] },
  });
  expect(parsePageOrder(content)).toEqual(['aaa', 'bbb', 'ccc']);
});

test('parsePageOrder falls back to legacy pages array', () => {
  expect(parsePageOrder(JSON.stringify({ pages: ['p1', 'p2'] }))).toEqual(['p1', 'p2']);
});

test('parsePageOrder returns [] on malformed input', () => {
  expect(parsePageOrder('not json')).toEqual([]);
  expect(parsePageOrder('{}')).toEqual([]);
});

test('sanitizeSvg escapes bare ampersands in notebook text (rmc does not escape)', () => {
  // real-world failure: rmc emitted this text verbatim and rsvg-convert died with
  // "EntityRef: expecting ';'" on the `&A`
  expect(sanitizeSvg('<text x="1" class="bullet">G&A PBP → Ambra</text>')).toBe(
    '<text x="1" class="bullet">G&amp;A PBP → Ambra</text>'
  );
  expect(sanitizeSvg('<text>R&D team</text>')).toBe('<text>R&amp;D team</text>');
});

test('sanitizeSvg leaves well-formed entity references alone', () => {
  const svg = '<text>&amp; &#39; &#x27; &quot; &lt;tag&gt;</text>';
  expect(sanitizeSvg(svg)).toBe(svg);
});

test('sanitizeSvg escapes < inside text content, leaves markup outside untouched', () => {
  expect(sanitizeSvg('<text>a < b, 3<4</text>')).toBe('<text>a &lt; b, 3&lt;4</text>');
  const svg = '<g><text>hi</text><polyline points="1,2"/><!-- note --></g>';
  expect(sanitizeSvg(svg)).toBe(svg);
  // text outside <text> elements is not rmc notebook text; left as-is by design
  expect(sanitizeSvg('a < b')).toBe('a < b');
});

test('sanitizeSvg on an rmc-style page with both hazards', () => {
  const broken = [
    '<?xml version="1.0"?>',
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '\t\t<text x="1" y="2">Q&A <draft</text>',
    '</svg>',
  ].join('\n');
  const fixed = sanitizeSvg(broken);
  expect(fixed).toContain('Q&amp;A &lt;draft</text>');
  expect(fixed.startsWith('<?xml')).toBe(true);
});
