import { AuditLogModel, AuditLog } from '../models/AuditLog';
import { ChangeEventModel, ChangeEvent, EntityType } from '../models/ChangeEvent';
import { BaseModel } from '../models/Base';
import { TableModel } from '../models/Table';
import { RecordModel } from '../models/Record';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Service for handling activity feeds
 */
export class ActivityFeedService {
  private static instance: ActivityFeedService;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ActivityFeedService {
    if (!ActivityFeedService.instance) {
      ActivityFeedService.instance = new ActivityFeedService();
    }
    
    return ActivityFeedService.instance;
  }
  
  /**
   * Get activity feed for a base
   */
  public async getBaseActivityFeed(
    baseId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ activities: any[]; total: number }> {
    try {
      // Get audit logs for the base
      const { logs, total } = await AuditLogModel.search(
        { entity_type: 'base', entity_id: baseId },
        limit,
        offset
      );
      
      // Enrich logs with additional information
      const enrichedLogs = await this.enrichAuditLogs(logs);
      
      return { activities: enrichedLogs, total };
    } catch (error) {
      logger.error('Error getting base activity feed:', error);
      throw error;
    }
  }
  
  /**
   * Get activity feed for a table
   */
  public async getTableActivityFeed(
    tableId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ activities: any[]; total: number }> {
    try {
      // Get audit logs for the table
      const { logs, total } = await AuditLogModel.search(
        { entity_type: 'table', entity_id: tableId },
        limit,
        offset
      );
      
      // Enrich logs with additional information
      const enrichedLogs = await this.enrichAuditLogs(logs);
      
      return { activities: enrichedLogs, total };
    } catch (error) {
      logger.error('Error getting table activity feed:', error);
      throw error;
    }
  }
  
  /**
   * Get activity feed for a record
   */
  public async getRecordActivityFeed(
    recordId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ activities: any[]; total: number }> {
    try {
      // Get audit logs for the record
      const { logs, total } = await AuditLogModel.search(
        { entity_type: 'record', entity_id: recordId },
        limit,
        offset
      );
      
      // Get recent change events for the record
      const recentChanges = await this.getRecentRecordChanges(recordId);
      
      // Combine and sort logs and changes
      const combinedActivities = [...logs, ...this.convertChangesToActivities(recentChanges)];
      
      // Sort by created_at/timestamp (descending)
      combinedActivities.sort((a, b) => {
        const dateA = a.created_at || a.timestamp;
        const dateB = b.created_at || b.timestamp;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      
      // Apply pagination
      const paginatedActivities = combinedActivities.slice(offset, offset + limit);
      
      // Enrich activities with additional information
      const enrichedActivities = await this.enrichActivities(paginatedActivities);
      
      return { 
        activities: enrichedActivities, 
        total: combinedActivities.length 
      };
    } catch (error) {
      logger.error('Error getting record activity feed:', error);
      throw error;
    }
  }
  
  /**
   * Get activity feed for a user
   */
  public async getUserActivityFeed(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ activities: any[]; total: number }> {
    try {
      // Get audit logs for the user
      const { logs, total } = await AuditLogModel.search(
        { user_id: userId },
        limit,
        offset
      );
      
      // Enrich logs with additional information
      const enrichedLogs = await this.enrichAuditLogs(logs);
      
      return { activities: enrichedLogs, total };
    } catch (error) {
      logger.error('Error getting user activity feed:', error);
      throw error;
    }
  }
  
  /**
   * Get recent changes for a record
   */
  private async getRecentRecordChanges(recordId: string): Promise<ChangeEvent[]> {
    try {
      // We need to search through all change events to find ones for this record
      const keys = await ChangeEventModel.getRecentTableEvents(recordId, 50);
      
      // Filter for this specific record
      return keys.filter(event => event.entityId === recordId);
    } catch (error) {
      logger.error('Error getting recent record changes:', error);
      return [];
    }
  }
  
  /**
   * Convert change events to activity format
   */
  private convertChangesToActivities(changes: ChangeEvent[]): any[] {
    return changes.map(change => ({
      ...change,
      action: change.type,
      entity_type: change.entityType,
      entity_id: change.entityId,
      user_id: change.userId,
      before: change.changes?.map(c => ({ [c.fieldId]: c.oldValue })).reduce((acc, val) => ({ ...acc, ...val }), {}),
      after: change.changes?.map(c => ({ [c.fieldId]: c.newValue })).reduce((acc, val) => ({ ...acc, ...val }), {}),
      created_at: change.timestamp
    }));
  }
  
  /**
   * Enrich audit logs with additional information
   */
  private async enrichAuditLogs(logs: AuditLog[]): Promise<any[]> {
    const enriched = [];
    
    for (const log of logs) {
      const enrichedLog = { ...log };
      
      // Add user information if available
      if (log.user_id) {
        try {
          const user = await UserModel.findById(log.user_id);
          if (user) {
            enrichedLog.user = {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar_url: user.avatar_url
            };
          }
        } catch (error) {
          logger.error('Error enriching log with user data:', error);
        }
      }
      
      // Add entity information based on entity_type
      if (log.entity_id && log.entity_type) {
        try {
          switch (log.entity_type) {
            case 'base':
              const base = await BaseModel.findById(log.entity_id);
              if (base) {
                enrichedLog.entity = {
                  id: base.id,
                  name: base.name,
                  description: base.description
                };
              }
              break;
              
            case 'table':
              const table = await TableModel.findById(log.entity_id);
              if (table) {
                enrichedLog.entity = {
                  id: table.id,
                  name: table.name,
                  base_id: table.base_id
                };
              }
              break;
              
            case 'record':
              const record = await RecordModel.findById(log.entity_id);
              if (record) {
                enrichedLog.entity = {
                  id: record.id,
                  table_id: record.table_id,
                  base_id: record.base_id
                };
              }
              break;
          }
        } catch (error) {
          logger.error('Error enriching log with entity data:', error);
        }
      }
      
      enriched.push(enrichedLog);
    }
    
    return enriched;
  }
  
  /**
   * Enrich activities with additional information
   */
  private async enrichActivities(activities: any[]): Promise<any[]> {
    const enriched = [];
    
    for (const activity of activities) {
      // If it's an audit log (has created_at)
      if (activity.created_at && !activity.timestamp) {
        enriched.push(await this.enrichAuditLogs([activity]).then(logs => logs[0]));
      } 
      // If it's a change event (has timestamp)
      else if (activity.timestamp) {
        const enrichedActivity = { ...activity };
        
        // Add user information if available
        if (activity.userId) {
          try {
            const user = await UserModel.findById(activity.userId);
            if (user) {
              enrichedActivity.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url
              };
            }
          } catch (error) {
            logger.error('Error enriching activity with user data:', error);
          }
        }
        
        enriched.push(enrichedActivity);
      }
    }
    
    return enriched;
  }
}