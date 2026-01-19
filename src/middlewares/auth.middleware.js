const { verifyToken } = require('../config/jwt');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
const tokenFromQuery = req.query.token;

let token = null;

if (authHeader && authHeader.startsWith('Bearer ')) {
  token = authHeader.split(' ')[1];
} else if (tokenFromQuery) {
  token = tokenFromQuery;
}

if (!token) {
  return res.status(401).json({ message: 'Unauthorized' });
}

  try {
    const decoded = verifyToken(token);

    req.auth = {
      userId: decoded.userId,
      businessId: decoded.businessId,
      role: decoded.role
    };

    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
