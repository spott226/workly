const bcrypt = require('bcrypt');
const pool = require('../../config/db');

const STAFF_LIMITS = {
  BASIC: 1,
  PRO: 2,
  ENTERPRISE: 5
};

async function createStaff({email, password, businessId }) {
  // 1️⃣ Obtener plan del business
  const planResult = await pool.query(
    `
    SELECT plan_code
    FROM businesses
    WHERE id = $1
    `,
    [businessId]
  );

  if (!planResult.rows.length) {
    throw { status: 404, message: 'Business not found' };
  }

  const planCode = planResult.rows[0].plan_code;

  // 2️⃣ Contar staff actuales
  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM staff
    WHERE business_id = $1
      AND is_active = true
    `,
    [businessId]
  );

  if (countResult.rows[0].count >= STAFF_LIMITS[planCode]) {
    throw { status: 403, message: 'Staff limit reached for your plan' };
  }

  // 3️⃣ Verificar email
  const emailCheck = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );

  if (emailCheck.rows.length) {
    throw { status: 409, message: 'Email already in use' };
  }

  // 4️⃣ Crear usuario
  const hashedPassword = await bcrypt.hash(password, 10);

  const userResult = await pool.query(
  `
  INSERT INTO users (email, password_hash, role, business_id)
VALUES ($1, $2, 'STAFF', $3)
  RETURNING id
  `,
 [email, hashedPassword, businessId]
);

  const userId = userResult.rows[0].id;

  // 5️⃣ Enlazar a staff
  await pool.query(
    `
     INSERT INTO staff (user_id, business_id, role)
  VALUES ($1, $2, 'staff')
    `,
    [userId, businessId]
  );

  return { userId };
}

module.exports = {
  createStaff
};
