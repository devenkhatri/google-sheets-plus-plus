import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { logger } from './utils/logger';
import { applySecurityMiddleware } from './middleware/securityMiddleware';
import { sanitizeInput } from './middleware/inputSanitizer';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Apply security middleware
applySecurityMiddleware(app);

// Additional middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeInput); // Apply input sanitization after body parsing

// Initialize database and Redis
initializeDatabase()
  .then(() => logger.info('Database initialized successfully'))
  .catch(err => {
    logger.error('Failed to initialize database', err);
    process.exit(1);
  });

initializeRedis()
  .then(() => logger.info('Redis initialized successfully'))
  .catch(err => {
    logger.error('Failed to initialize Redis', err);
    process.exit(1);
  });

// Setup routes
setupRoutes(app);

// Error handling middleware
app.use(errorHandler);

// Set up Socket.io handlers
import { setupGoogleSheetsHandlers } from './socket/googleSheetsHandler';
import { setupRealTimeSyncHandlers } from './socket/realTimeSyncHandler';
setupGoogleSheetsHandlers(io);
setupRealTimeSyncHandlers(io);

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export { app, io };