// `lfg config [key [value]]` — view or edit config.
// `lfg config`              → show all
// `lfg config <key>`        → show one
// `lfg config <key> <val>`  → set one
// `lfg config edit`         → open in $EDITOR
// `lfg config reset`        → re-run setup wizard

import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

import { c, banner, ok, fail, blank, header } from '../ui.mjs';
import { loadConfig, saveConfig, CONFIG_PATH } from '../config.mjs';
import { findRuntime } from '../runtimes.mjs';

const ALLOWED_KEYS = new Set(['projectsDir', 'agent', 'agentLabel', 'mux']);

export default async function config({ args, pkgRoot }) {
  if (args[0] === 'edit') return openEditor();
  if (args[0] === 'reset') {
    const setup = (await import('./setup.mjs')).default;
    return setup({ pkgRoot });
  }

  const cfg = loadConfig();
  if (!cfg) { fail('No config. Run ' + c.cyan('lfg setup') + ' first.'); process.exit(1); }

  // No args → show all
  if (args.length === 0) {
    banner();
    header('Current config');
    console.log('  ' + c.dim('File: ') + c.cyan(CONFIG_PATH.replace(homedir(), '~')));
    blank();
    for (const k of ALLOWED_KEYS) {
      console.log('  ' + k.padEnd(14) + '  ' + c.cyan(String(cfg[k] ?? '')));
    }
    blank();
    console.log('  ' + c.dim('Set with: ') + c.cyan('lfg config <key> <value>'));
    console.log('  ' + c.dim('Edit raw: ') + c.cyan('lfg config edit'));
    console.log('  ' + c.dim('Reset:    ') + c.cyan('lfg config reset'));
    blank();
    return;
  }

  const key = args[0];
  if (!ALLOWED_KEYS.has(key)) {
    fail(`Unknown key: ${key}`);
    console.log('  ' + c.dim('Allowed: ') + [...ALLOWED_KEYS].join(', '));
    process.exit(1);
  }

  // One arg → show
  if (args.length === 1) {
    console.log(cfg[key] ?? '');
    return;
  }

  // Two args → set
  let value = args.slice(1).join(' ');
  if (key === 'agent') {
    const rt = findRuntime(value);
    if (rt) {
      cfg.agent = rt.cmd;
      cfg.agentLabel = rt.label;
    } else {
      cfg.agent = value;
      cfg.agentLabel = value;
    }
    saveConfig(cfg);
    banner();
    ok('Agent set to ' + c.bold(cfg.agentLabel) + c.dim(`  (${cfg.agent})`));
    blank();
    return;
  }

  if (key === 'projectsDir') value = value.replace(/^~/, homedir());
  cfg[key] = value;
  saveConfig(cfg);
  banner();
  ok(key + ' = ' + c.cyan(value));
  blank();
}

function openEditor() {
  const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'nano');
  const res = spawnSync(editor, [CONFIG_PATH], { stdio: 'inherit', shell: true });
  process.exit(res.status ?? 0);
}
