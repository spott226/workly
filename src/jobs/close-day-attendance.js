const pool = require('../config/db');

async function closeDayAttendance() {
  // obtener negocios activos
  const businesses = await pool.query(`
    SELECT id, closing_time
    FROM businesses
    WHERE active = true
      AND closing_time IS NOT NULL
  `);

  for (const biz of businesses.rows) {
    // empleados activos
    const employees = await pool.query(
      `
      SELECT id
      FROM employees
      WHERE business_id = $1
        AND active = true
      `,
      [biz.id]
    );

    for (const emp of employees.rows) {
      await pool.query(
        `
        INSERT INTO employee_attendance (
          business_id,
          employee_id,
          date,
          status
        )
        VALUES ($1, $2, CURRENT_DATE, 'ABSENT')
        ON CONFLICT (employee_id, date) DO NOTHING
        `,
        [biz.id, emp.id]
      );
    }
  }

  console.log('✔️ Attendance closed for the day');
}

closeDayAttendance()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
