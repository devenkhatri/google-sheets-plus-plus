import { Express } from 'express';
import cors from 'cors';
import healthRoutes from './healthRoutes';
import apiRouter from './apiRouter';
import { rateLimiter } from '../middleware/rateLimiter';

export const setupRoutes = (app: Express) => {
  // Configure CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));

  // Health check routes - no auth required, no rate limiting
  app.use('/health', healthRoutes);

  // API routes with versioning and rate limiting
  app.use('/api', rateLimiter, apiRouter);

  // Add 404 handler for undefined routes
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });
};