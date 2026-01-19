const express = require('express');
const router = express.Router();
const businessMiddleware = require('../../middlewares/business.middleware');

const oauth2Client = require('./googleOAuthClient');
const auth = require('../../middlewares/auth.middleware');
const {
  saveGoogleTokens,
  getBusinessMe,
} = require('../../modules/businesses/businesses.service');

router.get('/connect', auth, businessMiddleware, async (req, res) => {
  if (req.business?.google_refresh_token) {
    return res.status(403).json({
      message: 'Google Calendar ya está conectado para este negocio',
    });
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: String(req.auth.businessId),
  });

  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code, state: businessId } = req.query;

  if (!code || !businessId) {
    return res.status(400).json({ message: 'Invalid OAuth callback' });
  }

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  await saveGoogleTokens(businessId, tokens);

  res.redirect('http://localhost:3001/dashboard');
});

module.exports = router;
