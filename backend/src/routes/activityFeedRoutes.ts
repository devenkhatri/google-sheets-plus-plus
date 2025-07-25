import { Router } from 'express';
import { ActivityFeedController } from '../controllers/ActivityFeedController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const activityFeedController = new ActivityFeedController();

/**
 * @route   GET /api/activity/base/:baseId
 * @desc    Get activity feed for a base
 * @access  Private
 */
router.get('/base/:baseId', authMiddleware, activityFeedController.getBaseActivityFeed);

/**
 * @route   GET /api/activity/table/:tableId
 * @desc    Get activity feed for a table
 * @access  Private
 */
router.get('/table/:tableId', authMiddleware, activityFeedController.getTableActivityFeed);

/**
 * @route   GET /api/activity/record/:recordId
 * @desc    Get activity feed for a record
 * @access  Private
 */
router.get('/record/:recordId', authMiddleware, activityFeedController.getRecordActivityFeed);

/**
 * @route   GET /api/activity/user
 * @desc    Get activity feed for the authenticated user
 * @access  Private
 */
router.get('/user', authMiddleware, activityFeedController.getUserActivityFeed);

export default router;