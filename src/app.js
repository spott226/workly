const express = require('express');
const cors = require('cors');

const app = express();

/* =========================
   CORS (CRÍTICO)
========================= */

app.use(
  cors({
    origin: [
      'http://localhost:3001',
      'https://workly-production-6f53.up.railway.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  })
);

// Preflight requests
app.options('*', cors());

/* =========================
   BODY PARSER
========================= */

app.use(express.json());

/* =========================
   HEALTHCHECK (RAILWAY)
========================= */

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

/* =========================
   RUTAS PÚBLICAS
   (NO auth / NO staff / NO business)
========================= */

app.use('/auth', require('./modules/auth/auth.routes'));

// Perfil público del negocio
app.use('/public/business', require('./modules/businesses/public.routes'));

// Disponibilidad y creación de cita pública
app.use(
  '/api/appointments',
  require('./modules/appointments/appointments.routes')
);

/* =========================
   RUTAS PRIVADAS BÁSICAS
========================= */

const authMiddleware = require('./middlewares/auth.middleware');
app.use('/users', authMiddleware, require('./modules/users/users.routes'));

/* =========================
   MIDDLEWARES AVANZADOS
========================= */

const staffMiddleware = require('./middlewares/staff.middleware');
const businessMiddleware = require('./middlewares/business.middleware');
const staffOnlyAppointmentsMiddleware =
  require('./middlewares/staff-only-appointments.middleware');

// ⛔ TODO lo que sigue requiere:
// - JWT válido
// - staff activo
// - business activo
app.use(staffMiddleware);
app.use(businessMiddleware);
app.use(staffOnlyAppointmentsMiddleware);

/* =========================
   RUTAS PRIVADAS AVANZADAS
========================= */

app.use('/services', require('./modules/services/services.routes'));
app.use('/employees', require('./modules/employees/employees.routes'));
app.use('/appointments', require('./modules/appointments/appointments.routes'));
app.use('/clients', require('./modules/clients/clients.routes'));
app.use('/businesses', require('./modules/businesses/businesses.routes'));
app.use('/staff', require('./modules/staff/staff.routes'));
app.use('/plans', require('./modules/plans/plans.routes'));
app.use('/billing', require('./modules/billing/billing.routes'));

app.use(
  '/integrations/google-calendar',
  require('./integrations/google-calendar/google.routes')
);

/* =========================
   MANEJO DE ERRORES
========================= */

app.use(require('./middlewares/error.middleware'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
  });
});

module.exports = app;
