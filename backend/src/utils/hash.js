const crypto = require('crypto');

/**
 * Generate SHA-256 hash of text for cache key
 */
function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

module.exports = { hashText };
