import { db } from '../config/database';
import { logger } from '../utils/logger';
import { AuditLogModel } from '../models/AuditLog';
import { SecurityService } from './SecurityService';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

/**
 * Service for handling GDPR compliance operations
 */
export class GdprService {
  private securityService: SecurityService;
  
  constructor() {
    this.securityService = SecurityService.getInstance();
  }
  
  /**
   * Export all user data for GDPR compliance
   * @param userId User ID
   * @returns Path to exported data file
   */
  public async exportUserData(userId: string): Promise<string> {
    try {
      // Create export directory if it doesn't exist
      const exportDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      // Create unique export filename
      const exportId = uuidv4();
      const exportPath = path.join(exportDir, `user_data_${exportId}.zip`);
      
      // Create zip archive
      const output = fs.createWriteStream(exportPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      // Pipe archive to output file
      archive.pipe(output);
      
      // Collect user data
      const userData = await this.collectUserData(userId);
      
      // Add user data to archive
      archive.append(JSON.stringify(userData, null, 2), { name: 'user_data.json' });
      
      // Finalize archive
      await archive.finalize();
      
      // Log export
      await AuditLogModel.create({
        user_id: userId,
        action: 'GDPR_EXPORT',
        entity_type: 'USER',
        entity_id: userId,
        metadata: { exportId }
      });
      
      return exportPath;
    } catch (error) {
      logger.error('Failed to export user data:', error);
      throw new Error('Failed to export user data');
    }
  }
  
  /**
   * Delete user data for GDPR compliance
   * @param userId User ID
   * @returns Success status
   */
  public async deleteUserData(userId: string): Promise<boolean> {
    const trx = await db.transaction();
    
    try {
      // Collect user data for audit log
      const userData = await this.collectUserData(userId);
      
      // Anonymize user record
      await trx('users')
        .where({ id: userId })
        .update({
          email: `deleted_${uuidv4()}@example.com`,
          name: 'Deleted User',
          profile_picture: null,
          google_id: null,
          deleted_at: new Date(),
          is_deleted: true
        });
      
      // Delete or anonymize user's bases
      const bases = await trx('bases').where({ owner_id: userId }).select('id');
      for (const base of bases) {
        // Option 1: Delete bases
        // await this.deleteBase(base.id, trx);
        
        // Option 2: Transfer ownership to admin
        await trx('bases')
          .where({ id: base.id })
          .update({
            owner_id: process.env.ADMIN_USER_ID,
            name: `Anonymized Base ${base.id}`
          });
      }
      
      // Delete user's API keys
      await trx('api_keys').where({ user_id: userId }).delete();
      
      // Delete user's notifications
      await trx('notifications').where({ user_id: userId }).delete();
      
      // Delete user's saved searches
      await trx('saved_searches').where({ user_id: userId }).delete();
      
      // Delete user's search notifications
      await trx('search_notifications').where({ user_id: userId }).delete();
      
      // Delete user's comments
      await trx('comments')
        .where({ user_id: userId })
        .update({
          content: 'This comment has been deleted',
          user_id: null
        });
      
      // Log deletion
      await AuditLogModel.create({
        action: 'GDPR_DELETE',
        entity_type: 'USER',
        entity_id: userId,
        before: userData,
        metadata: { deletedAt: new Date() }
      });
      
      // Commit transaction
      await trx.commit();
      
      return true;
    } catch (error) {
      // Rollback transaction
      await trx.rollback();
      
      logger.error('Failed to delete user data:', error);
      throw new Error('Failed to delete user data');
    }
  }
  
  /**
   * Collect all data related to a user
   * @param userId User ID
   * @returns User data object
   */
  private async collectUserData(userId: string): Promise<any> {
    // Get user profile
    const user = await db('users').where({ id: userId }).first();
    
    // Get user's bases
    const bases = await db('bases').where({ owner_id: userId });
    
    // Get user's collaborations
    const collaborations = await db('collaborators').where({ user_id: userId });
    
    // Get user's comments
    const comments = await db('comments').where({ user_id: userId });
    
    // Get user's API keys (masked)
    const apiKeys = await db('api_keys').where({ user_id: userId }).select('id', 'name', 'created_at', 'last_used_at');
    
    // Get user's notifications
    const notifications = await db('notifications').where({ user_id: userId });
    
    // Get user's audit logs
    const auditLogs = await db('audit_logs').where({ user_id: userId });
    
    return {
      profile: user,
      bases,
      collaborations,
      comments,
      apiKeys,
      notifications,
      auditLogs
    };
  }
  
  /**
   * Delete a base and all related data
   * @param baseId Base ID
   * @param trx Transaction object
   */
  private async deleteBase(baseId: string, trx: any): Promise<void> {
    // Get tables in base
    const tables = await trx('tables').where({ base_id: baseId }).select('id');
    
    // Delete records in each table
    for (const table of tables) {
      await trx('records').where({ table_id: table.id }).delete();
      
      // Delete fields
      await trx('fields').where({ table_id: table.id }).delete();
      
      // Delete views
      await trx('views').where({ table_id: table.id }).delete();
    }
    
    // Delete tables
    await trx('tables').where({ base_id: baseId }).delete();
    
    // Delete collaborators
    await trx('collaborators').where({ base_id: baseId }).delete();
    
    // Delete base
    await trx('bases').where({ id: baseId }).delete();
  }
}