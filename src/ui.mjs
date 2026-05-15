// Tiny color + formatting helpers. No deps.

const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (open, close) => (s) => isTTY ? `\x1b[${open}m${s}\x1b[${close}m` : String(s);

export const c = {
  red:    wrap(31, 39),
  green:  wrap(32, 39),
  yellow: wrap(33, 39),
  blue:   wrap(34, 39),
  cyan:   wrap(36, 39),
  gray:   wrap(90, 39),
  dim:    wrap(2, 22),
  bold:   wrap(1, 22),
  underline: wrap(4, 24),
};

export function banner() {
  console.log('');
  console.log('  ' + c.bold('⚡ lfg') + c.dim('  multi-agent workspace launcher'));
  console.log('');
}

export function header(text) {
  console.log('\n  ' + c.bold(text));
}

export function ok(msg)   { console.log('  ' + c.green('✓ ') + msg); }
export function info(msg) { console.log('  ' + c.cyan('→ ') + msg); }
export function warn(msg) { console.log('  ' + c.yellow('⚠ ') + msg); }
export function fail(msg) { console.log('  ' + c.red('✗ ') + msg); }
export function blank() { console.log(''); }

export function hint(msg) {
  console.log('  ' + c.dim(msg));
}

export function layoutPreview(n = 2) {
  const tree = c.cyan('files');
  const agent = (i) => c.green(`agent ${i}`);
  console.log('  ' + c.dim('When you run lfg you\'ll see:'));
  console.log('');
  console.log('    ┌─────────┬─────────────┬─────────────┐');
  console.log(`    │ ${tree}   │  ${agent('(A)')}  │  ${agent('(B)')}  │`);
  console.log('    │  ←auto  │             │             │');
  console.log('    │  syncs  │             │             │');
  console.log('    └─────────┴─────────────┴─────────────┘');
  console.log('  ' + c.dim('Click any agent pane → file tree follows.'));
  console.log('');
}
