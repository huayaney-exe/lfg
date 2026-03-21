# lfg

Multi-project workspace launcher for [cmux](https://cmux.dev) + AI coding agents.

Run 1-4 independent coding agents side by side with a syncing file tree sidebar. Click a pane, the file tree follows.

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

## Requirements

- [cmux](https://cmux.dev) — modern terminal multiplexer (macOS)
- zsh (default on macOS)
- An AI coding agent (`claude`, `cursor`, `aider`, etc.)

## Install

```sh
git clone https://github.com/YOUR_USER/lfg.git ~/.config/lfg
cd ~/.config/lfg
chmod +x install.sh lfg.sh picker.sh tree.sh opener.sh hook.sh
./install.sh
```

## Setup

Edit `~/.config/lfg/projects.conf` — one project per line:

```
myapp|~/projects/myapp
backend|~/work/backend-api
docs|~/projects/documentation
```

## Usage

```sh
lfg
```

1. Arrow keys to navigate, Space to select projects (max 4), Enter to launch
2. cmux workspace opens with your agent in each pane + file tree on the left
3. Click between agent panes — the file tree auto-switches to that project
4. Inside the file tree:
   - Arrow keys / click to navigate
   - Click or Enter on folders to expand/collapse
   - Enter on files to open in a new cmux tab
   - `p` to copy file path
   - `.` to toggle hidden files

## Configuration

**Agent command** — defaults to `claude`. Override with:

```sh
LFG_AGENT=aider lfg
LFG_AGENT="cursor --cli" lfg
```

**Projects** — edit `projects.conf` anytime. Changes take effect on next launch.

## Architecture

```
~/.config/lfg/
├── lfg.sh          # Main launcher — creates workspace, builds layout
├── picker.sh       # Interactive project selector TUI
├── tree.sh         # File browser TUI (pure zsh, mouse support)
├── opener.sh       # Routes file opens through cmux
├── hook.sh         # Pane focus hook for file tree sync
├── projects.conf   # Your project registry
└── state/          # Runtime state (gitignored)
```

All components are pure zsh with zero dependencies beyond cmux.

## How it works

1. `lfg.sh` creates a cmux workspace and splits it into an adaptive grid based on how many projects you selected
2. Each pane gets your agent launched in the project directory
3. The left pane runs `tree.sh` — a custom file browser that polls cmux to detect which agent pane is focused
4. When you click a different agent pane, the file tree rebuilds showing that project's files
5. Opening a file from the tree creates a new cmux surface (tab) with your editor

## License

MIT
