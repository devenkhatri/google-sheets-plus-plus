import { Request, Response } from 'express';
import { PushNotificationService } from '../services/PushNotificationService';
import { BaseController } from './BaseController';

export class PushNotificationController extends BaseController {
  private pushNotificationService: PushNotificationService;

  constructor() {
    super();
    this.pushNotificationService = PushNotificationService.getInstance();
  }

  /**
   * Get VAPID public key
   */
  public getVapidPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const publicKey = this.pushNotificationService.getVapidPublicKey();
      
      if (!publicKey) {
        return this.sendErrorResponse(res, 'Push notifications not configured', 503);
      }

      this.sendSuccessResponse(res, { publicKey });
    } catch (error) {
      this.sendErrorResponse(res, 'Failed to get VAPID public key', 500, error);
    }
  };

  /**
   * Subscribe to push notifications
   */
  public subscribe = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return this.sendErrorResponse(res, 'Invalid subscription data', 400);
      }

      const userAgent = req.get('User-Agent');
      
      const subscription = await this.pushNotificationService.subscribe(
        userId,
        endpoint,
        keys.p256dh,
        keys.auth,
        userAgent
      );

      this.sendSuccessResponse(res, { 
        message: 'Successfully subscribed to push notifications',
        subscription: {
          id: subscription.id,
          endpoint: subscription.endpoint
        }
      });
    } catch (error) {
      this.sendErrorResponse(res, 'Failed to subscribe to push notifications', 500, error);
    }
  };

  /**
   * Unsubscribe from push notifications
   */
  public unsubscribe = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { endpoint } = req.body;

      const success = await this.pushNotificationService.unsubscribe(userId, endpoint);

      if (success) {
        this.sendSuccessResponse(res, { message: 'Successfully unsubscribed from push notifications' });
      } else {
        this.sendErrorResponse(res, 'No subscription found to unsubscribe', 404);
      }
    } catch (error) {
      this.sendErrorResponse(res, 'Failed to unsubscribe from push notifications', 500, error);
    }
  };

  /**
   * Send test notification
   */
  public sendTestNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      await this.pushNotificationService.sendTestNotification(userId);

      this.sendSuccessResponse(res, { message: 'Test notification sent successfully' });
    } catch (error) {
      this.sendErrorResponse(res, 'Failed to send test notification', 500, error);
    }
  };

  /**
   * Get user's subscription status
   */
  public getSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const subscriptionCount = await this.pushNotificationService.getUserSubscriptionCount(userId);

      this.sendSuccessResponse(res, {
        isSubscribed: subscriptionCount > 0,
        subscriptionCount
      });
    } catch (error) {
      this.sendErrorResponse(res, 'Failed to get subscription status', 500, error);
    }
  };
}