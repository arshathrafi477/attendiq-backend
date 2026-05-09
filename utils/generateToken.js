const jwt = require('jsonwebtoken');

/**
 * @param {object} payload  — { id, collegeId, role, username, name }
 * @returns {string}  signed JWT valid for 7 days
 */
module.exports = function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};
