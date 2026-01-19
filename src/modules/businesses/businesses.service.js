const pool = require('../../config/db');

/* =========================================================
   PERFIL BÁSICO DEL NEGOCIO
========================================================= */
const getBusinessProfile = async (businessId) => {
  const res = await pool.query(
    `
    SELECT
      id,
      name,
      timezone,
      created_at,
      whatsapp_number,
      google_review_url,
      review_message,
      opening_time,
      closing_time
    FROM businesses
    WHERE id = $1
    `,
    [businessId]
  );

  if (!res.rows.length) {
    throw new Error('Business not found');
  }

  return res.rows[0];
};

/* =========================================================
   ACTUALIZAR PERFIL DEL NEGOCIO
========================================================= */
const updateBusinessProfile = async (businessId, data) => {
  const {
    whatsapp_number,
    google_review_url,
    review_message,
    opening_time,
    closing_time,
    tolerance_minutes,
  } = data;

  const res = await pool.query(
    `
    UPDATE businesses
    SET
      whatsapp_number = COALESCE($1, whatsapp_number),
      google_review_url = COALESCE($2, google_review_url),
      review_message = COALESCE($3, review_message),
      opening_time = COALESCE($4, opening_time),
      closing_time = COALESCE($5, closing_time),
      tolerance_minutes = COALESCE($6, tolerance_minutes)
    WHERE id = $7
      AND active = true
    RETURNING
      id,
      name,
      whatsapp_number,
      google_review_url,
      review_message,
      opening_time,
      closing_time,
      tolerance_minutes
    `,
    [
      whatsapp_number,
      google_review_url,
      review_message ?? null,
      opening_time ?? null,
      closing_time ?? null,
      tolerance_minutes ?? null,
      businessId,
    ]
  );

  return res.rows[0];
};

/* =========================================================
   GOOGLE OAUTH (NO TOCAR)
========================================================= */
const saveGoogleTokens = async (businessId, tokens) => {
  const { refresh_token } = tokens;

  await pool.query(
    `
    UPDATE businesses
    SET
      google_connected_at = NOW(),
      google_refresh_token = COALESCE($1, google_refresh_token)
    WHERE id = $2
    `,
    [refresh_token, businessId]
  );
};

/* =========================================================
   BUSINESS ME (DASHBOARD)
========================================================= */
const getBusinessMe = async (businessId) => {
  const res = await pool.query(
    `
    SELECT
      b.id,
      b.name,
      b.subscription_status,
      b.plan_code,
      b.google_refresh_token,
      b.whatsapp_number,
      b.review_message,
      b.google_review_url,
      b.opening_time,
      b.closing_time
    FROM businesses b
    WHERE b.id = $1
    `,
    [businessId]
  );

  if (!res.rows.length) {
    throw new Error('Business not found');
  }

  const b = res.rows[0];

  return {
    id: b.id,
    name: b.name,
    google_refresh_token: b.google_refresh_token,
    whatsapp_number: b.whatsapp_number,
    google_review_url: b.google_review_url,
    review_message: b.review_message,
    opening_time: b.opening_time,
    closing_time: b.closing_time,
  };
};


/* =========================================================
   HORARIO DEL NEGOCIO (APERTURA / CIERRE)
========================================================= */
const getBusinessHours = async (businessId) => {
  const res = await pool.query(
    `
    SELECT
      opening_time,
      closing_time
    FROM businesses
    WHERE id = $1
    `,
    [businessId]
  );

  return res.rows[0];
};

const updateBusinessHours = async (businessId, data) => {
  const { opening_time, closing_time } = data;

  const res = await pool.query(
    `
    UPDATE businesses
    SET
      opening_time = COALESCE($1, opening_time),
      closing_time = COALESCE($2, closing_time)
    WHERE id = $3
    RETURNING opening_time, closing_time
    `,
    [opening_time, closing_time, businessId]
  );

  return res.rows[0];
};

/* =========================================================
   HORARIO + TOLERANCIA POR EMPLEADO (POR DÍA)
   day = 'weekday' | 'saturday' | 'sunday'
========================================================= */
const updateEmployeeSchedule = async (
  businessId,
  employeeId,
  day,
  data
) => {
  const {
    expected_check_in,
    expected_check_out,
    tolerance_minutes,
  } = data;

  const columnMap = {
    weekday: {
      in: 'expected_check_in',
      out: 'expected_check_out',
      tol: 'tolerance_minutes',
    },
    saturday: {
      in: 'expected_check_in_sat',
      out: 'expected_check_out_sat',
      tol: 'tolerance_minutes_sat',
    },
    sunday: {
      in: 'expected_check_in_sun',
      out: 'expected_check_out_sun',
      tol: 'tolerance_minutes_sun',
    },
  };

  const cols = columnMap[day];
  if (!cols) throw new Error('INVALID_DAY');

  const res = await pool.query(
    `
    UPDATE employees
    SET
      ${cols.in} = COALESCE($1, ${cols.in}),
      ${cols.out} = COALESCE($2, ${cols.out}),
      ${cols.tol} = COALESCE($3, ${cols.tol})
    WHERE id = $4
      AND business_id = $5
    RETURNING
      id,
      ${cols.in} AS expected_check_in,
      ${cols.out} AS expected_check_out,
      ${cols.tol} AS tolerance_minutes
    `,
    [
      expected_check_in ?? null,
      expected_check_out ?? null,
      tolerance_minutes ?? null,
      employeeId,
      businessId,
    ]
  );

  if (!res.rows.length) {
    throw new Error('EMPLOYEE_NOT_FOUND');
  }

  return res.rows[0];
};

module.exports = {
  getBusinessProfile,
  updateBusinessProfile,
  saveGoogleTokens,
  getBusinessMe,
  getBusinessHours,
  updateBusinessHours,
  updateEmployeeSchedule,
};
