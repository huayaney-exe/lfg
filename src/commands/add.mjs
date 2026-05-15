// `lfg add [path]` — register a project.
// If the path is inside projectsDir, this is a no-op (auto-scanned).
// Otherwise records it in config.projects[name].path

import { existsSync, statSync, symlinkSync } from 'node:fs';
import { basename, resolve, relative } from 'node:path';
import { homedir } from 'node:os';

import { c, banner, ok, info, warn, fail, blank, errorBlock } from '../ui.mjs';
import { input, confirm } from '../prompts.mjs';
import { loadConfig, saveConfig } from '../config.mjs';

export default async function add({ args }) {
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
  let path = args[0] || process.cwd();
  path = resolve(path.replace(/^~/, homedir()));

  if (!existsSync(path) || !statSync(path).isDirectory()) {
    errorBlock({
      what: `${path} is not a directory`,
      why: 'lfg can only register directories as projects',
      fix: 'Pass a path to an existing directory: lfg add <path>',
      exitCode: 1,
    });
  }

  const inside = !relative(cfg.projectsDir, path).startsWith('..');
  const name = await input('Display name:', basename(path));

  if (inside) {
    ok(c.cyan(path) + ' is already inside your projects dir.');
    info('It\'s auto-scanned. No action needed.');
    blank();
    return;
  }

  cfg.projects ??= {};
  if (cfg.projects[name]) {
    const overwrite = await confirm(`A project named "${name}" exists. Overwrite?`, false);
    if (!overwrite) return;
  }
  cfg.projects[name] = { path };
  saveConfig(cfg);
  ok('Registered ' + c.bold(name) + ' → ' + c.cyan(path));
  blank();
}
