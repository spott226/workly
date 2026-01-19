const pool = require('../config/db');

const handleGoogleCalendarWebhook = async (req, res) => {
  // Google solo avisa que "algo cambió"
  // No manda detalles útiles aquí

  // En MVP: solo respondemos OK
  res.status(200).send('OK');
};

module.exports = { handleGoogleCalendarWebhook };
