module.exports = {
  apps: [
    {
      name: 'ota-answer-hub',
      script: 'npm',
      args: 'start',
      cwd: '/root/hub_inbox2sheet',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ],
  deploy: {
    production: {
      user: 'root',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/hub_inbox2sheet.git',
      path: '/root/hub_inbox2sheet',
      'post-deploy': 'npm install && npx prisma generate && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
}; 