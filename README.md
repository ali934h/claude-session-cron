# claude-session-cron

A small Telegram bot that pings your locally installed **Claude Code** CLI on a schedule (Tehran time), so your usage session/quota window starts before you actually sit down to work. The bot doesn't care about the response - it just needs a real request to go out.

Built for personal use on a single server, in the same style as [tg-hub](https://github.com/ali934h/tg-hub).

## Features

- Send one message with any number of times, e.g. `05:00,10:35,15:50,20:25,01:40`, all interpreted as **Asia/Tehran** time regardless of your server's own timezone.
- Strict `HH:MM` format is enforced: two digits for the hour and two for the minute (e.g. `05:00`, not `5:00`). If any single time in the message is invalid, the **entire schedule is rejected** and the bot tells you what to fix.
- A cron job fires at each of those times and runs:
  ```
  claude -p "Capital of France? One word." --model claude-haiku-4-5-20251001 --effort low
  ```
  using the cheapest available model and the lowest effort level, so each ping costs as little as possible.
- One-tap **Stop** button (and `/stop` command) to pause all scheduled pings without losing your saved schedule.
- `/resume` to turn the same schedule back on later.
- Supports multiple allowed Telegram user ids (comma-separated).
- Runs under PM2 so it survives reboots and crashes.

## Prerequisites

- Ubuntu 22.04 / 24.04 server (works as root or as a regular user with sudo).
- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) already installed **and logged in** on the server (this bot just calls the `claude` CLI you already have).
- A Telegram bot token from [@BotFather](https://t.me/BotFather).
- Your numeric Telegram user id(s) (ask [@userinfobot](https://t.me/userinfobot)).

## Install

One-line install:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ali934h/claude-session-cron/main/install.sh)
```

The installer will:

- Detect your `claude` CLI path (asks you to install/login first if missing).
- Install Node.js 20 and PM2 if they're missing (uses `sudo` automatically if you're not root).
- Clone this repo to `~/claude-session-cron`.
- Prompt for `BOT_TOKEN`, `ALLOWED_USER_ID` (comma-separated for multiple users), model, and effort level.
- Start the bot with PM2 and print the command to enable auto-start on boot.

## Usage

Open a private chat with your bot and use:

| Command | Action |
| --- | --- |
| `/start` | Show help |
| `/settimes 05:00,10:35,15:50` | Save a schedule (Tehran time) and start it |
| `/status` | Show the current schedule and whether it's active |
| `/stop` | Pause the schedule (kept for later) |
| `/resume` | Resume the last saved schedule |
| `/clear` | Delete the saved schedule entirely |
| `/pingnow` | Fire one ping immediately, useful for testing |

**Time format:** exactly `HH:MM`, two digits each, 24-hour clock. `05:00` is accepted, `5:00` is rejected - and if even one time in the list is malformed, none of the schedule is saved.

You can also tap the **Stop schedule** button shown after `/settimes` or `/status`.

## Daily commands

```bash
pm2 logs claude-session-cron            # follow live logs
pm2 restart claude-session-cron         # restart
bash ~/claude-session-cron/update.sh    # pull latest code and restart
bash ~/claude-session-cron/uninstall.sh # remove everything
```

## Configuration

All configuration lives in `~/claude-session-cron/.env` (see `.env.example`):

```
BOT_TOKEN=
ALLOWED_USER_ID=
CLAUDE_BIN=claude
CLAUDE_MODEL=claude-haiku-4-5-20251001
CLAUDE_EFFORT=low
NOTIFY_ON_PING=true
SCHEDULE_TIMEZONE=Asia/Tehran
```

`ALLOWED_USER_ID` accepts a comma-separated list, e.g. `111111,222222,333333`.

`CLAUDE_BIN` should be the full path to the `claude` binary if it's not on PM2's PATH (e.g. `~/.local/bin/claude`) - the installer fills this in automatically.

After editing, restart with `pm2 restart claude-session-cron`.

## Notes

- Since Iran no longer observes seasonal clock changes, `Asia/Tehran` has a fixed UTC+03:30 offset, but the bot uses the IANA timezone via `node-cron`'s built-in timezone support either way, so it stays correct even if that ever changes.
- Each ping is a real, minimal request through the `claude` CLI you're already authenticated with - the bot never touches your Claude credentials directly.
- Review Anthropic's current [Claude Code legal & compliance notes](https://code.claude.com/docs/en/legal-and-compliance) and [Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms) yourself before relying on this for account/quota management, since usage policies can change.

## License

MIT
