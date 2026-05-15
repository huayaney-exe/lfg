// `lfg help [command]` — contextual help.

import { c, banner, blank } from '../ui.mjs';

const TOPICS = {
  setup:     'Run the first-time setup wizard. Idempotent.',
  launch:    'Launch the picker. Default command when you type just `lfg`.',
  list:      'Show registered + auto-scanned projects. Supports --json.',
  add:       'Register the current dir (or given path) as a project.',
  remove:    'Unregister a project: lfg remove <name>',
  config:    'View / change config. `lfg config` for current values.',
  doctor:    'Diagnose install, deps, and config issues. Supports --json.',
  uninstall: 'Remove lfg config + legacy zsh alias.',
  help:      'This message. `lfg help <command>` for detail.',
};

export default async function help({ args }) {
  banner();
  if (args[0] && TOPICS[args[0]]) {
    console.log('  ' + c.bold('lfg ' + args[0]));
    console.log('  ' + c.dim(TOPICS[args[0]]));
    blank();
    return;
  }

  console.log('  ' + c.bold('lfg') + c.dim(' — multi-project workspace launcher for AI coding agents'));
  blank();
  console.log('  ' + c.bold('USAGE'));
  console.log('    ' + c.cyan('lfg') + c.dim('              launch picker'));
  console.log('    ' + c.cyan('lfg <command>') + c.dim('    run a subcommand'));
  console.log('    ' + c.cyan('lfg --version'));
  blank();
  console.log('  ' + c.bold('COMMANDS'));
  const w = Math.max(...Object.keys(TOPICS).map(k => k.length));
  for (const [k, v] of Object.entries(TOPICS)) {
    console.log('    ' + c.cyan(k.padEnd(w)) + '  ' + c.dim(v));
  }
  blank();
  console.log('  ' + c.bold('LEARN MORE'));
  console.log('    ' + c.cyan('lfg help <command>') + c.dim('   detail on one command'));
  console.log('    ' + c.dim('https://github.com/huayaney-exe/lfg'));
  blank();
}
