#!/bin/zsh

# lfg opener — routes yazi file opens through cmux
# Called by yazi's opener config with the file path as argument

export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/Applications/cmux.app/Contents/Resources/bin:$PATH"
[[ -z "$HOME" ]] && export HOME=~

CMUX="/Applications/cmux.app/Contents/Resources/bin/cmux"
SCRIPT_DIR="${0:A:h}"
STATE_DIR="${LFG_STATE_DIR:-$HOME/.config/lfg/state}"
WS_ID=$(/usr/bin/cat "$STATE_DIR/workspace-id" 2>/dev/null)

FILE="$1"
[[ -z "$FILE" ]] && exit 1

# Get file extension (zsh syntax)
EXT="${FILE:e:l}"

case "$EXT" in
  md|mdx)
    # Markdown → cmux formatted viewer with live reload
    "$CMUX" markdown open "$FILE" 2>/dev/null
    ;;
  *)
    # Code/text → new surface tab with editor
    EDIT_CMD="${EDITOR:-less}"
    RESULT=$("$CMUX" new-surface --workspace "$WS_ID" 2>&1)
    SURF=$(echo "$RESULT" | /usr/bin/grep -oE 'surface:[0-9]+')
    if [[ -n "$SURF" ]]; then
      "$CMUX" rename-tab --surface "$SURF" --workspace "$WS_ID" "$(basename "$FILE")" 2>/dev/null
      "$CMUX" send --surface "$SURF" --workspace "$WS_ID" "$EDIT_CMD '$FILE'" 2>/dev/null
      sleep 0.1
      "$CMUX" send-key --surface "$SURF" --workspace "$WS_ID" enter 2>/dev/null
    fi
    ;;
esac
