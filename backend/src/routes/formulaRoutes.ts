import { Router } from 'express';
import { FormulaController } from '../controllers/FormulaController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { body, param } from 'express-validator';

const router = Router();
const formulaController = new FormulaController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route POST /api/tables/:tableId/formulas/validate
 * @desc Validate a formula
 * @access Private
 */
router.post(
  '/:tableId/validate',
  [
    param('tableId').isUUID().withMessage('Table ID must be a valid UUID'),
    body('formula').isString().notEmpty().withMessage('Formula is required and must be a string'),
  ],
  validateRequest,
  formulaController.validateFormula
);

/**
 * @route POST /api/tables/:tableId/formulas/autocomplete
 * @desc Get autocomplete suggestions for formula
 * @access Private
 */
router.post(
  '/:tableId/autocomplete',
  [
    param('tableId').isUUID().withMessage('Table ID must be a valid UUID'),
    body('formula').isString().notEmpty().withMessage('Formula is required and must be a string'),
    body('cursorPosition').isInt({ min: 0 }).withMessage('Cursor position must be a non-negative integer'),
  ],
  validateRequest,
  formulaController.getAutoComplete
);

/**
 * @route POST /api/formulas/syntax-highlighting
 * @desc Get syntax highlighting for formula
 * @access Private
 */
router.post(
  '/syntax-highlighting',
  [
    body('formula').isString().notEmpty().withMessage('Formula is required and must be a string'),
  ],
  validateRequest,
  formulaController.getSyntaxHighlighting
);

/**
 * @route POST /api/tables/:tableId/formulas/evaluate
 * @desc Evaluate formula for a specific record
 * @access Private
 */
router.post(
  '/:tableId/evaluate',
  [
    param('tableId').isUUID().withMessage('Table ID must be a valid UUID'),
    body('formula').isString().notEmpty().withMessage('Formula is required and must be a string'),
    body('recordId').isUUID().withMessage('Record ID must be a valid UUID'),
  ],
  validateRequest,
  formulaController.evaluateFormula
);

/**
 * @route POST /api/formulas/dependencies
 * @desc Get formula dependencies
 * @access Private
 */
router.post(
  '/dependencies',
  [
    body('formula').isString().notEmpty().withMessage('Formula is required and must be a string'),
  ],
  validateRequest,
  formulaController.getDependencies
);

/**
 * @route GET /api/formulas/functions
 * @desc Get available functions for formulas
 * @access Private
 */
router.get('/functions', formulaController.getFunctions);

export default router;