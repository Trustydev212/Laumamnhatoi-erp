module.exports = {
  apps: [
    {
      name: "nha-toi-backend",
      script: "dist/main.js",
      cwd: "apps/backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        API_PORT: 3001,
        API_HOST: "0.0.0.0",
        DATABASE_URL: "postgresql://nhatoi_user:210200@localhost:5432/nha_toierp?schema=public",
        CORS_ORIGIN: "http://36.50.27.82:3002",
        SOCKET_URL: "ws://36.50.27.82:3001",
        JWT_SECRET: "your-super-secret-jwt-key-change-this-in-production",
        JWT_EXPIRES_IN: "24h"
      },
      env_production: {
        NODE_ENV: "production",
        API_PORT: 3001,
        API_HOST: "0.0.0.0"
      },
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_file: "./logs/backend-combined.log",
      time: true,
      max_memory_restart: "1G",
      node_args: "--max-old-space-size=1024"
    },
    {
      name: "nha-toi-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002",
      cwd: "apps/frontend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        NEXT_PUBLIC_API_URL: "http://36.50.27.82:3001",
        NEXT_PUBLIC_WS_URL: "ws://36.50.27.82:3001",
        NEXT_TELEMETRY_DISABLED: "1"
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3002
      },
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_file: "./logs/frontend-combined.log",
      time: true,
      max_memory_restart: "1G"
    }
  ],

  deploy: {
    production: {
      user: "deploy",
      host: "36.50.27.82",
      ref: "origin/main",
      repo: "https://github.com/Trustydev212/Laumamnhatoi-erp.git",
      path: "/home/deploy/Laumamnhatoi-erp",
      "pre-deploy-local": "",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
      "pre-setup": ""
    }
  }
};
