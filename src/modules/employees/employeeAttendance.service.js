const pool = require('../../config/db');
const { DateTime } = require('luxon');

const ZONE = 'America/Mexico_City';

/* =========================
   HELPERS
========================= */
const getLocalDate = () =>
  DateTime.now().setZone(ZONE).toISODate(); // YYYY-MM-DD

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Normaliza la hora:
 * - Acepta ISO (2026-01-19T17:42:41.780Z)
 * - Acepta HH:mm
 * - Acepta HH:mm:ss
 * - Devuelve SIEMPRE HH:mm:ss
 */
const normalizeTime = (value) => {
  // HH:mm o HH:mm:ss
  if (/^\d{2}:\d{2}/.test(value)) {
    return value.length === 5 ? `${value}:00` : value;
  }

  // ISO → hora local MX
  return DateTime
    .fromISO(value)
    .setZone(ZONE)
    .toFormat('HH:mm:ss');
};

/* =========================
   CHECK-IN
========================= */
const checkInEmployee = async (businessId, employeeId, time) => {
  const today = getLocalDate();
  const checkInTime = normalizeTime(time);

  // 1️⃣ validar empleado
  const empRes = await pool.query(
    `
    SELECT
      expected_check_in,
      tolerance_minutes
    FROM employees
    WHERE id = $1
      AND business_id = $2
      AND active = true
    `,
    [employeeId, businessId]
  );

  if (!empRes.rows.length) {
    throw new Error('EMPLOYEE_NOT_FOUND');
  }

  // 2️⃣ validar que NO exista asistencia hoy
  const exists = await pool.query(
    `
    SELECT id
    FROM employee_attendance
    WHERE employee_id = $1
      AND business_id = $2
      AND date = $3
    `,
    [employeeId, businessId, today]
  );

  if (exists.rows.length) {
    throw new Error('CHECK_IN_ALREADY_DONE');
  }

  // 3️⃣ calcular retardo
  const { expected_check_in, tolerance_minutes } = empRes.rows[0];
  let arrived_late = false;

  if (expected_check_in) {
    const expected = toMinutes(expected_check_in);
    const arrived = toMinutes(checkInTime);

    if (arrived > expected + (tolerance_minutes || 0)) {
      arrived_late = true;
    }
  }

  // 4️⃣ insertar asistencia
  await pool.query(
    `
    INSERT INTO employee_attendance (
      business_id,
      employee_id,
      date,
      check_in,
      arrived_late,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'PRESENT')
    `,
    [businessId, employeeId, today, checkInTime, arrived_late]
  );

  return { ok: true, arrived_late };
};

/* =========================
   CHECK-OUT
========================= */
const checkOutEmployee = async (businessId, employeeId, time) => {
  const today = getLocalDate();
  const checkOutTime = normalizeTime(time);

  // 1️⃣ validar empleado
  const empRes = await pool.query(
    `
    SELECT expected_check_out
    FROM employees
    WHERE id = $1
      AND business_id = $2
      AND active = true
    `,
    [employeeId, businessId]
  );

  if (!empRes.rows.length) {
    throw new Error('EMPLOYEE_NOT_FOUND');
  }

  // 2️⃣ traer asistencia de hoy
  const attRes = await pool.query(
    `
    SELECT check_out
    FROM employee_attendance
    WHERE employee_id = $1
      AND business_id = $2
      AND date = $3
    `,
    [employeeId, businessId, today]
  );

  if (!attRes.rows.length) {
    throw new Error('NO_CHECK_IN_FOUND');
  }

  if (attRes.rows[0].check_out) {
    throw new Error('CHECK_OUT_ALREADY_DONE');
  }

  // 3️⃣ calcular salida
  const { expected_check_out } = empRes.rows[0];
  let left_late = false;
  let left_early = false;

  if (expected_check_out) {
    const expected = toMinutes(expected_check_out);
    const left = toMinutes(checkOutTime);

    if (left > expected) left_late = true;
    if (left < expected) left_early = true;
  }

  // 4️⃣ actualizar salida
  await pool.query(
    `
    UPDATE employee_attendance
    SET
      check_out = $1,
      left_late = $2,
      left_early = $3
    WHERE employee_id = $4
      AND business_id = $5
      AND date = $6
    `,
    [
      checkOutTime,
      left_late,
      left_early,
      employeeId,
      businessId,
      today,
    ]
  );

  return { ok: true, left_late, left_early };
};

/* =========================
   ASISTENCIA DE HOY (DASHBOARD)
========================= */
const getTodayAttendance = async (businessId) => {
  const today = getLocalDate();

  const { rows } = await pool.query(
    `
    SELECT
      e.id AS employee_id,
      e.first_name,
      e.last_name,

      -- horario configurado
      e.expected_check_in,
      e.expected_check_out,
      e.tolerance_minutes,

      -- asistencia del día
      a.date AS attendance_date,
      a.check_in,
      a.check_out,
      a.arrived_late,
      a.left_late,
      a.left_early,
      COALESCE(a.status, 'ABSENT') AS status

    FROM employees e
    LEFT JOIN employee_attendance a
      ON a.employee_id = e.id
     AND a.business_id = $1
     AND a.date = $2
    WHERE e.business_id = $1
      AND e.active = true
    ORDER BY e.first_name
    `,
    [businessId, today]
  );

  return rows;
};

module.exports = {
  checkInEmployee,
  checkOutEmployee,
  getTodayAttendance,
};
