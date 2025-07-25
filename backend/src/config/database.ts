import knex, { Knex } from 'knex';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Database configuration
const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'airtable_clone',
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: '../migrations'
  },
  seeds: {
    directory: '../seeds'
  }
};

// Create database instance
export const db = knex(dbConfig);
export { knex };

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    // Test the connection
    await db.raw('SELECT 1');
    logger.info('Database connection established');
    
    // Run migrations if in development mode
    if (process.env.NODE_ENV === 'development') {
      await db.migrate.latest();
      logger.info('Database migrations completed');
    }
  } catch (error) {
    logger.error('Database connection failed', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', error);
    throw error;
  }
}