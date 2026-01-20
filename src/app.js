const express = require('express');
const cors = require('cors');

const app = express();

/* =========================
   CORS (CRÍTICO)
========================= */

const allowedOrigins = [
  'http://localhost:3001',
  'https://workly-front.vercel.app', // 👈 ESTE FALTABA
];

app.use(
  cors({
    origin: function (origin, callback) {
      // permitir requests sin origin (Postman, curl, Railway healthcheck)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Preflight
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
========================= */

app.use('/auth', require('./modules/auth/auth.routes'));
app.use('/public/business', require('./modules/businesses/public.routes'));
app.use('/api/appointments', require('./modules/appointments/appointments.routes'));

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
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
  });
});

module.exports = app;
