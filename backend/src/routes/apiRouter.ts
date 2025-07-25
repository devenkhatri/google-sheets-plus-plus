import express from 'express';
import authRoutes from './authRoutes';
import baseRoutes from './baseRoutes';
import tableRoutes from './tableRoutes';
import fieldRoutes from './fieldRoutes';
import recordRoutes from './recordRoutes';
import viewRoutes from './viewRoutes';
import webhookRoutes from './webhookRoutes';
import searchRoutes from './searchRoutes';
import importExportRoutes from './importExportRoutes';
import pushNotificationRoutes from './pushNotificationRoutes';
import templateRoutes from './templateRoutes';
import automationRoutes from './automationRoutes';
import { apiVersionMiddleware } from '../middleware/apiVersionMiddleware';
import swaggerUi from 'swagger-ui-express';
import { specs } from '../config/swagger';

const router = express.Router();

// Apply API versioning middleware to all routes
router.use(apiVersionMiddleware);

// Mount API documentation
router.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Airtable Clone API Documentation',
}));

// Mount API routes
router.use('/auth', authRoutes);
router.use('/bases', baseRoutes);
router.use('/tables', tableRoutes);
router.use('/fields', fieldRoutes);
router.use('/records', recordRoutes);
router.use('/views', viewRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/search', searchRoutes);
router.use('/import', importExportRoutes);
router.use('/export', importExportRoutes);
router.use('/push', pushNotificationRoutes);
router.use('/templates', templateRoutes);
router.use('/', automationRoutes);

// API health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    version: process.env.API_VERSION || 'v1',
    timestamp: new Date().toISOString(),
  });
});

export default router;