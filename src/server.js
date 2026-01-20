require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 8080;

// 🔥 ENDPOINT DE VIDA PARA RAILWAY
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`SaaS Citas running on port ${PORT}`);
});

// 🔒 MANEJO LIMPIO DE SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
