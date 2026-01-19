const pool = require('../../config/db');

/* ===========================
   RESUMEN DE ACCIONES POR STAFF
=========================== */
const getStaffActivitySummary = async (businessId) => {
  const { rows } = await pool.query(
    `
    SELECT
      su.id AS staff_user_id,
      su.email AS staff_email,
      sal.action_type,
      COUNT(*) AS total
    FROM staff_activity_logs sal
    JOIN users su ON su.id = sal.staff_user_id
    WHERE sal.business_id = $1
    GROUP BY su.id, su.email, sal.action_type
    ORDER BY su.email, total DESC
    `,
    [businessId]
  );

  return rows;
};

/* ===========================
   ASIGNACIONES A EMPLEADAS
=========================== */
const getStaffAssignments = async (businessId) => {
  const { rows } = await pool.query(
    `
    SELECT
      su.id AS staff_user_id,
      su.email AS staff_email,
      e.id AS employee_id,
      e.first_name || ' ' || e.last_name AS employee_name,
      COUNT(*) AS total_assignments
    FROM staff_activity_logs sal
    JOIN users su ON su.id = sal.staff_user_id
    JOIN employees e ON e.id = sal.employee_id
    WHERE sal.business_id = $1
      AND sal.action_type = 'APPOINTMENT_CREATED'
    GROUP BY su.id, su.email, e.id, e.first_name, e.last_name
    ORDER BY su.email, total_assignments DESC
    `,
    [businessId]
  );

  return rows;
};

module.exports = {
  getStaffActivitySummary,
  getStaffAssignments,
};
