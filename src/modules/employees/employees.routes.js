const express = require('express');
const router = express.Router();

const auth = require('../../middlewares/auth.middleware.js');
const role = require('../../middlewares/role.middleware.js');

const service = require('./employees.service');
const attendance = require('./employeeAttendance.service.js');

router.use(auth);

/* ==========================
   CREAR EMPLEADO
========================== */
router.post('/', role(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const item = await service.createEmployee(
      req.auth.businessId,
      req.body
    );
    res.status(201).json(item);
  } catch (err) {
    if (err.message === 'EMPLOYEE_DATA_REQUIRED') {
      return res.status(400).json({
        code: 'EMPLOYEE_DATA_REQUIRED',
        message: 'Nombre, apellidos y teléfono son obligatorios.',
      });
    }

    console.error(err);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Error al crear empleado.',
    });
  }
});

/* ==========================
   LISTAR EMPLEADOS
========================== */
router.get('/', async (req, res) => {
  try {
    const items = await service.listEmployees(req.auth.businessId);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Error al listar empleados.',
    });
  }
});

/* ==========================
   ACTIVAR / DESACTIVAR
========================== */
router.patch('/:id/active', role(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({
        code: 'ACTIVE_REQUIRED',
        message: 'El campo active debe ser true o false.',
      });
    }

    const result = await service.setEmployeeActive(
      req.auth.businessId,
      req.params.id,
      active
    );

    res.json(result);
  } catch (err) {
    if (err.message === 'EMPLOYEE_NOT_FOUND') {
      return res.status(404).json({
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Empleado no encontrado.',
      });
    }

    console.error(err);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Error al actualizar empleado.',
    });
  }
});

/* ==========================
   ASISTENCIA DEL DÍA
========================== */
router.get('/attendance/today', async (req, res) => {
  try {
    const data = await attendance.getTodayAttendance(
      req.auth.businessId
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Error al obtener asistencia.',
    });
  }
});

/* ==========================
   CHECK-IN
========================== */
router.post('/:id/check-in', async (req, res) => {
  try {
    const { time } = req.body;

    if (!time) {
      return res.status(400).json({
        code: 'TIME_REQUIRED',
        message: 'Hora requerida para check-in.',
      });
    }

    const result = await attendance.checkInEmployee(
      req.auth.businessId,
      req.params.id,
      time
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ code: err.message });
  }
});

/* ==========================
   CHECK-OUT
========================== */
router.post('/:id/check-out', async (req, res) => {
  try {
    const { time } = req.body;

    if (!time) {
      return res.status(400).json({
        code: 'TIME_REQUIRED',
        message: 'Hora requerida para check-out.',
      });
    }

    const result = await attendance.checkOutEmployee(
      req.auth.businessId,
      req.params.id,
      time
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ code: err.message });
  }
});

/* ==========================
   HISTORIAL DE ASISTENCIA
========================== */
router.get('/:id/attendance-history', async (req, res) => {
  try {
    const data = await service.getEmployeeAttendanceHistory(
      req.auth.businessId,
      req.params.id
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(404).json({
      code: err.message,
    });
  }
});

/* ==========================
   HORARIO DEL EMPLEADO
========================== */
router.patch('/:id/schedule', role(['OWNER']), async (req, res) => {
  try {
    const data = await service.updateEmployeeSchedule(
      req.auth.businessId,
      req.params.id,
      req.body
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(404).json({
      code: err.message,
    });
  }
});

/* ==========================
   SERVICIOS DEL EMPLEADO
========================== */
router.get('/:id/services', async (req, res) => {
  try {
    const services = await service.listEmployeeServices(
      req.auth.businessId,
      req.params.id
    );
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Error al obtener servicios.',
    });
  }
});

router.post('/:id/services/:serviceId', async (req, res) => {
  try {
    const result = await service.assignServiceToEmployee(
      req.auth.businessId,
      req.params.id,
      req.params.serviceId
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ code: err.message });
  }
});

router.delete('/:id/services/:serviceId', async (req, res) => {
  try {
    const result = await service.removeServiceFromEmployee(
      req.auth.businessId,
      req.params.id,
      req.params.serviceId
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ code: err.message });
  }
});

/* ==========================
   📊 ESTADÍSTICAS DEL EMPLEADO
   (🔥 FIX FINAL PARA PRODUCCIÓN)
========================== */
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await service.getEmployeeStats(
      req.auth.businessId,
      req.params.id
    );
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(404).json({
      code: err.message,
    });
  }
});

/* ==========================
   PERFORMANCE DEL EMPLEADO
========================== */
router.get('/:id/performance', async (req, res) => {
  try {
    const period = req.query.period || 'day'; // default: day

    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({
        code: 'INVALID_PERIOD',
        message: 'Periodo inválido. Usa day, week o month.',
      });
    }

    const data = await service.getEmployeePerformance(
      req.auth.businessId,
      req.params.id,
      period
    );

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Error al obtener performance del empleado.',
    });
  }
});

module.exports = router;
