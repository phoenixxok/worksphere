const jwt = require('jsonwebtoken');

function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

/**
 * Verifies the Bearer token and puts { user_id, role } on req.auth.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return fail(res, 401, 'UNAUTHENTICATED', 'Missing authorization token.');
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = { user_id: payload.user_id, role: payload.role };
    return next();
  } catch {
    return fail(res, 401, 'UNAUTHENTICATED', 'Invalid or expired token.');
  }
}

/**
 * Use AFTER requireAuth. requireRole('household') or requireRole('worker','admin').
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return fail(res, 401, 'UNAUTHENTICATED', 'Missing authorization token.');
    }
    if (!roles.includes(req.auth.role)) {
      return fail(res, 403, 'FORBIDDEN_ROLE', 'Your role cannot perform this action.');
    }
    return next();
  };
}

function signToken(user) {
  return jwt.sign(
    { user_id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { requireAuth, requireRole, signToken, fail };
