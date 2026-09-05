module.exports = {
  apps: [
    {
      name: 'claude-session-cron',
      script: 'src/bot.js',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
