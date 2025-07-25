import { Server } from 'socket.io';
import { RealTimeSyncService } from '../services/RealTimeSyncService';
import { NotificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';

/**
 * Set up real-time synchronization socket handlers
 */
export function setupRealTimeSyncHandlers(io: Server): void {
  try {
    // Initialize the RealTimeSyncService with the Socket.IO server
    RealTimeSyncService.getInstance(io);
    
    // Initialize the NotificationService with the Socket.IO server
    const notificationService = NotificationService.getInstance();
    notificationService.setSocketServer(io);
    
    logger.info('Real-time synchronization and notification handlers initialized');
  } catch (error) {
    logger.error('Error setting up real-time synchronization handlers:', error);
  }
}