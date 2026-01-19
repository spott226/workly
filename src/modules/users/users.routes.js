const express = require('express');
const router = express.Router();

const auth = require('../../middlewares/auth.middleware');
const business = require('../../middlewares/business.middleware');
const role = require('../../middlewares/role.middleware');

const service = require('./users.service');

/* =========================
   /users/me
   SOLO auth (NO business)
========================= */
router.get('/me', auth, (req, res) => {
  res.json({
    id: req.auth.userId,
    email: req.auth.email,
    role: req.auth.role,
    businessId: req.auth.businessId ?? null,
  });
});

/* =========================
   MIDDLEWARES PARA CRUD
   (auth + business)
========================= */
router.use(auth);
router.use(business);

/* =========================
   CRUD DE USUARIOS
========================= */

// Ver usuarios
router.get('/', role(['OWNER', 'ADMIN']), async (req, res) => {
  const users = await service.listUsers(req.business.id);
  res.json(users);
});

// Crear usuario
router.post('/', role(['OWNER', 'ADMIN']), async (req, res) => {
  const user = await service.createUser(
    req.business.id,
    req.body
  );
  res.json(user);
});

// Activar / desactivar usuario
router.patch('/:id/active', role(['OWNER', 'ADMIN']), async (req, res) => {
  const user = await service.toggleUserActive(
    req.business.id,
    req.params.id,
    req.body.active
  );
  res.json(user);
});

module.exports = router;
