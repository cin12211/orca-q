// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'orca-q-app',
      script: '.output/server/index.mjs',
      instances: 'max', // or: 3
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
