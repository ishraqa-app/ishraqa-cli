import { mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { auth, ApiError } from './api.js';
import { sessionPath } from './config.js';

/** Seconds of slack before expiry at which we refresh proactively. */
export const REFRESH_MARGIN_S = 90;

/** Shapes an auth response into what we persist (nothing else is kept). */
export function toSession(r, nowS = Math.floor(Date.now() / 1000)) {
  if (!r?.access_token || !r?.refresh_token) throw new ApiError('bad_session', { code: 'bad_session' });
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_at ?? nowS + (r.expires_in ?? 3600),
    user: { id: r.user?.id, email: r.user?.email },
  };
}

export function needsRefresh(s, nowS = Math.floor(Date.now() / 1000)) {
  return !s?.expires_at || s.expires_at - REFRESH_MARGIN_S <= nowS;
}

export function loadSession(path = sessionPath()) {
  try {
    const s = JSON.parse(readFileSync(path, 'utf8'));
    return s?.access_token && s?.refresh_token ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(s, path = sessionPath()) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(s, null, 2), { mode: 0o600 });
  try {
    chmodSync(path, 0o600); // tighten even if the file already existed
  } catch {}
}

export function clearSession(path = sessionPath()) {
  if (existsSync(path)) rmSync(path, { force: true });
}

/**
 * Returns a valid session (refreshing and persisting it when close to expiry),
 * or null when signed out / the refresh token was revoked.
 */
export async function activeSession({ path = sessionPath(), force = false } = {}) {
  const s = loadSession(path);
  if (!s) return null;
  if (!force && !needsRefresh(s)) return s;
  try {
    const next = toSession(await auth.refresh(s.refresh_token));
    saveSession(next, path);
    return next;
  } catch (e) {
    if (e instanceof ApiError && e.code !== 'offline' && e.status >= 400 && e.status < 500) {
      clearSession(path); // revoked or expired for good
      return null;
    }
    throw e;
  }
}

/** Runs fn(token); on a 401 refreshes once and retries. */
export async function withAuth(fn, opts = {}) {
  let s = await activeSession(opts);
  if (!s) throw new ApiError('signed_out', { code: 'signed_out' });
  try {
    return await fn(s.access_token, s);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    s = await activeSession({ ...opts, force: true });
    if (!s) throw new ApiError('signed_out', { code: 'signed_out' });
    return fn(s.access_token, s);
  }
}
