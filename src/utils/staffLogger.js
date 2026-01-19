const pool = require('../config/db');

async function logStaffAction({
  businessId,
  staffUserId,
  actionType,
  employeeId = null,
  appointmentId = null,
}) {
  await pool.query(
    `
    INSERT INTO staff_activity_logs (
      business_id,
      staff_user_id,
      action_type,
      employee_id,
      appointment_id
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      businessId,
      staffUserId,
      actionType,
      employeeId,
      appointmentId,
    ]
  );
}

module.exports = { logStaffAction };
