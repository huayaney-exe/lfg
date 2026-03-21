#!/bin/zsh

# lfg picker — interactive project selector
# All TUI draws go to /dev/tty (not stdout, which may be captured)
# Only final selection goes to stdout.

CONF="${1:-$HOME/.config/lfg/projects.conf}"
[[ ! -f "$CONF" ]] && echo "No projects.conf found" >&2 && exit 1

# Parse projects (skip comments and empty lines)
NAMES=()
PPATHS=()
while IFS='|' read -r name path; do
  [[ "$name" =~ ^#.*$ || -z "$name" ]] && continue
  name="${name## }"; name="${name%% }"
  path="${path## }"; path="${path%% }"
  path="${path/#\~/$HOME}"
  NAMES+=("$name")
  PPATHS+=("$path")
done < "$CONF"

N=${#NAMES[@]}
[[ $N -eq 0 ]] && echo "No projects in $CONF" >&2 && exit 1

# State
typeset -A SEL
CURSOR=1
MAX_SELECT=4

# Shorten path for display
shorten() {
  local p="$1"
  p="${p/$HOME/~}"
  if (( ${#p} > 40 )); then
    p="~/…/${p:t}"
  fi
  echo "$p"
}

# All drawing goes to /dev/tty
draw() {
  {
    printf '\e[%dA' $((N + 3))
    printf '\e[2K  \e[1;36m⚡ lfg\e[0m — select projects (max %d)\n\n' $MAX_SELECT

    for i in {1..$N}; do
      local mark=" "
      [[ -n "${SEL[$i]}" ]] && mark="x"
      local prefix="  "
      [[ $i -eq $CURSOR ]] && prefix="\e[1;33m> \e[0m"
      local path_short="$(shorten "${PPATHS[$i]}")"

      printf '\e[2K%b[%s] \e[1m%-14s\e[0m \e[90m%s\e[0m\n' "$prefix" "$mark" "${NAMES[$i]}" "$path_short"
    done

    local sel_count=0
    for k in ${(k)SEL}; do sel_count=$((sel_count + 1)); done
    printf '\e[2K\n\e[2K  \e[90mSelected: %d/%d  |  SPACE toggle  ENTER launch  q quit\e[0m' $sel_count $MAX_SELECT
  } > /dev/tty
}

# Print blank lines to create drawing space
printf '\n%.0s' {1..$((N + 3))} > /dev/tty
draw

# Input loop — read from /dev/tty
while true; do
  read -sk1 key < /dev/tty

  if [[ "$key" == $'\e' ]]; then
    read -sk1 -t 0.1 k2 < /dev/tty
    read -sk1 -t 0.1 k3 < /dev/tty
    case "$k2$k3" in
      "[A") (( CURSOR > 1 )) && CURSOR=$((CURSOR - 1)) ;;
      "[B") (( CURSOR < N )) && CURSOR=$((CURSOR + 1)) ;;
    esac
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
    # Clear and exit
    { printf '\e[%dA' $((N + 3)); for i in {1..$((N + 3))}; do printf '\e[2K\n'; done } > /dev/tty
    exit 1
  fi

  draw
done

# Clear drawing area
{
  printf '\n'
  printf '\e[%dA' $((N + 4))
  for i in {1..$((N + 4))}; do printf '\e[2K\n'; done
  printf '\e[%dA' $((N + 4))
} > /dev/tty

# Output selected projects to stdout (this is what gets captured)
for i in ${(kon)SEL}; do
  echo "${NAMES[$i]}|${PPATHS[$i]}"
done
