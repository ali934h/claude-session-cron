#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/ali934h/claude-session-cron.git"
INSTALL_DIR="$HOME/claude-session-cron"

SUDO=""
if [[ $EUID -ne 0 ]]; then
  SUDO="sudo"
fi

echo "==> Checking for Claude Code CLI..."
CLAUDE_BIN_PATH="$(command -v claude || true)"
if [[ -z "$CLAUDE_BIN_PATH" && -x "$HOME/.local/bin/claude" ]]; then
  CLAUDE_BIN_PATH="$HOME/.local/bin/claude"
fi
if [[ -z "$CLAUDE_BIN_PATH" ]]; then
  echo "WARNING: 'claude' command not found."
  echo "Install and log in to Claude Code first: https://docs.claude.com/en/docs/claude-code/overview"
  read -rp "Continue installing the bot anyway? [y/N] " cont
  if [[ ! "$cont" =~ ^[Yy]$ ]]; then
    exit 1
  fi
  CLAUDE_BIN_PATH="claude"
fi
echo "Using claude binary: $CLAUDE_BIN_PATH"

echo "==> Installing Node.js 20 (if missing)..."
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | sed 's/v//;s/\..*//') -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi

echo "==> Installing PM2 (if missing)..."
if ! command -v pm2 >/dev/null 2>&1; then
  $SUDO npm install -g pm2
fi

echo "==> Cloning repository..."
if [[ -d "$INSTALL_DIR" ]]; then
  echo "Directory $INSTALL_DIR already exists, pulling latest instead."
  git -C "$INSTALL_DIR" pull
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

echo "==> Installing npm dependencies..."
npm install --omit=dev

echo ""
echo "==> Telegram bot configuration"
read -rp "Enter your BOT_TOKEN (from @BotFather): " BOT_TOKEN
read -rp "Enter your numeric Telegram user id (from @userinfobot): " ALLOWED_USER_ID
read -rp "Claude model to use for pings [claude-haiku-4-5-20251001]: " CLAUDE_MODEL
CLAUDE_MODEL=${CLAUDE_MODEL:-claude-haiku-4-5-20251001}
read -rp "Effort level for pings [low]: " CLAUDE_EFFORT
CLAUDE_EFFORT=${CLAUDE_EFFORT:-low}

cat > .env <<EOF
BOT_TOKEN=${BOT_TOKEN}
ALLOWED_USER_ID=${ALLOWED_USER_ID}
CLAUDE_BIN=${CLAUDE_BIN_PATH}
CLAUDE_MODEL=${CLAUDE_MODEL}
CLAUDE_EFFORT=${CLAUDE_EFFORT}
NOTIFY_ON_PING=true
SCHEDULE_TIMEZONE=Asia/Tehran
EOF
chmod 600 .env

echo "==> Starting bot with PM2..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "==> To enable auto-start on boot, run the command PM2 prints below (copy/paste it):"
pm2 startup || true

echo ""
echo "Done. Open a chat with your bot and send /start."
echo "Useful commands:"
echo "  pm2 logs claude-session-cron"
echo "  pm2 restart claude-session-cron"
echo "  bash $INSTALL_DIR/update.sh"
echo "  bash $INSTALL_DIR/uninstall.sh"
