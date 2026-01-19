const rateLimit = require('express-rate-limit');

const publicAppointmentsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Demasiadas solicitudes. Intenta más tarde.',
  },
});

module.exports = {
  publicAppointmentsLimiter,
};
