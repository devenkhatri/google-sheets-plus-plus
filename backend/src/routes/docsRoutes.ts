import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { specs } from '../config/swagger';

const router = express.Router();

/**
 * Serve Swagger UI documentation
 */
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Airtable Clone API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

/**
 * Serve OpenAPI specification as JSON
 */
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

export default router;