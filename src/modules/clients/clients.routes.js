const express = require('express');
const router = express.Router();
const pool = require('../../config/db'); // 👈 FALTABA

const auth = require('../../middlewares/auth.middleware');

const {
  listClients,
  getClientStats,
  getClientProfile,
} = require('./clients.service');

/* ===========================
   LISTAR CLIENTES
   👉 ahora regresa clients + business
=========================== */
router.get('/', auth, async (req, res) => {
  try {
    const businessId = req.auth.businessId;

    const clients = await listClients(businessId);

    const { rows } = await pool.query(
      `
      SELECT
        whatsapp_number,
        google_review_url,
        review_message
      FROM businesses
      WHERE id = $1
      `,
      [businessId]
    );

    res.json({
      business: rows[0] || null,
      data: clients,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ===========================
   ESTADÍSTICAS
=========================== */
router.get('/stats', auth, async (req, res) => {
  try {
    const businessId = req.auth.businessId;
    const stats = await getClientStats(businessId);
    res.json({ data: stats });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ===========================
   PERFIL DE CLIENTE
=========================== */
router.get('/:id', auth, async (req, res) => {
  try {
    const businessId = req.auth.businessId;
    const clientId = req.params.id;

    const data = await getClientProfile(businessId, clientId);
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ===========================
   MARCAR RESEÑA COMO ENVIADA
=========================== */
router.patch('/:id/review-sent', auth, async (req, res) => {
  await pool.query(
    `
    UPDATE clients
    SET review_sent_at = NOW()
    WHERE id = $1
      AND business_id = $2
      AND review_sent_at IS NULL
    `,
    [req.params.id, req.auth.businessId]
  );

  res.json({ ok: true });
});

module.exports = router;
