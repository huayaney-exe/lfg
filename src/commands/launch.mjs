// `lfg [name]` — launch the workspace.
// On Mac with cmux: delegates to the bundled zsh script (proven path).
// Otherwise: prints what's needed.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { c, banner, fail, warn, info, blank } from '../ui.mjs';
import { loadConfig, SCRIPTS_DIR, STATE_DIR } from '../config.mjs';
import { IS_MAC, IS_WIN, CMUX_BIN, detectMux } from '../platform.mjs';

export default async function launch({ args }) {
  const cfg = loadConfig();
  if (!cfg) {
    fail('No config. Run ' + c.cyan('lfg setup') + ' first.');
    process.exit(1);
  }

  const mux = cfg.mux || detectMux();

  if (mux === 'cmux' && IS_MAC) {
    return launchCmux(cfg, args);
  }
  if (mux === 'wezterm') {
    return launchWezterm(cfg, args);
  }

  banner();
  fail('No supported terminal multiplexer detected.');
  if (IS_WIN) {
    info('Install Wezterm: ' + c.cyan('winget install wez.wezterm'));
    warn('Note: Wezterm driver is in beta for Windows.');
  } else if (IS_MAC) {
    info('Install cmux: ' + c.cyan('brew install --cask cmux'));
  }
  blank();
  process.exit(1);
}

function launchCmux(cfg, args) {
  const script = join(SCRIPTS_DIR, 'lfg.sh');
  if (!existsSync(script)) {
    fail('Scripts not found at ' + c.cyan(SCRIPTS_DIR));
    info('Re-run ' + c.cyan('lfg setup') + ' to reinstall.');
    process.exit(1);
  }

  const env = {
    ...process.env,
    LFG_AGENT: cfg.agent,
    LFG_PROJECTS: cfg.projectsDir,
    LFG_STATE_DIR: STATE_DIR,
  };

  const res = spawnSync('/bin/zsh', [script, ...args], {
    stdio: 'inherit',
    env,
  });
  process.exit(res.status ?? 0);
}

function launchWezterm(cfg, args) {
  banner();
  warn('Wezterm backend is in beta.');
  info('Track progress: https://github.com/huayaney-exe/lfg/issues');
  blank();
  console.log('  ' + c.dim('In the meantime, you can use lfg on macOS with cmux.'));
  blank();
  process.exit(2);
}
