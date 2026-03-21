#!/bin/zsh

# lfg installer — sets up alias and creates default config

INSTALL_DIR="${0:A:h}"
CONF="$INSTALL_DIR/projects.conf"
ZSHRC="$HOME/.zshrc"

# Create projects.conf from example if missing
if [[ ! -f "$CONF" ]]; then
  cp "$INSTALL_DIR/projects.conf.example" "$CONF"
  echo "  Created projects.conf — add your projects before running lfg"
fi

# Add alias if not present
if ! /usr/bin/grep -q 'alias lfg=' "$ZSHRC" 2>/dev/null; then
  echo "" >> "$ZSHRC"
  echo "# lfg — multi-agent workspace launcher" >> "$ZSHRC"
  echo "alias lfg=\"$INSTALL_DIR/lfg.sh\"" >> "$ZSHRC"
  echo "  Added 'lfg' alias to ~/.zshrc"
  echo "  Run: source ~/.zshrc"
else
  echo "  'lfg' alias already exists in ~/.zshrc"
fi

echo ""
echo "  Setup complete. Edit projects.conf, then run: lfg"
