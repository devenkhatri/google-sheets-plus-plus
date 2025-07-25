import dotenv from 'dotenv';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

dotenv.config();

// Redis configuration
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0', 10),
  ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10), // Default TTL in seconds
  
  // Cache key prefixes for different entity types
  keyPrefixes: {
    record: 'record:',
    table: 'table:',
    base: 'base:',
    view: 'view:',
    user: 'user:',
    query: 'query:',
  },
  
  // Cache TTLs for different entity types (in seconds)
  ttls: {
    record: 300,       // 5 minutes
    table: 600,        // 10 minutes
    base: 1800,        // 30 minutes
    view: 600,         // 10 minutes
    user: 3600,        // 1 hour
    query: 120,        // 2 minutes
    shortLived: 60,    // 1 minute
    longLived: 86400,  // 24 hours
  }
};

// Create Redis client
export const redisClient = createClient({
  url: `redis://${redisConfig.password ? `:${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`,
});

// Initialize Redis connection
export const initializeRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Redis client connected');
    
    // Set up error handler
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export default redisConfig;