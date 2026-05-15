// Exit-code contract for `lfg doctor`:
//   - text mode: exit 1 if issues found
//   - --json:    always exit 0 (diagnosis is in the JSON)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'lfg.mjs');

// Empty HOME → no config → "issues" exist
const tmpHome = mkdtempSync(join(tmpdir(), 'lfg-doctor-'));
const env = { ...process.env, HOME: tmpHome, USERPROFILE: tmpHome };

function run(args) {
  return spawnSync(process.execPath, [BIN, ...args], { env, encoding: 'utf8' });
}

test('doctor --json exits 0 even when system is unconfigured', () => {
  const r = run(['doctor', '--json']);
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}. stderr: ${r.stderr}`);
  const data = JSON.parse(r.stdout);
  assert.equal(data.ok, false, 'unconfigured system should report ok:false');
  assert.equal(typeof data.node, 'string');
});

test('doctor text mode exits 1 when issues found', () => {
  const r = run(['doctor']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /issue\(s\) need attention/);
});

test('cleanup', () => {
  rmSync(tmpHome, { recursive: true, force: true });
});
