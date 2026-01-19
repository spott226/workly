const pool = require('../../config/db');
const { DateTime } = require('luxon');
const { logStaffAction } = require('../../utils/staffLogger');

/* ===========================
   Helpers
=========================== */
const upsertClientOnAttend = async (appointment) => {
  const { business_id, client_name, phone, starts_at } = appointment;
  const phoneNormalized = phone.replace(/\D/g, '');

  const { rows } = await pool.query(
    `
    SELECT id
    FROM clients
    WHERE business_id = $1
      AND phone_normalized = $2
    `,
    [business_id, phoneNormalized]
  );

  let clientId;

  if (!rows.length) {
    const created = await pool.query(
      `
      INSERT INTO clients (
        business_id,
        name,
        phone,
        phone_normalized,
        attended_count,
        first_visit_at,
        last_visit_at
      )
      VALUES ($1,$2,$3,$4,1,$5,$5)
      RETURNING id
      `,
      [business_id, client_name, phone, phoneNormalized, starts_at]
    );
    clientId = created.rows[0].id;
  } else {
    clientId = rows[0].id;
    await pool.query(
      `
      UPDATE clients
      SET attended_count = attended_count + 1,
          last_visit_at = $1
      WHERE id = $2
      `,
      [starts_at, clientId]
    );
  }

  return clientId;
};

const assertBusinessCanOperate = (business) => {
  if (!business) throw new Error('BUSINESS_NOT_FOUND');
  if (business.active !== true) throw new Error('SUBSCRIPTION_INACTIVE');
};

const assertEmployeeCanDoService = async (businessId, employeeId, serviceId) => {
  const { rows } = await pool.query(
    `
    SELECT 1
    FROM employee_services es
    JOIN employees e ON e.id = es.employee_id
    JOIN services s ON s.id = es.service_id
    WHERE e.id = $1
      AND e.business_id = $2
      AND s.id = $3
      AND s.is_active = true
      AND es.active = true
    `,
    [employeeId, businessId, serviceId]
  );

  if (!rows.length) throw new Error('EMPLOYEE_NOT_ALLOWED_FOR_SERVICE');
};

/* ===========================
   Availability — ARRAY PLANO
=========================== */
const getAvailableEmployees = async (businessId, serviceId, startISO) => {
  const svc = await pool.query(
    `
    SELECT duration_minutes, business_id
    FROM services
    WHERE id = $1
      AND is_active = true
    `,
    [serviceId]
  );

  if (!svc.rows.length) return [];

  const realBusinessId = svc.rows[0].business_id;
  const duration = svc.rows[0].duration_minutes;

  const start = DateTime.fromISO(startISO, { zone: 'utc' });
  if (!start.isValid) return [];

  const end = start.plus({ minutes: duration });

  const { rows: biz } = await pool.query(
    `
    SELECT opening_time, closing_time
    FROM businesses
    WHERE id = $1
    `,
    [realBusinessId]
  );

  if (!biz.length) return [];

  const startMX = start.setZone('America/Mexico_City');
  const endMX = end.setZone('America/Mexico_City');

  const opening = DateTime.fromISO(
    `${startMX.toISODate()}T${biz[0].opening_time}`,
    { zone: 'America/Mexico_City' }
  );

  const closing = DateTime.fromISO(
    `${startMX.toISODate()}T${biz[0].closing_time}`,
    { zone: 'America/Mexico_City' }
  );

  if (startMX < opening || endMX > closing) return [];

  const res = await pool.query(
    `
    SELECT e.id, e.first_name, e.last_name
    FROM employees e
    JOIN employee_services es ON es.employee_id = e.id
    LEFT JOIN appointments a
      ON a.employee_id = e.id
     AND a.status IN ('PENDING','CONFIRMED')
     AND a.starts_at < $3
     AND a.ends_at > $2
    WHERE e.business_id = $1
      AND e.active = true
      AND es.service_id = $4
      AND es.active = true
      AND a.id IS NULL
    `,
    [
      realBusinessId,
      start.toISO(),
      end.toISO(),
      serviceId,
    ]
  );

  return res.rows.map((e) => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`.trim(),
  }));
};

/* ===========================
   Create Appointment
=========================== */
const createAppointment = async (businessId, payload, auth = null) => {
  const { serviceId, employeeId, startISO, clientName, phone } = payload;

  if (!clientName || !phone) {
    throw new Error('CLIENT_DATA_REQUIRED');
  }

  const { rows: biz } = await pool.query(
    `SELECT active FROM businesses WHERE id = $1`,
    [businessId]
  );

  assertBusinessCanOperate(biz[0]);
  await assertEmployeeCanDoService(businessId, employeeId, serviceId);

  const employees = await getAvailableEmployees(
    businessId,
    serviceId,
    startISO
  );

  if (!employees.find((e) => e.id === employeeId)) {
    throw new Error('EMPLOYEE_NOT_AVAILABLE');
  }

  const svc = await pool.query(
    `SELECT duration_minutes FROM services WHERE id = $1`,
    [serviceId]
  );

  // ✅ startISO YA VIENE EN UTC → NO reinterpretar
  const start = DateTime.fromISO(startISO, { zone: 'utc' });
  if (!start.isValid) {
    throw new Error('INVALID_START_DATE');
  }

  const end = start.plus({
    minutes: svc.rows[0].duration_minutes,
  });

  const { rows } = await pool.query(
    `
    INSERT INTO appointments (
      business_id,
      service_id,
      employee_id,
      client_name,
      phone,
      starts_at,
      ends_at,
      status,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8)
    RETURNING id
    `,
    [
      businessId,
      serviceId,
      employeeId,
      clientName,
      phone,
      start.toISO(),   // 🔒 ya es UTC
      end.toISO(),     // 🔒 ya es UTC
      auth?.userId || null,
    ]
  );

  const appointmentId = rows[0].id;

  if (auth?.userId) {
    await logStaffAction({
      businessId,
      staffUserId: auth.userId,
      actionType: 'APPOINTMENT_CREATED',
      appointmentId,
      employeeId,
    });
  }

  return appointmentId;
};

/* ===========================
   List / Update / Public
=========================== */
const listAppointments = async (businessId) => {
  const { rows } = await pool.query(
    `
    SELECT
      a.id,
      a.starts_at,
      a.ends_at,
      a.status,
      s.name AS service_name,
      e.first_name || ' ' || e.last_name AS employee_name,
      a.client_name,
      a.phone,
      a.review_sent_at
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    JOIN employees e ON e.id = a.employee_id
    WHERE a.business_id = $1
      AND a.status != 'CANCELLED'
    ORDER BY a.starts_at DESC
    `,
    [businessId]
  );

  return rows;
};

const confirmAppointment = async (
  businessId,
  appointmentId,
  actorUserId
) => {
  const { rows } = await pool.query(
    `
    UPDATE appointments
    SET status = 'CONFIRMED'
    WHERE id = $1 AND business_id = $2
    RETURNING id, employee_id
    `,
    [appointmentId, businessId]
  );

  if (!rows.length) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }

  // 🔥 LOG DEL MOVIMIENTO
  await pool.query(
    `
    INSERT INTO staff_activity_logs (
      business_id,
      staff_user_id,
      action_type,
      employee_id,
      appointment_id
    )
    VALUES ($1, $2, 'CONFIRM_APPOINTMENT', $3, $4)
    `,
    [
      businessId,
      actorUserId,
      rows[0].employee_id,
      rows[0].id,
    ]
  );
};

const cancelAppointment = async (businessId, appointmentId, actorUserId) => {
  const { rows } = await pool.query(
    `
    UPDATE appointments
    SET status = 'CANCELLED'
    WHERE id = $1 AND business_id = $2
    RETURNING id, employee_id
    `,
    [appointmentId, businessId]
  );

  if (!rows.length) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }

  // 🔥 LOG DEL MOVIMIENTO DEL STAFF
  await pool.query(
    `
    INSERT INTO staff_activity_logs (
      business_id,
      staff_user_id,
      action_type,
      employee_id,
      appointment_id
    )
    VALUES ($1, $2, 'CANCEL_APPOINTMENT', $3, $4)
    `,
    [
      businessId,
      actorUserId,
      rows[0].employee_id,
      rows[0].id,
    ]
  );
};

const markAsAttended = async (
  businessId,
  appointmentId,
  actorUserId
) => {
  const { rows } = await pool.query(
    `
    UPDATE appointments
    SET status = 'ATTENDED'
    WHERE id = $1
      AND business_id = $2
    RETURNING
      id,
      business_id,
      client_name,
      phone,
      starts_at,
      employee_id
    `,
    [appointmentId, businessId]
  );

  if (!rows.length) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }

  // 🔁 CLIENTE (YA EXISTE)
  const clientId = await upsertClientOnAttend(rows[0]);

  await pool.query(
    `
    UPDATE appointments
    SET client_id = $1
    WHERE id = $2
    `,
    [clientId, appointmentId]
  );

  // 🔥 LOG STAFF
  await pool.query(
    `
    INSERT INTO staff_activity_logs (
      business_id,
      staff_user_id,
      action_type,
      employee_id,
      appointment_id
    )
    VALUES ($1, $2, 'MARK_ATTENDED', $3, $4)
    `,
    [
      businessId,
      actorUserId,
      rows[0].employee_id,
      rows[0].id,
    ]
  );
};

const markAsNoShow = async (
  businessId,
  appointmentId,
  actorUserId
) => {
  const { rows } = await pool.query(
    `
    UPDATE appointments
    SET status = 'NO_SHOW'
    WHERE id = $1
      AND business_id = $2
    RETURNING
      id,
      business_id,
      phone,
      employee_id
    `,
    [appointmentId, businessId]
  );

  if (!rows.length) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }

  // 🔁 CONTADOR DE NO SHOW DEL CLIENTE (YA EXISTE)
  await pool.query(
    `
    UPDATE clients
    SET no_show_count = no_show_count + 1
    WHERE business_id = $1
      AND phone = $2
    `,
    [rows[0].business_id, rows[0].phone]
  );

  // 🔥 LOG STAFF
  await pool.query(
    `
    INSERT INTO staff_activity_logs (
      business_id,
      staff_user_id,
      action_type,
      employee_id,
      appointment_id
    )
    VALUES ($1, $2, 'MARK_NO_SHOW', $3, $4)
    `,
    [
      businessId,
      actorUserId,
      rows[0].employee_id,
      rows[0].id,
    ]
  );
};

const rescheduleAppointment = async (
  businessId,
  appointmentId,
  startISO,
  actorUserId
) => {
  const { rows } = await pool.query(
    `
    SELECT
      a.id,
      a.employee_id,
      s.duration_minutes
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.id = $1
      AND a.business_id = $2
    `,
    [appointmentId, businessId]
  );

  if (!rows.length) {
    throw new Error('APPOINTMENT_NOT_FOUND');
  }

  const start = DateTime.fromISO(startISO, { zone: 'utc' });
  if (!start.isValid) {
    throw new Error('INVALID_START_DATE');
  }

  const end = start.plus({
    minutes: rows[0].duration_minutes,
  });

  await pool.query(
    `
    UPDATE appointments
    SET
      starts_at = $1,
      ends_at   = $2,
      status    = 'CONFIRMED'
    WHERE id = $3
      AND business_id = $4
    `,
    [
      start.toISO(),
      end.toISO(),
      appointmentId,
      businessId,
    ]
  );

  await pool.query(
    `
    INSERT INTO staff_activity_logs (
      business_id,
      staff_user_id,
      action_type,
      employee_id,
      appointment_id
    )
    VALUES ($1, $2, 'RESCHEDULE_APPOINTMENT', $3, $4)
    `,
    [
      businessId,
      actorUserId,
      rows[0].employee_id,
      rows[0].id,
    ]
  );

  return { ok: true };
};

const markReviewAsSent = async (businessId, appointmentId) => {
  await pool.query(
    `
    UPDATE appointments
    SET review_sent_at = NOW()
    WHERE id = $1
      AND business_id = $2
      AND review_sent_at IS NULL
    `,
    [appointmentId, businessId]
  );
};

const createPublicAppointment = async (payload) => {
  const { slug, serviceId } = payload;

  const { rows: biz } = await pool.query(
    `
    SELECT id, active
    FROM businesses
    WHERE slug = $1
    `,
    [slug]
  );

  assertBusinessCanOperate(biz[0]);

  return createAppointment(biz[0].id, payload);
};

module.exports = {
  getAvailableEmployees,
  createAppointment,
  listAppointments,
  confirmAppointment,
  cancelAppointment,
  markAsAttended,
  markAsNoShow,
  rescheduleAppointment,
  markReviewAsSent,
  createPublicAppointment,
};
