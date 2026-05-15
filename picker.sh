#!/bin/zsh

# lfg picker — interactive project selector
# Source can be either:
#   - a directory  → each immediate subdirectory is a selectable project
#   - a file       → parsed as projects.conf (name|path per line)
# TUI draws go to /dev/tty. Only the final selection is written to stdout.

SOURCE="${1:-$HOME/.config/lfg/projects.conf}"
SOURCE="${SOURCE/#\~/$HOME}"

NAMES=()
PPATHS=()

if [[ -d "$SOURCE" ]]; then
  # Directory mode: each non-hidden subdir becomes a project, sorted alphabetically (case-insensitive)
  for dir in "$SOURCE"/*(N/); do
    base="${dir:t}"
    [[ "$base" = .* ]] && continue
    NAMES+=("$base")
    PPATHS+=("${dir%/}")
  done
elif [[ -f "$SOURCE" ]]; then
  while IFS='|' read -r name path; do
    [[ "$name" =~ ^#.*$ || -z "$name" ]] && continue
    name="${name## }"; name="${name%% }"
    path="${path## }"; path="${path%% }"
    path="${path/#\~/$HOME}"
    NAMES+=("$name")
    PPATHS+=("$path")
  done < "$SOURCE"
else
  echo "lfg: source not found: $SOURCE" >&2
  exit 1
fi

N=${#NAMES[@]}
(( N == 0 )) && echo "lfg: no projects found in $SOURCE" >&2 && exit 1

# State
typeset -A SEL
CURSOR=1
MAX_SELECT=4
PAGE_SIZE=15
(( PAGE_SIZE > N )) && PAGE_SIZE=$N
OFFSET=0
DRAW_LINES=$((PAGE_SIZE + 3))

# Truncate a name to fit the name column
trunc_name() {
  local n="$1"
  if (( ${#n} > 22 )); then
    n="${n:0:21}…"
  fi
  echo "$n"
}

# Shorten a path for display
shorten() {
  local p="$1"
  p="${p/$HOME/~}"
  if (( ${#p} > 40 )); then
    p="~/…/${p:t}"
  fi
  echo "$p"
}

ensure_visible() {
  if (( CURSOR - 1 < OFFSET )); then
    OFFSET=$((CURSOR - 1))
  elif (( CURSOR - 1 >= OFFSET + PAGE_SIZE )); then
    OFFSET=$((CURSOR - PAGE_SIZE))
  fi
}

draw() {
  {
    printf '\e[%dA' "$DRAW_LINES"
    printf '\e[2K  \e[1;36m⚡ lfg\e[0m — select projects (%d available, max %d)\n' "$N" "$MAX_SELECT"

    local end=$((OFFSET + PAGE_SIZE))
    (( end > N )) && end=$N

    if (( OFFSET > 0 )); then
      printf '\e[2K  \e[90m↑ %d more above\e[0m\n' "$OFFSET"
    else
      printf '\e[2K\n'
    fi

    local i
    for ((i = OFFSET + 1; i <= end; i++)); do
      local mark=" "
      [[ -n "${SEL[$i]}" ]] && mark="x"
      local prefix="  "
      [[ $i -eq $CURSOR ]] && prefix="\e[1;33m> \e[0m"
      local nm="$(trunc_name "${NAMES[$i]}")"
      local path_short="$(shorten "${PPATHS[$i]}")"
      printf '\e[2K%b[%s] \e[1m%-22s\e[0m \e[90m%s\e[0m\n' "$prefix" "$mark" "$nm" "$path_short"
    done

    local drawn=$((end - OFFSET))
    while (( drawn < PAGE_SIZE )); do
      printf '\e[2K\n'
      drawn=$((drawn + 1))
    done

    if (( end < N )); then
      printf '\e[2K  \e[90m↓ %d more below  |  SPACE toggle  ENTER launch  q quit\e[0m' $((N - end))
    else
      local sel_count=0
      for k in ${(k)SEL}; do sel_count=$((sel_count + 1)); done
      printf '\e[2K  \e[90mSelected: %d/%d  |  SPACE toggle  ENTER launch  q quit\e[0m' $sel_count $MAX_SELECT
    fi
  } > /dev/tty
}

# Create drawing area
printf '\n%.0s' {1..$DRAW_LINES} > /dev/tty
draw

# Input loop
while true; do
  read -sk1 key < /dev/tty

  if [[ "$key" == $'\e' ]]; then
    read -sk1 -t 0.1 k2 < /dev/tty
    read -sk1 -t 0.1 k3 < /dev/tty
    case "$k2$k3" in
      "[A") (( CURSOR > 1 )) && CURSOR=$((CURSOR - 1)); ensure_visible ;;
      "[B") (( CURSOR < N )) && CURSOR=$((CURSOR + 1)); ensure_visible ;;
      "[5") read -sk1 -t 0.1 _tilde < /dev/tty
            CURSOR=$((CURSOR - PAGE_SIZE)); (( CURSOR < 1 )) && CURSOR=1; ensure_visible ;;
      "[6") read -sk1 -t 0.1 _tilde < /dev/tty
            CURSOR=$((CURSOR + PAGE_SIZE)); (( CURSOR > N )) && CURSOR=$N; ensure_visible ;;
    esac
  elif [[ "$key" == "k" ]]; then
    (( CURSOR > 1 )) && CURSOR=$((CURSOR - 1)); ensure_visible
  elif [[ "$key" == "j" ]]; then
    (( CURSOR < N )) && CURSOR=$((CURSOR + 1)); ensure_visible
  elif [[ "$key" == "g" ]]; then
    CURSOR=1; OFFSET=0
  elif [[ "$key" == "G" ]]; then
    CURSOR=$N; ensure_visible
  elif [[ "$key" == " " ]]; then
    if [[ -n "${SEL[$CURSOR]}" ]]; then
      unset "SEL[$CURSOR]"
    else
      local sel_count=0
      for k in ${(k)SEL}; do sel_count=$((sel_count + 1)); done
      (( sel_count < MAX_SELECT )) && SEL[$CURSOR]=1
    fi
  elif [[ "$key" == $'\n' || "$key" == $'\r' ]]; then
    local sel_count=0
    for k in ${(k)SEL}; do sel_count=$((sel_count + 1)); done
    (( sel_count == 0 )) && SEL[$CURSOR]=1
    break
  elif [[ "$key" == "q" ]]; then
    { printf '\e[%dA' "$DRAW_LINES"; for i in {1..$DRAW_LINES}; do printf '\e[2K\n'; done } > /dev/tty
    exit 1
  fi

  draw
done

# Clear drawing area
{
  printf '\n'
  printf '\e[%dA' $((DRAW_LINES + 1))
  for i in {1..$((DRAW_LINES + 1))}; do printf '\e[2K\n'; done
  printf '\e[%dA' $((DRAW_LINES + 1))
} > /dev/tty

# Output selected projects to stdout (captured by lfg.sh)
for i in ${(kon)SEL}; do
  echo "${NAMES[$i]}|${PPATHS[$i]}"
done
