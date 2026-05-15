#!/bin/zsh

# lfg tree — custom file browser with mouse, tree view, and project sync
# Pure zsh TUI. Polls cmux for focus changes. No dependencies.

export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/Applications/cmux.app/Contents/Resources/bin:$PATH"
[[ -z "$HOME" ]] && export HOME=~

SCRIPT_DIR="${0:A:h}"

# Suppress stderr (cmux environment noise)
exec 2>/dev/null

STATE_DIR="${LFG_STATE_DIR:-$HOME/.config/lfg/state}"
ACTIVE_FILE="$STATE_DIR/active-dir"
MAP_FILE="$STATE_DIR/surface-map"
FILES_SURF=$(/usr/bin/cat "$STATE_DIR/files-surface" 2>/dev/null)
WS_ID=$(/usr/bin/cat "$STATE_DIR/workspace-id" 2>/dev/null)
CMUX="/Applications/cmux.app/Contents/Resources/bin/cmux"

# ── State ──
PROJECT_DIR=""
PROJECT_NAME=""
CWD=""
typeset -a D_NAME D_PATH D_TYPE D_DEPTH
typeset -A EXPANDED
CURSOR=1
SCROLL=0
SHOW_HIDDEN=false
LAST_FOCUSED=""
NEEDS_REDRAW=true

# Terminal
TERM_LINES=40
TERM_COLS=80
VISIBLE=35
HEADER_H=3
FOOTER_H=2

# ── Cleanup ──
cleanup() {
  printf '\e[?1000l\e[?1006l'
  printf '\e[?25h\e[0m'
  stty echo 2>/dev/null
}
trap cleanup EXIT

# ── Terminal size ──
update_size() {
  TERM_LINES=$(tput lines 2>/dev/null || echo 40)
  TERM_COLS=$(tput cols 2>/dev/null || echo 80)
  VISIBLE=$((TERM_LINES - HEADER_H - FOOTER_H))
  (( VISIBLE < 3 )) && VISIBLE=3
  NEEDS_REDRAW=true
}
trap update_size WINCH

# ── Sync: poll cmux for focused surface → switch project ──
check_sync() {
  local focused=$("$CMUX" identify --no-caller 2>/dev/null | /usr/bin/grep -oE 'surface:[0-9]+' | /usr/bin/head -1)
  [[ -z "$focused" || "$focused" == "$FILES_SURF" ]] && return
  if [[ "$focused" != "$LAST_FOCUSED" ]]; then
    LAST_FOCUSED="$focused"
    local new_dir=$(/usr/bin/grep "^${focused}=" "$MAP_FILE" 2>/dev/null | /usr/bin/cut -d= -f2-)
    [[ -z "$new_dir" || ! -d "$new_dir" ]] && return
    if [[ "$new_dir" != "$PROJECT_DIR" ]]; then
      echo "$new_dir" > "$ACTIVE_FILE"
      PROJECT_DIR="$new_dir"
      PROJECT_NAME="${new_dir:t}"
      CWD="$new_dir"
      EXPANDED=()
      build_tree
      CURSOR=1
      SCROLL=0
      NEEDS_REDRAW=true
    fi
  fi
}

# ── Build tree from expanded state ──
build_tree() {
  D_NAME=()
  D_PATH=()
  D_TYPE=()
  D_DEPTH=()
  _scan "$CWD" 0
}

_scan() {
  local dir="$1"
  local depth="$2"
  (( depth > 8 )) && return

  local glob_d="N/on"
  local glob_f="N^/on"
  $SHOW_HIDDEN && glob_d="ND/on" && glob_f="ND^/on"

  for item in "$dir"/*(${~glob_d}); do
    D_NAME+=("${item:t}")
    D_PATH+=("$item")
    D_TYPE+=("d")
    D_DEPTH+=("$depth")
    [[ -n "${EXPANDED[$item]}" ]] && _scan "$item" $((depth + 1))
  done
  for item in "$dir"/*(${~glob_f}); do
    D_NAME+=("${item:t}")
    D_PATH+=("$item")
    D_TYPE+=("f")
    D_DEPTH+=("$depth")
  done
}

# ── Scroll ──
adjust_scroll() {
  (( CURSOR < SCROLL + 1 )) && SCROLL=$((CURSOR - 1))
  (( CURSOR > SCROLL + VISIBLE )) && SCROLL=$((CURSOR - VISIBLE))
  (( SCROLL < 0 )) && SCROLL=0
}

# ── Draw ──
draw() {
  printf '\e[?25l\e[H'

  # Header
  printf '\e[2K  \e[1;36m▸ %s\e[0m\n' "$PROJECT_NAME"
  local rel="${CWD#$PROJECT_DIR}"
  [[ -z "$rel" ]] && rel="/"
  printf '\e[2K  \e[90m%s\e[0m\n' "$rel"
  local w=$((TERM_COLS - 4))
  (( w > 40 )) && w=40
  (( w < 4 )) && w=4
  printf '\e[2K  \e[90m'
  printf '─%.0s' {1..$w}
  printf '\e[0m\n'

  # Clamp scroll
  local total=${#D_NAME[@]}
  local max_scroll=$((total - VISIBLE))
  (( max_scroll < 0 )) && max_scroll=0
  (( SCROLL > max_scroll )) && SCROLL=$max_scroll

  local end=$((SCROLL + VISIBLE))
  (( end > total )) && end=$total

  # Tree entries
  local drawn=0
  if (( total == 0 )); then
    printf '\e[2K    \e[90m(empty)\e[0m\n'
    drawn=1
  elif (( SCROLL + 1 <= end )); then
    for i in {$((SCROLL + 1))..$end}; do
      printf '\e[2K'
      local name="${D_NAME[$i]}"
      local epath="${D_PATH[$i]}"
      local type="${D_TYPE[$i]}"
      local depth="${D_DEPTH[$i]}"

      # Indent: 2 chars per depth level
      local indent=""
      local dd=0
      while (( dd < depth )); do indent="  $indent"; dd=$((dd + 1)); done

      local arrow="▸"
      [[ "$type" == "d" && -n "${EXPANDED[$epath]}" ]] && arrow="▾"

      if [[ $i -eq $CURSOR ]]; then
        case "$type" in
          d) printf '  \e[1;33m›\e[0m %s\e[1;34m%s %s/\e[0m\n' "$indent" "$arrow" "$name" ;;
          f) printf '  \e[1;33m›\e[0m %s  \e[1m%s\e[0m\n' "$indent" "$name" ;;
        esac
      else
        case "$type" in
          d) printf '    %s\e[34m%s %s/\e[0m\n' "$indent" "$arrow" "$name" ;;
          f) printf '    %s  %s\n' "$indent" "$name" ;;
        esac
      fi
      drawn=$((drawn + 1))
    done
  fi

  # Clear remaining lines
  while (( drawn < VISIBLE )); do
    printf '\e[2K\n'
    drawn=$((drawn + 1))
  done

  # Footer
  printf '\e[2K  \e[90m'
  printf '─%.0s' {1..$w}
  printf '\e[0m\n'
  printf '\e[2K  \e[90m↑↓ nav  click fold  ↵ open  p copy  . dot\e[0m'

  # Erase everything below footer — prevents stray output from corrupting display
  printf '\e[J'

  NEEDS_REDRAW=false
}

# ── Actions ──
toggle_dir() {
  local idx="${1:-$CURSOR}"
  (( idx < 1 || idx > ${#D_NAME[@]} )) && return
  [[ "${D_TYPE[$idx]}" != "d" ]] && return

  local epath="${D_PATH[$idx]}"
  CURSOR=$idx

  if [[ -n "${EXPANDED[$epath]}" ]]; then
    unset "EXPANDED[$epath]"
    for k in ${(k)EXPANDED}; do
      [[ "$k" == "$epath/"* ]] && unset "EXPANDED[$k]"
    done
  else
    EXPANDED[$epath]=1
  fi

  build_tree
  (( CURSOR > ${#D_NAME[@]} )) && CURSOR=${#D_NAME[@]}
  (( CURSOR < 1 )) && CURSOR=1
  adjust_scroll
  NEEDS_REDRAW=true
}

open_item() {
  (( ${#D_NAME[@]} == 0 )) && return
  local type="${D_TYPE[$CURSOR]}"
  local epath="${D_PATH[$CURSOR]}"
  local name="${D_NAME[$CURSOR]}"

  if [[ "$type" == "d" ]]; then
    toggle_dir
  else
    "$SCRIPT_DIR/opener.sh" "$epath" &>/dev/null &
    NEEDS_REDRAW=true
  fi
}

copy_path() {
  (( ${#D_NAME[@]} == 0 )) && return
  printf '%s' "${D_PATH[$CURSOR]}" | pbcopy
  NEEDS_REDRAW=true
}

handle_click() {
  local col="$1"
  local row="$2"

  local idx=$((SCROLL + row - HEADER_H))
  (( idx < 1 || idx > ${#D_NAME[@]} )) && return

  CURSOR=$idx
  local type="${D_TYPE[$idx]}"

  if [[ "$type" == "d" ]]; then
    toggle_dir "$idx"
  else
    # Select file (use Enter to open, p to copy path)
    NEEDS_REDRAW=true
  fi
}

# ── Initialize ──
update_size
PROJECT_DIR=$(/usr/bin/cat "$ACTIVE_FILE" 2>/dev/null)
[[ -z "$PROJECT_DIR" || ! -d "$PROJECT_DIR" ]] && PROJECT_DIR="$HOME"
PROJECT_NAME="${PROJECT_DIR:t}"
CWD="$PROJECT_DIR"
build_tree
clear

# Disable terminal echo + enable mouse
stty -echo 2>/dev/null
printf '\e[?1000h\e[?1006h'

# ── Main loop ──
while true; do
  $NEEDS_REDRAW && draw

  if read -sk1 -t 0.5 key; then
    case "$key" in
      $'\e')
        read -sk1 -t 0.05 k2
        if [[ "$k2" == "[" ]]; then
          read -sk1 -t 0.05 k3
          case "$k3" in
            "A") # Up
              (( CURSOR > 1 )) && CURSOR=$((CURSOR - 1))
              adjust_scroll; NEEDS_REDRAW=true
              ;;
            "B") # Down
              (( CURSOR < ${#D_NAME[@]} )) && CURSOR=$((CURSOR + 1))
              adjust_scroll; NEEDS_REDRAW=true
              ;;
            "<") # SGR mouse event
              local mseq=""
              while read -sk1 -t 0.05 mc; do
                mseq+="$mc"
                [[ "$mc" == "M" || "$mc" == "m" ]] && break
              done
              if [[ "$mseq" =~ '^([0-9]+);([0-9]+);([0-9]+)([Mm])$' ]]; then
                local btn="${match[1]}"
                local mcol="${match[2]}"
                local mrow="${match[3]}"
                local mact="${match[4]}"
                if [[ "$mact" == "M" ]]; then
                  case "$btn" in
                    0) handle_click "$mcol" "$mrow" ;;
                    64) # Scroll up
                      (( SCROLL > 0 )) && SCROLL=$((SCROLL - 3))
                      (( SCROLL < 0 )) && SCROLL=0
                      NEEDS_REDRAW=true
                      ;;
                    65) # Scroll down
                      local max_s=$(( ${#D_NAME[@]} - VISIBLE ))
                      (( max_s < 0 )) && max_s=0
                      SCROLL=$((SCROLL + 3))
                      (( SCROLL > max_s )) && SCROLL=$max_s
                      NEEDS_REDRAW=true
                      ;;
                  esac
                fi
              fi
              ;;
          esac
        fi
        ;;
      $'\n'|$'\r') open_item ;;
      "p") copy_path ;;
      ".")
        if $SHOW_HIDDEN; then SHOW_HIDDEN=false; else SHOW_HIDDEN=true; fi
        build_tree; CURSOR=1; SCROLL=0; NEEDS_REDRAW=true
        ;;
    esac
  fi

  check_sync
done
