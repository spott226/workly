const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

/* =====================================================
   PERFIL PÚBLICO DEL NEGOCIO (POR SLUG)
   ✔ Case-insensitive
   ✔ Sin romper el front
===================================================== */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        whatsapp_number,
        google_review_url,
        slug
      FROM businesses
      WHERE LOWER(slug) = LOWER($1)
        AND active = true
      LIMIT 1
      `,
      [slug]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: 'Negocio no encontrado',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo negocio público:', error);
    res.status(500).json({
      message: 'Error interno del servidor',
    });
  }
});

module.exports = router;
