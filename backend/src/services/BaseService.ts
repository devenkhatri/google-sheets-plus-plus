import { BaseRepository } from '../repositories/BaseRepository';
import { TableRepository } from '../repositories/TableRepository';
import { GoogleSheetsService } from './GoogleSheetsService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class BaseService {
  private baseRepository: BaseRepository;
  private tableRepository: TableRepository;
  private sheetsService: GoogleSheetsService;

  constructor() {
    this.baseRepository = new BaseRepository();
    this.tableRepository = new TableRepository();
    this.sheetsService = GoogleSheetsService.getInstance();
  }

  /**
   * Create a new base
   */
  async createBase(userId: string, name: string, description?: string): Promise<any> {
    try {
      logger.info(`Creating base "${name}" for user ${userId}`);
      
      // Create a new Google Sheets spreadsheet
      const spreadsheetId = await this.sheetsService.createSpreadsheet(name);
      
      // Create base in database
      const base = await this.baseRepository.create({
        name,
        description,
        google_sheets_id: spreadsheetId,
        owner_id: userId,
      });
      
      logger.info(`Base created with ID ${base.id} and spreadsheet ID ${spreadsheetId}`);
      
      return base;
    } catch (error) {
      logger.error('Error creating base:', error);
      throw new AppError('Failed to create base', 500);
    }
  }

  /**
   * Get base by ID
   */
  async getBase(baseId: string, userId: string): Promise<any> {
    // Check if user has access to base
    const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(baseId, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this base', 403);
    }
    
    // Get base with tables and views
    const base = await this.baseRepository.getBaseWithTablesAndViews(baseId);
    
    if (!base) {
      throw new AppError('Base not found', 404);
    }
    
    // Add permission level to response
    return {
      ...base,
      permission_level: permissionLevel,
    };
  }

  /**
   * Get bases for user
   */
  async getBases(userId: string): Promise<any[]> {
    // Get bases accessible by user
    const bases = await this.baseRepository.findAccessibleByUser(userId);
    
    // Get permission level for each base
    const basesWithPermissions = await Promise.all(
      bases.map(async (base) => {
        const { permissionLevel } = await this.baseRepository.checkUserAccess(base.id, userId);
        
        return {
          ...base,
          permission_level: permissionLevel,
        };
      })
    );
    
    return basesWithPermissions;
  }

  /**
   * Update base
   */
  async updateBase(baseId: string, userId: string, data: { name?: string; description?: string }): Promise<any> {
    // Check if user has access to base
    const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(baseId, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this base', 403);
    }
    
    // Only owner or editor can update base
    if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
      throw new AppError('You do not have permission to update this base', 403);
    }
    
    // Update base
    const base = await this.baseRepository.update(baseId, data);
    
    if (!base) {
      throw new AppError('Base not found', 404);
    }
    
    // If name is updated, also update Google Sheets spreadsheet name
    if (data.name) {
      try {
        await this.sheetsService.batchUpdate(base.google_sheets_id, [
          {
            updateSpreadsheetProperties: {
              properties: {
                title: data.name,
              },
              fields: 'title',
            },
          },
        ]);
      } catch (error) {
        logger.error(`Error updating spreadsheet name for base ${baseId}:`, error);
        // Continue even if Google Sheets update fails
      }
    }
    
    return {
      ...base,
      permission_level: permissionLevel,
    };
  }

  /**
   * Delete base
   */
  async deleteBase(baseId: string, userId: string): Promise<void> {
    // Check if user has access to base
    const { hasAccess, permissionLevel } = await this.baseRepository.checkUserAccess(baseId, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this base', 403);
    }
    
    // Only owner can delete base
    if (permissionLevel !== 'owner') {
      throw new AppError('You do not have permission to delete this base', 403);
    }
    
    // Get base
    const base = await this.baseRepository.findById(baseId);
    
    if (!base) {
      throw new AppError('Base not found', 404);
    }
    
    // Delete base
    await this.baseRepository.delete(baseId);
    
    // We don't delete the Google Sheets spreadsheet to prevent data loss
    // Instead, we could implement a soft delete mechanism or archive functionality
  }

  /**
   * Share base with user
   */
  async shareBase(baseId: string, userId: string, email: string, permissionLevel: string): Promise<any> {
    // Check if user has access to base
    const { hasAccess, permissionLevel: userPermissionLevel } = await this.baseRepository.checkUserAccess(baseId, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this base', 403);
    }
    
    // Only owner can share base
    if (userPermissionLevel !== 'owner') {
      throw new AppError('You do not have permission to share this base', 403);
    }
    
    // Validate permission level
    if (!['viewer', 'commenter', 'editor'].includes(permissionLevel)) {
      throw new AppError('Invalid permission level', 400);
    }
    
    // Find user by email
    const { UserModel } = await import('../models/User');
    const targetUser = await UserModel.findByEmail(email);
    
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }
    
    // Check if user is already a collaborator
    const collaborators = await this.baseRepository.getCollaborators(baseId);
    const existingCollaborator = collaborators.find((c) => c.user_id === targetUser.id);
    
    if (existingCollaborator) {
      // Update permission level
      return this.baseRepository.updateCollaboratorPermission(baseId, targetUser.id, permissionLevel);
    } else {
      // Add new collaborator
      return this.baseRepository.addCollaborator(baseId, targetUser.id, permissionLevel);
    }
  }

  /**
   * Get base collaborators
   */
  async getCollaborators(baseId: string, userId: string): Promise<any[]> {
    // Check if user has access to base
    const { hasAccess } = await this.baseRepository.checkUserAccess(baseId, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this base', 403);
    }
    
    // Get collaborators
    return this.baseRepository.getCollaborators(baseId);
  }

  /**
   * Update collaborator permission
   */
  async updateCollaboratorPermission(baseId: string, userId: string, collaboratorId: string, permissionLevel: string): Promise<any> {
    // Check if user has access to base
    const { hasAccess, permissionLevel: userPermissionLevel } = await this.baseRepository.checkUserAccess(baseId, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this base', 403);
    }
    
    // Only owner can update permissions
    if (userPermissionLevel !== 'owner') {
      throw new AppError('You do not have permission to update collaborator permissions', 403);
    }
    
    // Validate permission level
    if (!['viewer', 'commenter', 'editor'].includes(permissionLevel)) {
      throw new AppError('Invalid permission level', 400);
    }
    
    // Update permission
    return this.baseRepository.updateCollaboratorPermission(baseId, collaboratorId, permissionLevel);
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(baseId: string, userId: string, collaboratorId: string): Promise<boolean> {
    // Check if user has access to base
    const { hasAccess, permissionLevel: userPermissionLevel } = await this.baseRepository.checkUserAccess(baseId, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this base', 403);
    }
    
    // Only owner can remove collaborators
    if (userPermissionLevel !== 'owner') {
      throw new AppError('You do not have permission to remove collaborators', 403);
    }
    
    // Remove collaborator
    return this.baseRepository.removeCollaborator(baseId, collaboratorId);
  }
}