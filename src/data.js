// Read/write calls. Only public content is read anonymously; everything else
// runs as the signed-in user and is checked again on the server.
import { rest, rpc, ApiError } from './api.js';
import { quoteOfTheDay } from './quote.js';
import { evaluateAccess } from './access.js';

const enc = encodeURIComponent;

export function localDay(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ── Public content ──
export async function todayQuote(date = new Date()) {
  const rows = await rest('quotes', 'select=id,quote,author,category,is_active');
  return quoteOfTheDay(rows || [], date);
}

export async function todayArticle(date = new Date()) {
  const rows = await rest(
    'articles',
    `select=id,slug,title,excerpt,category,author_name,reading_minutes,publish_date` +
      `&status=eq.published&publish_date=lte.${localDay(date)}` +
      `&order=publish_date.desc,published_at.desc&limit=1`,
  );
  return rows?.[0] ?? null;
}

export const todayPhenomenon = (token) => rpc('today_phenomenon', {}, { token });
export const tomorrowTeaser = () => rpc('phenomenon_teaser');

// ── Member ──
export async function profile(token, uid) {
  const rows = await rest('profiles', `select=id,display_name,username&id=eq.${enc(uid)}`, { token });
  return rows?.[0] ?? null;
}

export function memberships(token, uid) {
  return rest(
    'club_members',
    `select=role,joined_at,clubs(id,name,kind,is_hidden,is_official,visibility,member_count)` +
      `&user_id=eq.${enc(uid)}&order=joined_at.desc`,
    { token },
  );
}

export async function devStats(token, uid) {
  const rows = await rpc('dev_stats', { p_user: uid }, { token });
  return Array.isArray(rows) ? rows[0] ?? null : rows;
}

/** Server verdict from the proposed `dev_cli_access` RPC; null if not deployed yet. */
async function serverAccess(token) {
  try {
    return await rpc('dev_cli_access', {}, { token });
  } catch (e) {
    if (e instanceof ApiError && (e.code === 'PGRST202' || e.status === 404)) return null;
    throw e;
  }
}

export async function checkAccess(token, uid) {
  const server = await serverAccess(token);
  if (server) return evaluateAccess({ server });
  const [m, s] = await Promise.all([memberships(token, uid), devStats(token, uid).catch(() => null)]);
  return evaluateAccess({ memberships: m, stats: s });
}

export async function clubPulse(token, clubId) {
  const rows = await rpc('dev_club_pulse', { p_club: clubId }, { token });
  return Array.isArray(rows) ? rows[0] ?? null : rows;
}

export function projects(token, clubId) {
  return rest(
    'build_projects',
    `select=id,title,status,repo_url,ends_on,created_at&club_id=eq.${enc(clubId)}&order=created_at.desc`,
    { token },
  );
}

/** The project the team is working on now: newest still building, else newest. */
export function currentProject(list) {
  if (!list?.length) return null;
  return list.find((p) => p.status === 'building' || p.status === 'submitted') || list[0];
}

export const board = (token, projectId) => rpc('dev_board', { p_project: projectId }, { token });

export const postStandup = (token, clubId, { did, next, blockers }) =>
  rpc('dev_standup_post', { p_club: clubId, p_did: did || null, p_next: next || null, p_blockers: blockers || null }, { token });
