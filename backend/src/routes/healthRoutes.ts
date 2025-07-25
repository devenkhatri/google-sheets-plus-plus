import express from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { config } from '../config/database';
import { redisConfig } from '../config/redis';

const router = express.Router();

// Create database connection pool
const pool = new Pool(config);

// Create Redis client
const redisClient = createClient({
  url: redisConfig.url
});

/**
 * Health check endpoint
 * Checks the health of the application and its dependencies
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbClient = await pool.connect();
    const dbResult = await dbClient.query('SELECT 1');
    dbClient.release();
    
    const dbStatus = dbResult.rows.length > 0 ? 'healthy' : 'unhealthy';
    
    // Check Redis connection
    let redisStatus = 'unhealthy';
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      await redisClient.ping();
      redisStatus = 'healthy';
    } catch (redisError) {
      console.error('Redis health check failed:', redisError);
    }
    
    // Overall health status
    const isHealthy = dbStatus === 'healthy' && redisStatus === 'healthy';
    
    // Return health status
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    });
    
    // Disconnect Redis if we connected just for the health check
    if (redisClient.isOpen && redisStatus === 'healthy') {
      await redisClient.disconnect();
    }
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * Readiness probe endpoint
 * Checks if the application is ready to serve traffic
 */
router.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

/**
 * Liveness probe endpoint
 * Checks if the application is running
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export default router;