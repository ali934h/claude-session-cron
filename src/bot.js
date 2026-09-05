const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const scheduler = require('./scheduler');
const { runPing, PING_PROMPT } = require('./pinger');

const bot = new TelegramBot(config.botToken, { polling: true });

const EXAMPLE_TIMES = '04:50,10:10,15:40,21:10';

function isAllowed(msg) {
  return msg.from && config.allowedUserIds.includes(msg.from.id);
}

function confirmStopKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Yes, stop it', callback_data: 'confirm_stop' },
          { text: 'Cancel', callback_data: 'cancel_stop' },
        ],
      ],
    },
  };
}

function formatStatus() {
  const state = scheduler.getStatus();
  if (!state.times || state.times.length === 0) {
    return `No schedule set yet. Send \`/settimes ${EXAMPLE_TIMES}\` to create one.`;
  }
  const status = state.enabled ? 'ACTIVE' : 'STOPPED';
  return (
    `Schedule: \`${state.times.join(', ')}\` (${config.scheduleTimezone})\n` +
    `Status: ${status}\n` +
    `Model: ${config.claudeModel} (effort: ${config.claudeEffort})`
  );
}

bot.onText(/^\/start/, (msg) => {
  if (!isAllowed(msg)) return;
  bot.sendMessage(
    msg.chat.id,
    'Claude Session Cron is running.\n\n' +
      'Commands:\n' +
      '/settimes HH:MM,HH:MM,... - set ping times (Tehran time)\n' +
      '/status - show current schedule\n' +
      '/stop - pause the schedule (asks for confirmation)\n' +
      '/resume - resume the last saved schedule\n' +
      '/clear - delete the saved schedule\n' +
      '/pingnow - send one ping immediately (for testing)\n\n' +
      'Time format: two digits for hour, two digits for minute, e.g. 05:00 (not 5:00).\n' +
      'Example, tap to copy:\n' +
      `\`/settimes ${EXAMPLE_TIMES}\``,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/^\/settimes(?:\s+(.+))?/, (msg, match) => {
  if (!isAllowed(msg)) return;
  const input = match[1];
  if (!input) {
    bot.sendMessage(
      msg.chat.id,
      `Usage, tap to copy:\n\`/settimes ${EXAMPLE_TIMES}\`\n\n${scheduler.FORMAT_HINT}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }
  try {
    const times = scheduler.setTimes(input);
    bot.sendMessage(
      msg.chat.id,
      `Schedule saved and started: \`${times.join(', ')}\` (${config.scheduleTimezone}).`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    bot.sendMessage(msg.chat.id, `Error: ${err.message}`);
  }
});

bot.onText(/^\/status/, (msg) => {
  if (!isAllowed(msg)) return;
  bot.sendMessage(msg.chat.id, formatStatus(), { parse_mode: 'Markdown' });
});

bot.onText(/^\/stop/, (msg) => {
  if (!isAllowed(msg)) return;
  const state = scheduler.getStatus();
  if (!state.enabled) {
    bot.sendMessage(msg.chat.id, 'The schedule is already stopped.');
    return;
  }
  bot.sendMessage(
    msg.chat.id,
    'Are you sure you want to stop the schedule? Saved times will be kept, you can /resume later.',
    confirmStopKeyboard()
  );
});

bot.onText(/^\/resume/, (msg) => {
  if (!isAllowed(msg)) return;
  try {
    scheduler.resume();
    bot.sendMessage(msg.chat.id, 'Schedule resumed.');
  } catch (err) {
    bot.sendMessage(msg.chat.id, `Error: ${err.message}`);
  }
});

bot.onText(/^\/clear/, (msg) => {
  if (!isAllowed(msg)) return;
  scheduler.clear();
  bot.sendMessage(msg.chat.id, 'Saved schedule deleted.');
});

bot.onText(/^\/pingnow/, async (msg) => {
  if (!isAllowed(msg)) return;
  bot.sendMessage(msg.chat.id, `Sending test ping: "${PING_PROMPT}"...`);
  const result = await runPing();
  bot.sendMessage(
    msg.chat.id,
    result.ok ? `OK. Response: ${result.output}` : `Failed: ${result.error}`
  );
});

bot.on('callback_query', (query) => {
  if (!query.from || !config.allowedUserIds.includes(query.from.id)) return;

  if (query.data === 'confirm_stop') {
    scheduler.stop();
    bot.answerCallbackQuery(query.id, { text: 'Schedule stopped.' });
    bot.editMessageText('Schedule stopped. Saved times are kept, use /resume to restart.', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
    });
    return;
  }

  if (query.data === 'cancel_stop') {
    bot.answerCallbackQuery(query.id, { text: 'Cancelled.' });
    bot.editMessageText('Cancelled. The schedule is still active.', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
    });
    return;
  }
});

scheduler.init(bot);

console.log('claude-session-cron bot started.');
