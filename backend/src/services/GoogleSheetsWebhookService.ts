import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import { io } from '../index';

/**
 * Service for handling Google Sheets webhooks
 */
export class GoogleSheetsWebhookService {
  private static instance: GoogleSheetsWebhookService;
  private readonly WEBHOOK_CHANNEL_PREFIX = 'google_sheets_webhook:';
  private readonly CHANGE_NOTIFICATION_PREFIX = 'google_sheets_change:';

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): GoogleSheetsWebhookService {
    if (!GoogleSheetsWebhookService.instance) {
      GoogleSheetsWebhookService.instance = new GoogleSheetsWebhookService();
    }
    return GoogleSheetsWebhookService.instance;
  }

  /**
   * Handle webhook notification from Google Sheets
   */
  public async handleWebhook(payload: any): Promise<void> {
    try {
      // Extract spreadsheet ID from resource ID
      const resourceId = payload.resourceId;
      const match = resourceId.match(/spreadsheets\/([^\/]+)/);
      
      if (!match || !match[1]) {
        logger.error('Invalid resource ID in webhook payload:', resourceId);
        return;
      }
      
      const spreadsheetId = match[1];
      
      // Get change details
      const changeType = payload.changed?.type || 'unknown';
      const changedRange = payload.changed?.range || '';
      
      // Store change notification
      const changeKey = `${this.CHANGE_NOTIFICATION_PREFIX}${spreadsheetId}`;
      const changeData = {
        timestamp: Date.now(),
        type: changeType,
        range: changedRange,
      };
      
      // Store in Redis with 1 hour expiry
      await redisClient.set(changeKey, JSON.stringify(changeData), { EX: 3600 });
      
      // Notify subscribers
      this.notifySubscribers(spreadsheetId, changeData);
      
      logger.info(`Processed webhook for spreadsheet ${spreadsheetId}, change type: ${changeType}`);
    } catch (error) {
      logger.error('Error handling Google Sheets webhook:', error);
    }
  }

  /**
   * Subscribe to changes for a spreadsheet
   */
  public async subscribeToChanges(spreadsheetId: string, socketId: string): Promise<void> {
    const channelKey = `${this.WEBHOOK_CHANNEL_PREFIX}${spreadsheetId}`;
    
    // Add socket ID to subscribers
    await redisClient.sAdd(channelKey, socketId);
    
    // Set expiry if not exists
    await redisClient.expire(channelKey, 86400); // 24 hours
    
    logger.info(`Socket ${socketId} subscribed to changes for spreadsheet ${spreadsheetId}`);
  }

  /**
   * Unsubscribe from changes for a spreadsheet
   */
  public async unsubscribeFromChanges(spreadsheetId: string, socketId: string): Promise<void> {
    const channelKey = `${this.WEBHOOK_CHANNEL_PREFIX}${spreadsheetId}`;
    
    // Remove socket ID from subscribers
    await redisClient.sRem(channelKey, socketId);
    
    logger.info(`Socket ${socketId} unsubscribed from changes for spreadsheet ${spreadsheetId}`);
  }

  /**
   * Notify subscribers of changes
   */
  private async notifySubscribers(spreadsheetId: string, changeData: any): Promise<void> {
    const channelKey = `${this.WEBHOOK_CHANNEL_PREFIX}${spreadsheetId}`;
    
    // Get all subscribers
    const subscribers = await redisClient.sMembers(channelKey);
    
    if (subscribers.length === 0) {
      return;
    }
    
    // Emit event to each subscriber
    for (const socketId of subscribers) {
      const socket = io.sockets.sockets.get(socketId);
      
      if (socket) {
        socket.emit('google_sheets_change', {
          spreadsheetId,
          ...changeData,
        });
      } else {
        // Socket no longer connected, remove from subscribers
        await redisClient.sRem(channelKey, socketId);
      }
    }
    
    logger.info(`Notified ${subscribers.length} subscribers of changes to spreadsheet ${spreadsheetId}`);
  }

  /**
   * Get latest change for a spreadsheet
   */
  public async getLatestChange(spreadsheetId: string): Promise<any | null> {
    const changeKey = `${this.CHANGE_NOTIFICATION_PREFIX}${spreadsheetId}`;
    const changeData = await redisClient.get(changeKey);
    
    if (!changeData) {
      return null;
    }
    
    return JSON.parse(changeData);
  }
}