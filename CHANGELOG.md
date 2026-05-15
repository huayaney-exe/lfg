# Changelog

## 1.2.0 — 2026-05-15

### Added
- `lfg update` command. Checks the npm registry for the latest `lfg-cli`,
  prompts, then runs `npm i -g lfg-cli@<latest>`. Flags:
  - `--check` — print local vs latest only; exits 1 if behind, 0 if current.
  - `--yes` / `-y` — skip the confirmation prompt.
  - `--force` — reinstall even when already on the latest version.
- 8-second timeout on the registry request so a black-holed network can't
  hang the command indefinitely.

### Why
Before this, the only way to update was for users to remember
`npm i -g lfg-cli@latest` — invisible affordance, easy to drift. Bundling
it under `setup` would have hidden the entry point behind a wizard most
users run once, so `update` lives at the top level.

### Note on scripts refresh
`npm i -g` doesn't touch `~/.config/lfg/scripts/` — the bundled scripts
there get refreshed by `lfg setup` → "Update scripts only". The update
command prints this reminder after a successful install. A future release
may run the refresh automatically.

## 1.1.0 — 2026-05-15

### Added
- Picker `MAX_SELECT` raised from 4 → 8. The interactive picker now accepts
  up to 8 projects per launch.
- Layout branches for N=5..8 in `scripts/lfg.sh`. Pattern follows the
  existing 2-row ceil/floor split:
  - N=5: top row 3 cells, bottom row 2 cells
  - N=6: top row 3 cells, bottom row 3 cells
  - N=7: top row 4 cells, bottom row 3 cells
  - N=8: top row 4 cells, bottom row 4 cells
- `split_right` / `split_down` helper functions to keep new branches
  readable without refactoring the existing N=1..4 cases.

### Why
Requested by a user running multiple long-horizon agent tasks in parallel.
Four panes was the original ceiling because the explicit-branch layout
code didn't extend further; nothing in cmux limited us. The cap was
purely a script-side artifact.

### Caveat
cmux's `new-split right` halves the target surface, so chaining right-splits
off the newest surface yields progressively narrower cells (the rightmost
pane in a 4-cell row is ~12.5% of the row width). For evenly sized cells,
use `cmux resize-pane` after launch. A future release may auto-balance.

## 1.0.3 — 2026-05-15

### Added
- `bin/postinstall.mjs` — runs after `npm i -g lfg-cli` and prints a framed
  "✓ Installed" box with next-step instructions. Triggered only on global
  installs (`npm_config_global=true`); silent for local installs, dependency
  installs, and CI runs.
- `box(..., { stream: 'tty' })` — bypasses npm 7+'s lifecycle-script stdio
  buffering by writing directly to `/dev/tty`. Falls back to stderr where
  no controlling tty exists (Windows, CI, headless installers).

### Why
A Windows user (nicol) ran `npm i -g lfg-cli`, saw "added 1 package in 2s"
and was unsure if she was done. She then followed the README's Mac/Linux
curl|bash command and hit "bash: command not found." The postinstall box
makes the "you're done, type `lfg`" message unambiguous — at least on
Mac/Linux where /dev/tty cooperates. Windows users still rely on the
README's platform-specific install section (v1.0.2) which is now clear.

## 1.0.2 — 2026-05-15

### Didactic UX pass

Real users hit two predictable failure modes on v1.0.1:

1. After `install.sh` finished (Path 3 — reconfigured npm prefix), the
   "reload your shell" instruction was a one-liner buried below the install
   output. Users ran `lfg` immediately, got `command not found`, and got
   stuck.
2. Windows users (PowerShell) followed the README's curl|bash one-liner and
   hit "bash: command not found" — bash doesn't exist on default Windows.
   The README didn't differentiate platforms.

This release fixes both by adopting a consistent "teaching" pattern across
every surface where a user can get confused:

**Pattern A — Framed box for milestone moments.** A Unicode-bordered box
with numbered next-step options and a "Why?" footnote. Used at the end of
`install.sh` and at the end of `lfg setup`. Impossible to miss.

**Pattern B — 4-line error block.** Every error in every subcommand now
follows `✗ what failed` / `Why:` / `Fix:` / `More:`. Replaces the previous
mixed bag of one-liners. Errors become teaching moments.

**Pattern C — Concept line under wizard prompts.** Each setup-wizard
section now has a 1–2 line explanation of what the choice means and what
happens after.

**Pattern D — Platform-specific install instructions.** README now leads
with three clearly-labeled commands (Windows, macOS/Linux with Bun,
macOS/Linux with npm) instead of a single one-liner that breaks for one
of the three groups.

### Added
- `print_box` helper in `install.sh` — Unicode-bordered teaching box with
  auto-sized width, ANSI-aware padding.
- `box()` + `errorBlock()` helpers in `src/ui.mjs` — same pattern for the
  Node CLI.
- Unknown-command guard in `bin/lfg.mjs` — `lfg foo` (with config present)
  now errors with `Fix: lfg help` instead of silently passing through.

### Changed
- `install.sh` post-install message replaced with the framed box on all 3
  install paths (Bun / npm-writable / reconfigured-prefix). The
  reconfigured-prefix box includes the "Why?" explanation of why a shell
  reload is needed.
- README install section rewritten: platform-specific one-liners, plain-English
  explanation of what the curl|bash does, verification snippet, and a clear
  "open a new terminal if `lfg: command not found`" tip.
- Every subcommand's "no config" error now uses `errorBlock()` instead of
  ad-hoc text.

## 1.0.1 — 2026-05-15

### Added
- `install.sh` — one-line bootstrap installer
  (`curl -fsSL https://raw.githubusercontent.com/huayaney-exe/lfg/main/install.sh | bash`).
  Handles the standard macOS/Linux `EACCES` from `npm i -g` writing to
  `/usr/local/lib/node_modules/` without using sudo. Auto-detects Bun,
  falls back to npm, and reconfigures the npm prefix to `~/.npm-global`
  when the system prefix needs root.

### Changed
- README leads with the one-line installer; manual `npm i -g` / `bun i -g`
  paths kept as alternatives.

## 1.0.0 — 2026-05-15

First Node-CLI release.

### Added
- `npm i -g lfg-cli` / `bunx lfg-cli` install path.
- Setup wizard: deps check, projects-dir prompt (creates `~/projects` by default),
  agent runtime picker.
- Agent runtime registry: Claude Code, Codex CLI, Cursor Agent, Aider, Gemini CLI,
  GitHub Copilot CLI, OpenCode, plain shell.
- Subcommands: `setup`, `launch` (default), `list`, `add`, `remove`, `config`,
  `doctor`, `uninstall`, `help`.
- `--json` output on `list` and `doctor` for scripting.
- Per-project config schema (overrides reserved at `config.projects[name]`).
- Cross-platform detection — macOS launches via cmux + zsh scripts; Windows/Linux
  Wezterm backend stubbed with clear message.

### Changed
- Scripts moved to `scripts/` subdirectory.
- All shell scripts now read state from `$LFG_STATE_DIR` (falls back to
  `~/.config/lfg/state`), decoupling from script install location.
- `picker.sh` accepts a directory and treats each subdir as a project (paginated).
- `lfg.sh` chooses source by priority: `$LFG_PROJECTS` → `~/projects` →
  `projects.conf`.

### Removed
- Manual `git clone` install path from README (still works, but no longer the
  documented flow).

### Auto-install during setup
- Setup wizard now offers to install missing dependencies in-place instead
  of just printing the command. On macOS it runs `brew install --cask cmux`;
  on Windows `winget install wez.wezterm`; for the agent runtime it runs
  whatever install command the registry specifies (npm / pip / curl / gh).
- Always confirms before running — never silent. Failures are non-fatal:
  the wizard continues and the user can fix later via `lfg doctor`.
- Detects the package manager from the install command's first token; if
  the PM isn't on `PATH`, prints fallback guidance instead of dying mid-run.

### CI / dev
- `engines.node` bumped to `>=22` (Node 20 reached EOL on 2026-04-30).
- CI now runs three jobs: `lint` → `test` matrix (3 OS × Node 22, 24) → `pack`
  (tarball contents + global-install smoke). Lint catches syntax + packaging
  errors before paying for the matrix.
- Added `.github/workflows/release.yml`: tag-triggered (`v*`) pipeline that
  re-verifies on all 3 OSes before publishing to npm with provenance.
- Cross-platform `scripts/lint.mjs` replaces shell-loop lint.
- `node --test` uses the runner's built-in auto-discovery — no glob handling.
