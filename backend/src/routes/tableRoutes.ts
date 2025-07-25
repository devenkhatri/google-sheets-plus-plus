import express from 'express';
import { TableController } from '../controllers/TableController';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { body, param } from 'express-validator';

const router = express.Router();
const tableController = new TableController();

// All routes require authentication
router.use(authenticate);

// Table routes
router.post(
  '/base/:baseId',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
    body('name').notEmpty().withMessage('Table name is required'),
    body('description').optional(),
    body('fields').optional().isArray().withMessage('Fields must be an array'),
  ]),
  tableController.createTable.bind(tableController)
);

router.get(
  '/base/:baseId',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
  ]),
  tableController.getTables.bind(tableController)
);

router.get(
  '/:tableId',
  validate([
    param('tableId').isUUID().withMessage('Invalid table ID'),
  ]),
  tableController.getTable.bind(tableController)
);

router.put(
  '/:tableId',
  validate([
    param('tableId').isUUID().withMessage('Invalid table ID'),
    body('name').optional(),
    body('description').optional(),
  ]),
  tableController.updateTable.bind(tableController)
);

router.delete(
  '/:tableId',
  validate([
    param('tableId').isUUID().withMessage('Invalid table ID'),
  ]),
  tableController.deleteTable.bind(tableController)
);

// Sync routes
router.post(
  '/:tableId/sync',
  validate([
    param('tableId').isUUID().withMessage('Invalid table ID'),
    body('direction').optional().isIn(['from', 'to']).withMessage('Direction must be "from" or "to"'),
  ]),
  tableController.syncTable.bind(tableController)
);

export default router;