require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const allowedUserIds = required('ALLOWED_USER_ID')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

module.exports = {
  botToken: required('BOT_TOKEN'),
  allowedUserIds,
  claudeBin: process.env.CLAUDE_BIN || 'claude',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
  claudeEffort: process.env.CLAUDE_EFFORT || 'low',
  notifyOnPing: (process.env.NOTIFY_ON_PING || 'true').toLowerCase() === 'true',
  scheduleTimezone: process.env.SCHEDULE_TIMEZONE || 'Asia/Tehran',
};
