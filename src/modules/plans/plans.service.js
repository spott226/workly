const pool = require('../../config/db');

const getPlans = async () => {
  const res = await pool.query(
    `
    SELECT
      code,
      price,
      currency,
      max_employees
    FROM plans
    ORDER BY price ASC
    `
  );

  return res.rows;
};

module.exports = {
  getPlans
};
