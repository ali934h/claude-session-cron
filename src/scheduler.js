const cron = require('node-cron');
const config = require('./config');
const { loadState, saveState } = require('./state');
const { runPing } = require('./pinger');

let tasks = [];
let botRef = null;

function parseTimes(input) {
  // Accepts "5:00,10:35,15:50,20:25,1:40" -> ["05:00", "10:35", "15:50", "20:25", "01:40"]
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
  const times = [];
  for (const part of parts) {
    const match = part.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new Error(`Invalid time: "${part}". Use HH:MM (e.g. 5:00 or 23:45).`);
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(`Invalid time: "${part}". Hour must be 0-23 and minute 0-59.`);
    }
    times.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
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

module.exports = { init, setTimes, stop, resume, clear, getStatus, parseTimes };
