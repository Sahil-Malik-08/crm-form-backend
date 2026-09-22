const xss = require('xss');

const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return xss(value.trim());
};

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitized = {};
    for (const key of Object.keys(req.body)) {
      const val = req.body[key];
      sanitized[key] = typeof val === 'string' ? sanitizeString(val) : val;
    }
    req.body = sanitized;
  }
  next();
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const validatePhone = (phone) => /^\d{10}$/.test(String(phone || '').trim());

const validatePassword = (password) => {
  const pwd = String(password || '');
  return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd);
};

const requireFields = (fields) => (req, res, next) => {
  const missing = fields.filter((f) => !req.body[f] || String(req.body[f]).trim() === '');
  if (missing.length) {
    return res.status(400).json({ message: `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required.` });
  }
  next();
};

module.exports = { sanitizeBody, validateEmail, validatePhone, validatePassword, requireFields };
