module.exports = {
  apps: [
    {
      name: 'bexsign-server',
      script: './index.js',
      cwd: './server',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};