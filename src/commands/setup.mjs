// First-run setup wizard.

import { existsSync, mkdirSync, readdirSync, cpSync, chmodSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { c, banner, header, ok, info, warn, fail, blank, hint, layoutPreview } from '../ui.mjs';
import { confirm, select, input } from '../prompts.mjs';
import { CONFIG_DIR, SCRIPTS_DIR, defaultConfig, saveConfig, loadConfig } from '../config.mjs';
import { IS_MAC, IS_WIN, IS_LINUX, detectMux, checkDeps, CMUX_BIN } from '../platform.mjs';
import { RUNTIMES, detectInstalledRuntimes } from '../runtimes.mjs';

export default async function setup({ pkgRoot }) {
  banner();

  // Detect re-install
  const existing = loadConfig();
  if (existing) {
    console.log('  ' + c.yellow('Existing lfg config detected.'));
    const choice = await select('What would you like to do?', [
      { label: 'Update scripts only (keep my settings)', value: 'update' },
      { label: 'Reconfigure from scratch',                value: 'reset' },
      { label: 'Cancel',                                  value: 'cancel' },
    ]);
    if (choice === 'cancel') return;
    if (choice === 'update') {
      await installScripts(pkgRoot);
      ok('Scripts updated at ' + c.cyan(SCRIPTS_DIR));
      blank();
      return;
    }
    // 'reset' falls through
  }

  header('1. Checking dependencies');
  const deps = checkDeps();
  ok(`Node ${deps.node.version}`);

  if (!deps.mux.ok) {
    fail('No supported terminal multiplexer found.');
    if (IS_MAC) {
      info(`Install ${c.bold('cmux')}:  ${c.cyan('brew install --cask cmux')}  ${c.dim('(or https://cmux.dev)')}`);
    } else if (IS_WIN) {
      info(`Install ${c.bold('Wezterm')}:  ${c.cyan('winget install wez.wezterm')}`);
      warn('Note: Windows backend (Wezterm) is in beta. See README.');
    } else {
      info(`Install ${c.bold('Wezterm')}:  ${c.cyan('https://wezfurlong.org/wezterm/install/linux.html')}`);
    }
    blank();
    const proceed = await confirm('Continue setup anyway?', false);
    if (!proceed) return;
  } else {
    ok(`${deps.mux.name} found`);
  }

  if (!deps.git.ok) warn('git not found — won\'t affect lfg, but useful for cloning projects');

  // --- 2. Projects directory ---
  header('2. Where do you keep your code projects?');
  hint('lfg auto-scans this folder. Anything you git clone here becomes selectable.');
  const homeProjects = join(homedir(), 'projects');
  const projectsDir = await chooseProjectsDir(homeProjects);
  if (!existsSync(projectsDir)) {
    mkdirSync(projectsDir, { recursive: true });
    ok('Created ' + c.cyan(projectsDir));
  } else {
    const entries = readdirSync(projectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'));
    if (entries.length > 0) {
      ok(`Found ${entries.length} project(s) in ${c.cyan(projectsDir)}`);
    } else {
      info(c.cyan(projectsDir) + c.dim(' is empty — that\'s fine, add projects later with `lfg add` or git clone'));
    }
  }

  // --- 3. Agent runtime ---
  header('3. Pick your default coding agent');
  hint('This is what lfg launches in each pane. You can switch per-project later.');
  const installed = detectInstalledRuntimes();
  const runtimeOpts = installed.map(r => ({
    label: r.label,
    value: r.id,
    hint: r.installed ? c.green('installed') : c.dim('not installed'),
  }));
  const agentId = await select('Default agent runtime:', runtimeOpts, 0);
  const runtime = RUNTIMES.find(r => r.id === agentId);

  if (!installed.find(r => r.id === agentId).installed && runtime.install) {
    blank();
    console.log('  ' + c.dim('Install command: ') + c.cyan(runtime.install));
    if (runtime.docs) console.log('  ' + c.dim('Docs: ') + c.dim(runtime.docs));
    blank();
    info('lfg will use ' + c.bold(runtime.label) + ' once it\'s on your PATH.');
  }

  // --- 4. Write config + install scripts ---
  header('4. Installing');
  await installScripts(pkgRoot);
  ok('Scripts copied to ' + c.cyan(SCRIPTS_DIR));

  const cfg = {
    ...defaultConfig(),
    projectsDir,
    agent: runtime.cmd,
    agentLabel: runtime.label,
    mux: deps.mux.name || (IS_MAC ? 'cmux' : 'wezterm'),
    firstRunAt: new Date().toISOString(),
  };
  saveConfig(cfg);
  ok('Config written to ' + c.cyan(join(CONFIG_DIR, 'config.json')));

  // Remove any legacy zsh alias so the new Node bin takes over
  removeLegacyAlias();

  // --- 5. Preview ---
  blank();
  header('Setup complete');
  layoutPreview();

  console.log('  ' + c.bold('Next:'));
  console.log('    ' + c.cyan('lfg') + c.dim('              launch the picker'));
  console.log('    ' + c.cyan('lfg list') + c.dim('         show registered projects'));
  console.log('    ' + c.cyan('lfg add <path>') + c.dim('   register a project outside ') + c.cyan(projectsDir));
  console.log('    ' + c.cyan('lfg doctor') + c.dim('       diagnose any issues'));
  console.log('    ' + c.cyan('lfg help') + c.dim('         see all commands'));
  blank();
}

async function chooseProjectsDir(defaultPath) {
  const candidates = [
    join(homedir(), 'projects'),
    join(homedir(), 'code'),
    join(homedir(), 'dev'),
    join(homedir(), 'work'),
    join(homedir(), 'Documents', 'GitHub'),
  ];
  const options = candidates.map(p => ({
    label: p.replace(homedir(), '~'),
    value: p,
    hint: existsSync(p) ? c.green('exists') : c.dim('will create'),
  }));
  options.push({ label: 'Custom path…', value: '__custom__' });

  const chosen = await select('Pick a projects directory:', options);
  if (chosen === '__custom__') {
    const custom = await input('Enter path:', defaultPath);
    return custom.replace(/^~/, homedir());
  }
  return chosen;
}

async function installScripts(pkgRoot) {
  if (!existsSync(SCRIPTS_DIR)) mkdirSync(SCRIPTS_DIR, { recursive: true });
  const src = join(pkgRoot, 'scripts');
  for (const f of readdirSync(src)) {
    cpSync(join(src, f), join(SCRIPTS_DIR, f));
    if (f.endsWith('.sh')) chmodSync(join(SCRIPTS_DIR, f), 0o755);
  }
}

function removeLegacyAlias() {
  const zshrc = join(homedir(), '.zshrc');
  if (!existsSync(zshrc)) return;
  const content = readFileSync(zshrc, 'utf8');
  const lines = content.split('\n');
  // Strict patterns — only touch lines that clearly belong to the old lfg installer.
  const isLegacy = (l) =>
    /^alias\s+lfg=.*\.config\/lfg(\/lfg\.sh|\/scripts\/lfg\.sh)/.test(l) ||
    /^#\s*lfg\s*—\s*multi-agent workspace launcher/.test(l);
  const filtered = lines.filter(l => !isLegacy(l));
  if (filtered.length === lines.length) return;

  // Back up before touching the user's file.
  const backup = `${zshrc}.lfg-backup-${Date.now()}`;
  copyFileSync(zshrc, backup);
  writeFileSync(zshrc, filtered.join('\n'), 'utf8');
  ok('Removed legacy zsh alias from ' + c.cyan('~/.zshrc') + c.dim(`  (backup: ${backup.replace(homedir(), '~')})`));
}
