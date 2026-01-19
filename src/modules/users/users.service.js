const pool = require('../../config/db');
const bcrypt = require('bcrypt');

const listUsers = async (businessId) => {
  const res = await pool.query(
    `SELECT id, email, role, active, created_at
     FROM users
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [businessId]
  );

  return res.rows;
};

const createUser = async (businessId, data) => {
  const { email, password, role } = data;

  const passwordHash = await bcrypt.hash(password, 10);

  const res = await pool.query(
    `INSERT INTO users (business_id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, active, created_at`,
    [businessId, email, passwordHash, role]
  );

  return res.rows[0];
};

const toggleUserActive = async (businessId, userId, active) => {
  const res = await pool.query(
    `UPDATE users
     SET active = $1
     WHERE id = $2 AND business_id = $3
     RETURNING id, email, role, active`,
    [active, userId, businessId]
  );

  if (!res.rows.length) {
    throw new Error('User not found');
  }

  return res.rows[0];
};

module.exports = {
  listUsers,
  createUser,
  toggleUserActive
};
