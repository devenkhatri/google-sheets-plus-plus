import webpush from 'web-push';
import { PushSubscriptionModel, PushSubscription } from '../models/PushSubscription';
import { NotificationModel, Notification } from '../models/Notification';
import { logger } from '../utils/logger';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  url?: string;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;

  private constructor() {
    this.initializeVapid();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize VAPID keys
   */
  private initializeVapid(): void {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'mailto:admin@airtableclone.com';

    if (!publicKey || !privateKey) {
      logger.warn('VAPID keys not configured. Push notifications will not work.');
      return;
    }

    this.vapidKeys = { publicKey, privateKey };

    webpush.setVapidDetails(email, publicKey, privateKey);
    logger.info('VAPID keys configured successfully');
  }

  /**
   * Get VAPID public key
   */
  public getVapidPublicKey(): string | null {
    return this.vapidKeys?.publicKey || null;
  }

  /**
   * Subscribe user to push notifications
   */
  public async subscribe(
    userId: string,
    endpoint: string,
    p256dhKey: string,
    authKey: string,
    userAgent?: string
  ): Promise<PushSubscription> {
    try {
      const subscription = await PushSubscriptionModel.upsert({
        user_id: userId,
        endpoint,
        p256dh_key: p256dhKey,
        auth_key: authKey,
        user_agent: userAgent
      });

      logger.info(`User ${userId} subscribed to push notifications`);
      return subscription;
    } catch (error) {
      logger.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  public async unsubscribe(userId: string, endpoint?: string): Promise<boolean> {
    try {
      let deletedCount: number;
      
      if (endpoint) {
        // Delete specific subscription
        const deleted = await PushSubscriptionModel.deleteByUserAndEndpoint(userId, endpoint);
        deletedCount = deleted ? 1 : 0;
      } else {
        // Delete all subscriptions for user
        deletedCount = await PushSubscriptionModel.deleteByUserId(userId);
      }

      logger.info(`Unsubscribed ${deletedCount} push subscription(s) for user ${userId}`);
      return deletedCount > 0;
    } catch (error) {
      logger.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a specific user
   */
  public async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    if (!this.vapidKeys) {
      logger.warn('VAPID keys not configured. Cannot send push notification.');
      return;
    }

    try {
      const subscriptions = await PushSubscriptionModel.findByUserId(userId);
      
      if (subscriptions.length === 0) {
        logger.debug(`No push subscriptions found for user ${userId}`);
        return;
      }

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        data: {
          ...payload.data,
          url: payload.url || '/'
        }
      });

      // Send to all user's subscriptions
      const sendPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh_key,
                auth: subscription.auth_key
              }
            },
            pushPayload
          );
          
          logger.debug(`Push notification sent successfully to ${subscription.endpoint}`);
        } catch (error: any) {
          logger.error(`Failed to send push notification to ${subscription.endpoint}:`, error);
          
          // Handle expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            logger.info(`Removing expired subscription: ${subscription.endpoint}`);
            await PushSubscriptionModel.delete(subscription.id);
          }
        }
      });

      await Promise.allSettled(sendPromises);
      logger.info(`Push notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification for a database notification
   */
  public async sendForNotification(notification: Notification): Promise<void> {
    const payload: PushNotificationPayload = {
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id,
        type: notification.type,
        entityType: notification.entity_type,
        entityId: notification.entity_id
      },
      url: this.generateNotificationUrl(notification)
    };

    await this.sendToUser(notification.user_id, payload);
  }

  /**
   * Generate URL for notification based on its type and entity
   */
  private generateNotificationUrl(notification: Notification): string {
    const { entity_type, entity_id, metadata } = notification;

    switch (entity_type) {
      case 'record':
        if (metadata?.baseId && metadata?.tableId) {
          return `/bases/${metadata.baseId}/tables/${metadata.tableId}/records/${entity_id}`;
        }
        break;
      case 'base':
        return `/bases/${entity_id}`;
      case 'table':
        if (metadata?.baseId) {
          return `/bases/${metadata.baseId}/tables/${entity_id}`;
        }
        break;
      default:
        return '/';
    }

    return '/';
  }

  /**
   * Send test notification
   */
  public async sendTestNotification(userId: string): Promise<void> {
    const payload: PushNotificationPayload = {
      title: 'Test Notification',
      body: 'This is a test notification from Airtable Clone',
      data: { test: true }
    };

    await this.sendToUser(userId, payload);
  }

  /**
   * Clean up expired subscriptions
   */
  public async cleanupExpiredSubscriptions(): Promise<number> {
    try {
      const deletedCount = await PushSubscriptionModel.cleanupExpired();
      logger.info(`Cleaned up ${deletedCount} expired push subscriptions`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get subscription count for a user
   */
  public async getUserSubscriptionCount(userId: string): Promise<number> {
    try {
      const subscriptions = await PushSubscriptionModel.findByUserId(userId);
      return subscriptions.length;
    } catch (error) {
      logger.error('Error getting user subscription count:', error);
      throw error;
    }
  }
}