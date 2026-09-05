const cron = require('node-cron');
const config = require('./config');
const { loadState, saveState } = require('./state');
const { runPing } = require('./pinger');

let tasks = [];
let botRef = null;

const TIME_RE = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
const FORMAT_HINT =
  'Each time must be exactly HH:MM with two digits for the hour and two for the minute ' +
  '(00-23 and 00-59), e.g. 05:00 - not 5:00. ' +
  'If any single time in the list is invalid, the whole schedule is rejected.';

function parseTimes(input) {
  // Strict format: "05:00,10:35,15:50,20:25,01:40" -> ["05:00", "10:35", "15:50", "20:25", "01:40"]
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error(`No times found. ${FORMAT_HINT}`);
  }
  const times = [];
  for (const part of parts) {
    if (!TIME_RE.test(part)) {
      throw new Error(`Invalid time: "${part}". ${FORMAT_HINT}`);
    }
    times.push(part);
  }
  return [...new Set(times)].sort();
}

function stopAllTasks() {
  for (const task of tasks) {
    task.stop();
  }
  tasks = [];
}

function notifyAll(text) {
  if (!botRef) return;
  for (const uid of config.allowedUserIds) {
    botRef.sendMessage(uid, text).catch(() => {});
  }
}

function scheduleTasks(times) {
  stopAllTasks();
  for (const time of times) {
    const [hour, minute] = time.split(':').map(Number);
    const expression = `${minute} ${hour} * * *`;
    const task = cron.schedule(
      expression,
      async () => {
        const result = await runPing();
        if (config.notifyOnPing) {
          const text = result.ok
            ? `Ping sent at ${time} (${config.scheduleTimezone}). Model: ${config.claudeModel}.`
            : `Ping failed at ${time} (${config.scheduleTimezone}): ${result.error}`;
          notifyAll(text);
        }
      },
      { scheduled: true, timezone: config.scheduleTimezone }
    );
    tasks.push(task);
  }
}

function init(bot) {
  botRef = bot;
  const state = loadState();
  if (state.enabled && state.times.length > 0) {
    scheduleTasks(state.times);
  }
}

function setTimes(rawInput) {
  const times = parseTimes(rawInput);
  const state = loadState();
  state.times = times;
  state.enabled = true;
  saveState(state);
  scheduleTasks(times);
  return times;
}

function stop() {
  const state = loadState();
  state.enabled = false;
  saveState(state);
  stopAllTasks();
}

function resume() {
  const state = loadState();
  if (!state.times || state.times.length === 0) {
    throw new Error('No schedule saved yet. Use /settimes first.');
  }
  state.enabled = true;
  saveState(state);
  scheduleTasks(state.times);
}

function clear() {
  const state = { times: [], enabled: false };
  saveState(state);
  stopAllTasks();
}

function getStatus() {
  return loadState();
}

module.exports = { init, setTimes, stop, resume, clear, getStatus, parseTimes, FORMAT_HINT };
