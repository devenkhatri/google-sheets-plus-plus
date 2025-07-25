import { Router } from 'express';
import { LinkController } from '../controllers/LinkController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const linkController = new LinkController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Link routes
router.post('/links', linkController.createLink);
router.delete('/links/:id', linkController.deleteLink);
router.get('/fields/:fieldId/links', linkController.getLinksForField);

// Link records routes
router.post('/link-records', linkController.linkRecords);
router.delete('/link-records', linkController.unlinkRecords);
router.get('/records/:recordId/fields/:fieldId/linked-records', linkController.getLinkedRecords);

// Lookup and rollup routes
router.get('/records/:recordId/fields/:fieldId/lookup', linkController.getLookupValue);
router.get('/records/:recordId/fields/:fieldId/rollup', linkController.getRollupValue);
router.post('/records/:recordId/update-dependent-fields', linkController.updateDependentFields);

export default router;