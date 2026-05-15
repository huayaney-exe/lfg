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
