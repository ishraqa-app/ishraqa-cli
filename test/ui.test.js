import { test } from 'node:test';
import assert from 'node:assert/strict';
import { width, wrapText, wrapStyled, box, isRtl, pad, stripAnsi, colorLevel, setColorLevel, c } from '../src/ui.js';

test('display width: latin, arabic with harakat, emoji, ansi', () => {
  assert.equal(width('abc'), 3);
  assert.equal(width('إشراقة'), 6);
  assert.equal(width('تعلّمها'), 6, 'shadda is zero-width');
  assert.equal(width('🧠'), 2);
  assert.equal(width('\x1b[1mhi\x1b[22m'), 2);
});

test('direction detection uses the first strong character', () => {
  assert.equal(isRtl('إشراقة يومية'), true);
  assert.equal(isRtl('— حكمة'), true);
  assert.equal(isRtl('Ishraqa إشراقة'), false);
  assert.equal(isRtl('2026 ✨'), false);
});

test('wrap keeps lines within the limit and preserves paragraphs', () => {
  const lines = wrapText('one two three four five six seven\n\nnext', 10);
  for (const l of lines) assert.ok(width(l) <= 10, l);
  assert.ok(lines.includes(''));
  assert.equal(lines.at(-1), 'next');
  const long = wrapText('https://example.com/' + 'a'.repeat(50), 20);
  assert.ok(long.every((l) => width(l) <= 20));
});

test('styled wrap re-applies the style on each line', () => {
  const ls = wrapStyled('\x1b[1mone two three four\x1b[22m', 8);
  assert.ok(ls.length > 1);
  for (const l of ls) assert.ok(l.startsWith('\x1b[1m') && l.endsWith('\x1b[22m'));
});

test('pad aligns by display width', () => {
  assert.equal(pad('ab', 5, 'right'), '   ab');
  assert.equal(pad('ab', 5), 'ab   ');
  assert.equal(pad('ab', 6, 'center'), '  ab  ');
});

test('box: every row has the same width; arabic is right-aligned', () => {
  setColorLevel(0);
  const s = box(['Hello', 'مرحبا بك', null, 'x'.repeat(100)], { title: 'T', width: 40, style: 'round' });
  const rows = s.split('\n');
  for (const r of rows) assert.equal(width(r), 40, JSON.stringify(r));
  assert.match(rows.find((r) => r.includes('مرحبا')), /^│ {2,}مرحبا بك │$/);
  assert.match(rows.find((r) => r.includes('Hello')), /^│ Hello {2,}│$/);
  assert.ok(rows.some((r) => r.startsWith('├')));
  assert.ok(box(['a'], { width: 20, style: 'ascii' }).startsWith('+-'));
});

test('colour honours NO_COLOR, FORCE_COLOR and non-TTY', () => {
  assert.equal(colorLevel({ NO_COLOR: '1' }, { isTTY: true }), 0);
  assert.equal(colorLevel({}, { isTTY: false }), 0);
  assert.equal(colorLevel({ FORCE_COLOR: '1' }, { isTTY: false }), 2);
  assert.equal(colorLevel({ COLORTERM: 'truecolor' }, { isTTY: true }), 3);
  setColorLevel(0);
  assert.equal(c.gold('x'), 'x');
  setColorLevel(3);
  assert.equal(stripAnsi(c.gold('x')), 'x');
  assert.notEqual(c.gold('x'), 'x');
  setColorLevel(0);
});
