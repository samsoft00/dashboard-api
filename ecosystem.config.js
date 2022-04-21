module.exports = {
  apps: [
    {
      name: 'dashboard-api-v1',
      script: './dist/server.js',
      // args: ['start'],

      // watch: './src/**/*.js',
      // instances: 2,
      // exec_mode: 'cluster',

      env: {
        PORT: 3081,
      },
      env_production: {
        PORT: 3000,
      },
    },
  ],

  deploy: {
    production: {
      user: 'SSH_USERNAME',
      host: 'SSH_HOSTMACHINE',
      ref: 'origin/master',
      repo: 'git@gitlab.com:cpg_cicd/dashboard-api-v1.git',
      path: 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
    staging: {
      user: 'joseph_olaoye',
      host: '34.105.205.190',
      ref: 'origin/master',
      repo: 'git@gitlab.com:cpg_cicd/dashboard-api-v1.git',
      path: '/home/joseph_olaoye/dashboard-api-v1',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env dev',
      env: {
        NODE_ENV: 'development',
        NODE_CONFIG_DIR: './src/configs',
      },
    },
  },
};
