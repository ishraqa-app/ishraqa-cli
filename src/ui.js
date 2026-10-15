// Terminal rendering: colour, display width, word wrap, boxes and RTL alignment.
// Kept dependency-free and pure (except `out`) so it is easy to test.

// ── Colour ──
export function colorLevel(env = process.env, stream = process.stdout) {
  if ('NO_COLOR' in env && env.NO_COLOR !== '') return 0;
  if (env.FORCE_COLOR === '0') return 0;
  if (env.FORCE_COLOR) return env.FORCE_COLOR === '3' ? 3 : 2;
  if (!stream?.isTTY || env.TERM === 'dumb') return 0;
  if (/truecolor|24bit/i.test(env.COLORTERM || '') || env.WT_SESSION) return 3;
  return 2;
}

let LEVEL = colorLevel();
export const setColorLevel = (n) => (LEVEL = n);

const wrap = (open, close) => (s) => (LEVEL ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));
const rgb = (r, g, b, fallback) => (s) =>
  !LEVEL ? String(s) : LEVEL >= 3 ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : `\x1b[38;5;${fallback}m${s}\x1b[39m`;

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  italic: wrap(3, 23),
  underline: wrap(4, 24),
  // Ishraqa sunrise palette
  gold: rgb(242, 183, 5, 214),
  sun: rgb(255, 138, 61, 209),
  plum: rgb(156, 107, 206, 141),
  sky: rgb(88, 166, 255, 75),
  green: rgb(63, 185, 80, 71),
  red: rgb(248, 81, 73, 203),
  grey: rgb(139, 148, 158, 245),
};

/** Hex like "#00897B" to a colourer (falls back to gold). */
export function hex(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
  if (!m) return c.gold;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const to6 = (v) => Math.round((v / 255) * 5);
  return rgb(r, g, b, 16 + 36 * to6(r) + 6 * to6(g) + to6(b));
}

// ── Width ──
const ANSI = /\x1b\[[0-9;]*m/g;
export const stripAnsi = (s) => String(s).replace(ANSI, '');

// Zero-width: Arabic harakat & marks, tatweel is visible, ZWJ/ZWNJ, variation selectors, bidi controls.
const ZERO = /[̀-ͯؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ​-‏‪-‮⁠-⁩︀-️]/u;
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|\p{Extended_Pictographic}/u;

export function width(s) {
  let w = 0;
  for (const ch of stripAnsi(s)) {
    if (ZERO.test(ch)) continue;
    const cp = ch.codePointAt(0);
    if (cp < 32 || (cp >= 0x7f && cp < 0xa0)) continue;
    w += WIDE.test(ch) ? 2 : 1;
  }
  return w;
}

// ── Direction ──
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/u;
const LTR_CHAR = /[A-Za-zÀ-ɏ]/;
/** True when the first strong character is right-to-left. */
export function isRtl(s) {
  for (const ch of stripAnsi(s)) {
    if (RTL_CHAR.test(ch)) return true;
    if (LTR_CHAR.test(ch)) return false;
  }
  return false;
}

// ── Wrap ──
/** Word-wraps plain or coloured text to `max` columns. Preserves blank lines. */
export function wrapText(text, max) {
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    if (!para.trim()) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if (width(line) + 1 + width(word) <= max) line += ' ' + word;
      else {
        out.push(line);
        line = word;
      }
      while (width(line) > max) {
        // hard-split very long tokens (urls)
        let cut = '';
        for (const ch of line) {
          if (width(cut + ch) > max) break;
          cut += ch;
        }
        out.push(cut);
        line = line.slice(cut.length);
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * Like wrapText, but when the whole line is wrapped in one style
 * (e.g. bold) the style is re-applied to every wrapped line so it never
 * bleeds into the box border.
 */
export function wrapStyled(text, max) {
  const m = /^((?:\x1b\[[0-9;]*m)+)([^\x1b]*)((?:\x1b\[[0-9;]*m)+)$/s.exec(String(text ?? ''));
  if (!m) return wrapText(text, max);
  return wrapText(m[2], max).map((l) => (l ? m[1] + l + m[3] : l));
}

export function pad(s, w, align = 'left') {
  const gap = Math.max(0, w - width(s));
  if (align === 'right') return ' '.repeat(gap) + s;
  if (align === 'center') return ' '.repeat(gap >> 1) + s + ' '.repeat(gap - (gap >> 1));
  return s + ' '.repeat(gap);
}

// ── Box ──
const BORDERS = {
  round: ['╭', '╮', '╰', '╯', '─', '│', '├', '┤'],
  ascii: ['+', '+', '+', '+', '-', '|', '+', '+'],
};

export function termWidth(stream = process.stdout) {
  return Math.max(40, Math.min(stream?.columns || 80, 100));
}

/**
 * Draws a box. `lines` may include the marker `null` for a divider.
 * Arabic (RTL) lines are right-aligned so they read naturally in terminals
 * that render RTL runs.
 */
export function box(lines, { title = '', width: total = termWidth(), color = c.gold, style, rtl } = {}) {
  const b = BORDERS[style || (process.env.ISHRAQA_ASCII ? 'ascii' : 'round')];
  const inner = total - 4;
  const body = [];
  for (const raw of lines) {
    if (raw === null) {
      body.push(color(b[6] + b[4].repeat(total - 2) + b[7]));
      continue;
    }
    for (const l of wrapStyled(raw, inner)) {
      const align = rtl !== false && isRtl(l) ? 'right' : 'left';
      body.push(color(b[5]) + ' ' + pad(l, inner, align) + ' ' + color(b[5]));
    }
  }
  const t = title ? ` ${title} ` : '';
  const top = color(b[0] + b[4]) + c.bold(t) + color(b[4].repeat(Math.max(0, total - 3 - width(t))) + b[1]);
  const bottom = color(b[2] + b[4].repeat(total - 2) + b[3]);
  return [top, ...body, bottom].join('\n');
}

/** Two-column key/value rows. */
export function table(rows, { gap = 2 } = {}) {
  const k = Math.max(0, ...rows.map(([a]) => width(a)));
  return rows.map(([a, v]) => c.grey(pad(a, k)) + ' '.repeat(gap) + v).join('\n');
}

export const out = (s = '') => void process.stdout.write(s + '\n');
export const err = (s = '') => void process.stderr.write(s + '\n');
