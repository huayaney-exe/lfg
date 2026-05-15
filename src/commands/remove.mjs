// `lfg remove <name>` — unregister an out-of-dir project.

import { c, banner, ok, fail, blank, errorBlock } from '../ui.mjs';
import { loadConfig, saveConfig } from '../config.mjs';

export default async function remove({ args }) {
  const cfg = loadConfig();
  if (!cfg) {
    errorBlock({
      what: 'No lfg config found',
      why: "You haven't run setup yet",
      fix: 'lfg setup',
      exitCode: 1,
    });
  }

  banner();
  const name = args[0];
  if (!name) {
    errorBlock({
      what: 'Project name required',
      fix: 'lfg remove <name>',
      more: 'See `lfg list` for registered names',
      exitCode: 1,
    });
  }
  if (!cfg.projects?.[name]) {
    errorBlock({
      what: `No registered project named "${name}"`,
      why: 'Only out-of-dir projects (added via `lfg add`) can be removed. Auto-scanned projects come from your projects directory.',
      fix: 'lfg list',
      more: 'Shows what is currently registered',
      exitCode: 1,
    });
  }
  delete cfg.projects[name];
  saveConfig(cfg);
  ok('Removed ' + c.bold(name));
  blank();
}
