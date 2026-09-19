// OTP rules: 01_SHARED_BRIEF.md section 4.2.
const crypto = require('crypto');

const MAX_ATTEMPTS = 5;

/** 6-digit numeric string, 100000-999999, cryptographically random. */
function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/** Constant-time compare so timing cannot leak the code. */
function otpMatches(stored, supplied) {
  if (typeof stored !== 'string' || typeof supplied !== 'string') return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(String(supplied).trim());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { generateOtp, otpMatches, MAX_ATTEMPTS };
