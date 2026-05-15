// `lfg remove <name>` — unregister an out-of-dir project.

import { c, banner, ok, fail, blank } from '../ui.mjs';
import { loadConfig, saveConfig } from '../config.mjs';

export default async function remove({ args }) {
  const cfg = loadConfig();
  if (!cfg) { fail('No config. Run ' + c.cyan('lfg setup') + ' first.'); process.exit(1); }

  banner();
  const name = args[0];
  if (!name) {
    fail('Usage: ' + c.cyan('lfg remove <name>'));
    process.exit(1);
  }
  if (!cfg.projects?.[name]) {
    fail(`No registered project named "${name}".`);
    process.exit(1);
  }
  delete cfg.projects[name];
  saveConfig(cfg);
  ok('Removed ' + c.bold(name));
  blank();
}
