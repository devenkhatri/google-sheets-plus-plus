import { Router } from 'express';
import { RecordController } from '../controllers/RecordController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { body, param, query } from 'express-validator';

const router = Router();
const recordController = new RecordController();

// Middleware for all routes
router.use(authMiddleware);

// Create a new record
router.post(
  '/tables/:tableId/records',
  [
    param('tableId').isUUID().withMessage('Invalid table ID'),
    body('fields').isObject().withMessage('Fields must be an object'),
    body('syncToSheets').optional().isBoolean().withMessage('syncToSheets must be a boolean')
  ],
  validate,
  recordController.createRecord
);

// Get record by ID
router.get(
  '/records/:id',
  [
    param('id').isUUID().withMessage('Invalid record ID')
  ],
  validate,
  recordController.getRecordById
);

// Get records by table ID with filtering and pagination
router.get(
  '/tables/:tableId/records',
  [
    param('tableId').isUUID().withMessage('Invalid table ID'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
    query('filters').optional().custom(value => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch (e) {
        return false;
      }
    }).withMessage('Filters must be a valid JSON array'),
    query('sorts').optional().custom(value => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch (e) {
        return false;
      }
    }).withMessage('Sorts must be a valid JSON array'),
    query('includeDeleted').optional().isBoolean().withMessage('includeDeleted must be a boolean')
  ],
  validate,
  recordController.getRecordsByTableId
);

// Update record
router.patch(
  '/records/:id',
  [
    param('id').isUUID().withMessage('Invalid record ID'),
    body('fields').optional().isObject().withMessage('Fields must be an object'),
    body('deleted').optional().isBoolean().withMessage('Deleted must be a boolean'),
    body('syncToSheets').optional().isBoolean().withMessage('syncToSheets must be a boolean')
  ],
  validate,
  recordController.updateRecord
);

// Soft delete record
router.delete(
  '/records/:id',
  [
    param('id').isUUID().withMessage('Invalid record ID'),
    body('syncToSheets').optional().isBoolean().withMessage('syncToSheets must be a boolean')
  ],
  validate,
  recordController.softDeleteRecord
);

// Restore soft-deleted record
router.post(
  '/records/:id/restore',
  [
    param('id').isUUID().withMessage('Invalid record ID'),
    body('syncToSheets').optional().isBoolean().withMessage('syncToSheets must be a boolean')
  ],
  validate,
  recordController.restoreRecord
);

// Bulk create records
router.post(
  '/tables/:tableId/records/bulk',
  [
    param('tableId').isUUID().withMessage('Invalid table ID'),
    body('records').isArray().withMessage('Records must be an array'),
    body('records.*.fields').isObject().withMessage('Each record must have fields object'),
    body('records.*.rowIndex').optional().isInt({ min: 0 }).withMessage('Row index must be a non-negative integer'),
    body('syncToSheets').optional().isBoolean().withMessage('syncToSheets must be a boolean')
  ],
  validate,
  recordController.bulkCreateRecords
);

// Bulk update records
router.patch(
  '/records/bulk',
  [
    body('updates').isArray().withMessage('Updates must be an array'),
    body('updates.*.id').isUUID().withMessage('Each update must have a valid record ID'),
    body('updates.*.fields').optional().isObject().withMessage('Fields must be an object'),
    body('updates.*.deleted').optional().isBoolean().withMessage('Deleted must be a boolean'),
    body('syncToSheets').optional().isBoolean().withMessage('syncToSheets must be a boolean')
  ],
  validate,
  recordController.bulkUpdateRecords
);

// Sync records from Google Sheets
router.post(
  '/tables/:tableId/records/sync/from-sheets',
  [
    param('tableId').isUUID().withMessage('Invalid table ID')
  ],
  validate,
  recordController.syncFromGoogleSheets
);

// Sync records to Google Sheets
router.post(
  '/tables/:tableId/records/sync/to-sheets',
  [
    param('tableId').isUUID().withMessage('Invalid table ID')
  ],
  validate,
  recordController.syncToGoogleSheets
);

export default router;