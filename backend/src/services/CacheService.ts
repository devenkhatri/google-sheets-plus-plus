import Redis from 'ioredis';
import { logger } from '../utils/logger';
import config from '../config/redis';

/**
 * Service for handling Redis caching operations
 */
export class CacheService {
  private redis: Redis;
  private defaultTTL: number = 3600; // 1 hour default TTL

  constructor() {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis cache');
    });
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttl);
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Delete multiple values from cache using pattern
   * @param pattern Key pattern to match
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Get or set cache value with callback function
   * @param key Cache key
   * @param callback Function to generate value if not in cache
   * @param ttl Time to live in seconds (optional)
   * @returns Cached or generated value
   */
  async getOrSet<T>(key: string, callback: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns True if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      logger.error(`Error checking if key ${key} exists:`, error);
      return false;
    }
  }

  /**
   * Set cache value with hash
   * @param key Hash key
   * @param field Hash field
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  async hset(key: string, field: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.hset(key, field, serialized);
      await this.redis.expire(key, ttl);
    } catch (error) {
      logger.error(`Error setting hash cache ${key}.${field}:`, error);
    }
  }

  /**
   * Get cache value from hash
   * @param key Hash key
   * @param field Hash field
   * @returns Cached value or null if not found
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const data = await this.redis.hget(key, field);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Error getting hash cache ${key}.${field}:`, error);
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Export singleton instance
export const cacheService = new CacheService();