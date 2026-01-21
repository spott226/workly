const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

/* =====================================================
   PERFIL PÚBLICO DEL NEGOCIO (POR SLUG)
   ✔ Case-insensitive
   ✔ Público (sin auth)
   ✔ Seguro
   ✔ Escalable para SaaS multi-negocio
===================================================== */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        slug,
        whatsapp_number,
        google_review_url,

        -- CONTENIDO EDITABLE PARA LANDING
        COALESCE(public_title, name)              AS public_title,
        COALESCE(public_description, '')          AS public_description,
        COALESCE(cta_text, 'Reservar cita')       AS cta_text,

        -- ESTILO VISUAL
        COALESCE(theme_variant, 'default')        AS theme_variant,
        COALESCE(font_variant, 'sans')            AS font_variant

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
