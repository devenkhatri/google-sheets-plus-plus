import { Router } from 'express';
import { ImportExportController } from '../controllers/ImportExportController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const importExportController = new ImportExportController();

/**
 * @route POST /api/import
 * @desc Import data from a file
 * @access Private
 */
router.post(
  '/',
  authMiddleware,
  importExportController.getUploadMiddleware(),
  importExportController.importData
);

/**
 * @route GET /api/import/:jobId/progress
 * @desc Get import progress
 * @access Private
 */
router.get(
  '/:jobId/progress',
  authMiddleware,
  importExportController.getImportProgress
);

/**
 * @route GET /api/export/:tableId
 * @desc Export data to a file
 * @access Private
 */
router.get(
  '/:tableId',
  authMiddleware,
  importExportController.exportData
);

export default router;