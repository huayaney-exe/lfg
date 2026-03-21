# lfg

Multi-project workspace launcher for [cmux](https://cmux.dev) + AI coding agents.

Run 1–4 coding agents side by side with a file tree that auto-syncs to the focused pane. Pure zsh. Zero dependencies beyond cmux.

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

## Why

Working on multiple projects at once with AI agents means switching windows, losing context, and forgetting which agent is where. lfg gives you a single workspace where everything is visible and the file tree always shows the right project.

## Requirements

- [cmux](https://cmux.dev) — modern terminal multiplexer (macOS)
- zsh (default on macOS)
- An AI coding agent ([Claude Code](https://docs.anthropic.com/en/docs/claude-code), [aider](https://aider.chat), [Codex](https://github.com/openai/codex), etc.)

## Install

```sh
git clone https://github.com/huayaney-exe/lfg-launcher.git ~/.config/lfg
cd ~/.config/lfg
chmod +x install.sh lfg.sh picker.sh tree.sh opener.sh hook.sh
./install.sh
```

This adds an `lfg` alias to your `~/.zshrc` and creates a starter `projects.conf`.

## Setup

Edit `~/.config/lfg/projects.conf` — one project per line, `name|path` format:

```
myapp|~/projects/myapp
backend|~/work/backend-api
docs|~/projects/documentation
```

## Usage

```sh
lfg
```

The picker shows your registered projects. Arrow keys to navigate, Space to toggle (max 4), Enter to launch.

### File tree controls

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate |
| Click / Enter | Expand/collapse folders |
| Enter (on file) | Open in new cmux tab |
| `p` | Copy file path to clipboard |
| `.` | Toggle hidden files |
| Scroll wheel | Scroll the tree |

### Pane sync

Click any agent pane — the file tree automatically switches to show that project's files. No manual switching needed.

## Configuration

### Agent command

Defaults to `claude`. Override with the `LFG_AGENT` environment variable:

```sh
LFG_AGENT=aider lfg
LFG_AGENT="codex" lfg
```

### Adaptive layouts

lfg builds the grid based on how many projects you select:

```
1 project:  [tree | agent]
2 projects: [tree | agent | agent]
3 projects: [tree | agent | agent] + [tree spans | agent]
4 projects: [tree | agent | agent] + [tree spans | agent | agent]
```

## Architecture

```
~/.config/lfg/
├── lfg.sh            # Main launcher — workspace creation, layout, agent spawn
├── picker.sh         # Interactive project selector TUI
├── tree.sh           # File browser TUI with mouse + keyboard support
├── opener.sh         # Routes file opens → cmux markdown viewer or editor tab
├── hook.sh           # Pane focus hook for file tree sync
├── install.sh        # One-time setup (alias + starter config)
├── projects.conf     # Your project registry (gitignored)
└── state/            # Runtime ephemeral state (gitignored)
```

### How it works

1. **`lfg.sh`** creates a cmux workspace and splits it into an adaptive grid
2. Each pane gets your agent launched via `cd <project> && <agent command>`
3. The left pane runs **`tree.sh`** — a custom file browser built in pure zsh with SGR mouse tracking
4. `tree.sh` polls `cmux identify` every 500ms to detect which pane is focused, maps the surface ID to a project directory via `state/surface-map`, and rebuilds the tree
5. **`hook.sh`** provides a secondary sync mechanism via cmux's `after-select-pane` hook
6. **`opener.sh`** handles file opens: markdown files go to cmux's built-in viewer, everything else opens in a new surface tab with `$EDITOR`

## License

MIT
