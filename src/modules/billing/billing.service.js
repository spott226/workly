const pool = require('../../config/db');

const changePlan = async (businessId, planCode) => {

  // 1️⃣ validar que el plan exista
  const planRes = await pool.query(
    `SELECT code FROM plans WHERE code = $1`,
    [planCode]
  );

  if (!planRes.rows.length) {
    throw new Error('PLAN_NOT_FOUND');
  }

  // 2️⃣ actualizar negocio
  await pool.query(
    `
    UPDATE businesses
SET
  plan_code = $1,
  subscription_status = 'active'
WHERE id = $2
    `,
    [planCode, businessId]
  );

  return {
    ok: true,
    plan_code: planCode
  };
};

module.exports = {
  changePlan
};
