import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export interface CursorPosition {
  recordId: string;
  fieldId: string;
  x?: number;
  y?: number;
}

export interface Selection {
  startRecordId: string;
  endRecordId: string;
  startFieldId: string;
  endFieldId: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  tableId: string;
  viewId: string;
  cursor?: CursorPosition;
  selection?: Selection;
  lastSeen: Date;
  color?: string; // Assigned color for the user in the current session
}

// Redis key prefixes
const USER_PRESENCE_PREFIX = 'user_presence:';
const TABLE_USERS_PREFIX = 'table_users:';

// Time-to-live for presence data (in seconds)
const PRESENCE_TTL = 60; // 1 minute

export class UserPresenceModel {
  /**
   * Update user presence information
   */
  static async updatePresence(presence: UserPresence): Promise<void> {
    try {
      const userKey = `${USER_PRESENCE_PREFIX}${presence.userId}:${presence.tableId}`;
      const tableKey = `${TABLE_USERS_PREFIX}${presence.tableId}`;
      
      // Update user presence
      await redisClient.set(userKey, JSON.stringify(presence), {
        EX: PRESENCE_TTL
      });
      
      // Add user to table's active users set
      await redisClient.sAdd(tableKey, presence.userId);
      await redisClient.expire(tableKey, PRESENCE_TTL);
    } catch (error) {
      logger.error('Error updating user presence:', error);
      throw error;
    }
  }

  /**
   * Get user presence information
   */
  static async getPresence(userId: string, tableId: string): Promise<UserPresence | null> {
    try {
      const userKey = `${USER_PRESENCE_PREFIX}${userId}:${tableId}`;
      const presenceData = await redisClient.get(userKey);
      
      if (!presenceData) {
        return null;
      }
      
      return JSON.parse(presenceData) as UserPresence;
    } catch (error) {
      logger.error('Error getting user presence:', error);
      throw error;
    }
  }

  /**
   * Get all active users in a table
   */
  static async getTableUsers(tableId: string): Promise<UserPresence[]> {
    try {
      const tableKey = `${TABLE_USERS_PREFIX}${tableId}`;
      const userIds = await redisClient.sMembers(tableKey);
      
      if (!userIds.length) {
        return [];
      }
      
      const presences: UserPresence[] = [];
      
      for (const userId of userIds) {
        const presence = await this.getPresence(userId, tableId);
        if (presence) {
          presences.push(presence);
        }
      }
      
      return presences;
    } catch (error) {
      logger.error('Error getting table users:', error);
      throw error;
    }
  }

  /**
   * Remove user presence
   */
  static async removePresence(userId: string, tableId: string): Promise<void> {
    try {
      const userKey = `${USER_PRESENCE_PREFIX}${userId}:${tableId}`;
      const tableKey = `${TABLE_USERS_PREFIX}${tableId}`;
      
      // Remove user presence
      await redisClient.del(userKey);
      
      // Remove user from table's active users set
      await redisClient.sRem(tableKey, userId);
    } catch (error) {
      logger.error('Error removing user presence:', error);
      throw error;
    }
  }

  /**
   * Assign a color to a user
   * This ensures each user in a table has a distinct color
   */
  static async assignUserColor(userId: string, tableId: string): Promise<string> {
    // Predefined colors for user highlighting
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A8', 
      '#33A8FF', '#A833FF', '#FFD133', '#33FFD1'
    ];
    
    try {
      const tableKey = `${TABLE_USERS_PREFIX}${tableId}`;
      const userIds = await redisClient.sMembers(tableKey);
      
      // Get existing colors
      const existingColors: string[] = [];
      for (const id of userIds) {
        if (id === userId) continue;
        
        const presence = await this.getPresence(id, tableId);
        if (presence?.color) {
          existingColors.push(presence.color);
        }
      }
      
      // Find an available color
      const availableColors = colors.filter(color => !existingColors.includes(color));
      
      // If all colors are taken, use a random one
      const selectedColor = availableColors.length > 0 
        ? availableColors[0] 
        : colors[Math.floor(Math.random() * colors.length)];
      
      return selectedColor;
    } catch (error) {
      logger.error('Error assigning user color:', error);
      // Return a default color in case of error
      return '#33A8FF';
    }
  }
}