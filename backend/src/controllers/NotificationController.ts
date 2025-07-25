import { Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { BaseController } from './BaseController';
import { NotificationType } from '../models/Notification';

export class NotificationController extends BaseController {
  private notificationService: NotificationService;
  
  constructor() {
    super();
    this.notificationService = NotificationService.getInstance();
  }
  
  /**
   * Get notifications for the authenticated user
   */
  public getUserNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { limit, offset, read, types } = req.query;
      
      const options: {
        limit?: number;
        offset?: number;
        read?: boolean;
        types?: NotificationType[];
      } = {};
      
      if (limit) {
        options.limit = parseInt(limit as string, 10);
      }
      
      if (offset) {
        options.offset = parseInt(offset as string, 10);
      }
      
      if (read !== undefined) {
        options.read = read === 'true';
      }
      
      if (types) {
        const typesArray = (types as string).split(',');
        options.types = typesArray as NotificationType[];
      }
      
      const result = await this.notificationService.getUserNotifications(userId, options);
      
      this.sendSuccessResponse(res, result);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Get unread notification count for the authenticated user
   */
  public getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      
      this.sendSuccessResponse(res, { unreadCount });
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Mark notification as read
   */
  public markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const notification = await this.notificationService.markAsRead(id);
      
      if (!notification) {
        return this.sendNotFoundResponse(res, 'Notification not found');
      }
      
      // Verify ownership
      if (notification.user_id !== userId) {
        return this.sendForbiddenResponse(res, 'You do not have permission to access this notification');
      }
      
      this.sendSuccessResponse(res, notification);
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Mark all notifications as read
   */
  public markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const updatedCount = await this.notificationService.markAllAsRead(userId);
      
      this.sendSuccessResponse(res, { updatedCount });
    } catch (error) {
      this.handleError(res, error);
    }
  };
  
  /**
   * Delete notification
   */
  public deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Verify ownership
      const notification = await this.notificationService.deleteNotification(id);
      
      if (!notification) {
        return this.sendNotFoundResponse(res, 'Notification not found');
      }
      
      this.sendSuccessResponse(res, { success: true });
    } catch (error) {
      this.handleError(res, error);
    }
  };
}