import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toSession, needsRefresh, saveSession, loadSession, clearSession, withAuth, REFRESH_MARGIN_S } from '../src/session.js';
import { configDir } from '../src/config.js';

const r = { access_token: 'a', refresh_token: 'r', expires_in: 3600, user: { id: 'u', email: 'e@x.io', phone: '1', app_metadata: {} } };
const tmp = () => mkdtempSync(join(tmpdir(), 'ishraqa-'));

test('toSession keeps only what is needed', () => {
  assert.deepEqual(toSession(r, 1000), { access_token: 'a', refresh_token: 'r', expires_at: 4600, user: { id: 'u', email: 'e@x.io' } });
  assert.throws(() => toSession({}), /bad_session/);
});

test('refreshes shortly before expiry', () => {
  assert.equal(needsRefresh({ expires_at: 10_000 }, 10_000 - REFRESH_MARGIN_S - 1), false);
  assert.equal(needsRefresh({ expires_at: 10_000 }, 10_000 - REFRESH_MARGIN_S), true);
  assert.equal(needsRefresh({}), true);
});

test('session file is private (0600) and round-trips', () => {
  const p = join(tmp(), 'nested', 'session.json');
  saveSession(toSession(r, 1), p);
  assert.equal(loadSession(p).access_token, 'a');
  if (process.platform !== 'win32') assert.equal(statSync(p).mode & 0o777, 0o600);
  assert.ok(!readFileSync(p, 'utf8').includes('phone'));
  clearSession(p);
  assert.equal(loadSession(p), null);
});

test('config dir follows XDG_CONFIG_HOME', () => {
  assert.equal(configDir({ XDG_CONFIG_HOME: '/tmp/x' }), join('/tmp/x', 'ishraqa'));
});

test('withAuth refuses when signed out', async () => {
  await assert.rejects(withAuth(async () => 1, { path: join(tmp(), 'none.json') }), /signed_out/);
});

test('withAuth passes a fresh token through without refreshing', async () => {
  const p = join(tmp(), 's.json');
  saveSession({ ...toSession(r), expires_at: Math.floor(Date.now() / 1000) + 3600 }, p);
  assert.equal(await withAuth(async (t) => t, { path: p }), 'a');
});
