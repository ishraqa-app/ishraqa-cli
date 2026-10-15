import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SeededRandom, shuffle, quoteOfTheDay, dayNumber, englishOf, BUNDLED_COUNT } from '../src/quote.js';

// Reference values produced by the app's own runtime.
test('seeded generator matches the app bit for bit', () => {
  const r = new SeededRandom(7);
  assert.deepEqual([0, 0, 0, 0, 0].map(() => r.nextInt(1000)), [420, 637, 278, 549, 706]);
  assert.deepEqual([0, 0, 0].map(() => r.nextInt(1 << 20)), [450910, 1029866, 289559]);
});

test('fixed-seed shuffle matches the app order', () => {
  const ids = Array.from({ length: 276 }, (_, i) => i + 1);
  const s = shuffle(ids, new SeededRandom(2025));
  assert.deepEqual(s.slice(0, 5), [258, 133, 131, 226, 197]);
  assert.deepEqual(s.slice(-3), [274, 255, 109]);
  assert.equal(new Set(s).size, 276);
  assert.equal(ids[0], 1, 'input not mutated');
});

test('quote of the day matches the app for known dates', () => {
  assert.equal(BUNDLED_COUNT, 276);
  for (const [y, m, d, id] of [
    [2026, 10, 15, 269],
    [2026, 1, 1, 210],
    [2027, 3, 9, 185],
  ]) {
    assert.equal(quoteOfTheDay([], new Date(y, m - 1, d, 23, 59)).id, id, `${y}-${m}-${d}`);
  }
});

test('server text overrides bundled ids; extras are appended', () => {
  const q = quoteOfTheDay([{ id: 269, quote: 'x', is_active: true }], new Date(2026, 9, 15));
  assert.equal(q.quote, 'x');
  const withExtra = quoteOfTheDay([{ id: 400, quote: 'new' }], new Date(2026, 9, 15));
  assert.ok(withExtra.id >= 1);
});

test('deactivated quotes are never picked', () => {
  assert.notEqual(quoteOfTheDay([{ id: 269, is_active: false }], new Date(2026, 9, 15)).id, 269);
});

test('dayNumber uses the local calendar date', () => {
  assert.equal(dayNumber(new Date(1970, 0, 1, 0, 1)), 0);
  assert.equal(dayNumber(new Date(1970, 0, 2, 23, 59)), 1);
});

test('english rendering is available for bundled quotes', () => {
  assert.equal(englishOf(269).text, 'Work in silence, and let your success make the noise.');
  assert.equal(englishOf(999999), null);
});
