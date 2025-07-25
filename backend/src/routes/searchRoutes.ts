import express from 'express';
import { query, body } from 'express-validator';
import SearchController from '../controllers/SearchController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all search routes
router.use(authMiddleware);

// Search across bases, tables, and records
router.get(
  '/',
  [
    query('query').isString().notEmpty().withMessage('Search query is required'),
    query('baseId').optional().isUUID().withMessage('Invalid base ID'),
    query('tableId').optional().isUUID().withMessage('Invalid table ID'),
    query('fieldIds').optional().isString().withMessage('Field IDs must be a comma-separated string'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
    query('savedSearchId').optional().isUUID().withMessage('Invalid saved search ID')
  ],
  SearchController.search.bind(SearchController)
);

// Save a search query
router.post(
  '/saved',
  [
    body('name').isString().notEmpty().withMessage('Search name is required'),
    body('query').isString().notEmpty().withMessage('Search query is required'),
    body('baseId').optional().isUUID().withMessage('Invalid base ID'),
    body('tableId').optional().isUUID().withMessage('Invalid table ID'),
    body('fieldIds').optional().isArray().withMessage('Field IDs must be an array'),
    body('notificationsEnabled').optional().isBoolean().withMessage('Notifications enabled must be a boolean')
  ],
  SearchController.saveSearch.bind(SearchController)
);

// Get saved searches for the current user
router.get(
  '/saved',
  SearchController.getSavedSearches.bind(SearchController)
);

// Delete a saved search
router.delete(
  '/saved/:id',
  SearchController.deleteSavedSearch.bind(SearchController)
);

// Update a saved search
router.put(
  '/saved/:id',
  [
    body('name').optional().isString().notEmpty().withMessage('Search name is required'),
    body('query').optional().isString().notEmpty().withMessage('Search query is required'),
    body('baseId').optional().isUUID().withMessage('Invalid base ID'),
    body('tableId').optional().isUUID().withMessage('Invalid table ID'),
    body('fieldIds').optional().isArray().withMessage('Field IDs must be an array'),
    body('notificationsEnabled').optional().isBoolean().withMessage('Notifications enabled must be a boolean')
  ],
  SearchController.updateSavedSearch.bind(SearchController)
);

export default router;