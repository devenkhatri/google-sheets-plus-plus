import rateLimit from 'express-rate-limit';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { AuditLogModel } from '../models/AuditLog';

// Rate limit window in milliseconds
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // Default: 15 minutes

// Maximum number of requests per window
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '100', 10); // Default: 100 requests

// Burst limit window in milliseconds (for DDoS protection)
const BURST_WINDOW_MS = 1000; // 1 second

// Maximum number of requests per burst window
const BURST_MAX_REQUESTS = parseInt(process.env.BURST_LIMIT_MAX || '10', 10); // Default: 10 requests per second

// Suspicious IP tracking
interface SuspiciousIP {
  ip: string;
  count: number;
  firstDetected: Date;
  lastDetected: Date;
  blocked: boolean;
  blockExpires?: Date;
}

// In-memory store for suspicious IPs (in production, use Redis)
const suspiciousIPs: Map<string, SuspiciousIP> = new Map();

// Create a Redis store for rate limiting
const RedisStore = {
  increment: async (key: string): Promise<{ totalHits: number; resetTime: Date }> => {
    try {
      // Increment the counter for the key
      const count = await redisClient.incr(key);
      
      // Set expiration if this is the first hit
      if (count === 1) {
        await redisClient.expire(key, Math.floor(WINDOW_MS / 1000));
      }
      
      // Get TTL for the key
      const ttl = await redisClient.ttl(key);
      
      // Calculate reset time
      const resetTime = new Date(Date.now() + ttl * 1000);
      
      return { totalHits: count, resetTime };
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      // Fallback to allow the request if Redis fails
      return { totalHits: 0, resetTime: new Date(Date.now() + WINDOW_MS) };
    }
  },
  
  decrement: async (key: string): Promise<void> => {
    try {
      await redisClient.decr(key);
    } catch (error) {
      logger.error('Redis rate limit decrement error:', error);
    }
  },
  
  resetKey: async (key: string): Promise<void> => {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Redis rate limit reset error:', error);
    }
  },
};

/**
 * Middleware to detect and block DDoS attacks
 * Uses a short time window to detect burst requests
 */
export const ddosProtection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || '0.0.0.0'; // Default IP if not available
  const key = `burst:${ip}`;
  
  try {
    // Check if IP is already blocked
    const suspiciousIP = suspiciousIPs.get(ip);
    if (suspiciousIP && suspiciousIP.blocked) {
      // Check if block has expired
      if (suspiciousIP.blockExpires && suspiciousIP.blockExpires < new Date()) {
        // Remove from blocked list
        suspiciousIPs.delete(ip);
      } else {
        // Log blocked attempt
        logger.warn(`Blocked request from suspicious IP: ${ip}`);
        
        // Create audit log entry
        await AuditLogModel.create({
          action: 'SECURITY_BLOCK',
          entity_type: 'IP_ADDRESS',
          metadata: { ip, reason: 'DDoS protection' },
          ip_address: ip,
          user_agent: req.headers['user-agent'],
        });
        
        res.status(403).json({
          status: 'error',
          message: 'Access denied due to suspicious activity',
        });
        return;
      }
    }
    
    // Check burst rate
    const count = await redisClient.incr(key);
    
    // Set expiration if this is the first hit
    if (count === 1) {
      await redisClient.expire(key, Math.floor(BURST_WINDOW_MS / 1000));
    }
    
    // If burst limit exceeded
    if (count > BURST_MAX_REQUESTS) {
      // Track suspicious IP
      if (suspiciousIP) {
        suspiciousIP.count += 1;
        suspiciousIP.lastDetected = new Date();
        
        // Block IP if threshold exceeded
        if (suspiciousIP.count >= 3) {
          const blockDuration = Math.min(30 * 60 * 1000 * suspiciousIP.count, 24 * 60 * 60 * 1000); // Max 24 hours
          suspiciousIP.blocked = true;
          suspiciousIP.blockExpires = new Date(Date.now() + blockDuration);
          
          // Log blocking
          logger.warn(`Blocking suspicious IP ${ip} for ${blockDuration/1000/60} minutes`);
          
          // Create audit log entry
          await AuditLogModel.create({
            action: 'SECURITY_BLOCK',
            entity_type: 'IP_ADDRESS',
            metadata: { ip, reason: 'DDoS protection', duration: blockDuration },
            ip_address: ip,
            user_agent: req.headers['user-agent'],
          });
          
          res.status(403).json({
            status: 'error',
            message: 'Access denied due to suspicious activity',
          });
          return;
        }
      } else {
        // First detection
        suspiciousIPs.set(ip, {
          ip,
          count: 1,
          firstDetected: new Date(),
          lastDetected: new Date(),
          blocked: false,
        });
      }
      
      // Log burst detection
      logger.warn(`Burst rate limit exceeded for IP: ${ip}`);
      
      // Return 429 Too Many Requests
      res.status(429).json({
        status: 'error',
        message: 'Too many requests in a short time period',
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('DDoS protection error:', error);
    next();
  }
};

// Create rate limiter middleware
export const rateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key, user ID, or IP address as the key
    const apiKey = req.headers['x-api-key'] as string;
    const userId = req.user?.id;
    return apiKey || userId || req.ip;
  },
  handler: async (req, res) => {
    // Calculate reset time
    const resetTime = Math.floor(Date.now() / 1000) + Math.floor(WINDOW_MS / 1000);
    
    // Set custom headers
    res.setHeader('Retry-After', Math.ceil(WINDOW_MS / 1000));
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', resetTime);
    
    // Create audit log entry
    try {
      await AuditLogModel.create({
        user_id: req.user?.id,
        action: 'RATE_LIMIT_EXCEEDED',
        entity_type: 'API',
        metadata: {
          path: req.path,
          method: req.method,
          ip: req.ip,
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });
    } catch (error) {
      logger.error('Failed to create audit log for rate limit:', error);
    }
    
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(WINDOW_MS / 1000),
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/api/health';
  },
  store: {
    increment: async (key) => {
      const result = await RedisStore.increment(key);
      return {
        totalHits: result.totalHits,
        resetTime: result.resetTime,
      };
    },
    decrement: (key) => RedisStore.decrement(key),
    resetKey: (key) => RedisStore.resetKey(key),
    // @ts-ignore - Type definitions for express-rate-limit are not complete
    resetAll: () => Promise.resolve(),
  },
});