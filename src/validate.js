// Input checks that mirror the server's rules, so mistakes are caught before a round-trip.

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

/** Accepts "123 456" or "123-456"; returns the 6 digits or null. */
export function normalizeCode(s) {
  const d = String(s || '').replace(/[\s-]/g, '');
  // also accept Arabic-Indic digits
  const ascii = d.replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 0x660));
  return /^\d{6}$/.test(ascii) ? ascii : null;
}

export const STANDUP_LIMITS = { did: 600, next: 600, blockers: 400 };

/** @returns {{ ok: true, value: object } | { ok: false, error: 'standup_empty'|'too_long' }} */
export function validateStandup({ did, next, blockers } = {}) {
  const v = {
    did: String(did ?? '').trim(),
    next: String(next ?? '').trim(),
    blockers: String(blockers ?? '').trim(),
  };
  for (const k of Object.keys(STANDUP_LIMITS)) if ([...v[k]].length > STANDUP_LIMITS[k]) return { ok: false, error: 'too_long' };
  if ([...v.did].length < 3 && [...v.next].length < 3) return { ok: false, error: 'standup_empty' };
  return { ok: true, value: v };
}

/** Maps a server error to a strings key. */
export function errorKey(e) {
  const m = `${e?.code || ''} ${e?.message || ''}`;
  if (/offline|timeout/.test(m)) return 'offline';
  if (/signed_out/.test(m)) return 'notSignedIn';
  if (/not_member|42501/.test(m)) return 'notMember';
  if (/standup_empty/.test(m)) return 'standupEmpty';
  if (/too_long/.test(m)) return 'tooLong';
  if (/otp_expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(m)) return 'wrongCode';
  if (/otp_disabled|signups? not allowed|user_not_found/i.test(m)) return 'noAccount';
  if (/rate|over_email_send_rate_limit|429/i.test(m) || e?.status === 429) return 'tooMany';
  return null;
}
