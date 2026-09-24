const { PrismaClient } = require('@prisma/client');
const { env } = require('../config/env');

let prisma = null;
let isConnected = false;

try {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL
      }
    },
    log: []
  });

  // Test connection immediately with 2s timeout
  prisma.$connect()
    .then(() => {
      isConnected = true;
      console.log('✅ PostgreSQL connected successfully.');
    })
    .catch((err) => {
      isConnected = false;
      console.warn('⚠️ PostgreSQL unavailable or credentials invalid. Using in-memory resilient storage for instant responses.');
    });
} catch (err) {
  isConnected = false;
}

module.exports = {
  client: prisma,
  isAvailable() {
    return isConnected;
  }
};
