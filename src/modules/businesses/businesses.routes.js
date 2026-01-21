const express = require('express');
const router = express.Router();

const auth = require('../../middlewares/auth.middleware');
const business = require('../../middlewares/business.middleware');
const role = require('../../middlewares/role.middleware'); // ✅ FALTABA

const service = require('./businesses.service');

router.use(auth);
router.use(business);

/* =========================================================
   VER PERFIL DEL NEGOCIO (ME)
========================================================= */
router.get('/me', async (req, res) => {
  const data = await service.getBusinessMe(req.auth.businessId);
  res.json(data);
});

/* =========================================================
   ACTUALIZAR PERFIL DEL NEGOCIO
   👉 whatsapp + google url + review_message
========================================================= */
router.patch('/me', async (req, res) => {
  const {
    name,
    address,
    whatsapp_number,
    google_review_url,
    review_message,
    opening_time,
    closing_time,
    tolerance_minutes,
  } = req.body;

  const normalizePhone = (phone) =>
    phone ? phone.replace(/\D/g, '') : null;

  const data = await service.updateBusinessProfile(
    req.auth.businessId,
    {
      name,
      address,
      whatsapp_number: normalizePhone(whatsapp_number),
      google_review_url: google_review_url || null,
      review_message: review_message ?? null,
      opening_time: opening_time ?? null,
      closing_time: closing_time ?? null,
      tolerance_minutes: tolerance_minutes ?? null,
    }
  );

  res.json(data);
});


/* =========================================================
   HORARIOS DEL NEGOCIO (ASISTENCIAS)
   SOLO CONFIGURACIÓN
========================================================= */

/**
 * OBTENER HORARIOS
 */
router.get('/me/hours', async (req, res) => {
  const data = await service.getBusinessHours(
    req.auth.businessId
  );
  res.json(data);
});

/**
 * ACTUALIZAR HORARIOS
 */
router.put('/me/hours', async (req, res) => {
  const { business_hours } = req.body;

  if (!business_hours || typeof business_hours !== 'object') {
    return res.status(400).json({
      code: 'INVALID_HOURS',
      message: 'business_hours inválido'
    });
  }

  const data = await service.updateBusinessHours(
    req.auth.businessId,
    business_hours
  );

  res.json(data);
});

/* =========================================================
   CONFIGURACIÓN PÚBLICA (LANDING)
   👉 título, descripción, CTA, estilo, tipografía
========================================================= */
router.put('/public-config', async (req, res) => {
  try {
    const {
      public_title,
      public_description,
      cta_text,
      theme_variant,
      font_variant,
    } = req.body;

    const data = await service.updatePublicConfig(
      req.auth.businessId,
      {
        public_title,
        public_description,
        cta_text,
        theme_variant,
        font_variant,
      }
    );

    res.json(data);
  } catch (error) {
    console.error('Error guardando public config:', error);
    res.status(500).json({
      message: 'Error al guardar configuración pública',
    });
  }
});

module.exports = router;
