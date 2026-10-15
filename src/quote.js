import { readFileSync } from 'node:fs';

// The daily quote is the same for everyone on the same calendar day. The app
// orders its bundled quotes with a fixed-seed shuffle; this is a bit-exact port
// of that generator (multiply-with-carry over a 64-bit mixed seed) so the CLI
// shows exactly the quote the app shows.

const M64 = (1n << 64n) - 1n;
const M32 = 0xffffffffn;

function mix64(n) {
  n &= M64;
  n = (~n + (n << 21n)) & M64;
  n ^= n >> 24n;
  n = (n * 265n) & M64;
  n ^= n >> 14n;
  n = (n * 21n) & M64;
  n ^= n >> 28n;
  n = (n + (n << 31n)) & M64;
  return n;
}

export class SeededRandom {
  constructor(seed) {
    let s = mix64(BigInt.asUintN(64, BigInt(seed)));
    if (s === 0n) s = 0x5a17n;
    this.lo = s & M32;
    this.hi = s >> 32n;
    for (let i = 0; i < 4; i++) this.#step(); // warm-up
  }
  #step() {
    const st = 0xffffda61n * this.lo + this.hi;
    this.lo = st & M32;
    this.hi = (st >> 32n) & M32;
  }
  nextInt(max) {
    if (!(max > 0) || max > 2 ** 32) throw new RangeError('max');
    if ((max & -max) === max) {
      this.#step();
      return Number(this.lo & BigInt(max - 1));
    }
    let r, res;
    do {
      this.#step();
      r = Number(this.lo);
      res = r % max;
    } while (r - res + max > 2 ** 32);
    return res;
  }
}

export function shuffle(list, random) {
  const a = [...list];
  for (let n = a.length; n > 1; ) {
    const p = random.nextInt(n);
    n -= 1;
    [a[n], a[p]] = [a[p], a[n]];
  }
  return a;
}

/** Quotes shipped inside the app have ids 1..BUNDLED_COUNT, in id order. */
export const BUNDLED_COUNT = 276;
const SEED = 2025;

/** Days since 1970-01-01 for the given *local* calendar date. */
export function dayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

/**
 * Picks the quote of the day.
 * @param {Array<{id:number,is_active?:boolean}>} serverRows rows from the quotes table
 * @param {Date} date local date
 */
export function quoteOfTheDay(serverRows, date = new Date(), bundledCount = BUNDLED_COUNT) {
  const byId = new Map();
  for (let id = 1; id <= bundledCount; id++) byId.set(id, { id });
  const removed = new Set();
  for (const r of serverRows) {
    const id = Number(r.id);
    if (r.is_active === false) {
      removed.add(id);
      byId.delete(id);
      continue;
    }
    byId.set(id, { ...r, id });
  }
  const bundledIds = [];
  for (let id = 1; id <= bundledCount; id++) if (!removed.has(id)) bundledIds.push(id);
  const shuffled = shuffle(bundledIds, new SeededRandom(SEED));
  const extra = [...byId.keys()].filter((id) => id > bundledCount || id < 1).sort((a, b) => a - b);
  const sortedIds = [...byId.keys()].sort((a, b) => a - b);
  if (!sortedIds.length) return null;
  const order = [...shuffled, ...extra].filter((id) => byId.has(id));
  // Morning slot (period 0) of that day.
  const slot = dayNumber(date) * 4;
  const id = order[slot % sortedIds.length];
  return byId.get(id) ?? null;
}

let _en;
/** English rendering of a quote, when the app ships one: { text, author }. */
export function englishOf(id) {
  if (_en === undefined) {
    try {
      _en = JSON.parse(readFileSync(new URL('../data/quotes-en.json', import.meta.url), 'utf8'));
    } catch {
      _en = {};
    }
  }
  const e = _en[String(id)];
  return e ? { text: e[0], author: e[1] } : null;
}
