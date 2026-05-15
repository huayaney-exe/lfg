// Auto-install helper. Detects package manager, prompts, streams install,
// re-verifies. Always confirms before running — no silent shell execution.

import { spawn } from 'node:child_process';
import { c } from './ui.mjs';
import { confirm } from './prompts.mjs';
import { hasCommand } from './platform.mjs';

const KNOWN_PACKAGE_MANAGERS = new Set([
  'npm', 'bun', 'pnpm', 'yarn',
  'pip', 'pip3',
  'brew',
  'gh',
  'winget',
  'apt', 'apt-get',
  'dnf', 'pacman',
]);

// Stream a shell command's stdout/stderr to the terminal; resolve with exit code.
export function runStreaming(command) {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true, stdio: 'inherit' });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

/**
 * Offer to install something. Idempotent — skips if already installed.
 *
 * @param {object} opts
 * @param {string} opts.label             Human label (e.g. "cmux")
 * @param {string} opts.command           Shell command to install (e.g. "brew install --cask cmux")
 * @param {() => boolean} opts.verify     Returns true if already installed
 * @param {string=} opts.packageManager   If set, require this PM on PATH (e.g. "brew")
 * @param {string=} opts.fallback         Message shown when PM is missing
 * @param {boolean=} opts.defaultYes      Default answer for prompt (default true)
 * @returns {Promise<{installed: boolean, ran: boolean, reason?: string}>}
 */
export async function offerInstall(opts) {
  const {
    label,
    command,
    verify,
    packageManager,
    fallback,
    defaultYes = true,
  } = opts;

  // Already installed — skip cleanly
  if (verify()) {
    return { installed: true, ran: false, reason: 'already-installed' };
  }

  // Determine which PM to check: explicit param, or first token if it's known
  const firstToken = command.split(/\s+/)[0];
  const pmToCheck = packageManager ?? (KNOWN_PACKAGE_MANAGERS.has(firstToken) ? firstToken : null);

  if (pmToCheck && !hasCommand(pmToCheck)) {
    console.log('  ' + c.yellow('⚠ ') + `${pmToCheck} not found on PATH.`);
    if (fallback) console.log('  ' + c.dim(fallback));
    console.log('  ' + c.dim(`Then re-run setup or install manually:  `) + c.cyan(command));
    return { installed: false, ran: false, reason: 'no-package-manager' };
  }

  const yes = await confirm(
    `Install ${c.bold(label)} now?  ${c.dim(command)}`,
    defaultYes,
  );
  if (!yes) {
    console.log('  ' + c.dim('Skipped. To install later, run:  ') + c.cyan(command));
    return { installed: false, ran: false, reason: 'declined' };
  }

  console.log('');
  const code = await runStreaming(command);
  console.log('');

  if (code !== 0) {
    console.log('  ' + c.red('✗ ') + `${label} install failed (exit ${code}).`);
    console.log('  ' + c.dim('Run manually:  ') + c.cyan(command));
    return { installed: false, ran: true, reason: 'install-failed' };
  }

  // Re-verify — install may have succeeded but binary not yet on PATH
  if (!verify()) {
    console.log('  ' + c.yellow('⚠ ') + `${label} install reported success but verification failed.`);
    console.log('  ' + c.dim('You may need to restart your shell, then re-run ') + c.cyan('lfg doctor'));
    return { installed: false, ran: true, reason: 'verify-failed' };
  }

  console.log('  ' + c.green('✓ ') + `${label} installed`);
  return { installed: true, ran: true };
}
