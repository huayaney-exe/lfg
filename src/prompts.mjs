// Zero-dependency interactive prompts.
// Uses raw mode + ANSI for arrow-key menus; falls back gracefully when non-TTY.

import readline from 'node:readline';
import { c } from './ui.mjs';

const isTTY = process.stdin.isTTY && process.stdout.isTTY;

export async function confirm(message, defaultYes = true) {
  if (process.env.LFG_YES) return true;
  if (!isTTY) return defaultYes;
  const hint = defaultYes ? c.dim('[Y/n]') : c.dim('[y/N]');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${message} ${hint} `, (ans) => {
      rl.close();
      const a = ans.trim().toLowerCase();
      if (!a) return resolve(defaultYes);
      resolve(a === 'y' || a === 'yes');
    });
  });
}

export async function input(message, defaultVal = '') {
  if (!isTTY) return defaultVal;
  const hint = defaultVal ? c.dim(`(${defaultVal})`) : '';
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${message} ${hint} `, (ans) => {
      rl.close();
      resolve(ans.trim() || defaultVal);
    });
  });
}

// Arrow-key single-select menu. options: [{ label, value, hint? }]
export async function select(message, options, defaultIndex = 0) {
  if (!isTTY) return options[defaultIndex]?.value;

  let cursor = Math.max(0, Math.min(defaultIndex, options.length - 1));
  const out = process.stdout;

  const render = (firstDraw = false) => {
    if (!firstDraw) {
      out.write(`\x1b[${options.length}A`); // move cursor up
    }
    out.write(`\x1b[?25l`); // hide cursor
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      const marker = i === cursor ? c.cyan('▸') : ' ';
      const label  = i === cursor ? c.bold(o.label) : o.label;
      const hint   = o.hint ? c.dim('  ' + o.hint) : '';
      out.write(`\r\x1b[2K  ${marker} ${label}${hint}\n`);
    }
  };

  return new Promise((resolve) => {
    const onData = (key) => {
      const s = key.toString();
      if (s === '[A' || s === 'k') { cursor = (cursor - 1 + options.length) % options.length; render(); }
      else if (s === '[B' || s === 'j') { cursor = (cursor + 1) % options.length; render(); }
      else if (s === '\r' || s === '\n') { finish(options[cursor].value); }
      else if (s === '' || s === 'q') { finish(null); } // Ctrl-C or q
    };
    const finish = (val) => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener('data', onData);
      process.stdin.pause();
      out.write(`\x1b[?25h`); // show cursor
      if (val === null) {
        console.log(c.dim('  (cancelled)'));
        process.exit(0);
      }
      resolve(val);
    };

    console.log('\n  ' + c.bold(message));
    render(true);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}
