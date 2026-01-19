const pool = require('../config/db');

const requireActiveSubscription = async (req, res, next) => {
  try {
    const businessId = req.businessId;

    const { rows } = await pool.query(
      `
      SELECT subscription_status
      FROM businesses
      WHERE id = $1
      `,
      [businessId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'BUSINESS_NOT_FOUND' });
    }

    const status = rows[0].subscription_status;

    if (status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'SUBSCRIPTION_NOT_ACTIVE',
        subscription_status: status
      });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

module.exports = { requireActiveSubscription };
