#!/usr/bin/env node
// lfg — multi-project workspace launcher for AI coding agents
// Entry point: routes subcommands to src/commands/*.mjs

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

import { loadConfig } from '../src/config.mjs';
import { c, banner } from '../src/ui.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..');

const COMMANDS = {
  setup:     '../src/commands/setup.mjs',
  launch:    '../src/commands/launch.mjs',
  list:      '../src/commands/list.mjs',
  ls:        '../src/commands/list.mjs',
  add:       '../src/commands/add.mjs',
  remove:    '../src/commands/remove.mjs',
  rm:        '../src/commands/remove.mjs',
  config:    '../src/commands/config.mjs',
  doctor:    '../src/commands/doctor.mjs',
  uninstall: '../src/commands/uninstall.mjs',
  help:      '../src/commands/help.mjs',
};

async function run(cmdName, args) {
  const modPath = COMMANDS[cmdName];
  if (!modPath) {
    console.error(c.red(`unknown command: ${cmdName}`));
    console.error(`run ${c.cyan('lfg help')} for a list`);
    process.exit(1);
  }
  const mod = await import(modPath);
  await mod.default({ args, pkgRoot: PKG_ROOT });
}

async function main() {
  const [, , ...argv] = process.argv;

  // Handle --version / -v / --help / -h before command dispatch
  if (argv[0] === '--version' || argv[0] === '-v') {
    const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));
    console.log(pkg.version);
    return;
  }
  if (argv[0] === '--help' || argv[0] === '-h') {
    return run('help', argv.slice(1));
  }

  // Recognized command → dispatch
  if (argv[0] && COMMANDS[argv[0]]) {
    return run(argv[0], argv.slice(1));
  }

  // First-run guard: if no config, run setup wizard
  const cfg = loadConfig();
  if (!cfg) {
    banner();
    console.log(c.dim('  No config found. Running first-time setup…\n'));
    await run('setup', []);
    return;
  }

  // Default: launch (no args = picker, with name = direct launch)
  return run('launch', argv);
}

main().catch((err) => {
  console.error(c.red('\n  error: ') + err.message);
  if (process.env.LFG_DEBUG) console.error(err.stack);
  process.exit(1);
});
