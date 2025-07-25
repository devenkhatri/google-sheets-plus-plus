import { Router } from 'express';
import { TemplateController } from '../controllers/TemplateController';
import { TemplateService } from '../services/TemplateService';
import { BaseService } from '../services/BaseService';
import { TableService } from '../services/TableService';

import { ViewService } from '../services/ViewService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Initialize services and controller
const baseService = new BaseService();
const tableService = new TableService();
const viewService = new ViewService();
const templateService = new TemplateService(baseService, tableService, viewService);
const templateController = new TemplateController(templateService);

// Public routes
router.get('/categories', templateController.getCategories);
router.get('/featured', templateController.getFeaturedTemplates);
router.get('/search', templateController.searchTemplates);
router.get('/category/:categoryId', templateController.getTemplatesByCategory);

// Protected routes
router.use(authMiddleware);
router.get('/my-templates', templateController.getUserTemplates);
router.post('/', templateController.createTemplate);
router.post('/import', templateController.importTemplate);
router.get('/:templateId', templateController.getTemplate);
router.post('/:templateId/create-base', templateController.createBaseFromTemplate);
router.get('/:templateId/export', templateController.exportTemplate);
router.post('/:templateId/duplicate', templateController.duplicateTemplate);

export default router;