# lfg

Multi-agent workspace launcher. Run 1–8 AI coding agents side by side with a file tree that auto-syncs to the focused pane.

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

Pick the command for your platform. Each one is **safe and one line**.

### 🪟 Windows

```powershell
npm i -g lfg-cli
```

That's it. Windows puts `npm` globals in `%AppData%\npm\` (user-owned), so no permission tricks needed.

### 🍎 macOS / 🐧 Linux

If you have **Bun**:
```sh
bun i -g lfg-cli
```

If you have **npm** (the standard case):
```sh
curl -fsSL https://raw.githubusercontent.com/huayaney-exe/lfg/main/install.sh | bash
```

> **What that curl line does, in plain English:**
>
> ① Downloads the [install script](./install.sh) from this repo.
> ② Runs it through `bash`. The script picks the best installer for your system.
> ③ If your `npm` prefix needs `sudo` (the default on macOS Node installs), the script switches you to a user-owned prefix at `~/.npm-global` and adds it to your `PATH` — **never uses sudo**.
>
> After it finishes, follow the framed **Last step** box at the bottom of its output.

### Verify

After install, open a **new terminal** (or `source ~/.zshrc` first) and run:

```sh
lfg --version    # → 1.0.2
lfg              # launches the setup wizard
```

If `lfg: command not found`, your shell hasn't reloaded yet. Open a fresh terminal window and try again.

### Try without installing

```sh
npx lfg-cli      # or: bunx lfg-cli
```

Note: `npx` doesn't put `lfg` on your PATH — you'd have to keep prefixing every command. Fine for trying, not for daily use.

### Requirements

- Node **≥ 22** (current active LTS)
- A terminal multiplexer:
  - **macOS:** [cmux](https://cmux.dev) — the setup wizard offers to install it for you (`brew install --cask cmux`)
  - **Windows / Linux:** Wezterm (in beta — see roadmap)
- An AI coding agent on your `PATH` (Claude Code, Aider, Codex, Cursor Agent, Aider, Gemini CLI, GitHub Copilot CLI, OpenCode) — the setup wizard offers install commands and runs them for you

## Use

```sh
lfg                  # interactive picker — pick 1–8 projects, launch
lfg list             # show registered + auto-scanned projects
lfg add              # register the current dir as a project
lfg config           # view config; `lfg config agent aider` to change
lfg doctor           # diagnose dependencies, paths, config
lfg update           # check for and install the latest lfg-cli
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
5 projects: [tree | a | a | a] + [tree spans | a | a]
6 projects: [tree | a | a | a] + [tree spans | a | a | a]
7 projects: [tree | a | a | a | a] + [tree spans | a | a | a]
8 projects: [tree | a | a | a | a] + [tree spans | a | a | a | a]
```

## Uninstall

```sh
lfg uninstall            # removes ~/.config/lfg/ + any legacy zsh alias
npm uninstall -g lfg-cli # removes the lfg binary
```

## License

MIT
