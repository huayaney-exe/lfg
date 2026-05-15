// Config IO. Persistent state lives at ~/.config/lfg/config.json.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_DIR  = join(homedir(), '.config', 'lfg');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export const STATE_DIR   = join(CONFIG_DIR, 'state');
export const SCRIPTS_DIR = join(CONFIG_DIR, 'scripts');

export const SCHEMA_VERSION = 1;

export function defaultConfig() {
  return {
    schemaVersion: SCHEMA_VERSION,
    projectsDir: join(homedir(), 'projects'),
    agent: 'claude',          // command spawned in each pane
    agentLabel: 'Claude Code', // human label
    mux: 'cmux',              // 'cmux' on mac, 'wezterm' planned for win
    projects: {},             // per-project overrides: { name: { path?, agent? } }
    lastWorkspace: null,
    firstRunAt: null,
  };
}

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    throw new Error(`config at ${CONFIG_PATH} is not valid JSON: ${err.message}`);
  }
}

export function saveConfig(cfg) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

export function updateConfig(patch) {
  const cur = loadConfig() ?? defaultConfig();
  const next = { ...cur, ...patch };
  saveConfig(next);
  return next;
}
