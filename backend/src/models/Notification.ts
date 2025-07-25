import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';

export enum NotificationType {
  MENTION = 'mention',
  COMMENT = 'comment',
  RECORD_CHANGE = 'record_change',
  PERMISSION_CHANGE = 'permission_change',
  BASE_SHARE = 'base_share',
  SYSTEM = 'system'
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: string;
  entity_id?: string;
  reference_id?: string;
  metadata?: any;
  read: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateNotificationDTO {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: string;
  entity_id?: string;
  reference_id?: string;
  metadata?: any;
}

export class NotificationModel {
  private static readonly tableName = 'notifications';
  private static readonly REDIS_UNREAD_COUNT_PREFIX = 'unread_notifications:';
  private static readonly REDIS_NOTIFICATION_TTL = 86400 * 7; // 7 days

  /**
   * Create a new notification
   */
  static async create(notificationData: CreateNotificationDTO): Promise<Notification> {
    const notification: Partial<Notification> = {
      ...notificationData,
      id: uuidv4(),
      read: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdNotification] = await db(this.tableName).insert(notification).returning('*');
    
    // Update unread count in Redis
    await this.incrementUnreadCount(notificationData.user_id);
    
    return createdNotification;
  }

  /**
   * Find notification by ID
   */
  static async findById(id: string): Promise<Notification | null> {
    const notification = await db(this.tableName).where({ id }).first();
    return notification || null;
  }

  /**
   * Find notifications by user ID
   */
  static async findByUserId(
    userId: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      read?: boolean;
      types?: NotificationType[];
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { limit = 20, offset = 0, read, types } = options;
    
    // Build query
    let query = db(this.tableName).where({ user_id: userId });
    
    if (read !== undefined) {
      query = query.where({ read });
    }
    
    if (types && types.length > 0) {
      query = query.whereIn('type', types);
    }
    
    // Get total count
    const countQuery = query.clone().count('* as total').first();
    
    // Get paginated results
    const notificationsQuery = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Execute both queries
    const [countResult, notifications] = await Promise.all([countQuery, notificationsQuery]);
    
    return {
      notifications,
      total: parseInt(countResult?.total.toString() || '0', 10),
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: string): Promise<Notification | null> {
    const notification = await this.findById(id);
    
    if (!notification) {
      return null;
    }
    
    // Only decrement if notification was unread
    if (!notification.read) {
      await this.decrementUnreadCount(notification.user_id);
    }
    
    const [updatedNotification] = await db(this.tableName)
      .where({ id })
      .update({ read: true, updated_at: new Date() })
      .returning('*');
      
    return updatedNotification || null;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const unreadCount = await this.getUnreadCount(userId);
    
    const updatedCount = await db(this.tableName)
      .where({ user_id: userId, read: false })
      .update({ read: true, updated_at: new Date() });
    
    // Reset unread count in Redis
    await redisClient.set(`${this.REDIS_UNREAD_COUNT_PREFIX}${userId}`, '0');
    
    return updatedCount;
  }

  /**
   * Delete notification
   */
  static async delete(id: string): Promise<boolean> {
    const notification = await this.findById(id);
    
    if (!notification) {
      return false;
    }
    
    // Only decrement if notification was unread
    if (!notification.read) {
      await this.decrementUnreadCount(notification.user_id);
    }
    
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const key = `${this.REDIS_UNREAD_COUNT_PREFIX}${userId}`;
    
    // Try to get from Redis first
    const cachedCount = await redisClient.get(key);
    
    if (cachedCount !== null) {
      return parseInt(cachedCount, 10);
    }
    
    // If not in Redis, query the database
    const result = await db(this.tableName)
      .where({ user_id: userId, read: false })
      .count('id as count')
      .first();
    
    const count = parseInt(result?.count.toString() || '0', 10);
    
    // Cache in Redis
    await redisClient.set(key, count.toString(), {
      EX: this.REDIS_NOTIFICATION_TTL
    });
    
    return count;
  }

  /**
   * Increment unread count for a user
   */
  private static async incrementUnreadCount(userId: string): Promise<number> {
    const key = `${this.REDIS_UNREAD_COUNT_PREFIX}${userId}`;
    const newCount = await redisClient.incr(key);
    
    // Set expiration if it's a new key
    await redisClient.expire(key, this.REDIS_NOTIFICATION_TTL);
    
    return newCount;
  }

  /**
   * Decrement unread count for a user
   */
  private static async decrementUnreadCount(userId: string): Promise<number> {
    const key = `${this.REDIS_UNREAD_COUNT_PREFIX}${userId}`;
    const count = await redisClient.get(key);
    
    // If no cached count, don't decrement
    if (count === null) {
      return 0;
    }
    
    const currentCount = parseInt(count, 10);
    
    // Don't go below zero
    if (currentCount <= 0) {
      return 0;
    }
    
    const newCount = await redisClient.decr(key);
    return newCount;
  }

  /**
   * Create a mention notification
   */
  static async createMentionNotification(
    mentionedUserId: string,
    mentioningUserId: string,
    mentioningUserName: string,
    recordId: string,
    tableId: string,
    baseId: string,
    commentId: string,
    commentText: string
  ): Promise<Notification> {
    return this.create({
      user_id: mentionedUserId,
      type: NotificationType.MENTION,
      title: 'You were mentioned in a comment',
      message: `${mentioningUserName} mentioned you: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      entity_type: 'record',
      entity_id: recordId,
      reference_id: commentId,
      metadata: {
        mentioningUserId,
        mentioningUserName,
        tableId,
        baseId,
        commentText
      }
    });
  }

  /**
   * Create a comment notification
   */
  static async createCommentNotification(
    userId: string,
    commentingUserId: string,
    commentingUserName: string,
    recordId: string,
    tableId: string,
    baseId: string,
    commentId: string,
    commentText: string
  ): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: NotificationType.COMMENT,
      title: 'New comment on your record',
      message: `${commentingUserName} commented: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      entity_type: 'record',
      entity_id: recordId,
      reference_id: commentId,
      metadata: {
        commentingUserId,
        commentingUserName,
        tableId,
        baseId,
        commentText
      }
    });
  }

  /**
   * Create a permission change notification
   */
  static async createPermissionChangeNotification(
    userId: string,
    baseId: string,
    baseName: string,
    changedByUserId: string,
    changedByUserName: string,
    newPermissionLevel: string
  ): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: NotificationType.PERMISSION_CHANGE,
      title: 'Your permissions have changed',
      message: `${changedByUserName} changed your access to "${baseName}" to ${newPermissionLevel}`,
      entity_type: 'base',
      entity_id: baseId,
      metadata: {
        changedByUserId,
        changedByUserName,
        baseName,
        newPermissionLevel
      }
    });
  }

  /**
   * Create a base share notification
   */
  static async createBaseShareNotification(
    userId: string,
    baseId: string,
    baseName: string,
    sharedByUserId: string,
    sharedByUserName: string,
    permissionLevel: string
  ): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: NotificationType.BASE_SHARE,
      title: 'Base shared with you',
      message: `${sharedByUserName} shared "${baseName}" with you as ${permissionLevel}`,
      entity_type: 'base',
      entity_id: baseId,
      metadata: {
        sharedByUserId,
        sharedByUserName,
        baseName,
        permissionLevel
      }
    });
  }
}