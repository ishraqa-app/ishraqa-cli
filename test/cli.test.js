import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Point the CLI at an empty config dir so no real session is ever used.
process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'ishraqa-cli-'));
process.env.NO_COLOR = '1';
const { main, EXIT } = await import('../src/cli.js');

const quiet = async (fn) => {
  const o = process.stdout.write;
  const e = process.stderr.write;
  process.stdout.write = process.stderr.write = () => true;
  try {
    return await fn();
  } finally {
    process.stdout.write = o;
    process.stderr.write = e;
  }
};

test('member commands refuse when signed out (no network needed)', async () => {
  for (const cmd of ['clubs', 'tasks', 'standup', 'whoami']) {
    assert.equal(await quiet(() => main([cmd])), EXIT.signedOut, cmd);
  }
});

test('usage errors and meta flags', async () => {
  assert.equal(await quiet(() => main(['nope'])), EXIT.usage);
  assert.equal(await quiet(() => main(['today', '--bogus'])), EXIT.usage);
  assert.equal(await quiet(() => main(['--version'])), EXIT.ok);
  assert.equal(await quiet(() => main(['--help'])), EXIT.ok);
  assert.equal(await quiet(() => main(['logout'])), EXIT.ok);
});
