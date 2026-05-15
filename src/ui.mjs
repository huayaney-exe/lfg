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

// Strip ANSI escapes for visible width calculation.
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const visibleLen = (s) => s.replace(ANSI_RE, '').length;

/**
 * Render a teaching box with title + content lines.
 *
 *   ╭─ TITLE ─────────────────────────────╮
 *   │                                     │
 *   │  content line 1                     │
 *   │  content line 2                     │
 *   │                                     │
 *   ╰─────────────────────────────────────╯
 *
 * Width auto-sizes to fit longest line; min width 56 so short boxes still look intentional.
 */
export function box(title, lines, opts = {}) {
  const INNER_PAD = 2;
  const MIN_WIDTH = opts.minWidth ?? 56;
  const maxLine = Math.max(0, ...lines.map(visibleLen));
  const titleLen = visibleLen(title);
  const inner = Math.max(maxLine + INNER_PAD * 2, MIN_WIDTH, titleLen + 4);
  const dashRight = Math.max(1, inner - titleLen - 4); // "─ TITLE " takes (titleLen + 3) + closing space
  const pad = (line) => {
    const fill = inner - visibleLen(line) - INNER_PAD;
    return '  │  ' + line + ' '.repeat(Math.max(0, fill)) + '│';
  };
  const emptyLine = '  │' + ' '.repeat(inner) + '│';
  console.log('');
  console.log('  ╭─ ' + title + ' ' + '─'.repeat(dashRight) + '╮');
  console.log(emptyLine);
  for (const l of lines) console.log(pad(l));
  console.log(emptyLine);
  console.log('  ╰' + '─'.repeat(inner) + '╯');
  console.log('');
}

/**
 * Render a 4-line error teaching block.
 *
 *   ✗ What failed
 *     Why: root cause
 *     Fix: action
 *     More: link / `lfg help X`
 *
 * `why`, `fix`, `more` are optional but `what` is required.
 * Exits the process with `exitCode` if provided.
 */
export function errorBlock({ what, why, fix, more, exitCode }) {
  console.log('');
  console.log('  ' + c.red('✗ ') + c.bold(what));
  if (why)  console.log('    ' + c.dim('Why: ') + why);
  if (fix)  console.log('    ' + c.dim('Fix: ') + c.cyan(fix));
  if (more) console.log('    ' + c.dim('More: ') + c.dim(more));
  console.log('');
  if (exitCode !== undefined) process.exit(exitCode);
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
