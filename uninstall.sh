#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="$HOME/claude-session-cron"

echo "==> Stopping and removing PM2 process..."
pm2 stop claude-session-cron 2>/dev/null || true
pm2 delete claude-session-cron 2>/dev/null || true
pm2 save 2>/dev/null || true

read -rp "Delete the install directory ($INSTALL_DIR)? [y/N] " del
if [[ "$del" =~ ^[Yy]$ ]]; then
  rm -rf "$INSTALL_DIR"
  echo "Removed $INSTALL_DIR."
fi

echo "Uninstall complete."
