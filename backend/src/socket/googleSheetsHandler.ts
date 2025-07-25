import { Server, Socket } from 'socket.io';
import { GoogleSheetsWebhookService } from '../services/GoogleSheetsWebhookService';
import { logger } from '../utils/logger';

/**
 * Set up Google Sheets socket handlers
 */
export function setupGoogleSheetsHandlers(io: Server): void {
  const webhookService = GoogleSheetsWebhookService.getInstance();
  
  io.on('connection', (socket: Socket) => {
    // Handle subscription to spreadsheet changes
    socket.on('subscribe_to_spreadsheet', async (spreadsheetId: string) => {
      try {
        // Join room for this spreadsheet
        socket.join(`spreadsheet:${spreadsheetId}`);
        
        // Subscribe to changes
        await webhookService.subscribeToChanges(spreadsheetId, socket.id);
        
        logger.info(`Socket ${socket.id} subscribed to spreadsheet ${spreadsheetId}`);
      } catch (error) {
        logger.error(`Error subscribing to spreadsheet ${spreadsheetId}:`, error);
        socket.emit('error', {
          message: 'Failed to subscribe to spreadsheet changes',
        });
      }
    });
    
    // Handle unsubscription from spreadsheet changes
    socket.on('unsubscribe_from_spreadsheet', async (spreadsheetId: string) => {
      try {
        // Leave room for this spreadsheet
        socket.leave(`spreadsheet:${spreadsheetId}`);
        
        // Unsubscribe from changes
        await webhookService.unsubscribeFromChanges(spreadsheetId, socket.id);
        
        logger.info(`Socket ${socket.id} unsubscribed from spreadsheet ${spreadsheetId}`);
      } catch (error) {
        logger.error(`Error unsubscribing from spreadsheet ${spreadsheetId}:`, error);
      }
    });
    
    // Handle subscription to table sync status
    socket.on('subscribe_to_table', (tableId: string) => {
      try {
        // Join room for this table
        socket.join(`table:${tableId}`);
        
        logger.info(`Socket ${socket.id} subscribed to table ${tableId}`);
      } catch (error) {
        logger.error(`Error subscribing to table ${tableId}:`, error);
        socket.emit('error', {
          message: 'Failed to subscribe to table sync status',
        });
      }
    });
    
    // Handle unsubscription from table sync status
    socket.on('unsubscribe_from_table', (tableId: string) => {
      try {
        // Leave room for this table
        socket.leave(`table:${tableId}`);
        
        logger.info(`Socket ${socket.id} unsubscribed from table ${tableId}`);
      } catch (error) {
        logger.error(`Error unsubscribing from table ${tableId}:`, error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Socket ${socket.id} disconnected`);
    });
  });
}