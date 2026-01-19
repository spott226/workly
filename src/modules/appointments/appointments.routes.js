const express = require('express');
const router = express.Router();

const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const business = require('../../middlewares/business.middleware');
const {
  publicAppointmentsLimiter,
} = require('../../middlewares/public-rate-limit.middleware');

const {
  getAvailableEmployees,
  createAppointment,
  createPublicAppointment,
  listAppointments,
  confirmAppointment,
  markAsAttended,
  markAsNoShow,
  cancelAppointment,
  rescheduleAppointment,
  markReviewAsSent,
} = require('./appointments.service');

/* =========================================================
   DISPONIBILIDAD (PUBLICA) — CORRECTA
   👉 DEVUELVE ARRAY PLANO
========================================================= */
router.get('/availability', async (req, res) => {
  try {
    const { serviceId, startISO } = req.query;

    if (!serviceId || !startISO) {
      return res.status(400).json({
        message: 'serviceId y startISO son requeridos',
      });
    }

    const employees = await getAvailableEmployees(
      null,
      serviceId,
      startISO
    );

    // 🔥 ARRAY PLANO SIEMPRE
    res.json(employees);
  } catch (err) {
    res.status(200).json([]); // ⛔ NUNCA romper frontend
  }
});

/* =========================================================
   CREAR CITA (PUBLICA)
========================================================= */
router.post(
  '/public',
  publicAppointmentsLimiter,
  async (req, res) => {
    try {
      const {
        slug,
        serviceId,
        employeeId,
        startISO,
        clientName,
        phone,
      } = req.body;

      if (
        !slug ||
        !serviceId ||
        !employeeId ||
        !startISO ||
        !clientName ||
        !phone
      ) {
        throw new Error('MISSING_DATA');
      }

      await createPublicAppointment(req.body);

      res.status(201).json({ ok: true });
    } catch (err) {
      res.status(400).json({
        message: err.message,
      });
    }
  }
);

/* =========================================================
   CREAR CITA (PRIVADA)
========================================================= */
router.post(
  '/',
  auth,
  business,
  role(['OWNER', 'STAFF']),
  async (req, res) => {
    try {
      const appointment = await createAppointment(
  req.business.id,
  req.body,
  req.auth.userId
);


      res.status(201).json({
        success: true,
        appointment,
      });
    } catch (err) {
      res.status(400).json({
        message: err.message,
      });
    }
  }
);

/* =========================================================
   RUTAS PRIVADAS
========================================================= */

router.use(auth);

router.get('/', async (req, res) => {
  const items = await listAppointments(req.auth.businessId);
  res.json(items);
});

router.patch(
  '/:id/confirm',
  role(['OWNER', 'STAFF']),
  async (req, res) => {
    await confirmAppointment(
  req.auth.businessId,
  req.params.id,
  req.auth.userId
);
    res.json({ ok: true });
  }
);

router.patch(
  '/:id/cancel',
  role(['OWNER', 'STAFF']),
  async (req, res) => {
    await cancelAppointment(
  req.auth.businessId,
  req.params.id,
  req.auth.userId
);
    res.json({ ok: true });
  }
);

router.patch(
  '/:id/reschedule',
  role(['OWNER', 'STAFF']),
  async (req, res) => {
    await rescheduleAppointment(
  req.auth.businessId,
  req.params.id,
  req.body.startISO,
  req.auth.userId
);
    res.json({ ok: true });
  }
);

router.patch(
  '/:id/attend',
  role(['OWNER', 'STAFF']),
  async (req, res) => {
    await markAsAttended(
  req.auth.businessId,
  req.params.id,
  req.auth.userId
);
    res.json({ ok: true });
  }
);

router.patch(
  '/:id/no-show',
  role(['OWNER', 'STAFF']),
  async (req, res) => {
    await markAsNoShow(
  req.auth.businessId,
  req.params.id,
  req.auth.userId
);
    res.json({ ok: true });
  }
);

router.patch(
  '/:id/review-sent',
  role(['OWNER', 'STAFF']),
  async (req, res) => {
    await markReviewAsSent(
      req.auth.businessId,
      req.params.id
    );
    res.json({ ok: true });
  }
);

/* =========================================================
   SUMMARY HOY (DUMMY / BASE)
========================================================= */
router.get('/summary/today', async (req, res) => {
  res.json({
    total: 0,
    pending: 0,
    confirmed: 0,
    attended: 0,
    no_show: 0,
  });
});

module.exports = router;
