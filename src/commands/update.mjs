// `lfg update` — check for and install the latest lfg-cli release.
//
// Default:        check npm registry, prompt, run `npm i -g lfg-cli@latest`.
// --check         print local vs latest, exit 1 if behind, exit 0 if current.
// --yes / -y      skip the confirmation prompt.
// --force         reinstall even when already on the latest version.
//
// Why this lives as its own command (not a doctor flag or setup option):
// updating is a top-level user intent ("is there anything new?") and the
// answer should be one keystroke away. Bundling it under setup would hide
// the affordance behind a wizard most users only run once.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { c, banner, header, ok, info, blank, errorBlock } from '../ui.mjs';
import { confirm } from '../prompts.mjs';

const PKG_NAME = 'lfg-cli';
const REGISTRY = 'https://registry.npmjs.org';

export default async function update({ args, pkgRoot }) {
  const flags = parseFlags(args);

  banner();
  header('Checking for updates');

  // Local version from this package's manifest. Reading the file (not
  // import.meta) keeps this honest if the user's install was patched in place.
  const localPkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'));
  const local = localPkg.version;
  info('Current: ' + c.cyan('v' + local));

  let latest;
  try {
    latest = await fetchLatest();
  } catch (err) {
    errorBlock({
      what: 'Could not reach npm registry',
      why: err.message,
      fix: 'Check your network connection and try again',
      exitCode: 1,
    });
  }
  info('Latest:  ' + c.cyan('v' + latest));
  blank();

  const behind = semverCompare(local, latest) < 0;

  if (flags.check) {
    if (behind) {
      console.log('  ' + c.yellow('⚠ ') + 'Update available — run ' + c.cyan('lfg update'));
      blank();
      process.exit(1);
    }
    ok('Up to date.');
    blank();
    return;
  }

  if (!behind && !flags.force) {
    ok('Already on the latest version.');
    blank();
    return;
  }

  if (!flags.yes) {
    const msg = behind
      ? `Install v${latest}? (current v${local})`
      : `Reinstall v${latest}?`;
    const proceed = await confirm(msg, true);
    if (!proceed) {
      info('Cancelled.');
      blank();
      return;
    }
  }

  header('Installing');
  // We always pin to the resolved `latest` (not the tag) so the message
  // above matches what actually gets installed, even if `latest` shifts
  // between the check and the install.
  const target = `${PKG_NAME}@${latest}`;
  const res = spawnSync('npm', ['i', '-g', target], { stdio: 'inherit' });

  if (res.status !== 0) {
    // EACCES on global installs is common and has a dedicated remediation
    // path in the repo's install.sh + README. Don't try to diagnose here;
    // just point the user at the right place.
    errorBlock({
      what: `npm install failed (exit ${res.status ?? 'unknown'})`,
      why: 'See npm output above. Permission errors (EACCES) usually mean npm prefix is in a system dir',
      fix: 'See https://github.com/huayaney-exe/lfg#installation for EACCES remediation',
      exitCode: res.status ?? 1,
    });
  }

  blank();
  ok(`Installed ${target}`);
  info('Refresh bundled scripts: ' + c.cyan('lfg setup') + c.dim(' → "Update scripts only"'));
  blank();
}

function parseFlags(args) {
  return {
    check: args.includes('--check'),
    yes:   args.includes('--yes') || args.includes('-y'),
    force: args.includes('--force'),
  };
}

// Returns -1 if a < b, 0 if equal, 1 if a > b. Strips pre-release tags
// because we only publish stable versions today; if that changes, switch
// to the `semver` package and re-evaluate.
function semverCompare(a, b) {
  const norm = (v) => v.split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const pa = norm(a);
  const pb = norm(b);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

async function fetchLatest() {
  const url = `${REGISTRY}/${PKG_NAME}/latest`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // Node 22 fetch honors AbortSignal.timeout; this prevents the command
    // from hanging on a network black hole.
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`registry returned HTTP ${res.status}`);
  const json = await res.json();
  if (!json.version) throw new Error('registry response missing version field');
  return json.version;
}
