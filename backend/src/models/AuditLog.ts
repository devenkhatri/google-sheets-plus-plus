import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  before?: any;
  after?: any;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface CreateAuditLogDTO {
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  before?: any;
  after?: any;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
}

export class AuditLogModel {
  private static readonly tableName = 'audit_logs';

  /**
   * Create a new audit log entry
   */
  static async create(logData: CreateAuditLogDTO): Promise<AuditLog> {
    const log: Partial<AuditLog> = {
      ...logData,
      id: uuidv4(),
      created_at: new Date(),
    };
    
    const [createdLog] = await db(this.tableName).insert(log).returning('*');
    return createdLog;
  }

  /**
   * Find audit logs by entity
   */
  static async findByEntity(entityType: string, entityId: string, limit: number = 50): Promise<AuditLog[]> {
    const logs = await db(this.tableName)
      .select('audit_logs.*', 'users.name as user_name')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    return logs;
  }

  /**
   * Find audit logs by user
   */
  static async findByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
    const logs = await db(this.tableName)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    return logs;
  }

  /**
   * Find audit logs by action
   */
  static async findByAction(action: string, limit: number = 50): Promise<AuditLog[]> {
    const logs = await db(this.tableName)
      .select('audit_logs.*', 'users.name as user_name')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .where({ action })
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    return logs;
  }

  /**
   * Search audit logs
   */
  static async search(
    filters: {
      user_id?: string;
      action?: string;
      entity_type?: string;
      entity_id?: string;
      start_date?: Date;
      end_date?: Date;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; total: number }> {
    // Build query
    let query = db(this.tableName)
      .select('audit_logs.*', 'users.name as user_name')
      .leftJoin('users', 'audit_logs.user_id', 'users.id');
    
    // Apply filters
    if (filters.user_id) {
      query = query.where('audit_logs.user_id', filters.user_id);
    }
    
    if (filters.action) {
      query = query.where('audit_logs.action', filters.action);
    }
    
    if (filters.entity_type) {
      query = query.where('audit_logs.entity_type', filters.entity_type);
    }
    
    if (filters.entity_id) {
      query = query.where('audit_logs.entity_id', filters.entity_id);
    }
    
    if (filters.start_date) {
      query = query.where('audit_logs.created_at', '>=', filters.start_date);
    }
    
    if (filters.end_date) {
      query = query.where('audit_logs.created_at', '<=', filters.end_date);
    }
    
    // Get total count
    const countQuery = query.clone().count('* as total').first();
    
    // Get paginated results
    const logsQuery = query.orderBy('audit_logs.created_at', 'desc').limit(limit).offset(offset);
    
    // Execute both queries
    const [countResult, logs] = await Promise.all([countQuery, logsQuery]);
    
    return {
      logs,
      total: parseInt(countResult?.total.toString() || '0', 10),
    };
  }
}