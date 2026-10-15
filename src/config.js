import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// Public endpoint and publishable (anon) key. This key is designed to ship
// inside clients; every row is protected server-side by row-level policies.
// The CLI never holds any privileged key: it acts only as the signed-in user.
export const API_URL = (process.env.ISHRAQA_API_URL || 'https://jytbowsfvuzdnsmhmsly.supabase.co').replace(/\/+$/, '');
export const PUBLIC_KEY = process.env.ISHRAQA_PUBLIC_KEY || 'sb_publishable_cm8SXt2NPRY5RY7dclZsLw_4ng3Q0TD';

export const SITE = 'https://ishraqa.app';
export const links = {
  site: SITE,
  quote: (id) => `${SITE}/q/${id}/`,
  article: (slug) => `${SITE}/a/${encodeURIComponent(slug)}`,
};

export function configDir(env = process.env) {
  const base = env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(base, 'ishraqa');
}

export const sessionPath = (env = process.env) => join(configDir(env), 'session.json');

export const VERSION = (() => {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  } catch {
    return '0.0.0';
  }
})();

export const USER_AGENT = `ishraqa-cli/${VERSION} node/${process.versions.node}`;
