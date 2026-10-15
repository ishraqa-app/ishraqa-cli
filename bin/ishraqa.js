#!/usr/bin/env node
import { main } from '../src/cli.js';

const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  process.stderr.write('ishraqa needs Node.js 18 or newer.\n');
  process.exit(1);
}

main().then(
  (code) => {
    process.exitCode = code ?? 0;
  },
  (e) => {
    process.stderr.write(String(e?.stack || e) + '\n');
    process.exitCode = 1;
  },
);
