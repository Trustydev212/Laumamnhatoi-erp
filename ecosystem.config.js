module.exports = {
  apps: [
    {
      name: "laumam-backend",
      script: "apps/backend/dist/main.js",
      cwd: "/home/deploy/Laumamnhatoi-erp",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "/home/deploy/.pm2/logs/laumam-backend-error.log",
      out_file: "/home/deploy/.pm2/logs/laumam-backend-out.log",
      log_file: "/home/deploy/.pm2/logs/laumam-backend.log",
      time: true,
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s"
    },
    {
      name: "laumam-frontend",
      script: "npm",
      args: "run start",
      cwd: "/home/deploy/Laumamnhatoi-erp/apps/frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      error_file: "/home/deploy/.pm2/logs/laumam-frontend-error.log",
      out_file: "/home/deploy/.pm2/logs/laumam-frontend-out.log",
      log_file: "/home/deploy/.pm2/logs/laumam-frontend.log",
      time: true,
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s"
    }
  ]
};