const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const service = require('./billing.service');

router.use(auth);

router.post('/change-plan', role(['OWNER']), async (req, res) => {
  const { plan_code } = req.body;

  const result = await service.changePlan(
    req.auth.businessId,
    plan_code
  );

  res.json(result);
});

module.exports = router;
