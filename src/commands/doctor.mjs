// `lfg doctor` — diagnose install + deps.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import { c, banner, ok, warn, fail, info, blank, header } from '../ui.mjs';
import { loadConfig, CONFIG_PATH, SCRIPTS_DIR, STATE_DIR } from '../config.mjs';
import { IS_MAC, IS_WIN, CMUX_BIN, hasCommand, checkDeps } from '../platform.mjs';

export default async function doctor({ args }) {
  const json = args?.includes('--json');
  if (json) return doctorJson();

  banner();
  header('Diagnostics');

  let issues = 0;

  // Config
  const cfg = loadConfig();
  if (cfg) ok('Config found at ' + c.cyan(CONFIG_PATH));
  else { fail('Config missing — run ' + c.cyan('lfg setup')); issues++; }

  // Scripts
  if (existsSync(SCRIPTS_DIR)) {
    const have = readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.sh'));
    ok(`Scripts installed (${have.length}) at ` + c.cyan(SCRIPTS_DIR));
  } else { fail('Scripts not installed — run ' + c.cyan('lfg setup')); issues++; }

  // Platform deps
  const deps = checkDeps();
  ok(`Node ${deps.node.version}`);

  if (cfg?.mux === 'cmux') {
    if (existsSync(CMUX_BIN)) ok('cmux installed');
    else { fail('cmux missing at ' + CMUX_BIN); info('Install: ' + c.cyan('brew install --cask cmux')); issues++; }
  } else if (cfg?.mux === 'wezterm') {
    if (hasCommand('wezterm')) ok('Wezterm installed');
    else { fail('Wezterm missing on PATH'); issues++; }
  }

  // Agent
  if (cfg?.agent) {
    const agentBin = cfg.agent.split(' ')[0];
    if (hasCommand(agentBin)) ok(`Agent ${c.bold(cfg.agentLabel)} (${cfg.agent}) on PATH`);
    else { warn(`Agent ${cfg.agentLabel} (${cfg.agent}) not on PATH`); }
  }

  // Projects dir
  if (cfg?.projectsDir) {
    if (existsSync(cfg.projectsDir)) {
      const count = readdirSync(cfg.projectsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.')).length;
      ok(`Projects dir: ${c.cyan(cfg.projectsDir.replace(homedir(), '~'))}  ${c.dim('(' + count + ' projects)')}`);
    } else { fail('Projects dir missing: ' + cfg.projectsDir); issues++; }
  }

  // State dir (informational)
  if (existsSync(STATE_DIR)) ok('State dir exists at ' + c.cyan(STATE_DIR.replace(homedir(), '~')));
  else info('State dir not yet created (will be on first launch)');

  blank();
  if (issues === 0) {
    ok(c.green('All checks passed. lfg is ready.'));
  } else {
    fail(c.red(`${issues} issue(s) need attention.`));
  }
  blank();
}

function doctorJson() {
  const cfg = loadConfig();
  const deps = checkDeps();
  const result = {
    node: deps.node.version,
    mux: cfg?.mux ?? null,
    muxInstalled: cfg?.mux === 'cmux' ? existsSync(CMUX_BIN) : (cfg?.mux === 'wezterm' ? hasCommand('wezterm') : false),
    agent: cfg?.agent ?? null,
    agentInstalled: cfg?.agent ? hasCommand(cfg.agent.split(' ')[0]) : false,
    projectsDir: cfg?.projectsDir ?? null,
    projectsDirExists: cfg?.projectsDir ? existsSync(cfg.projectsDir) : false,
    config: !!cfg,
    scripts: existsSync(SCRIPTS_DIR),
    state: existsSync(STATE_DIR),
  };
  result.ok = result.config && result.scripts && result.muxInstalled;
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
