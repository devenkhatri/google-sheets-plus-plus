import { Request } from 'express';
import { AuditLogModel, CreateAuditLogDTO } from '../models/AuditLog';
import { logger } from '../utils/logger';
import { SecurityService } from './SecurityService';

/**
 * Service for handling audit logging
 */
export class AuditService {
  private static instance: AuditService;
  private securityService: SecurityService;
  
  private constructor() {
    this.securityService = SecurityService.getInstance();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }
  
  /**
   * Log an audit event
   * @param logData Audit log data
   * @returns Created audit log
   */
  public async log(logData: CreateAuditLogDTO): Promise<any> {
    try {
      // Mask sensitive data if present
      if (logData.before) {
        logData.before = this.maskSensitiveData(logData.before);
      }
      
      if (logData.after) {
        logData.after = this.maskSensitiveData(logData.after);
      }
      
      if (logData.metadata) {
        logData.metadata = this.maskSensitiveData(logData.metadata);
      }
      
      return await AuditLogModel.create(logData);
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      // Don't throw error to prevent disrupting main flow
      return null;
    }
  }
  
  /**
   * Log an authentication event
   * @param req Express request
   * @param success Whether authentication was successful
   * @param userId User ID (if successful)
   * @param method Authentication method
   * @returns Created audit log
   */
  public async logAuthentication(
    req: Request,
    success: boolean,
    userId?: string,
    method: 'password' | 'google' | 'api_key' = 'password'
  ): Promise<any> {
    const action = success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE';
    
    return this.log({
      user_id: userId,
      action,
      entity_type: 'USER',
      entity_id: userId,
      metadata: {
        method,
        success,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }
  
  /**
   * Log a data access event
   * @param req Express request
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param action Action performed
   * @returns Created audit log
   */
  public async logDataAccess(
    req: Request,
    entityType: string,
    entityId: string,
    action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'
  ): Promise<any> {
    return this.log({
      user_id: req.user?.id,
      action: `DATA_${action}`,
      entity_type: entityType,
      entity_id: entityId,
      metadata: {
        path: req.path,
        method: req.method,
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }
  
  /**
   * Log a permission change event
   * @param req Express request
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param targetUserId Target user ID
   * @param oldPermission Old permission
   * @param newPermission New permission
   * @returns Created audit log
   */
  public async logPermissionChange(
    req: Request,
    entityType: string,
    entityId: string,
    targetUserId: string,
    oldPermission: string,
    newPermission: string
  ): Promise<any> {
    return this.log({
      user_id: req.user?.id,
      action: 'PERMISSION_CHANGE',
      entity_type: entityType,
      entity_id: entityId,
      before: { permission: oldPermission },
      after: { permission: newPermission },
      metadata: {
        targetUserId,
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }
  
  /**
   * Log a security event
   * @param req Express request
   * @param action Security action
   * @param details Event details
   * @returns Created audit log
   */
  public async logSecurityEvent(
    req: Request,
    action: string,
    details: any
  ): Promise<any> {
    return this.log({
      user_id: req.user?.id,
      action,
      entity_type: 'SECURITY',
      metadata: details,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }
  
  /**
   * Log a data change event
   * @param req Express request
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param before Entity state before change
   * @param after Entity state after change
   * @returns Created audit log
   */
  public async logDataChange(
    req: Request,
    entityType: string,
    entityId: string,
    before: any,
    after: any
  ): Promise<any> {
    return this.log({
      user_id: req.user?.id,
      action: 'DATA_CHANGE',
      entity_type: entityType,
      entity_id: entityId,
      before,
      after,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
  }
  
  /**
   * Mask sensitive data in objects
   * @param data Data to mask
   * @returns Masked data
   */
  private maskSensitiveData(data: any): any {
    if (!data) return data;
    
    const sensitiveFields = [
      'password',
      'token',
      'api_key',
      'secret',
      'credit_card',
      'ssn',
      'social_security',
      'access_token',
      'refresh_token',
    ];
    
    return this.securityService.maskSensitiveData(data, sensitiveFields);
  }
}