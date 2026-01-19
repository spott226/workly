const express = require('express');
const router = express.Router();
const authService = require('./auth.service');

router.post('/signup', async (req, res) => {
  const token = await authService.signup(req.body);
  res.json({ token });
});

router.post('/login', async (req, res) => {
  const token = await authService.login(req.body);
  res.json({ token });
});

module.exports = router;
