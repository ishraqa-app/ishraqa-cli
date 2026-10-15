import { API_URL, PUBLIC_KEY, USER_AGENT } from './config.js';

/** An error from the backend, carrying the server's short code when present. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = null, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TIMEOUT_MS = Number(process.env.ISHRAQA_TIMEOUT_MS) || 15000;

async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        apikey: PUBLIC_KEY,
        Authorization: `Bearer ${token || PUBLIC_KEY}`,
        'User-Agent': USER_AGENT,
        'X-Client-Info': USER_AGENT,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new ApiError(e?.name === 'TimeoutError' ? 'timeout' : 'offline', { code: 'offline' });
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      (data && (data.message || data.msg || data.error_description || data.error)) || `HTTP ${res.status}`;
    const code = (data && (data.error_code || data.code)) || null;
    throw new ApiError(String(msg), { status: res.status, code, details: data });
  }
  return data;
}

// ── Data API ──
export const rest = (table, query = '', opts = {}) =>
  request(`/rest/v1/${table}${query ? `?${query}` : ''}`, opts);

export const rpc = (fn, params = {}, opts = {}) =>
  request(`/rest/v1/rpc/${fn}`, { method: 'POST', body: params, ...opts });

// ── Auth API (email one-time code) ──
export const auth = {
  /** Sends a 6-digit code. Never creates an account: the CLI is for existing members. */
  sendCode: (email) =>
    request('/auth/v1/otp', { method: 'POST', body: { email, create_user: false } }),
  verifyCode: (email, token) =>
    request('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token } }),
  refresh: (refreshToken) =>
    request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    }),
  user: (token) => request('/auth/v1/user', { token }),
  logout: (token) => request('/auth/v1/logout?scope=local', { method: 'POST', token, body: {} }),
};
