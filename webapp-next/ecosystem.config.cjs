const path = require('path');
const APP_DIR = path.resolve(__dirname);
const PORT = process.env.PORT || 3001;

module.exports = {
  apps: [
    {
      name: 'tdb-webapp-next',
      cwd: APP_DIR,
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${PORT}`,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: PORT,
      },
    },
    {
      name: 'tdb-health-monitor',
      cwd: APP_DIR,
      script: 'node',
      args: 'deploy/health-monitor.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        HEALTHCHECK_URL: `http://127.0.0.1:${PORT}/api/health`,
        HEALTHCHECK_INTERVAL_MS: '60000',
        HEALTHCHECK_TIMEOUT_MS: '5000',
      },
    },
  ],
};