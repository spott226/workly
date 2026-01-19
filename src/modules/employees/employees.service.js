const pool = require('../../config/db');

/* =========================
   CREAR EMPLEADO
========================= */
const createEmployee = async (businessId, data) => {
  const { first_name, last_name, phone } = data;

  if (!first_name || !last_name || !phone) {
    throw new Error('EMPLOYEE_DATA_REQUIRED');
  }

  const bizRes = await pool.query(
    `SELECT id FROM businesses WHERE id = $1`,
    [businessId]
  );

  if (!bizRes.rows.length) {
    throw new Error('BUSINESS_NOT_FOUND');
  }

  const insertRes = await pool.query(
    `
    INSERT INTO employees (business_id, first_name, last_name, phone)
    VALUES ($1, $2, $3, $4)
    RETURNING id, first_name, last_name, phone, active
    `,
    [businessId, first_name, last_name, phone]
  );

  return insertRes.rows[0];
};

/* =========================
   LISTAR EMPLEADOS
========================= */
const listEmployees = async (businessId) => {
  const res = await pool.query(
    `
    SELECT
      e.id,
      e.first_name,
      e.last_name,
      e.phone,
      e.active,
      COALESCE(
        ARRAY_AGG(es.service_id)
          FILTER (WHERE es.active = true),
        '{}'
      ) AS service_ids
    FROM employees e
    LEFT JOIN employee_services es
      ON es.employee_id = e.id
    WHERE e.business_id = $1
    GROUP BY e.id
    ORDER BY e.first_name
    `,
    [businessId]
  );

  return res.rows;
};

/* =========================
   ACTIVAR / DESACTIVAR EMPLEADO
========================= */
const setEmployeeActive = async (businessId, employeeId, active) => {
  const res = await pool.query(
    `
    UPDATE employees
    SET active = $1
    WHERE id = $2
      AND business_id = $3
    RETURNING id, first_name, last_name, phone, active
    `,
    [active, employeeId, businessId]
  );

  if (!res.rows.length) {
    throw new Error('EMPLOYEE_NOT_FOUND');
  }

  return res.rows[0];
};

/* =========================
   LISTAR SERVICIOS DEL EMPLEADO
========================= */
const listEmployeeServices = async (businessId, employeeId) => {
  const res = await pool.query(
    `
    SELECT
      s.id,
      s.name
    FROM employee_services es
    JOIN employees e ON e.id = es.employee_id
    JOIN services s ON s.id = es.service_id
    WHERE e.id = $1
      AND e.business_id = $2
      AND e.active = true
      AND es.active = true
      AND s.is_active = true
    ORDER BY s.name
    `,
    [employeeId, businessId]
  );

  return res.rows;
};

/* =========================
   ASIGNAR SERVICIO
========================= */
const assignServiceToEmployee = async (businessId, employeeId, serviceId) => {
  const emp = await pool.query(
    `
    SELECT id
    FROM employees
    WHERE id = $1
      AND business_id = $2
      AND active = true
    `,
    [employeeId, businessId]
  );

  if (!emp.rows.length) {
    throw new Error('EMPLOYEE_NOT_FOUND');
  }

  const srv = await pool.query(
    `
    SELECT id
    FROM services
    WHERE id = $1
      AND business_id = $2
      AND is_active = true
    `,
    [serviceId, businessId]
  );

  if (!srv.rows.length) {
    throw new Error('SERVICE_NOT_FOUND');
  }

  const result = await pool.query(
    `
    INSERT INTO employee_services (employee_id, service_id, active)
    VALUES ($1, $2, true)
    ON CONFLICT (employee_id, service_id)
    DO UPDATE SET active = true
    RETURNING employee_id, service_id, active
    `,
    [employeeId, serviceId]
  );

  return result.rows[0];
};

/* =========================
   QUITAR SERVICIO
========================= */
const removeServiceFromEmployee = async (businessId, employeeId, serviceId) => {
  const result = await pool.query(
    `
    UPDATE employee_services es
    SET active = false
    FROM employees e
    WHERE es.employee_id = e.id
      AND es.service_id = $1
      AND e.id = $2
      AND e.business_id = $3
    RETURNING es.employee_id, es.service_id, es.active
    `,
    [serviceId, employeeId, businessId]
  );

  if (!result.rows.length) {
    throw new Error('SERVICE_NOT_ASSIGNED');
  }

  return result.rows[0];
};

/* =========================
   ESTADÍSTICAS DEL EMPLEADO
========================= */
const getEmployeeStats = async (businessId, employeeId) => {
  const empRes = await pool.query(
    `
    SELECT id
    FROM employees
    WHERE id = $1
      AND business_id = $2
    `,
    [employeeId, businessId]
  );

  if (!empRes.rows.length) {
    throw new Error('EMPLOYEE_NOT_FOUND');
  }

  const totalAppointmentsRes = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM appointments
    WHERE employee_id = $1
      AND status = 'ATTENDED'
    `,
    [employeeId]
  );

  const topServiceRes = await pool.query(
    `
    SELECT s.name, COUNT(*) AS total
    FROM appointments a
    JOIN services s
      ON s.id = a.service_id
     AND s.business_id = $2
    WHERE a.employee_id = $1
      AND a.status = 'ATTENDED'
    GROUP BY s.name
    ORDER BY total DESC
    LIMIT 1
    `,
    [employeeId, businessId]
  );

  return {
    totalAppointments: Number(totalAppointmentsRes.rows[0].total),
    topService: topServiceRes.rows[0] || null,
  };
};

/* =========================
   ASISTENCIA DEL DÍA
========================= */
const getTodayAttendance = async (businessId) => {
  const today = new Date().toISOString().split('T')[0];

  const res = await pool.query(
    `
    SELECT
      e.id AS employee_id,
      e.first_name,
      e.last_name,
      e.expected_check_in,
      e.expected_check_out,
      e.tolerance_minutes,
      COALESCE(a.status, 'ABSENT') AS status,
      a.check_in,
      a.check_out,
      a.arrived_late,
      a.left_late,
      a.left_early
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

  return res.rows;
};

/* =========================
   HISTORIAL DE ASISTENCIA
========================= */
const getEmployeeAttendanceHistory = async (businessId, employeeId) => {
  const res = await pool.query(
    `
    SELECT
      date,
      check_in,
      check_out,
      status,
      arrived_late,
      left_late,
      left_early
    FROM employee_attendance
    WHERE employee_id = $1
      AND business_id = $2
    ORDER BY date DESC
    `,
    [employeeId, businessId]
  );

  return res.rows;
};

/* =========================
   ACTUALIZAR HORARIO
========================= */
const updateEmployeeSchedule = async (
  businessId,
  employeeId,
  { expected_check_in, expected_check_out, tolerance_minutes }
) => {
  const res = await pool.query(
    `
    UPDATE employees
    SET
      expected_check_in = $1,
      expected_check_out = $2,
      tolerance_minutes = $3
    WHERE id = $4
      AND business_id = $5
      AND active = true
    RETURNING
      id,
      expected_check_in,
      expected_check_out,
      tolerance_minutes
    `,
    [
      expected_check_in,
      expected_check_out,
      tolerance_minutes ?? 0,
      employeeId,
      businessId,
    ]
  );

  if (!res.rows.length) {
    throw new Error('EMPLOYEE_NOT_FOUND');
  }

  return res.rows[0];
};

/* =========================
   PERFORMANCE DEL EMPLEADO
========================= */
const getEmployeePerformance = async (businessId, employeeId, period = 'day') => {
  // 📅 RANGO DE FECHAS
  let dateFilter = '';
  let params = [employeeId, businessId];

  if (period === 'day') {
    dateFilter = 'CURRENT_DATE';
  }

  if (period === 'week') {
    dateFilter = "date_trunc('week', CURRENT_DATE)";
  }

  if (period === 'month') {
    dateFilter = "date_trunc('month', CURRENT_DATE)";
  }

  /* =========================
     PUNTUALIDAD
  ========================= */
  const punctualityRes = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE arrived_late = true) AS late_arrivals,
      COUNT(*) FILTER (WHERE left_early = true) AS early_departures
    FROM employee_attendance
    WHERE employee_id = $1
      AND business_id = $2
      AND date >= ${dateFilter}
    `,
    params
  );

  /* =========================
     PRODUCTIVIDAD
  ========================= */
  const productivityRes = await pool.query(
    `
    SELECT COUNT(*) AS total_services
    FROM appointments
    WHERE employee_id = $1
      AND status = 'ATTENDED'
      AND starts_at >= ${dateFilter}
    `,
    [employeeId]
  );

  /* =========================
     DESGLOSE DE SERVICIOS
  ========================= */
  const servicesRes = await pool.query(
    `
    SELECT
      s.name,
      COUNT(*) AS total
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.employee_id = $1
      AND a.status = 'ATTENDED'
      AND a.starts_at >= ${dateFilter}
    GROUP BY s.name
    ORDER BY total DESC
    `,
    [employeeId]
  );

  /* =========================
     CONSISTENCIA (PROMEDIO)
  ========================= */
  const daysWorkedRes = await pool.query(
    `
    SELECT COUNT(DISTINCT date) AS days_worked
    FROM employee_attendance
    WHERE employee_id = $1
      AND business_id = $2
      AND status != 'ABSENT'
      AND date >= ${dateFilter}
    `,
    params
  );

  const totalServices = Number(productivityRes.rows[0].total_services);
  const daysWorked = Number(daysWorkedRes.rows[0].days_worked) || 1;

  return {
    period,
    punctuality: {
      late_arrivals: Number(punctualityRes.rows[0].late_arrivals),
      early_departures: Number(punctualityRes.rows[0].early_departures),
    },
    productivity: {
      total_services: totalServices,
      average_per_day: Number((totalServices / daysWorked).toFixed(2)),
    },
    services_breakdown: servicesRes.rows.map(r => ({
      name: r.name,
      total: Number(r.total),
    })),
    top_service: servicesRes.rows[0]
      ? {
          name: servicesRes.rows[0].name,
          total: Number(servicesRes.rows[0].total),
        }
      : null,
  };
};

/* =========================
   EXPORTS
========================= */
module.exports = {
  createEmployee,
  listEmployees,
  setEmployeeActive,
  listEmployeeServices,
  assignServiceToEmployee,
  removeServiceFromEmployee,
  getEmployeeStats,
  getTodayAttendance,
  getEmployeeAttendanceHistory,
  updateEmployeeSchedule,
  getEmployeePerformance,
};
