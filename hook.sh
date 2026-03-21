#!/bin/zsh

# lfg hook — fired on pane focus change
# Translates surface ID → project directory, triggers yazi restart

export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/Applications/cmux.app/Contents/Resources/bin:$PATH"
[[ -z "$HOME" ]] && export HOME=~

STATE_DIR="$HOME/.config/lfg/state"
MAP_FILE="$STATE_DIR/surface-map"
ACTIVE_FILE="$STATE_DIR/active-dir"
CMUX="/Applications/cmux.app/Contents/Resources/bin/cmux"

[[ ! -f "$MAP_FILE" ]] && exit 0

# Get focused surface
FOCUSED="${CMUX_SURFACE_ID}"
if [[ -z "$FOCUSED" ]]; then
  FOCUSED=$("$CMUX" identify --no-caller 2>/dev/null | /usr/bin/grep -oE 'surface:[0-9]+' | /usr/bin/head -1)
fi
[[ -z "$FOCUSED" ]] && exit 0

# Skip if yazi pane itself was clicked
FILES_SURF=$(/usr/bin/cat "$STATE_DIR/files-surface" 2>/dev/null)
[[ "$FOCUSED" == "$FILES_SURF" ]] && exit 0

# Look up directory for this surface
NEW_DIR=$(/usr/bin/grep "^${FOCUSED}=" "$MAP_FILE" 2>/dev/null | /usr/bin/cut -d= -f2-)
[[ -z "$NEW_DIR" ]] && exit 0

# Only act if project changed
CURRENT=$(/usr/bin/cat "$ACTIVE_FILE" 2>/dev/null)
if [[ "$NEW_DIR" != "$CURRENT" ]]; then
  echo "$NEW_DIR" > "$ACTIVE_FILE"
  WS_ID=$(/usr/bin/cat "$STATE_DIR/workspace-id" 2>/dev/null)
  # Quit yazi — the wrapper loop will relaunch in the new dir
  "$CMUX" send-key --surface "$FILES_SURF" --workspace "$WS_ID" q 2>/dev/null
fi
