const pool = require('../../config/db');

/**
 * CREAR SERVICIO
 */
const createService = async (businessId, data) => {
  const {
    name,
    duration_minutes,
    price_min,
    price_max
  } = data;

  if (
    !name ||
    !duration_minutes ||
    price_min == null ||
    price_max == null
  ) {
    throw new Error('SERVICE_DATA_REQUIRED');
  }

  if (price_min > price_max) {
    throw new Error('INVALID_PRICE_RANGE');
  }

  const res = await pool.query(
    `INSERT INTO services (
       business_id,
       name,
       duration_minutes,
       price_min,
       price_max,
       is_active
     )
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING
       id,
       name,
       duration_minutes,
       price_min,
       price_max,
       is_active`,
    [
      businessId,
      name,
      duration_minutes,
      price_min,
      price_max
    ]
  );

  return res.rows[0];
};

/**
 * LISTAR SERVICIOS (DASHBOARD)
 * → muestra activos e inactivos
 */
const listServices = async (businessId) => {
  const res = await pool.query(
    `SELECT
       id,
       name,
       duration_minutes,
       price_min,
       price_max,
       is_active
     FROM services
     WHERE business_id = $1
     ORDER BY name`,
    [businessId]
  );

  return res.rows;
};

/**
 * ACTIVAR / DESACTIVAR SERVICIO
 */
const setServiceActive = async (businessId, serviceId, isActive) => {
  const res = await pool.query(
    `UPDATE services
     SET is_active = $1,
         updated_at = now()
     WHERE id = $2
       AND business_id = $3
     RETURNING
       id,
       name,
       duration_minutes,
       price_min,
       price_max,
       is_active`,
    [isActive, serviceId, businessId]
  );

  return res.rows[0];
};

/**
 * LISTAR SERVICIOS (PUBLICO POR SLUG)
 * → solo activos
 */
const listPublicServicesBySlug = async (slug) => {
  if (!slug) return [];

  // 1️⃣ obtener negocio por slug
  const { rows: biz } = await pool.query(
    `SELECT id
     FROM businesses
     WHERE slug = $1
       AND active = true`,
    [slug]
  );

  if (!biz.length) return [];

  // 2️⃣ obtener servicios activos de ese negocio
  const { rows } = await pool.query(
    `SELECT
       id,
       name,
       duration_minutes,
       price_min
     FROM services
     WHERE business_id = $1
       AND is_active = true
     ORDER BY name`,
    [biz[0].id]
  );

  return rows;
};

module.exports = {
  createService,
  listServices,
  setServiceActive,
  listPublicServicesBySlug
};
