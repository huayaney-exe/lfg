// First-run setup wizard.

import { existsSync, mkdirSync, readdirSync, cpSync, chmodSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { c, banner, header, ok, info, warn, fail, blank, hint, layoutPreview, box } from '../ui.mjs';
import { confirm, select, input } from '../prompts.mjs';
import { CONFIG_DIR, SCRIPTS_DIR, defaultConfig, saveConfig, loadConfig } from '../config.mjs';
import { IS_MAC, IS_WIN, IS_LINUX, detectMux, checkDeps, CMUX_BIN, hasCommand } from '../platform.mjs';
import { RUNTIMES, detectInstalledRuntimes } from '../runtimes.mjs';
import { offerInstall } from '../install.mjs';

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

  let muxReady = deps.mux.ok;
  if (!muxReady) {
    fail('No supported terminal multiplexer found.');
    blank();

    let result = { installed: false, ran: false };
    if (IS_MAC) {
      result = await offerInstall({
        label: 'cmux',
        command: 'brew install --cask cmux',
        verify: () => existsSync(CMUX_BIN),
        packageManager: 'brew',
        fallback: 'Install Homebrew first (https://brew.sh).',
      });
    } else if (IS_WIN) {
      result = await offerInstall({
        label: 'Wezterm',
        command: 'winget install wez.wezterm',
        verify: () => hasCommand('wezterm'),
        packageManager: 'winget',
        fallback: 'Install winget (Windows 10+) or download from https://wezfurlong.org/wezterm/',
      });
      if (result.installed) warn('Windows backend (Wezterm) is in beta.');
    } else {
      info('Install Wezterm: ' + c.cyan('https://wezfurlong.org/wezterm/install/linux.html'));
      info('Then re-run ' + c.cyan('lfg setup') + '.');
    }
    muxReady = result.installed;

    if (!muxReady) {
      blank();
      const proceed = await confirm('Continue setup without a multiplexer?', false);
      if (!proceed) return;
    }
  } else {
    ok(`${deps.mux.name} found`);
  }

  if (!deps.git.ok) warn('git not found — won\'t affect lfg, but useful for cloning projects');

  // --- 2. Projects directory ---
  header('2. Where do you keep your code projects?');
  hint('This is the folder lfg auto-scans. Any subdirectory becomes a project');
  hint('you can pick when you run `lfg`. Most devs use ~/projects.');
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
  hint('lfg spawns this command in every pane. You can override per-project later');
  hint('via `lfg config agent <name>`. Picks marked `installed` are already on PATH.');
  const installed = detectInstalledRuntimes();
  const runtimeOpts = installed.map(r => ({
    label: r.label,
    value: r.id,
    hint: r.installed ? c.green('installed') : c.dim('not installed'),
  }));
  const agentId = await select('Default agent runtime:', runtimeOpts, 0);
  const runtime = RUNTIMES.find(r => r.id === agentId);

  const alreadyHaveAgent = installed.find(r => r.id === agentId).installed;
  if (!alreadyHaveAgent && runtime.install) {
    blank();
    const agentBin = runtime.cmd.split(' ')[0];
    const result = await offerInstall({
      label: runtime.label,
      command: runtime.install,
      verify: () => hasCommand(agentBin),
    });
    if (!result.installed && runtime.docs) {
      info('Docs: ' + c.dim(runtime.docs));
    }
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

  // --- 5. Done ---
  layoutPreview();

  box(c.green('✓') + ' Setup complete', [
    c.bold('lfg is ready to launch.'),
    '',
    c.bold('➊') + '  Launch the picker (pick 1–4 projects):',
    '    ' + c.cyan('$ lfg'),
    '',
    c.bold('➋') + '  ' + c.dim('See registered projects:'),
    '    ' + c.cyan('$ lfg list'),
    '',
    c.bold('➌') + '  ' + c.dim('Diagnose issues:'),
    '    ' + c.cyan('$ lfg doctor'),
    '',
    c.dim('Run ') + c.cyan('lfg help') + c.dim(' for the full command list.'),
  ]);
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
