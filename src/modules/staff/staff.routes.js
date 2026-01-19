const express = require('express');
const pool = require('../../config/db');

const auth = require('../../middlewares/auth.middleware');
const business = require('../../middlewares/business.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

const { createStaff } = require('./staff.service');
const {
  getStaffActivitySummary,
  getStaffAssignments,
} = require('./staffActivity.service');

const router = express.Router();

/* =========================
   MIDDLEWARES BASE
========================= */
router.use(auth);       // 🔑 crea req.auth
router.use(business);   // 🏢 inyecta req.business

/* =========================
   CREAR STAFF
   SOLO OWNER
========================= */
router.post(
  '/',
  roleMiddleware(['OWNER']),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const { businessId } = req.auth;

      if (!email || !password) {
        return res.status(400).json({
          message: 'email and password are required',
        });
      }

      await createStaff({
        email,
        password,
        businessId,
      });

      res.status(201).json({
        message: 'Staff created successfully',
      });
    } catch (err) {
      console.error('CREATE STAFF ERROR:', err);
      res.status(err.status || 500).json({
        message: err.message || 'Server error',
      });
    }
  }
);

/* =========================
   LISTAR STAFF
   SOLO OWNER
========================= */
router.get(
  '/',
  roleMiddleware(['OWNER']),
  async (req, res) => {
    try {
      const { businessId } = req.auth;

      const result = await pool.query(
        `
        SELECT
          s.id,
          u.email,
          s.is_active,
          s.created_at
        FROM staff s
        JOIN users u ON u.id = s.user_id
        WHERE s.business_id = $1
        ORDER BY s.created_at DESC
        `,
        [businessId]
      );

      res.json(result.rows);
    } catch (err) {
      console.error('FETCH STAFF ERROR:', err);
      res.status(500).json({
        message: 'Error fetching staff',
      });
    }
  }
);

/* =========================
   DESACTIVAR STAFF
========================= */
router.patch(
  '/:id/deactivate',
  roleMiddleware(['OWNER']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { businessId } = req.auth;

      await pool.query(
        `
        UPDATE staff
        SET is_active = false
        WHERE id = $1 AND business_id = $2
        `,
        [id, businessId]
      );

      res.json({ message: 'Staff deactivated' });
    } catch (err) {
      console.error('DEACTIVATE STAFF ERROR:', err);
      res.status(500).json({
        message: 'Error deactivating staff',
      });
    }
  }
);

/* =========================
   ACTIVAR STAFF
========================= */
router.patch(
  '/:id/activate',
  roleMiddleware(['OWNER']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { businessId } = req.auth;

      await pool.query(
        `
        UPDATE staff
        SET is_active = true
        WHERE id = $1 AND business_id = $2
        `,
        [id, businessId]
      );

      res.json({ message: 'Staff activado' });
    } catch (err) {
      console.error('ACTIVATE STAFF ERROR:', err);
      res.status(500).json({
        message: 'Error activando staff',
      });
    }
  }
);

/* =====================================================
   🔥 NUEVO — ACTIVIDAD DEL STAFF (SOLO OWNER)
===================================================== */

/* RESUMEN DE ACCIONES */
router.get(
  '/activity/summary',
  roleMiddleware(['OWNER']),
  async (req, res) => {
    const data = await getStaffActivitySummary(req.business.id);
    res.json(data);
  }
);

/* ASIGNACIONES A EMPLEADAS */
router.get(
  '/activity/assignments',
  roleMiddleware(['OWNER']),
  async (req, res) => {
    const data = await getStaffAssignments(req.business.id);
    res.json(data);
  }
);

module.exports = router;
