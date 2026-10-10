'use strict';

function requireMongoUri(environment = process.env) {
  const uri = environment.MONGODB_URI;
  if (typeof uri !== 'string' || uri.trim().length === 0) {
    throw new Error('MONGODB_URI is required');
  }
  return uri;
}

module.exports = { requireMongoUri };
