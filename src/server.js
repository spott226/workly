/**
 * ============================================
 * Server bootstrap
 * Compatible con Railway / Docker / Local
 * ============================================
 */

require('dotenv').config();
const app = require('./app');

/* =========================
   CONFIG
========================= */

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

/* =========================
   HEALTH CHECK
   (Railway / Load Balancer)
========================= */

app.get('/', (_req, res) => {
  res.status(200).send('OK');
});

/* =========================
   START SERVER
========================= */

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 SaaS Citas running on ${HOST}:${PORT}`);
});

/* =========================
   GRACEFUL SHUTDOWN
========================= */

const shutdown = (signal) => {
  console.log(`⚠️  ${signal} received. Closing server...`);

  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });

  // Hard kill si algo se queda colgado
  setTimeout(() => {
    console.error('❌ Force shutdown');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
