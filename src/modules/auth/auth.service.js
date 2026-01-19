const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const { signToken } = require('../../config/jwt');

const signup = async ({ business_name, timezone = 'America/Mexico_City', email, password }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const businessResult = await client.query(
  `INSERT INTO businesses (
  name,
  timezone,
  subscription_status
)
VALUES (
  $1,
  $2,
  'PENDING_PAYMENT'
)
RETURNING id`,
  [business_name, timezone]
);

    const businessId = businessResult.rows[0].id;
    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (business_id, email, password_hash, role, active)
       VALUES ($1, $2, $3, 'OWNER', false)
       RETURNING id, role`,
      [businessId, email, passwordHash]
    );

    await client.query('COMMIT');

    return signToken({
      userId: userResult.rows[0].id,
      businessId,
      role: 'OWNER'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const login = async ({ email, password }) => {
  const result = await pool.query(
    `SELECT id, business_id, password_hash, role, active
     FROM users
     WHERE email = $1`,
    [email]
  );

  if (!result.rows.length) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];

  // ❌ usuario inactivo → no entra
  if (!user.active) {
    throw new Error('Invalid credentials');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  // 🔑 SI ES STAFF → VALIDAR staff.is_active
  if (user.role === 'STAFF') {
    const staffResult = await pool.query(
      `SELECT is_active
       FROM staff
       WHERE user_id = $1`,
      [user.id]
    );

    if (!staffResult.rows.length || !staffResult.rows[0].is_active) {
      throw new Error('Invalid credentials');
    }
  }

  return signToken({
    userId: user.id,
    businessId: user.business_id,
    role: user.role
  });
};

module.exports = {
  signup,
  login
};
