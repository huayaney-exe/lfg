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

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

say()  { printf "  ${CYAN}→${NC} %s\n" "$1"; }
ok()   { printf "  ${GREEN}✓${NC} %s\n" "$1"; }
warn() { printf "  ${YELLOW}⚠${NC} %s\n" "$1"; }
fail() { printf "  ${RED}✗${NC} %s\n" "$1"; exit 1; }

printf "\n  ${BOLD}⚡ lfg-cli installer${NC}\n\n"

# ── Path 1: Bun ─────────────────────────────────────────────────────────────
if command -v bun >/dev/null 2>&1; then
  say "Bun detected — using it (user-owned installs, no permission issues)"
  bun i -g lfg-cli
  ok "Installed via Bun"
  printf "\n  Run: ${CYAN}lfg${NC}\n\n"
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
  printf "\n  Run: ${CYAN}lfg${NC}\n\n"
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

printf "\n  ${BOLD}One more step:${NC} reload your shell so 'lfg' is on PATH\n"
if [ -n "$SHELL_RC" ]; then
  printf "    ${CYAN}source %s${NC}\n" "$SHELL_RC"
fi
printf "  Then run: ${CYAN}lfg${NC}\n\n"
