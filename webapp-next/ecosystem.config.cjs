module.exports = {
  apps: [
    {
      name: 'tdb-webapp-next',
      cwd: '/var/www/tdb/webapp-next',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '350M',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'tdb-health-monitor',
      cwd: '/var/www/tdb/webapp-next',
      script: 'node',
      args: 'deploy/health-monitor.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        HEALTHCHECK_URL: 'http://127.0.0.1:3000/api/health',
        HEALTHCHECK_INTERVAL_MS: '60000',
        HEALTHCHECK_TIMEOUT_MS: '5000',
      },
    },
  ],
};