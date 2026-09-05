const { execFile } = require('child_process');
const config = require('./config');

// Deliberately the shortest possible real question, so the ping consumes
// as few tokens as possible while still being a genuine request.
const PING_PROMPT = 'Capital of France? One word.';
const TIMEOUT_MS = 120000;

function runPing() {
  return new Promise((resolve) => {
    const args = [
      '-p',
      PING_PROMPT,
      '--model',
      config.claudeModel,
      '--effort',
      config.claudeEffort,
    ];

    execFile(
      config.claudeBin,
      args,
      { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ ok: false, error: error.message, stderr: stderr && stderr.trim() });
          return;
        }
        resolve({ ok: true, output: stdout && stdout.trim() });
      }
    );
  });
}

module.exports = { runPing, PING_PROMPT };
