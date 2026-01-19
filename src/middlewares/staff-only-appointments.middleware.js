module.exports = (req, res, next) => {
  // 🔒 Guardia defensiva
  if (!req.auth) {
    return next();
  }

  const { role } = req.auth;

  // Solo aplica para rutas de appointments
  if (!req.path.startsWith('/appointments')) {
    return next();
  }

  // STAFF limitado
  if (role === 'STAFF') {
    // aquí puedes filtrar más adelante si quieres
    return next();
  }

  // OWNER pasa sin pedos
  if (role === 'OWNER') {
    return next();
  }

  return res.status(403).json({ message: 'FORBIDDEN' });
};
