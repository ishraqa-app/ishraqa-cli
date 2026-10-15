// Who may use the member side of the CLI.
//
// Rule: an Ishraqa account that is part of the developers' world, meaning
//   (a) a member of at least one developer club (club kind "build"), or
//   (b) active in the developers hub: a linked GitHub profile, a solved weekly
//       challenge, a mentor card, or a team project.
//
// This is a convenience gate for a friendly message. The real protection lives
// on the server: every board, task and standup call is checked there again.

export const DEV_CLUB_KIND = 'build';

/** Developer clubs from `club_members` rows shaped `{ role, clubs: {...} }`. */
export function devClubsFrom(memberships) {
  const out = [];
  for (const m of memberships || []) {
    const c = m?.clubs;
    if (!c || c.kind !== DEV_CLUB_KIND || c.is_hidden) continue;
    out.push({
      id: c.id,
      name: c.name,
      role: m.role || 'member',
      members: Number(c.member_count) || 0,
      official: !!c.is_official,
      private: c.visibility === 'private',
    });
  }
  return out;
}

/** Hub signals from the `dev_stats` row. */
export function hubSignals(stats) {
  if (!stats) return [];
  const s = [];
  if (typeof stats.github === 'string' && stats.github.trim()) s.push('github');
  if (Number(stats.solved) > 0) s.push('challenges');
  if (stats.mentor === true) s.push('mentor');
  if (Number(stats.projects_shipped) + Number(stats.projects_building) > 0) s.push('projects');
  return s;
}

/**
 * @returns {{ allowed: boolean, clubs: object[], hub: string[], reason: 'club'|'hub'|'none' }}
 */
export function evaluateAccess({ memberships = [], stats = null, server = null } = {}) {
  // A server-side verdict (proposed `dev_cli_access` RPC) wins when available.
  if (server && typeof server.allowed === 'boolean') {
    const clubs = Array.isArray(server.clubs) ? server.clubs : devClubsFrom(memberships);
    const hub = Array.isArray(server.hub) ? server.hub : hubSignals(stats);
    return { allowed: server.allowed, clubs, hub, reason: server.allowed ? (clubs.length ? 'club' : 'hub') : 'none' };
  }
  const clubs = devClubsFrom(memberships);
  const hub = hubSignals(stats);
  const reason = clubs.length ? 'club' : hub.length ? 'hub' : 'none';
  return { allowed: reason !== 'none', clubs, hub, reason };
}

/** Commands that need a developer account (only login/logout/whoami are open). */
// قرار المؤسس: الأداة كلها لأصحاب حسابات المطوّرين (login/logout/whoami فقط مفتوحة)
export const MEMBER_COMMANDS = new Set(['today', 'phenomenon', 'clubs', 'tasks', 'standup']);
export const requiresDeveloper = (cmd) => MEMBER_COMMANDS.has(cmd);

/** Picks a club by 1-based index, id, or case-insensitive name fragment. */
export function pickClub(clubs, query) {
  if (!clubs.length) return { club: null, error: 'no_clubs' };
  if (query == null || query === '') {
    return clubs.length === 1 ? { club: clubs[0] } : { club: null, error: 'ambiguous', choices: clubs };
  }
  const q = String(query).trim();
  if (/^\d+$/.test(q) && Number(q) >= 1 && Number(q) <= clubs.length) return { club: clubs[Number(q) - 1] };
  const byId = clubs.find((c) => c.id === q);
  if (byId) return { club: byId };
  const norm = (s) => String(s).toLocaleLowerCase().normalize('NFKC');
  const exact = clubs.filter((c) => norm(c.name) === norm(q));
  if (exact.length === 1) return { club: exact[0] };
  const hits = clubs.filter((c) => norm(c.name).includes(norm(q)));
  if (hits.length === 1) return { club: hits[0] };
  return { club: null, error: hits.length ? 'ambiguous' : 'not_found', choices: hits.length ? hits : clubs };
}
