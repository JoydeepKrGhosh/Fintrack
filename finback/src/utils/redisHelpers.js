// utils/redisHelpers.js
const logger = require('./logger');

// Exponential backoff retry strategy
const retryStrategy = (maxRetries) => (times) => {
  if (times >= maxRetries) {
    logger.error(`Redis max retries (${maxRetries}) reached`);
    return null; // Give up
  }
  const delay = Math.min(times * 100, 5000); // Max 5s delay
  return delay;
};

// Health check for Redis connection
const checkRedisHealth = async (client) => {
  try {
    await client.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed', { error: error.message });
    return false;
  }
};

// Safe JSON serialization for queue data
const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    logger.error('Failed to stringify Redis payload', { error: error.message });
    return '{}';
  }
};

module.exports = {
  retryStrategy,
  checkRedisHealth,
  safeStringify
};