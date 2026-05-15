// Platform + dependency detection. No deps.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

export const PLATFORM = platform(); // 'darwin' | 'win32' | 'linux'
export const IS_MAC = PLATFORM === 'darwin';
export const IS_WIN = PLATFORM === 'win32';
export const IS_LINUX = PLATFORM === 'linux';

export const CMUX_BIN = '/Applications/cmux.app/Contents/Resources/bin/cmux';

export function hasCommand(cmd) {
  try {
    if (IS_WIN) {
      execSync(`where ${cmd}`, { stdio: 'ignore' });
    } else {
      execSync(`command -v ${cmd}`, { stdio: 'ignore', shell: '/bin/sh' });
    }
    return true;
  } catch { return false; }
}

export function detectMux() {
  if (IS_MAC && existsSync(CMUX_BIN)) return 'cmux';
  if (hasCommand('wezterm')) return 'wezterm';
  return null;
}

export function checkDeps() {
  const results = {
    node: { ok: true, version: process.versions.node },
    mux:  { name: detectMux() },
    git:  { ok: hasCommand('git') },
  };
  results.mux.ok = results.mux.name !== null;
  return results;
}
