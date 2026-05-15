// `lfg uninstall` — remove ~/.config/lfg and legacy alias.

import { existsSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import { c, banner, ok, info, blank, header } from '../ui.mjs';
import { confirm } from '../prompts.mjs';
import { CONFIG_DIR } from '../config.mjs';

export default async function uninstall() {
  banner();
  header('Uninstall lfg');
  blank();
  console.log('  ' + c.dim('This will remove:'));
  console.log('  ' + c.dim('  • ') + c.cyan(CONFIG_DIR.replace(homedir(), '~')));
  console.log('  ' + c.dim('  • any ') + c.cyan('alias lfg=') + c.dim(' line in your ~/.zshrc'));
  blank();
  console.log('  ' + c.dim('To finish removing the ') + c.cyan('lfg') + c.dim(' command itself, run:'));
  console.log('  ' + c.dim('    npm uninstall -g lfg-cli   ') + c.dim('(if installed globally)'));
  blank();

  const ok1 = await confirm('Continue?', false);
  if (!ok1) return;

  if (existsSync(CONFIG_DIR)) {
    rmSync(CONFIG_DIR, { recursive: true, force: true });
    ok('Removed ' + c.cyan(CONFIG_DIR.replace(homedir(), '~')));
  }

  const zshrc = join(homedir(), '.zshrc');
  if (existsSync(zshrc)) {
    const content = readFileSync(zshrc, 'utf8');
    const lines = content.split('\n');
    const filtered = lines.filter(l =>
      !l.match(/^alias\s+lfg=.*lfg\.sh/) &&
      !l.match(/^#\s*lfg\s*—\s*multi-agent workspace launcher/)
    );
    if (filtered.length !== lines.length) {
      writeFileSync(zshrc, filtered.join('\n'), 'utf8');
      ok('Cleaned ~/.zshrc');
    }
  }

  blank();
  info('Done. Thanks for trying lfg.');
  blank();
}
