import express from 'express';
import { GoogleSheetsController } from '../controllers/GoogleSheetsController';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { body, param } from 'express-validator';

const router = express.Router();

// Webhook endpoint (public)
router.post('/webhook', GoogleSheetsController.handleWebhook);

// Protected routes
router.use(authenticate);

// Spreadsheet operations
router.post(
  '/',
  validate([
    body('title').notEmpty().withMessage('Spreadsheet title is required'),
  ]),
  GoogleSheetsController.createSpreadsheet
);

router.get(
  '/:spreadsheetId',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
  ]),
  GoogleSheetsController.getSpreadsheet
);

// Sheet operations
router.post(
  '/:spreadsheetId/sheets',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
    body('title').notEmpty().withMessage('Sheet title is required'),
  ]),
  GoogleSheetsController.createSheet
);

// Values operations
router.get(
  '/:spreadsheetId/values/:range',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
    param('range').notEmpty().withMessage('Range is required'),
  ]),
  GoogleSheetsController.getValues
);

router.put(
  '/:spreadsheetId/values/:range',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
    param('range').notEmpty().withMessage('Range is required'),
    body('values').isArray().withMessage('Values must be a 2D array'),
  ]),
  GoogleSheetsController.updateValues
);

router.post(
  '/:spreadsheetId/values/:range',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
    param('range').notEmpty().withMessage('Range is required'),
    body('values').isArray().withMessage('Values must be a 2D array'),
  ]),
  GoogleSheetsController.appendValues
);

// Batch operations
router.post(
  '/:spreadsheetId/batchUpdate',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
    body('requests').isArray().withMessage('Requests must be an array'),
  ]),
  GoogleSheetsController.batchUpdate
);

router.post(
  '/:spreadsheetId/queueBatchUpdate',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
    body('requests').isArray().withMessage('Requests must be an array'),
  ]),
  GoogleSheetsController.queueBatchUpdate
);

router.post(
  '/:spreadsheetId/processBatchUpdates',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
  ]),
  GoogleSheetsController.processBatchUpdates
);

// Sync operations
router.post(
  '/:spreadsheetId/syncFrom',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
    body('sheetName').notEmpty().withMessage('Sheet name is required'),
    body('tableId').notEmpty().withMessage('Table ID is required'),
  ]),
  GoogleSheetsController.syncFromGoogleSheets
);

router.post(
  '/:spreadsheetId/syncTo',
  validate([
    param('spreadsheetId').notEmpty().withMessage('Spreadsheet ID is required'),
    body('sheetName').notEmpty().withMessage('Sheet name is required'),
    body('tableId').notEmpty().withMessage('Table ID is required'),
    body('records').isArray().withMessage('Records must be an array'),
    body('fields').isArray().withMessage('Fields must be an array'),
  ]),
  GoogleSheetsController.syncToGoogleSheets
);

router.get(
  '/syncStatus/:tableId',
  validate([
    param('tableId').notEmpty().withMessage('Table ID is required'),
  ]),
  GoogleSheetsController.getSyncStatus
);

export default router;