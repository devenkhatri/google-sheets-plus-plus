import { NotificationModel, Notification, NotificationType, CreateNotificationDTO } from '../models/Notification';
import { CommentModel } from '../models/Comment';
import { RecordModel } from '../models/Record';
import { UserModel } from '../models/User';
import { PushNotificationService } from './PushNotificationService';
import { logger } from '../utils/logger';
import { Server } from 'socket.io';

/**
 * Service for handling notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private io: Server | null = null;
  private pushNotificationService: PushNotificationService;
  
  private constructor() {
    this.pushNotificationService = PushNotificationService.getInstance();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    
    return NotificationService.instance;
  }
  
  /**
   * Set Socket.IO server instance
   */
  public setSocketServer(io: Server): void {
    this.io = io;
  }
  
  /**
   * Create a notification
   */
  public async createNotification(notificationData: CreateNotificationDTO): Promise<Notification> {
    try {
      const notification = await NotificationModel.create(notificationData);
      
      // Broadcast notification to user if socket server is available
      if (this.io) {
        this.io.to(`user:${notificationData.user_id}`).emit('notification', notification);
      }
      
      // Send push notification
      try {
        await this.pushNotificationService.sendForNotification(notification);
      } catch (pushError) {
        logger.error('Error sending push notification:', pushError);
        // Don't fail the entire operation if push notification fails
      }
      
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }
  
  /**
   * Get notifications for a user
   */
  public async getUserNotifications(
    userId: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      read?: boolean;
      types?: NotificationType[];
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      return await NotificationModel.findByUserId(userId, options);
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }
  
  /**
   * Mark notification as read
   */
  public async markAsRead(id: string): Promise<Notification | null> {
    try {
      const notification = await NotificationModel.markAsRead(id);
      
      if (notification && this.io) {
        // Broadcast updated unread count
        const unreadCount = await NotificationModel.getUnreadCount(notification.user_id);
        this.io.to(`user:${notification.user_id}`).emit('notification_count', { unreadCount });
      }
      
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }
  
  /**
   * Mark all notifications as read for a user
   */
  public async markAllAsRead(userId: string): Promise<number> {
    try {
      const updatedCount = await NotificationModel.markAllAsRead(userId);
      
      if (this.io) {
        // Broadcast updated unread count (which is now 0)
        this.io.to(`user:${userId}`).emit('notification_count', { unreadCount: 0 });
      }
      
      return updatedCount;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
  
  /**
   * Delete notification
   */
  public async deleteNotification(id: string): Promise<boolean> {
    try {
      const notification = await NotificationModel.findById(id);
      
      if (!notification) {
        return false;
      }
      
      const deleted = await NotificationModel.delete(id);
      
      if (deleted && !notification.read && this.io) {
        // Broadcast updated unread count
        const unreadCount = await NotificationModel.getUnreadCount(notification.user_id);
        this.io.to(`user:${notification.user_id}`).emit('notification_count', { unreadCount });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }
  
  /**
   * Get unread count for a user
   */
  public async getUnreadCount(userId: string): Promise<number> {
    try {
      return await NotificationModel.getUnreadCount(userId);
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }
  
  /**
   * Process a new comment for notifications
   * - Notifies record owner
   * - Processes mentions
   */
  public async processCommentNotifications(
    commentId: string,
    recordId: string,
    commentingUserId: string,
    content: string
  ): Promise<void> {
    try {
      // Get necessary data
      const [comment, record, commentingUser] = await Promise.all([
        CommentModel.findById(commentId),
        RecordModel.findById(recordId),
        UserModel.findById(commentingUserId)
      ]);
      
      if (!comment || !record || !commentingUser) {
        logger.error('Missing data for comment notification:', { commentId, recordId, commentingUserId });
        return;
      }
      
      // Process mentions (e.g., @username)
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const mentions = content.match(mentionRegex) || [];
      
      for (const mention of mentions) {
        const username = mention.substring(1); // Remove @ symbol
        
        // Find user by username
        const mentionedUser = await UserModel.findByUsername(username);
        
        if (mentionedUser && mentionedUser.id !== commentingUserId) {
          // Create mention notification
          await NotificationModel.createMentionNotification(
            mentionedUser.id,
            commentingUserId,
            commentingUser.name,
            recordId,
            record.table_id,
            record.base_id,
            commentId,
            content
          );
          
          // Broadcast notification if socket server is available
          if (this.io) {
            const notification = await NotificationModel.findById(commentId);
            if (notification) {
              this.io.to(`user:${mentionedUser.id}`).emit('notification', notification);
            }
          }
        }
      }
      
      // Notify record creator if different from commenting user
      if (record.created_by && record.created_by !== commentingUserId) {
        await NotificationModel.createCommentNotification(
          record.created_by,
          commentingUserId,
          commentingUser.name,
          recordId,
          record.table_id,
          record.base_id,
          commentId,
          content
        );
        
        // Broadcast notification if socket server is available
        if (this.io) {
          const notification = await NotificationModel.findById(commentId);
          if (notification) {
            this.io.to(`user:${record.created_by}`).emit('notification', notification);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing comment notifications:', error);
      throw error;
    }
  }
  
  /**
   * Process permission change notification
   */
  public async processPermissionChangeNotification(
    userId: string,
    baseId: string,
    baseName: string,
    changedByUserId: string,
    changedByUserName: string,
    newPermissionLevel: string
  ): Promise<void> {
    try {
      await NotificationModel.createPermissionChangeNotification(
        userId,
        baseId,
        baseName,
        changedByUserId,
        changedByUserName,
        newPermissionLevel
      );
      
      // Broadcast notification if socket server is available
      if (this.io) {
        const unreadCount = await NotificationModel.getUnreadCount(userId);
        this.io.to(`user:${userId}`).emit('notification_count', { unreadCount });
      }
    } catch (error) {
      logger.error('Error processing permission change notification:', error);
      throw error;
    }
  }
  
  /**
   * Process base share notification
   */
  public async processBaseShareNotification(
    userId: string,
    baseId: string,
    baseName: string,
    sharedByUserId: string,
    sharedByUserName: string,
    permissionLevel: string
  ): Promise<void> {
    try {
      await NotificationModel.createBaseShareNotification(
        userId,
        baseId,
        baseName,
        sharedByUserId,
        sharedByUserName,
        permissionLevel
      );
      
      // Broadcast notification if socket server is available
      if (this.io) {
        const unreadCount = await NotificationModel.getUnreadCount(userId);
        this.io.to(`user:${userId}`).emit('notification_count', { unreadCount });
      }
    } catch (error) {
      logger.error('Error processing base share notification:', error);
      throw error;
    }
  }
}