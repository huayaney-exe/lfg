// `lfg list` — show registered + auto-scanned projects.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import { c, banner, info, blank, errorBlock } from '../ui.mjs';
import { loadConfig } from '../config.mjs';

export default async function list({ args }) {
  const cfg = loadConfig();
  if (!cfg) {
    if (args?.includes('--json')) {
      console.log(JSON.stringify({ error: 'no-config' }));
      process.exit(1);
    }
    errorBlock({
      what: 'No lfg config found',
      why: "You haven't run setup yet",
      fix: 'lfg setup',
      exitCode: 1,
    });
  }

  const json = args?.includes('--json');
  if (json) return printJson(cfg);

  banner();
  console.log('  ' + c.bold('Registered projects'));
  console.log('  ' + c.dim('Source: auto-scan of ') + c.cyan(cfg.projectsDir.replace(homedir(), '~')));
  blank();

  const dir = cfg.projectsDir;
  if (!existsSync(dir)) {
    console.log('  ' + c.yellow('Projects directory does not exist.'));
    info('Create with: ' + c.cyan(`mkdir -p ${dir}`));
    blank();
    return;
  }

  const entries = readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) {
    console.log('  ' + c.dim('(empty)'));
    info('Add a project: ' + c.cyan('cd ' + cfg.projectsDir.replace(homedir(), '~') + ' && git clone <url>'));
    blank();
    return;
  }

  const w = Math.max(...entries.map(e => e.name.length), 10);
  for (const e of entries) {
    const path = join(dir, e.name).replace(homedir(), '~');
    const override = cfg.projects?.[e.name];
    const tag = override?.agent
      ? c.cyan(`  [${override.agent}]`)
      : '';
    console.log('  ' + c.green('●') + ' ' + e.name.padEnd(w) + '  ' + c.dim(path) + tag);
  }

  // Out-of-dir entries (overrides with a `path`)
  const outsiders = Object.entries(cfg.projects || {})
    .filter(([, v]) => v.path);
  if (outsiders.length > 0) {
    blank();
    console.log('  ' + c.bold('Out-of-dir registrations'));
    for (const [name, v] of outsiders) {
      console.log('  ' + c.cyan('●') + ' ' + name + '  ' + c.dim(v.path.replace(homedir(), '~')));
    }
  }
  blank();
}

function printJson(cfg) {
  const dir = cfg.projectsDir;
  const scanned = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.'))
        .map(d => ({ name: d.name, path: join(dir, d.name), source: 'scan' }))
    : [];
  const registered = Object.entries(cfg.projects || {})
    .filter(([, v]) => v.path)
    .map(([name, v]) => ({ name, path: v.path, source: 'registered', agent: v.agent ?? null }));
  console.log(JSON.stringify({ projectsDir: dir, projects: [...scanned, ...registered] }, null, 2));
}
