import { Server, Socket } from 'socket.io';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { UserPresenceModel, UserPresence, CursorPosition, Selection } from '../models/UserPresence';
import { ChangeEventModel, ChangeEvent, ChangeType, EntityType, FieldChange } from '../models/ChangeEvent';
import { RecordModel, Record } from '../models/Record';

/**
 * Service for handling real-time synchronization between clients
 */
export class RealTimeSyncService {
  private static instance: RealTimeSyncService;
  private io: Server;
  
  // Map to track socket to user associations
  private socketUserMap: Map<string, { userId: string, userName: string, avatarUrl?: string }> = new Map();
  
  // Map to track which tables a socket is subscribed to
  private socketTableMap: Map<string, Set<string>> = new Map();
  
  private constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(io?: Server): RealTimeSyncService {
    if (!RealTimeSyncService.instance && io) {
      RealTimeSyncService.instance = new RealTimeSyncService(io);
    }
    
    if (!RealTimeSyncService.instance) {
      throw new Error('RealTimeSyncService not initialized');
    }
    
    return RealTimeSyncService.instance;
  }
  
  /**
   * Set up socket handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket connected: ${socket.id}`);
      
      // Handle authentication
      socket.on('authenticate', async (data: { userId: string, userName: string, avatarUrl?: string }) => {
        try {
          this.socketUserMap.set(socket.id, {
            userId: data.userId,
            userName: data.userName,
            avatarUrl: data.avatarUrl
          });
          
          logger.info(`Socket ${socket.id} authenticated as user ${data.userId}`);
          
          // Join user-specific room for notifications
          socket.join(`user:${data.userId}`);
          
          // Initialize socket table map
          this.socketTableMap.set(socket.id, new Set());
          
          // Check for offline changes
          const offlineChanges = await ChangeEventModel.getOfflineChanges(data.userId);
          
          if (offlineChanges.length > 0) {
            socket.emit('offline_changes', offlineChanges);
          }
          
          // Send unread notification count
          const { getUnreadCount } = require('../services/NotificationService').NotificationService.getInstance();
          const unreadCount = await getUnreadCount(data.userId);
          socket.emit('notification_count', { unreadCount });
        } catch (error) {
          logger.error(`Error authenticating socket ${socket.id}:`, error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });
      
      // Handle table subscription
      socket.on('subscribe_to_table', async (data: { tableId: string, viewId: string }) => {
        try {
          const { tableId, viewId } = data;
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (!userInfo) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }
          
          // Join room for this table
          socket.join(`table:${tableId}`);
          
          // Track subscription
          const tables = this.socketTableMap.get(socket.id);
          if (tables) {
            tables.add(tableId);
          }
          
          logger.info(`Socket ${socket.id} subscribed to table ${tableId}`);
          
          // Create initial presence
          const color = await UserPresenceModel.assignUserColor(userInfo.userId, tableId);
          
          const presence: UserPresence = {
            userId: userInfo.userId,
            userName: userInfo.userName,
            avatarUrl: userInfo.avatarUrl,
            tableId,
            viewId,
            lastSeen: new Date(),
            color
          };
          
          await UserPresenceModel.updatePresence(presence);
          
          // Broadcast user joined to other users in the table
          socket.to(`table:${tableId}`).emit('user_joined', presence);
          
          // Send current users to the new user
          const tableUsers = await UserPresenceModel.getTableUsers(tableId);
          socket.emit('table_users', tableUsers);
          
          // Send recent changes
          const recentChanges = await ChangeEventModel.getRecentTableEvents(tableId, 50);
          if (recentChanges.length > 0) {
            socket.emit('recent_changes', recentChanges);
          }
        } catch (error) {
          logger.error(`Error subscribing to table:`, error);
          socket.emit('error', { message: 'Failed to subscribe to table' });
        }
      });
      
      // Handle table unsubscription
      socket.on('unsubscribe_from_table', async (tableId: string) => {
        try {
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (!userInfo) {
            return;
          }
          
          // Leave room for this table
          socket.leave(`table:${tableId}`);
          
          // Remove from tracking
          const tables = this.socketTableMap.get(socket.id);
          if (tables) {
            tables.delete(tableId);
          }
          
          // Remove presence
          await UserPresenceModel.removePresence(userInfo.userId, tableId);
          
          // Broadcast user left to other users in the table
          this.io.to(`table:${tableId}`).emit('user_left', {
            userId: userInfo.userId,
            tableId
          });
          
          logger.info(`Socket ${socket.id} unsubscribed from table ${tableId}`);
        } catch (error) {
          logger.error(`Error unsubscribing from table:`, error);
        }
      });
      
      // Handle cursor position updates
      socket.on('cursor_position', async (data: { tableId: string, cursor: CursorPosition }) => {
        try {
          const { tableId, cursor } = data;
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (!userInfo) {
            return;
          }
          
          // Get current presence
          const presence = await UserPresenceModel.getPresence(userInfo.userId, tableId);
          
          if (!presence) {
            return;
          }
          
          // Update presence
          const updatedPresence: UserPresence = {
            ...presence,
            cursor,
            lastSeen: new Date()
          };
          
          await UserPresenceModel.updatePresence(updatedPresence);
          
          // Broadcast to other users in the table
          socket.to(`table:${tableId}`).emit('cursor_position', {
            userId: userInfo.userId,
            cursor
          });
        } catch (error) {
          logger.error(`Error updating cursor position:`, error);
        }
      });
      
      // Handle selection updates
      socket.on('selection', async (data: { tableId: string, selection: Selection }) => {
        try {
          const { tableId, selection } = data;
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (!userInfo) {
            return;
          }
          
          // Get current presence
          const presence = await UserPresenceModel.getPresence(userInfo.userId, tableId);
          
          if (!presence) {
            return;
          }
          
          // Update presence
          const updatedPresence: UserPresence = {
            ...presence,
            selection,
            lastSeen: new Date()
          };
          
          await UserPresenceModel.updatePresence(updatedPresence);
          
          // Broadcast to other users in the table
          socket.to(`table:${tableId}`).emit('selection', {
            userId: userInfo.userId,
            selection
          });
        } catch (error) {
          logger.error(`Error updating selection:`, error);
        }
      });
      
      // Handle record changes
      socket.on('record_change', async (data: {
        type: ChangeType;
        recordId: string;
        tableId: string;
        baseId: string;
        changes?: FieldChange[];
        metadata?: { [key: string]: any };
      }) => {
        try {
          const { type, recordId, tableId, baseId, changes, metadata } = data;
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (!userInfo) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }
          
          // Create change event
          const changeEvent = await ChangeEventModel.create({
            type,
            entityType: EntityType.RECORD,
            entityId: recordId,
            tableId,
            baseId,
            userId: userInfo.userId,
            changes,
            metadata
          });
          
          // Broadcast to other users in the table
          socket.to(`table:${tableId}`).emit('record_change', changeEvent);
          
          // Update presence
          const presence = await UserPresenceModel.getPresence(userInfo.userId, tableId);
          
          if (presence) {
            await UserPresenceModel.updatePresence({
              ...presence,
              lastSeen: new Date()
            });
          }
        } catch (error) {
          logger.error(`Error handling record change:`, error);
          socket.emit('error', { message: 'Failed to process record change' });
        }
      });
      
      // Handle offline changes sync
      socket.on('sync_offline_changes', async (changes: ChangeEvent[]) => {
        try {
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (!userInfo) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }
          
          // Process each change
          for (const change of changes) {
            // Verify the change belongs to this user
            if (change.userId !== userInfo.userId) {
              continue;
            }
            
            // Apply the change based on type
            if (change.entityType === EntityType.RECORD) {
              await this.applyRecordChange(change);
            }
            
            // Broadcast to other users in the table
            if (change.tableId) {
              this.io.to(`table:${change.tableId}`).emit('record_change', change);
            }
          }
          
          // Clear offline changes
          await ChangeEventModel.clearOfflineChanges(userInfo.userId);
          
          socket.emit('offline_sync_complete');
        } catch (error) {
          logger.error(`Error syncing offline changes:`, error);
          socket.emit('error', { message: 'Failed to sync offline changes' });
        }
      });
      
      // Handle heartbeat to keep presence alive
      socket.on('heartbeat', async (data: { tableId: string }) => {
        try {
          const { tableId } = data;
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (!userInfo) {
            return;
          }
          
          // Get current presence
          const presence = await UserPresenceModel.getPresence(userInfo.userId, tableId);
          
          if (presence) {
            // Update last seen
            await UserPresenceModel.updatePresence({
              ...presence,
              lastSeen: new Date()
            });
          }
          
          // Send heartbeat response
          socket.emit('heartbeat_ack', { timestamp: new Date() });
        } catch (error) {
          logger.error(`Error handling heartbeat:`, error);
        }
      });

      // Handle connection recovery
      socket.on('recover_connection', async (data: { 
        tableId: string; 
        viewId?: string;
        lastEventId?: string; 
        lastVersion?: number; 
      }) => {
        try {
          const { tableId, lastEventId, lastVersion } = data;
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (!userInfo) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }
          
          // Get missed events since last known event
          const missedEvents = await this.getMissedEvents(tableId, lastEventId, lastVersion);
          
          if (missedEvents.length > 0) {
            socket.emit('missed_events', missedEvents);
          }
          
          // Re-establish presence
          const color = await UserPresenceModel.assignUserColor(userInfo.userId, tableId);
          
          const presence: UserPresence = {
            userId: userInfo.userId,
            userName: userInfo.userName,
            avatarUrl: userInfo.avatarUrl,
            tableId,
            viewId: data.viewId || 'default',
            lastSeen: new Date(),
            color
          };
          
          await UserPresenceModel.updatePresence(presence);
          
          // Notify other users
          socket.to(`table:${tableId}`).emit('user_reconnected', presence);
          
          socket.emit('connection_recovered', { 
            timestamp: new Date(),
            missedEventsCount: missedEvents.length 
          });
        } catch (error) {
          logger.error(`Error recovering connection:`, error);
          socket.emit('error', { message: 'Failed to recover connection' });
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          const userInfo = this.socketUserMap.get(socket.id);
          
          if (userInfo) {
            // Remove presence from all subscribed tables
            const tables = this.socketTableMap.get(socket.id);
            
            if (tables) {
              for (const tableId of tables) {
                await UserPresenceModel.removePresence(userInfo.userId, tableId);
                
                // Broadcast user left to other users in the table
                this.io.to(`table:${tableId}`).emit('user_left', {
                  userId: userInfo.userId,
                  tableId
                });
              }
            }
            
            // Clean up maps
            this.socketUserMap.delete(socket.id);
            this.socketTableMap.delete(socket.id);
          }
          
          logger.info(`Socket disconnected: ${socket.id}`);
        } catch (error) {
          logger.error(`Error handling disconnect:`, error);
        }
      });
    });
  }
  
  /**
   * Apply a record change
   */
  private async applyRecordChange(change: ChangeEvent): Promise<void> {
    try {
      if (!change.entityId || change.entityType !== EntityType.RECORD) {
        return;
      }
      
      switch (change.type) {
        case ChangeType.CREATE:
          // Creation is handled by the RecordService
          break;
          
        case ChangeType.UPDATE:
          if (change.changes && change.changes.length > 0) {
            // Get current record
            const record = await RecordModel.findById(change.entityId);
            
            if (!record) {
              return;
            }
            
            // Apply field changes
            const updatedFields = { ...record.fields };
            
            for (const fieldChange of change.changes) {
              updatedFields[fieldChange.fieldId] = fieldChange.newValue;
            }
            
            // Update record
            await RecordModel.update(change.entityId, {
              fields: updatedFields,
              updated_by: change.userId
            });
          }
          break;
          
        case ChangeType.DELETE:
          await RecordModel.softDelete(change.entityId, change.userId);
          break;
          
        case ChangeType.RESTORE:
          await RecordModel.restore(change.entityId, change.userId);
          break;
          
        default:
          // Other change types are handled by their respective services
          break;
      }
    } catch (error) {
      logger.error(`Error applying record change:`, error);
      throw error;
    }
  }
  
  /**
   * Broadcast a change event to all clients subscribed to a table
   */
  public async broadcastChange(change: ChangeEvent): Promise<void> {
    try {
      if (!change.tableId) {
        return;
      }
      
      this.io.to(`table:${change.tableId}`).emit('record_change', change);
    } catch (error) {
      logger.error(`Error broadcasting change:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate delta between two record versions
   * This is used to minimize the data sent over the network
   */
  public calculateDelta(oldRecord: Record, newRecord: Record): FieldChange[] {
    const changes: FieldChange[] = [];
    
    // Compare fields
    const oldFields = oldRecord.fields || {};
    const newFields = newRecord.fields || {};
    
    // Find all field IDs from both records
    const fieldIds = new Set([
      ...Object.keys(oldFields),
      ...Object.keys(newFields)
    ]);
    
    for (const fieldId of fieldIds) {
      const oldValue = oldFields[fieldId];
      const newValue = newFields[fieldId];
      
      // Check if value changed
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          fieldId,
          oldValue,
          newValue
        });
      }
    }
    
    return changes;
  }
  
  /**
   * Resolve conflicts between concurrent edits
   * Uses a last-write-wins strategy with version numbers
   */
  public async resolveConflict(
    recordId: string, 
    changes: FieldChange[], 
    version: number
  ): Promise<{ resolved: boolean, winningChanges?: FieldChange[] }> {
    try {
      // Get current version
      const currentVersion = await ChangeEventModel.getEntityVersion(
        EntityType.RECORD, 
        recordId
      );
      
      // If incoming change is older, reject it
      if (version < currentVersion) {
        return { resolved: false };
      }
      
      // If same version, merge changes (last write wins for each field)
      if (version === currentVersion) {
        // Get most recent change for this record
        const recentChanges = await this.getRecentRecordChanges(recordId);
        
        if (recentChanges.length > 0) {
          const latestChange = recentChanges[0];
          
          if (latestChange.changes && latestChange.changes.length > 0) {
            // Create a map of field IDs to their latest changes
            const latestFieldChanges = new Map<string, FieldChange>();
            
            for (const change of latestChange.changes) {
              latestFieldChanges.set(change.fieldId, change);
            }
            
            // Filter out changes that would overwrite more recent changes
            const winningChanges = changes.filter(change => {
              const latestChange = latestFieldChanges.get(change.fieldId);
              
              // If no latest change for this field, this change wins
              if (!latestChange) {
                return true;
              }
              
              // If latest change has same old value as this change's old value,
              // this change wins (they were based on the same starting point)
              return JSON.stringify(latestChange.oldValue) === JSON.stringify(change.oldValue);
            });
            
            return { resolved: true, winningChanges };
          }
        }
      }
      
      // If newer version or no conflicts, accept all changes
      return { resolved: true, winningChanges: changes };
    } catch (error) {
      logger.error(`Error resolving conflict:`, error);
      throw error;
    }
  }
  
  /**
   * Get recent changes for a record
   */
  private async getRecentRecordChanges(recordId: string, limit: number = 5): Promise<ChangeEvent[]> {
    try {
      // We need to search through all change events to find ones for this record
      const keys = await redisClient.keys(`change_events:${EntityType.RECORD}:${recordId}:*`);
      
      if (!keys.length) {
        return [];
      }
      
      // Get event details
      const events: ChangeEvent[] = [];
      
      for (const key of keys.slice(0, limit)) {
        const eventData = await redisClient.get(key);
        if (eventData) {
          events.push(JSON.parse(eventData) as ChangeEvent);
        }
      }
      
      // Sort by version (descending)
      return events.sort((a, b) => b.version - a.version);
    } catch (error) {
      logger.error(`Error getting recent record changes:`, error);
      throw error;
    }
  }

  /**
   * Handle batch operations for better performance
   */
  public async processBatchChanges(changes: ChangeEvent[]): Promise<void> {
    try {
      // Group changes by table for efficient broadcasting
      const changesByTable = new Map<string, ChangeEvent[]>();
      
      for (const change of changes) {
        if (change.tableId) {
          if (!changesByTable.has(change.tableId)) {
            changesByTable.set(change.tableId, []);
          }
          changesByTable.get(change.tableId)!.push(change);
        }
      }
      
      // Broadcast changes to each table
      for (const [tableId, tableChanges] of changesByTable) {
        this.io.to(`table:${tableId}`).emit('batch_changes', tableChanges);
      }
    } catch (error) {
      logger.error(`Error processing batch changes:`, error);
      throw error;
    }
  }

  /**
   * Clean up stale presence data
   */
  public async cleanupStalePresence(): Promise<void> {
    try {
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
      
      // Get all table keys
      const tableKeys = await redisClient.keys('table_users:*');
      
      for (const tableKey of tableKeys) {
        const tableId = tableKey.replace('table_users:', '');
        const userIds = await redisClient.sMembers(tableKey);
        
        for (const userId of userIds) {
          const presence = await UserPresenceModel.getPresence(userId, tableId);
          
          if (presence && presence.lastSeen < staleThreshold) {
            await UserPresenceModel.removePresence(userId, tableId);
            
            // Broadcast user left
            this.io.to(`table:${tableId}`).emit('user_left', {
              userId,
              tableId
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Error cleaning up stale presence:`, error);
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    totalConnections: number;
    authenticatedUsers: number;
    tableSubscriptions: number;
  } {
    return {
      totalConnections: this.io.sockets.sockets.size,
      authenticatedUsers: this.socketUserMap.size,
      tableSubscriptions: Array.from(this.socketTableMap.values())
        .reduce((total, tables) => total + tables.size, 0)
    };
  }

  /**
   * Get missed events for connection recovery
   */
  private async getMissedEvents(
    tableId: string, 
    lastEventId?: string, 
    lastVersion?: number
  ): Promise<ChangeEvent[]> {
    try {
      // Get recent events for the table
      const recentEvents = await ChangeEventModel.getRecentTableEvents(tableId, 100);
      
      if (!lastEventId && !lastVersion) {
        return recentEvents;
      }
      
      // Filter events that occurred after the last known event
      const missedEvents: ChangeEvent[] = [];
      
      for (const event of recentEvents) {
        if (lastEventId && event.id === lastEventId) {
          break; // Found the last known event, stop here
        }
        
        if (lastVersion && event.version <= lastVersion) {
          continue; // Skip events that are older or equal to last known version
        }
        
        missedEvents.push(event);
      }
      
      return missedEvents.reverse(); // Return in chronological order
    } catch (error) {
      logger.error(`Error getting missed events:`, error);
      return [];
    }
  }
}