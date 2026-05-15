# Changelog

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
