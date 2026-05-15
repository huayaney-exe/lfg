#!/usr/bin/env node
// Runs after `npm i -g lfg-cli`. Tells the user they're done and what to type next.
// Never blocks the install — wrapped in try/catch and always exits 0.
//
// Only fires on global installs (npm_config_global=true). Local installs and
// `npm ci` in dependent projects are silent so this doesn't spam users.

async function main() {
  // Only on `npm i -g` — not on local installs or as a transitive dep
  if (process.env.npm_config_global !== 'true') return;

  // Honor --ignore-scripts — npm sets these but lifecycle scripts wouldn't run
  // anyway in that case. Defensive guard for unusual installers.
  if (process.env.npm_config_ignore_scripts === 'true') return;

  // Skip in CI noise — but not in CI matrix tests of lfg itself
  if (process.env.CI === 'true' && process.env.LFG_DEV !== 'true') return;

  const { c, box } = await import('../src/ui.mjs');

  const isWin = process.platform === 'win32';

  const lines = [
    c.bold('lfg-cli is installed.'),
    '',
    c.bold('➊') + '  Start the setup wizard:',
    '    ' + c.cyan('$ lfg'),
    '',
    c.bold('➋') + '  ' + c.dim('See all commands:'),
    '    ' + c.cyan('$ lfg help'),
  ];

  // Non-Windows: warn about the PATH-reload trap. Windows puts npm globals on
  // %PATH% via the npm installer itself — no reload step there.
  if (!isWin) {
    lines.push('');
    lines.push(c.dim('If you see ') + c.cyan('lfg: command not found') + c.dim(','));
    lines.push(c.dim('open a new terminal window (or run ') + c.cyan('source ~/.zshrc') + c.dim(').'));
  }

  // npm 7+ buffers BOTH stdout and stderr from lifecycle scripts — neither
  // is shown unless --foreground-scripts is set. /dev/tty bypasses npm's
  // pipe entirely on Mac/Linux. Windows: fall back to stderr (rarely shown,
  // but Windows npm install has clearer output and v1.0.2 README covers it).
  box(c.green('✓') + ' lfg-cli installed', lines, { stream: 'tty' });
}

main().catch(() => {
  // Never fail an install over a friendly message
});
