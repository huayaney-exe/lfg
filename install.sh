#!/usr/bin/env bash
# lfg-cli installer — handles npm permission issues without sudo.
#
# Usage:  curl -fsSL https://raw.githubusercontent.com/huayaney-exe/lfg/main/install.sh | bash
#
# Behavior:
#   1. If Bun is on PATH → bun i -g lfg-cli (cleanest, no permissions issue)
#   2. Else if npm prefix is user-writable → npm i -g lfg-cli
#   3. Else reconfigure npm prefix to ~/.npm-global, add to PATH, install
#
# Never uses sudo. Never modifies system paths.

set -e

# Use $'...' so variables expand to actual ESC bytes (not literal \033 strings).
# This lets the box renderer compute visible width correctly via sed.
GREEN=$'\033[0;32m'
CYAN=$'\033[0;36m'
YELLOW=$'\033[0;33m'
RED=$'\033[0;31m'
DIM=$'\033[2m'
BOLD=$'\033[1m'
NC=$'\033[0m'

say()  { printf "  ${CYAN}→${NC} %s\n" "$1"; }
ok()   { printf "  ${GREEN}✓${NC} %s\n" "$1"; }
warn() { printf "  ${YELLOW}⚠${NC} %s\n" "$1"; }
fail() { printf "  ${RED}✗${NC} %s\n" "$1"; exit 1; }

# ── Box renderer ────────────────────────────────────────────────────────────
# Renders a Unicode-bordered "teaching box" with a status line and content.
# Usage: print_box "TITLE" "line 1" "line 2" ...
# Lines are printed verbatim; the box auto-pads to fit the longest line.
print_box() {
  local title="$1"; shift
  local lines=("$@")
  local INNER_PAD=2          # spaces inside left/right borders
  local MIN_WIDTH=56         # min inner width so short boxes don't look cramped

  # Strip ANSI helper (works on macOS sed)
  _strip_ansi() { printf '%s' "$1" | sed -E $'s/\033\\[[0-9;]*[mK]//g'; }

  # Compute inner width as max(longest visible line + padding, MIN_WIDTH, title length)
  local maxw=0 line clean
  for line in "${lines[@]}"; do
    clean=$(_strip_ansi "$line")
    [ ${#clean} -gt $maxw ] && maxw=${#clean}
  done
  local title_clean
  title_clean=$(_strip_ansi "$title")
  local title_min=$(( ${#title_clean} + 4 ))   # "─ TITLE ─" baseline

  local inner=$(( maxw + INNER_PAD * 2 ))
  [ $inner -lt $MIN_WIDTH ] && inner=$MIN_WIDTH
  [ $inner -lt $title_min ] && inner=$title_min

  # Dash counts for top border around title
  local dashes_right=$(( inner - ${#title_clean} - 4 ))   # subtract "─ TITLE "
  [ $dashes_right -lt 1 ] && dashes_right=1

  local dash_str
  dash_str=$(printf '─%.0s' $(seq 1 $dashes_right))

  printf '\n  ╭─ %s %s╮\n' "$title" "$dash_str"
  # Empty line (top breathing room)
  printf '  │%*s│\n' $inner ''
  for line in "${lines[@]}"; do
    clean=$(_strip_ansi "$line")
    local pad=$(( inner - ${#clean} - INNER_PAD ))
    [ $pad -lt 0 ] && pad=0
    printf '  │  %s%*s│\n' "$line" $pad ''
  done
  printf '  │%*s│\n' $inner ''
  # Bottom border
  local bot_dashes
  bot_dashes=$(printf '─%.0s' $(seq 1 $inner))
  printf '  ╰%s╯\n\n' "$bot_dashes"
}

printf "\n  ${BOLD}⚡ lfg-cli installer${NC}\n\n"

# ── Path 1: Bun ─────────────────────────────────────────────────────────────
if command -v bun >/dev/null 2>&1; then
  say "Bun detected — using it (user-owned installs, no permission issues)"
  bun i -g lfg-cli
  ok "Installed via Bun"
  print_box "${GREEN}✓${NC} lfg-cli installed via Bun" \
    "${BOLD}You're ready.${NC}" \
    "" \
    "${BOLD}➊${NC}  Verify the install:" \
    "    ${CYAN}\$ lfg --version${NC}" \
    "" \
    "${BOLD}➋${NC}  Start the setup wizard:" \
    "    ${CYAN}\$ lfg${NC}"
  exit 0
fi

# ── Path 2: npm — check if we need fallback ────────────────────────────────
if ! command -v npm >/dev/null 2>&1; then
  warn "Neither bun nor npm found on PATH."
  printf "  ${DIM}Install one first:${NC}\n"
  printf "    ${CYAN}brew install oven-sh/bun/bun${NC}    # easiest\n"
  printf "    ${CYAN}brew install node${NC}               # if you prefer npm\n"
  exit 1
fi

NPM_PREFIX=$(npm config get prefix 2>/dev/null)
NODE_MODULES_DIR="$NPM_PREFIX/lib/node_modules"

# If the global node_modules dir is writable (or doesn't exist yet and parent is writable),
# straight npm install works.
prefix_writable() {
  local p="$NODE_MODULES_DIR"
  while [ ! -e "$p" ] && [ "$p" != "/" ]; do
    p=$(dirname "$p")
  done
  [ -w "$p" ]
}

if prefix_writable; then
  say "Installing with npm (prefix: $NPM_PREFIX)"
  npm i -g lfg-cli
  ok "Installed"
  print_box "${GREEN}✓${NC} lfg-cli installed via npm" \
    "${BOLD}You're ready.${NC}" \
    "" \
    "${BOLD}➊${NC}  Verify the install:" \
    "    ${CYAN}\$ lfg --version${NC}" \
    "" \
    "${BOLD}➋${NC}  Start the setup wizard:" \
    "    ${CYAN}\$ lfg${NC}"
  exit 0
fi

# ── Path 3: reconfigure npm to a user-owned prefix ──────────────────────────
warn "npm prefix $NPM_PREFIX needs sudo to write — switching to a user-owned prefix"

USER_PREFIX="$HOME/.npm-global"
mkdir -p "$USER_PREFIX"
npm config set prefix "$USER_PREFIX"
ok "Set npm prefix → $USER_PREFIX"

# Make sure PATH includes the new bin
SHELL_RC=""
case "${SHELL:-}" in
  */zsh)  SHELL_RC="$HOME/.zshrc"  ;;
  */bash) SHELL_RC="$HOME/.bashrc" ;;
  */fish) SHELL_RC="$HOME/.config/fish/config.fish" ;;
esac

EXPORT_LINE='export PATH="$HOME/.npm-global/bin:$PATH"'
if [ -n "$SHELL_RC" ] && [ -f "$SHELL_RC" ]; then
  if ! grep -q ".npm-global/bin" "$SHELL_RC" 2>/dev/null; then
    printf "\n# Added by lfg-cli installer\n%s\n" "$EXPORT_LINE" >> "$SHELL_RC"
    ok "Added ~/.npm-global/bin to PATH in $(basename "$SHELL_RC")"
  fi
fi

export PATH="$USER_PREFIX/bin:$PATH"

say "Installing lfg-cli into the new prefix"
npm i -g lfg-cli
ok "Installed at $USER_PREFIX/bin/lfg"

# Short shell rc display path for the box
SHELL_RC_SHORT="${SHELL_RC/$HOME/~}"
[ -z "$SHELL_RC_SHORT" ] && SHELL_RC_SHORT='~/.zshrc'

print_box "${GREEN}✓${NC} Installed — one last step" \
  "${BOLD}Your current terminal still has the old PATH.${NC}" \
  "" \
  "${BOLD}➊${NC}  Reload PATH in this terminal:" \
  "    ${CYAN}\$ source $SHELL_RC_SHORT && lfg${NC}" \
  "" \
  "${BOLD}➋${NC}  ${DIM}Or just open a new terminal and run:${NC}" \
  "    ${CYAN}\$ lfg${NC}" \
  "" \
  "${DIM}Why? Your shell loaded its config before we${NC}" \
  "${DIM}updated PATH. Reloading (or a new terminal)${NC}" \
  "${DIM}picks up the change.${NC}"
