// Smoke tests for src/config.mjs — uses node:test, zero deps.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Override HOME so config writes to a temp dir for the test process.
const tmpHome = mkdtempSync(join(tmpdir(), 'lfg-test-'));
process.env.HOME = tmpHome;
process.env.USERPROFILE = tmpHome; // Windows

const { defaultConfig, loadConfig, saveConfig, updateConfig, CONFIG_PATH } = await import('../src/config.mjs');

test('defaultConfig has expected keys', () => {
  const cfg = defaultConfig();
  assert.equal(cfg.schemaVersion, 1);
  assert.equal(typeof cfg.projectsDir, 'string');
  assert.equal(cfg.agent, 'claude');
  assert.deepEqual(cfg.projects, {});
});

test('loadConfig returns null when no config exists', () => {
  assert.equal(loadConfig(), null);
});

test('saveConfig writes JSON readable by loadConfig', () => {
  const cfg = defaultConfig();
  cfg.agent = 'aider';
  saveConfig(cfg);
  assert.ok(existsSync(CONFIG_PATH));
  const loaded = loadConfig();
  assert.equal(loaded.agent, 'aider');
});

test('updateConfig merges fields', () => {
  saveConfig(defaultConfig());
  const next = updateConfig({ agent: 'codex' });
  assert.equal(next.agent, 'codex');
  assert.equal(next.schemaVersion, 1); // unchanged
});

test('loadConfig throws on malformed JSON', () => {
  writeFileSync(CONFIG_PATH, '{ not json', 'utf8');
  assert.throws(() => loadConfig(), /not valid JSON/);
});

// Cleanup
test('cleanup', () => {
  rmSync(tmpHome, { recursive: true, force: true });
});
