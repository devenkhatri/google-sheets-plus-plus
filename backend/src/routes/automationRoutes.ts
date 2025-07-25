import { Router } from 'express';
import { AutomationController } from '../controllers/AutomationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validationMiddleware } from '../middleware/validationMiddleware';
import { body, param, query } from 'express-validator';

const router = Router();
const automationController = new AutomationController();

// Validation schemas
const createAutomationRuleValidation = [
  body('name').isString().isLength({ min: 1, max: 255 }).withMessage('Name is required and must be between 1-255 characters'),
  body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
  body('triggerConfig').isObject().withMessage('Trigger configuration is required'),
  body('triggerConfig.type').isIn(['record_created', 'record_updated', 'record_deleted', 'field_changed', 'scheduled']).withMessage('Invalid trigger type'),
  body('actionConfig').isObject().withMessage('Action configuration is required'),
  body('actionConfig.type').isIn(['create_record', 'update_record', 'delete_record', 'send_email', 'send_webhook', 'run_script']).withMessage('Invalid action type'),
];

const updateAutomationRuleValidation = [
  body('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Name must be between 1-255 characters'),
  body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
  body('triggerConfig').optional().isObject().withMessage('Trigger configuration must be an object'),
  body('actionConfig').optional().isObject().withMessage('Action configuration must be an object'),
];

const uuidValidation = [
  param('baseId').isUUID().withMessage('Base ID must be a valid UUID'),
  param('ruleId').optional().isUUID().withMessage('Rule ID must be a valid UUID'),
];

// Routes for base-specific automation rules
router.get(
  '/bases/:baseId/automations',
  authMiddleware,
  uuidValidation,
  validationMiddleware,
  automationController.getAutomationRules
);

router.post(
  '/bases/:baseId/automations',
  authMiddleware,
  uuidValidation,
  createAutomationRuleValidation,
  validationMiddleware,
  automationController.createAutomationRule
);

// Routes for specific automation rules
router.get(
  '/automations/:ruleId',
  authMiddleware,
  [param('ruleId').isUUID().withMessage('Rule ID must be a valid UUID')],
  validationMiddleware,
  automationController.getAutomationRule
);

router.put(
  '/automations/:ruleId',
  authMiddleware,
  [param('ruleId').isUUID().withMessage('Rule ID must be a valid UUID')],
  updateAutomationRuleValidation,
  validationMiddleware,
  automationController.updateAutomationRule
);

router.delete(
  '/automations/:ruleId',
  authMiddleware,
  [param('ruleId').isUUID().withMessage('Rule ID must be a valid UUID')],
  validationMiddleware,
  automationController.deleteAutomationRule
);

router.post(
  '/automations/:ruleId/execute',
  authMiddleware,
  [param('ruleId').isUUID().withMessage('Rule ID must be a valid UUID')],
  validationMiddleware,
  automationController.executeAutomation
);

router.get(
  '/automations/:ruleId/executions',
  authMiddleware,
  [
    param('ruleId').isUUID().withMessage('Rule ID must be a valid UUID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validationMiddleware,
  automationController.getExecutionHistory
);

router.post(
  '/automations/:ruleId/toggle',
  authMiddleware,
  [param('ruleId').isUUID().withMessage('Rule ID must be a valid UUID')],
  validationMiddleware,
  automationController.toggleAutomationRule
);

export default router;