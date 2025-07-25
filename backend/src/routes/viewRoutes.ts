import express from 'express';
import { ViewController } from '../controllers/ViewController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
const viewController = new ViewController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Table views routes
router.get('/tables/:tableId/views', viewController.getViewsByTableId.bind(viewController));
router.post('/tables/:tableId/views', viewController.createView.bind(viewController));

// Individual view routes
router.get('/views/:viewId', viewController.getView.bind(viewController));
router.patch('/views/:viewId', viewController.updateView.bind(viewController));
router.delete('/views/:viewId', viewController.deleteView.bind(viewController));

// View duplication
router.post('/views/:viewId/duplicate', viewController.duplicateView.bind(viewController));

// View configuration routes
router.patch('/views/:viewId/filters', viewController.updateViewFilters.bind(viewController));
router.patch('/views/:viewId/sorts', viewController.updateViewSorts.bind(viewController));
router.patch('/views/:viewId/field-visibility', viewController.updateViewFieldVisibility.bind(viewController));

// View templates
router.post('/views/:viewId/templates', viewController.createViewTemplate.bind(viewController));

// View sharing
router.post('/views/:viewId/share', viewController.shareView.bind(viewController));

// View deep linking
router.get('/views/:viewId/deep-link', viewController.generateViewDeepLink.bind(viewController));

export default router;