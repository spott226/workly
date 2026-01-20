const express = require('express');
const cors = require('cors');

const app = express();

/* =========================
   MIDDLEWARES BASE
========================= */

app.use(
  cors({
    origin: 'http://localhost:3001', // en prod luego lo cambias
  })
);

app.use(express.json());

/* =========================
   HEALTHCHECK (CRÍTICO RAILWAY)
========================= */

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

/* =========================
   RUTAS PÚBLICAS
   (NO auth / NO staff / NO business)
========================= */

app.use('/auth', require('./modules/auth/auth.routes'));

// 🔥 PERFIL PÚBLICO DEL NEGOCIO
app.use('/public/business', require('./modules/businesses/public.routes'));

// 🔥 DISPONIBILIDAD Y CITA PÚBLICA (CRÍTICO)
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

// ⛔ TODO LO QUE SIGUE ES PRIVADO
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
   ERRORES
========================= */

app.use(require('./middlewares/error.middleware'));

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
  });
});

module.exports = app;

app.get('/', (req, res) => {
  res.status(200).send('OK');
});
