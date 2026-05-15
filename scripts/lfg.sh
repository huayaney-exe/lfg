#!/bin/zsh

# lfg v3 — workspace launcher for cmux + Claude Code
# Usage: lfg  (or ~/.config/lfg/lfg.sh)

export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/Applications/cmux.app/Contents/Resources/bin:$PATH"

SCRIPT_DIR="${0:A:h}"
CMUX="/Applications/cmux.app/Contents/Resources/bin/cmux"
AGENT_CMD="${LFG_AGENT:-claude}"
STATE_DIR="${LFG_STATE_DIR:-$HOME/.config/lfg/state}"

# ── Validate ──
[[ ! -x "$CMUX" ]] && echo "  cmux not found" && exit 1

# ── Clean stale state ──
rm -rf "$STATE_DIR"
mkdir -p "$STATE_DIR"

# Close existing lfg workspace if any
EXISTING=$("$CMUX" list-workspaces 2>&1 | /usr/bin/grep -oE 'workspace:[0-9]+')
if [[ -n "$EXISTING" ]]; then
  for ws in ${(f)EXISTING}; do
    # Check if this workspace is named "lfg" by reading its tree
    WS_TREE=$("$CMUX" tree --workspace "$ws" 2>&1)
    if echo "$WS_TREE" | /usr/bin/grep -q '"lfg"'; then
      "$CMUX" close-workspace --workspace "$ws" &>/dev/null
    fi
  done
fi

# ── Pick projects ──
# Source priority:
#   1. $LFG_PROJECTS  (explicit override — file or directory)
#   2. ~/projects     (auto-scan when present)
#   3. projects.conf  (curated fallback)
LFG_SOURCE="${LFG_PROJECTS:-}"
if [[ -z "$LFG_SOURCE" ]]; then
  if [[ -d "$HOME/projects" ]]; then
    LFG_SOURCE="$HOME/projects"
  else
    LFG_SOURCE="$SCRIPT_DIR/projects.conf"
  fi
fi

echo ""
SELECTED=("${(@f)$("$SCRIPT_DIR/picker.sh" "$LFG_SOURCE")}")
N=${#SELECTED[@]}
[[ $N -eq 0 ]] && echo "  No projects selected." && exit 0

# Parse selections into arrays
SEL_NAMES=()
SEL_DIRS=()
for line in "${SELECTED[@]}"; do
  SEL_NAMES+=("${line%%|*}")
  SEL_DIRS+=("${line#*|}")
done

echo ""
echo "  ⚡ launching $N project(s)..."
echo ""

# ── Create workspace ──
WS_ID=$("$CMUX" new-workspace --cwd "${SEL_DIRS[1]}" 2>&1 | /usr/bin/grep -oE 'workspace:[0-9]+')
[[ -z "$WS_ID" ]] && echo "  ⚠ Failed to create workspace" && exit 1
"$CMUX" rename-workspace --workspace "$WS_ID" "lfg" &>/dev/null
echo "$WS_ID" > "$STATE_DIR/workspace-id"

# ── Build layout ──
# Get initial surface (becomes yazi sidebar)
ALL=$("$CMUX" list-pane-surfaces --workspace "$WS_ID" 2>&1)
FILES_SURF=$(echo "$ALL" | /usr/bin/grep -oE 'surface:[0-9]+' | /usr/bin/head -1)
echo "$FILES_SURF" > "$STATE_DIR/files-surface"

# Split right → files(left) | main(right)
SPLIT1=$("$CMUX" new-split right --surface "$FILES_SURF" --workspace "$WS_ID" 2>&1)
MAIN_SURF=$(echo "$SPLIT1" | /usr/bin/grep -oE 'surface:[0-9]+')
sleep 0.2

# Shrink files pane
FILES_PANE=$("$CMUX" list-panes --workspace "$WS_ID" 2>&1 | /usr/bin/grep -oE 'pane:[0-9]+' | /usr/bin/head -1)
[[ -n "$FILES_PANE" ]] && "$CMUX" resize-pane --pane "$FILES_PANE" --workspace "$WS_ID" -L --amount 25 &>/dev/null

# Helpers for N>=5 layouts. Echo the new surface ID; pace splits with sleep.
# Note: cmux halves the target surface on each split, so chained right-splits
# off the newest surface yield progressively narrower panes on the right.
# For evenly sized cells, balance manually with cmux resize-pane after launch.
split_right() {
  local out
  out=$("$CMUX" new-split right --surface "$1" --workspace "$WS_ID" 2>&1)
  echo "$out" | /usr/bin/grep -oE 'surface:[0-9]+'
  sleep 0.2
}
split_down() {
  local out
  out=$("$CMUX" new-split down --surface "$1" --workspace "$WS_ID" 2>&1)
  echo "$out" | /usr/bin/grep -oE 'surface:[0-9]+'
  sleep 0.2
}

SURF_LIST=()

if (( N == 1 )); then
  # [yazi | claude]
  SURF_LIST=("$MAIN_SURF")

elif (( N == 2 )); then
  # [yazi | c1 | c2]
  SPLIT2=$("$CMUX" new-split right --surface "$MAIN_SURF" --workspace "$WS_ID" 2>&1)
  SURF_2=$(echo "$SPLIT2" | /usr/bin/grep -oE 'surface:[0-9]+')
  SURF_LIST=("$MAIN_SURF" "$SURF_2")
  sleep 0.2

elif (( N == 3 )); then
  # [yazi | c1 | c2] top + [yazi spans | c3] bottom
  # Split main top/bottom
  SPLIT2=$("$CMUX" new-split down --surface "$MAIN_SURF" --workspace "$WS_ID" 2>&1)
  BOTTOM_SURF=$(echo "$SPLIT2" | /usr/bin/grep -oE 'surface:[0-9]+')
  sleep 0.2
  # Split top right
  SPLIT3=$("$CMUX" new-split right --surface "$MAIN_SURF" --workspace "$WS_ID" 2>&1)
  SURF_2=$(echo "$SPLIT3" | /usr/bin/grep -oE 'surface:[0-9]+')
  SURF_LIST=("$MAIN_SURF" "$SURF_2" "$BOTTOM_SURF")
  sleep 0.2

elif (( N == 4 )); then
  # [yazi | c1 | c2] top + [yazi spans | c3 | c4] bottom
  # Split main top/bottom
  SPLIT2=$("$CMUX" new-split down --surface "$MAIN_SURF" --workspace "$WS_ID" 2>&1)
  BOTTOM_SURF=$(echo "$SPLIT2" | /usr/bin/grep -oE 'surface:[0-9]+')
  sleep 0.2
  # Split top → c1 | c2
  SPLIT3=$("$CMUX" new-split right --surface "$MAIN_SURF" --workspace "$WS_ID" 2>&1)
  SURF_2=$(echo "$SPLIT3" | /usr/bin/grep -oE 'surface:[0-9]+')
  sleep 0.2
  # Split bottom → c3 | c4
  SPLIT4=$("$CMUX" new-split right --surface "$BOTTOM_SURF" --workspace "$WS_ID" 2>&1)
  SURF_4=$(echo "$SPLIT4" | /usr/bin/grep -oE 'surface:[0-9]+')
  SURF_LIST=("$MAIN_SURF" "$SURF_2" "$BOTTOM_SURF" "$SURF_4")
  sleep 0.2

elif (( N == 5 )); then
  # Top: c1 | c2 | c3   Bottom: c4 | c5
  BOTTOM_SURF=$(split_down "$MAIN_SURF")
  SURF_2=$(split_right "$MAIN_SURF")
  SURF_3=$(split_right "$SURF_2")
  SURF_5=$(split_right "$BOTTOM_SURF")
  SURF_LIST=("$MAIN_SURF" "$SURF_2" "$SURF_3" "$BOTTOM_SURF" "$SURF_5")

elif (( N == 6 )); then
  # Top: c1 | c2 | c3   Bottom: c4 | c5 | c6
  BOTTOM_SURF=$(split_down "$MAIN_SURF")
  SURF_2=$(split_right "$MAIN_SURF")
  SURF_3=$(split_right "$SURF_2")
  SURF_5=$(split_right "$BOTTOM_SURF")
  SURF_6=$(split_right "$SURF_5")
  SURF_LIST=("$MAIN_SURF" "$SURF_2" "$SURF_3" "$BOTTOM_SURF" "$SURF_5" "$SURF_6")

elif (( N == 7 )); then
  # Top: c1 | c2 | c3 | c4   Bottom: c5 | c6 | c7
  BOTTOM_SURF=$(split_down "$MAIN_SURF")
  SURF_2=$(split_right "$MAIN_SURF")
  SURF_3=$(split_right "$SURF_2")
  SURF_4=$(split_right "$SURF_3")
  SURF_6=$(split_right "$BOTTOM_SURF")
  SURF_7=$(split_right "$SURF_6")
  SURF_LIST=("$MAIN_SURF" "$SURF_2" "$SURF_3" "$SURF_4" "$BOTTOM_SURF" "$SURF_6" "$SURF_7")

elif (( N == 8 )); then
  # Top: c1 | c2 | c3 | c4   Bottom: c5 | c6 | c7 | c8
  BOTTOM_SURF=$(split_down "$MAIN_SURF")
  SURF_2=$(split_right "$MAIN_SURF")
  SURF_3=$(split_right "$SURF_2")
  SURF_4=$(split_right "$SURF_3")
  SURF_6=$(split_right "$BOTTOM_SURF")
  SURF_7=$(split_right "$SURF_6")
  SURF_8=$(split_right "$SURF_7")
  SURF_LIST=("$MAIN_SURF" "$SURF_2" "$SURF_3" "$SURF_4" "$BOTTOM_SURF" "$SURF_6" "$SURF_7" "$SURF_8")
fi

# ── Write surface → directory map ──
for i in {1..$N}; do
  echo "${SURF_LIST[$i]}=${SEL_DIRS[$i]}" >> "$STATE_DIR/surface-map"
done

# Set initial active dir
echo "${SEL_DIRS[1]}" > "$STATE_DIR/active-dir"

# ── Register hooks ──
# Clear old hooks first
for event in pane-focus-in after-select-pane pane-changed focus-in; do
  "$CMUX" set-hook --unset "$event" 2>/dev/null
done
# Set the hook that actually maps surface → directory
"$CMUX" set-hook after-select-pane "$SCRIPT_DIR/hook.sh" 2>/dev/null

# ── Launch Claude in each pane ──
for i in {1..$N}; do
  name="${SEL_NAMES[$i]}"
  dir="${SEL_DIRS[$i]}"
  surf="${SURF_LIST[$i]}"

  echo "  [$i/$N] $name"
  "$CMUX" rename-tab --surface "$surf" --workspace "$WS_ID" "$name" &>/dev/null
  "$CMUX" send --surface "$surf" --workspace "$WS_ID" "cd '$dir' && clear && $AGENT_CMD" &>/dev/null
  sleep 0.1
  "$CMUX" send-key --surface "$surf" --workspace "$WS_ID" enter &>/dev/null
  sleep 0.3
done

# ── Launch file browser in files pane ──
"$CMUX" rename-tab --surface "$FILES_SURF" --workspace "$WS_ID" "files" &>/dev/null
"$CMUX" send --surface "$FILES_SURF" --workspace "$WS_ID" "$SCRIPT_DIR/tree.sh" &>/dev/null
sleep 0.1
"$CMUX" send-key --surface "$FILES_SURF" --workspace "$WS_ID" enter &>/dev/null

# ── Status ──
"$CMUX" set-status project "lfg ($N)" --workspace "$WS_ID" 2>/dev/null
"$CMUX" notify --title "lfg" --body "$N projects launched" 2>/dev/null

echo ""
echo "  ✅ Ready"
echo ""
echo "  Click a pane → file tree follows"
echo "  Enter on file → opens in cmux"
echo "  p → copy file path"
echo "  . → toggle hidden files"
echo "  Cmd+Shift+U → jump to agent needing you"
echo ""
echo "  lfg. ⚡"
