# lfg

Multi-agent workspace launcher. Run 1–4 AI coding agents side by side with a file tree that auto-syncs to the focused pane.

```
┌──────────┬────────────────────┬────────────────────┐
│          │                    │                    │
│  files   │   agent (proj A)   │   agent (proj B)   │
│  tree    │                    │                    │
│          │                    │                    │
│  ← auto  ├────────────────────┼────────────────────┤
│  syncs   │                    │                    │
│          │   agent (proj C)   │   agent (proj D)   │
│          │                    │                    │
└──────────┴────────────────────┴────────────────────┘
```

Supports Claude Code, Codex CLI, Cursor Agent, Aider, Gemini CLI, GitHub Copilot CLI, OpenCode — or any command of your choice.

## Install

**One-line installer** (recommended — auto-handles npm permissions, never uses sudo):

```sh
curl -fsSL https://raw.githubusercontent.com/huayaney-exe/lfg/main/install.sh | bash
```

The script picks Bun if you have it, falls back to npm, and reconfigures the npm prefix to a user-owned dir if needed.

**Or install manually with your package manager:**

```sh
npm i -g lfg-cli              # or: bun i -g lfg-cli
lfg                           # first run launches the setup wizard
```

**Or try without installing globally:**

```sh
npx lfg-cli                   # bunx lfg-cli
```

### Hitting `EACCES` with manual `npm i -g`?

The one-line installer above handles this automatically. If you prefer to fix it yourself:

```sh
# Easiest: install via Bun (manages globals in user-owned dir)
brew install oven-sh/bun/bun && bun i -g lfg-cli

# Or: switch to a Node version manager (recommended long-term)
brew install fnm && fnm install 22 && fnm use 22
npm i -g lfg-cli

# Or: reconfigure npm prefix without changing Node
mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc && source ~/.zshrc
npm i -g lfg-cli
```

Avoid `sudo npm i -g` — works but leaves root-owned files in your Node install that bite later.

### Requirements

- Node **≥ 22** (current active LTS)
- A terminal multiplexer:
  - **macOS:** [cmux](https://cmux.dev) — `brew install --cask cmux`
  - **Windows / Linux:** Wezterm (in beta — see roadmap)
- An AI coding agent on your `PATH` (Claude Code, Aider, Codex, etc.) — the setup wizard offers install commands

## Use

```sh
lfg                  # interactive picker — pick 1–4 projects, launch
lfg list             # show registered + auto-scanned projects
lfg add              # register the current dir as a project
lfg config           # view config; `lfg config agent aider` to change
lfg doctor           # diagnose dependencies, paths, config
lfg help             # full command reference
```

### File tree controls

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate |
| Click / Enter | Expand/collapse folders |
| Enter (on file) | Open in new cmux tab |
| `p` | Copy file path to clipboard |
| `.` | Toggle hidden files |
| `Cmd+Shift+U` | Jump to agent needing input |

### Pane sync

Click any agent pane — the file tree automatically switches to show that project's files. No manual switching.

## Configuration

Config lives at `~/.config/lfg/config.json`:

```json
{
  "schemaVersion": 1,
  "projectsDir": "/Users/you/projects",
  "agent": "claude",
  "agentLabel": "Claude Code",
  "mux": "cmux",
  "projects": {
    "myapp": { "agent": "aider" }
  }
}
```

Change a setting:

```sh
lfg config agent aider              # switch default agent
lfg config projectsDir ~/code       # switch scan dir
lfg config edit                     # open in $EDITOR
lfg config reset                    # re-run setup wizard
```

### Per-project agent override (planned, schema reserved)

The `projects.<name>.agent` field is already in the schema. CLI command to set it ships in v1.1.

### Environment overrides

For one-off runs without changing config:

```sh
LFG_AGENT=codex lfg
LFG_PROJECTS=~/work-mono lfg
```

## How it works

```
lfg-cli/  (npm package)
├── bin/lfg.mjs           # Node entry, routes subcommands
├── src/
│   ├── commands/         # setup, launch, list, add, remove, config, doctor, …
│   ├── runtimes.mjs      # agent registry
│   ├── config.mjs        # ~/.config/lfg/config.json IO
│   ├── platform.mjs      # OS + dep detection
│   ├── prompts.mjs       # zero-dep arrow-key prompts
│   └── ui.mjs            # colors, banner, helpers
└── scripts/              # zsh layout + file-tree (cmux backend)
    ├── lfg.sh
    ├── picker.sh
    ├── tree.sh
    ├── opener.sh
    └── hook.sh
```

On macOS with cmux, `lfg launch` shells out to the bundled zsh scripts. The scripts build the workspace, spawn the chosen agent in each pane, and run a polling file-tree that syncs to focus via cmux's `after-select-pane` hook.

Windows/Linux Wezterm backend: planned for v1.1.

## Adaptive layouts

```
1 project:  [tree | agent]
2 projects: [tree | agent | agent]
3 projects: [tree | agent | agent] + [tree spans | agent]
4 projects: [tree | agent | agent] + [tree spans | agent | agent]
```

## Uninstall

```sh
lfg uninstall            # removes ~/.config/lfg/ + any legacy zsh alias
npm uninstall -g lfg-cli # removes the lfg binary
```

## License

MIT
