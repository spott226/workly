const pool = require('../../config/db');

/* =========================================================
   LISTAR CLIENTES (para /clients)
   🔒 Reseña SOLO UNA VEZ POR CLIENTE
========================================================= */
const listClients = async (businessId) => {
  const { rows } = await pool.query(
    `
    SELECT
      c.id,
      c.name,
      c.phone,
      c.attended_count,
      c.no_show_count,
      c.cancelled_count,
      c.first_visit_at,
      c.last_visit_at,
      c.review_sent_at,

      (
        SELECT s.name
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.client_id = c.id
          AND a.business_id = $1
        ORDER BY a.starts_at DESC
        LIMIT 1
      ) AS last_service_name,

      -- ✅ SOLO UNA VEZ PARA SIEMPRE
      (c.review_sent_at IS NULL) AS can_send_review

    FROM clients c
    WHERE c.business_id = $1
    ORDER BY c.last_visit_at DESC NULLS LAST
    `,
    [businessId]
  );

  return rows;
};

/* =========================================================
   ESTADÍSTICAS (para /clients/stats)
========================================================= */
const getClientStats = async (businessId) => {
  const { rows } = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (
        WHERE status = 'ATTENDED'
        AND starts_at::date = CURRENT_DATE
      ) AS today_attended,
      COUNT(*) FILTER (
        WHERE status = 'NO_SHOW'
        AND starts_at::date = CURRENT_DATE
      ) AS today_no_show,

      COUNT(*) FILTER (
        WHERE status = 'ATTENDED'
        AND starts_at >= date_trunc('week', CURRENT_DATE)
      ) AS week_attended,
      COUNT(*) FILTER (
        WHERE status = 'NO_SHOW'
        AND starts_at >= date_trunc('week', CURRENT_DATE)
      ) AS week_no_show,

      COUNT(*) FILTER (
        WHERE status = 'ATTENDED'
        AND starts_at >= date_trunc('month', CURRENT_DATE)
      ) AS month_attended,
      COUNT(*) FILTER (
        WHERE status = 'NO_SHOW'
        AND starts_at >= date_trunc('month', CURRENT_DATE)
      ) AS month_no_show
    FROM appointments
    WHERE business_id = $1
    `,
    [businessId]
  );

  const r = rows[0];

  return {
    today: { attended: Number(r.today_attended), no_show: Number(r.today_no_show) },
    week: { attended: Number(r.week_attended), no_show: Number(r.week_no_show) },
    month: { attended: Number(r.month_attended), no_show: Number(r.month_no_show) },
  };
};

/* =========================================================
   PERFIL DE CLIENTE + HISTORIAL
========================================================= */
const getClientProfile = async (businessId, clientId) => {
  const clientRes = await pool.query(
    `
    SELECT
      id,
      name,
      phone,
      attended_count,
      no_show_count,
      cancelled_count,
      first_visit_at,
      last_visit_at,
      review_sent_at
    FROM clients
    WHERE id = $1
      AND business_id = $2
    `,
    [clientId, businessId]
  );

  if (!clientRes.rows.length) {
    throw new Error('CLIENT_NOT_FOUND');
  }

  const appointmentsRes = await pool.query(
    `
    SELECT
      a.id,
      a.starts_at,
      a.ends_at,
      a.status,
      s.name AS service_name,
      e.first_name || ' ' || e.last_name AS employee_name
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    JOIN employees e ON e.id = a.employee_id
    WHERE a.business_id = $1
      AND a.client_id = $2
    ORDER BY a.starts_at DESC
    `,
    [businessId, clientId]
  );

  return {
    client: clientRes.rows[0],
    appointments: appointmentsRes.rows,
  };
};

/* =========================================================
   MARCAR RESEÑA ENVIADA (DEFINITIVO)
========================================================= */
const markReviewSent = async (businessId, clientId) => {
  await pool.query(
    `
    UPDATE clients
    SET review_sent_at = NOW()
    WHERE id = $1
      AND business_id = $2
      AND review_sent_at IS NULL
    `,
    [clientId, businessId]
  );
};

module.exports = {
  listClients,
  getClientStats,
  getClientProfile,
  markReviewSent,
};
