// `lfg [name]` — launch the workspace.
// On Mac with cmux: delegates to the bundled zsh script (proven path).
// Otherwise: prints what's needed.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { c, banner, fail, warn, info, blank, errorBlock } from '../ui.mjs';
import { loadConfig, SCRIPTS_DIR, STATE_DIR } from '../config.mjs';
import { IS_MAC, IS_WIN, CMUX_BIN, detectMux } from '../platform.mjs';

export default async function launch({ args }) {
  const cfg = loadConfig();
  if (!cfg) {
    errorBlock({
      what: 'No lfg config found',
      why: "You haven't run setup yet",
      fix: 'lfg setup',
      exitCode: 1,
    });
  }

  const mux = cfg.mux || detectMux();

  if (mux === 'cmux' && IS_MAC) {
    return launchCmux(cfg, args);
  }
  if (mux === 'wezterm') {
    return launchWezterm(cfg, args);
  }

  errorBlock({
    what: 'No supported terminal multiplexer detected',
    why: IS_MAC ? 'lfg uses cmux on macOS' :
         IS_WIN ? 'lfg uses Wezterm on Windows' :
                  'lfg uses Wezterm on Linux',
    fix: IS_MAC ? 'brew install --cask cmux' :
         IS_WIN ? 'winget install wez.wezterm' :
                  'See https://wezfurlong.org/wezterm/install/linux.html',
    more: IS_WIN || !IS_MAC ? 'Wezterm backend is in beta — Mac+cmux is most stable today' : undefined,
    exitCode: 1,
  });
}

function launchCmux(cfg, args) {
  const script = join(SCRIPTS_DIR, 'lfg.sh');
  if (!existsSync(script)) {
    errorBlock({
      what: 'Bundled scripts not found at ' + SCRIPTS_DIR,
      why: 'Setup never completed, or the scripts dir was deleted',
      fix: 'lfg setup',
      exitCode: 1,
    });
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
