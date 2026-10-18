const dns = require('node:dns');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function connectDatabase(uri) {
  mongoose.connection.on('error', (err) => logger.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => logger.warn('[db] disconnected'));
  await mongoose.connect(uri);
  logger.info('[db] connected');
}

module.exports = { connectDatabase };