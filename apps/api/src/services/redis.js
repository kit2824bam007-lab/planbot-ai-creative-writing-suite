const Redis = require('ioredis');
const { env } = require('../config/env');

let redisClient = null;
let isConnected = false;

// In-memory fallback map for dev or when Redis is offline
const memoryStore = new Map();
const memoryExpiry = new Map();

function cleanMemoryStore() {
  const now = Date.now();
  for (const [key, exp] of memoryExpiry.entries()) {
    if (exp <= now) {
      memoryStore.delete(key);
      memoryExpiry.delete(key);
    }
  }
}

setInterval(cleanMemoryStore, 60000).unref();

function initRedis() {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️ Redis unreachable, running with in-memory resilient fallback.');
          return null; // stop retrying
        }
        return Math.min(times * 100, 2000);
      }
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('✅ Redis connected successfully.');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // Silent error logging to avoid spam
    });
  } catch (err) {
    isConnected = false;
    console.warn('⚠️ Redis initialization fallback triggered:', err.message);
  }
}

initRedis();

const redisService = {
  isAvailable() {
    return isConnected && redisClient && redisClient.status === 'ready';
  },

  async get(key) {
    if (this.isAvailable()) {
      try {
        return await redisClient.get(key);
      } catch (err) {
        // Fallback to memory
      }
    }
    const exp = memoryExpiry.get(key);
    if (exp && exp <= Date.now()) {
      memoryStore.delete(key);
      memoryExpiry.delete(key);
      return null;
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },

  async set(key, value, mode, duration) {
    if (this.isAvailable()) {
      try {
        if (mode === 'EX' && duration) {
          return await redisClient.set(key, value, 'EX', duration);
        }
        return await redisClient.set(key, value);
      } catch (err) {
        // Fallback to memory
      }
    }
    memoryStore.set(key, String(value));
    if (mode === 'EX' && duration) {
      memoryExpiry.set(key, Date.now() + duration * 1000);
    }
    return 'OK';
  },

  async incr(key) {
    if (this.isAvailable()) {
      try {
        return await redisClient.incr(key);
      } catch (err) {
        // Fallback to memory
      }
    }
    const current = parseInt(memoryStore.get(key) || '0', 10);
    const nextVal = current + 1;
    memoryStore.set(key, String(nextVal));
    return nextVal;
  },

  async expire(key, seconds) {
    if (this.isAvailable()) {
      try {
        return await redisClient.expire(key, seconds);
      } catch (err) {
        // Fallback to memory
      }
    }
    memoryExpiry.set(key, Date.now() + seconds * 1000);
    return 1;
  },

  async del(key) {
    if (this.isAvailable()) {
      try {
        return await redisClient.del(key);
      } catch (err) {
        // Fallback to memory
      }
    }
    memoryStore.delete(key);
    memoryExpiry.delete(key);
    return 1;
  }
};

module.exports = redisService;
