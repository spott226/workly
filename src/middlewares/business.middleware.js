const pool = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    // 🔒 Guardia defensiva
    if (!req.auth) {
      return next();
    }

    const { businessId } = req.auth;

    // Si no hay negocio aún (ej. /users/me), no bloqueamos
    if (!businessId) {
      return next();
    }

    const result = await pool.query(
      `
      SELECT id, name, timezone, google_calendar_id
      FROM businesses
      WHERE id = $1 AND active = true
      `,
      [businessId]
    );

    if (!result.rows.length) {
      return res
        .status(403)
        .json({ message: 'Business inactive or not found' });
    }

    // Inyectamos el business para uso posterior
    req.business = result.rows[0];

    next();
  } catch (error) {
    next(error);
  }
};
