const pool = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    // 🔒 Guardas defensivas
    if (!req.auth) {
      return next();
    }

    const { userId, businessId } = req.auth;

    // Si no hay contexto de negocio, no evaluamos staff
    if (!userId || !businessId) {
      return next();
    }

    const result = await pool.query(
      `
      SELECT 1
      FROM staff
      WHERE user_id = $1
        AND business_id = $2
        AND is_active = true
      `,
      [userId, businessId]
    );

    if (result.rowCount > 0) {
      req.auth.role = 'STAFF';
    }

    next();
  } catch (error) {
    next(error);
  }
};
