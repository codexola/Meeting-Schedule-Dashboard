/**
 * PM2 process definitions for the Meeting Schedule Dashboard.
 *
 * Keeps the database and backend always-on (auto-restart, survives terminal
 * closes and reboots) — the same pattern used by the other projects on this
 * machine. Start with:  pm2 start ecosystem.config.cjs && pm2 save
 */
const path = require("path");

const root = __dirname;
const backend = path.join(root, "backend");

module.exports = {
  apps: [
    {
      name: "meeting-db",
      script: path.join(root, "scripts", "run-db.mjs"),
      cwd: root,
      autorestart: true,
      min_uptime: 10000,
      max_restarts: 20,
      restart_delay: 3000,
    },
    {
      name: "meeting-backend",
      script: path.join(backend, "scripts", "start.mjs"),
      cwd: backend,
      autorestart: true,
      min_uptime: 10000,
      max_restarts: 20,
      restart_delay: 3000,
    },
  ],
};
