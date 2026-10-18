// a trailing * is allowed: it makes the code a prefix (see dispatch/router.js)
const CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9 -]{0,18}\*?$/;

function normalizeCode(input) {
  const code = String(input ?? '').trim().replace(/\s+/g, ' ');
  return CODE_REGEX.test(code) ? code.toUpperCase() : null;
}

module.exports = { normalizeCode };