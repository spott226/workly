const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const service = require('./services.service');

router.use(auth);

/**
 * CREAR SERVICIO
 */
router.post('/', role(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const item = await service.createService(
      req.auth.businessId,
      req.body
    );
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear servicio' });
  }
});

/**
 * LISTAR SERVICIOS
 */
router.get('/', async (req, res) => {
  try {
    const items = await service.listServices(req.auth.businessId);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al listar servicios' });
  }
});

/**
 * ACTIVAR / DESACTIVAR SERVICIO
 */
router.patch('/:id/active', role(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res
        .status(400)
        .json({ message: 'active debe ser boolean' });
    }

    const item = await service.setServiceActive(
      req.auth.businessId,
      req.params.id,
      active
    );

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar servicio' });
  }
});

module.exports = router;
