import { Router } from 'express';
import { PushNotificationController } from '../controllers/PushNotificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const pushNotificationController = new PushNotificationController();

/**
 * @route   GET /api/push/vapid-public-key
 * @desc    Get VAPID public key for push notifications
 * @access  Public
 */
router.get('/vapid-public-key', pushNotificationController.getVapidPublicKey);

/**
 * @route   POST /api/push/subscribe
 * @desc    Subscribe to push notifications
 * @access  Private
 */
router.post('/subscribe', authMiddleware, pushNotificationController.subscribe);

/**
 * @route   POST /api/push/unsubscribe
 * @desc    Unsubscribe from push notifications
 * @access  Private
 */
router.post('/unsubscribe', authMiddleware, pushNotificationController.unsubscribe);

/**
 * @route   POST /api/push/test
 * @desc    Send test push notification
 * @access  Private
 */
router.post('/test', authMiddleware, pushNotificationController.sendTestNotification);

/**
 * @route   GET /api/push/status
 * @desc    Get user's push notification subscription status
 * @access  Private
 */
router.get('/status', authMiddleware, pushNotificationController.getSubscriptionStatus);

export default router;