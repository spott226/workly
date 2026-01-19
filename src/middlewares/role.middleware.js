module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    // 🔒 Guardia defensiva
    if (!req.auth) {
      return res.status(401).json({ message: 'NO_AUTH' });
    }

    const { role } = req.auth;

    if (!role) {
      return res.status(403).json({ message: 'ROLE_NOT_DEFINED' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'FORBIDDEN' });
    }

    next();
  };
};
