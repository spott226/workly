const express = require('express');
const router = express.Router();
const service = require('./plans.service');

router.get('/', async (req, res) => {
  const plans = await service.getPlans();
  res.json(plans);
});

module.exports = router;
