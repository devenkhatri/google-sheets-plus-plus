import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
  BULK_CREATE = 'bulk_create',
  BULK_UPDATE = 'bulk_update',
  BULK_DELETE = 'bulk_delete',
}

export enum EntityType {
  RECORD = 'record',
  FIELD = 'field',
  TABLE = 'table',
  VIEW = 'view',
  BASE = 'base',
}

export interface FieldChange {
  fieldId: string;
  oldValue?: any;
  newValue?: any;
}

export interface ChangeEvent {
  id: string;
  type: ChangeType;
  entityType: EntityType;
  entityId: string;
  tableId?: string;
  baseId?: string;
  userId: string;
  timestamp: Date;
  changes?: FieldChange[];
  metadata?: Record<string, any>;
  version: number;
}

// Redis key prefixes
const CHANGE_EVENTS_PREFIX = 'change_events:';
const ENTITY_VERSION_PREFIX = 'entity_version:';
const OFFLINE_CHANGES_PREFIX = 'offline_changes:';

// Time-to-live for change events (in seconds)
const CHANGE_EVENTS_TTL = 86400; // 24 hours

export class ChangeEventModel {
  /**
   * Create a new change event
   */
  static async create(event: Omit<ChangeEvent, 'id' | 'timestamp' | 'version'>): Promise<ChangeEvent> {
    try {
      // Get current entity version
      const version = await this.incrementEntityVersion(
        event.entityType, 
        event.entityId
      );
      
      const changeEvent: ChangeEvent = {
        ...event,
        id: uuidv4(),
        timestamp: new Date(),
        version
      };
      
      // Store change event in Redis
      const key = `${CHANGE_EVENTS_PREFIX}${event.entityType}:${event.entityId}:${changeEvent.id}`;
      await redisClient.set(key, JSON.stringify(changeEvent), {
        EX: CHANGE_EVENTS_TTL
      });
      
      // Add to sorted set for time-based retrieval
      const tableKey = event.tableId 
        ? `${CHANGE_EVENTS_PREFIX}table:${event.tableId}` 
        : null;
        
      const baseKey = event.baseId
        ? `${CHANGE_EVENTS_PREFIX}base:${event.baseId}`
        : null;
      
      const score = changeEvent.timestamp.getTime();
      
      if (tableKey) {
        await redisClient.zAdd(tableKey, { score, value: changeEvent.id });
        await redisClient.expire(tableKey, CHANGE_EVENTS_TTL);
      }
      
      if (baseKey) {
        await redisClient.zAdd(baseKey, { score, value: changeEvent.id });
        await redisClient.expire(baseKey, CHANGE_EVENTS_TTL);
      }
      
      return changeEvent;
    } catch (error) {
      logger.error('Error creating change event:', error);
      throw error;
    }
  }

  /**
   * Get recent change events for a table
   */
  static async getRecentTableEvents(tableId: string, limit: number = 100): Promise<ChangeEvent[]> {
    try {
      const tableKey = `${CHANGE_EVENTS_PREFIX}table:${tableId}`;
      
      // Get recent event IDs from sorted set
      const eventIds = await redisClient.zRange(tableKey, 0, limit - 1, { REV: true });
      
      if (!eventIds.length) {
        return [];
      }
      
      // Get event details
      const events: ChangeEvent[] = [];
      
      for (const eventId of eventIds) {
        // We need to find the key pattern for this event ID
        const keys = await redisClient.keys(`${CHANGE_EVENTS_PREFIX}*:*:${eventId}`);
        
        if (keys.length > 0) {
          const eventData = await redisClient.get(keys[0]);
          if (eventData) {
            events.push(JSON.parse(eventData) as ChangeEvent);
          }
        }
      }
      
      return events;
    } catch (error) {
      logger.error('Error getting recent table events:', error);
      throw error;
    }
  }

  /**
   * Get entity version
   */
  static async getEntityVersion(entityType: EntityType, entityId: string): Promise<number> {
    try {
      const key = `${ENTITY_VERSION_PREFIX}${entityType}:${entityId}`;
      const version = await redisClient.get(key);
      
      return version ? parseInt(version, 10) : 0;
    } catch (error) {
      logger.error('Error getting entity version:', error);
      return 0;
    }
  }

  /**
   * Increment entity version
   */
  static async incrementEntityVersion(entityType: EntityType, entityId: string): Promise<number> {
    try {
      const key = `${ENTITY_VERSION_PREFIX}${entityType}:${entityId}`;
      const version = await redisClient.incr(key);
      
      return version;
    } catch (error) {
      logger.error('Error incrementing entity version:', error);
      throw error;
    }
  }

  /**
   * Store offline changes for a user
   */
  static async storeOfflineChange(userId: string, change: ChangeEvent): Promise<void> {
    try {
      const key = `${OFFLINE_CHANGES_PREFIX}${userId}`;
      
      // Get existing changes
      const existingChangesStr = await redisClient.get(key);
      const existingChanges = existingChangesStr 
        ? JSON.parse(existingChangesStr) as ChangeEvent[] 
        : [];
      
      // Add new change
      existingChanges.push(change);
      
      // Store updated changes
      await redisClient.set(key, JSON.stringify(existingChanges), {
        EX: 604800 // 7 days
      });
    } catch (error) {
      logger.error('Error storing offline change:', error);
      throw error;
    }
  }

  /**
   * Get offline changes for a user
   */
  static async getOfflineChanges(userId: string): Promise<ChangeEvent[]> {
    try {
      const key = `${OFFLINE_CHANGES_PREFIX}${userId}`;
      const changesStr = await redisClient.get(key);
      
      if (!changesStr) {
        return [];
      }
      
      return JSON.parse(changesStr) as ChangeEvent[];
    } catch (error) {
      logger.error('Error getting offline changes:', error);
      throw error;
    }
  }

  /**
   * Clear offline changes for a user
   */
  static async clearOfflineChanges(userId: string): Promise<void> {
    try {
      const key = `${OFFLINE_CHANGES_PREFIX}${userId}`;
      await redisClient.del(key);
    } catch (error) {
      logger.error('Error clearing offline changes:', error);
      throw error;
    }
  }
}