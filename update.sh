#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="$HOME/claude-session-cron"
cd "$INSTALL_DIR"

echo "==> Pulling latest code..."
git pull

echo "==> Installing dependencies..."
npm install --omit=dev

echo "==> Restarting bot..."
pm2 restart claude-session-cron

echo "Update complete."
