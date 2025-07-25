import express from 'express';
import { BaseController } from '../controllers/BaseController';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { body, param } from 'express-validator';

const router = express.Router();
const baseController = new BaseController();

// All routes require authentication
router.use(authenticate);

// Base routes
router.post(
  '/',
  validate([
    body('name').notEmpty().withMessage('Base name is required'),
    body('description').optional(),
  ]),
  baseController.createBase.bind(baseController)
);

router.get('/', baseController.getBases.bind(baseController));

router.get(
  '/:baseId',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
  ]),
  baseController.getBase.bind(baseController)
);

router.put(
  '/:baseId',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
    body('name').optional(),
    body('description').optional(),
  ]),
  baseController.updateBase.bind(baseController)
);

router.delete(
  '/:baseId',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
  ]),
  baseController.deleteBase.bind(baseController)
);

// Collaborator routes
router.post(
  '/:baseId/share',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('permissionLevel').isIn(['viewer', 'commenter', 'editor']).withMessage('Invalid permission level'),
  ]),
  baseController.shareBase.bind(baseController)
);

router.get(
  '/:baseId/collaborators',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
  ]),
  baseController.getCollaborators.bind(baseController)
);

router.put(
  '/:baseId/collaborators/:collaboratorId',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
    param('collaboratorId').isUUID().withMessage('Invalid collaborator ID'),
    body('permissionLevel').isIn(['viewer', 'commenter', 'editor']).withMessage('Invalid permission level'),
  ]),
  baseController.updateCollaboratorPermission.bind(baseController)
);

router.delete(
  '/:baseId/collaborators/:collaboratorId',
  validate([
    param('baseId').isUUID().withMessage('Invalid base ID'),
    param('collaboratorId').isUUID().withMessage('Invalid collaborator ID'),
  ]),
  baseController.removeCollaborator.bind(baseController)
);

export default router;