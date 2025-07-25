import { BaseModel, Base, CreateBaseDTO, UpdateBaseDTO } from '../models/Base';
import { TableModel } from '../models/Table';
import { ViewModel } from '../models/View';
import { AuditLogModel } from '../models/AuditLog';

export class BaseRepository {
  /**
   * Create a new base
   */
  async create(baseData: CreateBaseDTO, req?: any): Promise<Base> {
    const base = await BaseModel.create(baseData);
    
    // Log the action
    await this.logAction('create', base, null, base, req);
    
    return base;
  }

  /**
   * Find base by ID
   */
  async findById(id: string): Promise<Base | null> {
    return BaseModel.findById(id);
  }

  /**
   * Find bases by owner ID
   */
  async findByOwnerId(ownerId: string): Promise<Base[]> {
    return BaseModel.findByOwnerId(ownerId);
  }

  /**
   * Find bases accessible by user
   */
  async findAccessibleByUser(userId: string): Promise<Base[]> {
    return BaseModel.findAccessibleByUser(userId);
  }

  /**
   * Update base
   */
  async update(id: string, baseData: UpdateBaseDTO, req?: any): Promise<Base | null> {
    const before = await BaseModel.findById(id);
    if (!before) {
      return null;
    }
    
    const after = await BaseModel.update(id, baseData);
    
    // Log the action
    await this.logAction('update', after, before, after, req);
    
    return after;
  }

  /**
   * Delete base
   */
  async delete(id: string, req?: any): Promise<boolean> {
    const base = await BaseModel.findById(id);
    if (!base) {
      return false;
    }
    
    const result = await BaseModel.delete(id);
    
    // Log the action
    await this.logAction('delete', base, base, null, req);
    
    return result;
  }

  /**
   * Check if user has access to base
   */
  async checkUserAccess(baseId: string, userId: string): Promise<{ hasAccess: boolean; permissionLevel?: string }> {
    return BaseModel.checkUserAccess(baseId, userId);
  }

  /**
   * Get base collaborators
   */
  async getCollaborators(baseId: string): Promise<any[]> {
    return BaseModel.getCollaborators(baseId);
  }

  /**
   * Add collaborator to base
   */
  async addCollaborator(baseId: string, userId: string, permissionLevel: string, req?: any): Promise<any> {
    const collaborator = await BaseModel.addCollaborator(baseId, userId, permissionLevel);
    
    // Log the action
    await this.logAction(
      'add_collaborator',
      { id: baseId, collaborator: { user_id: userId, permission_level: permissionLevel } },
      null,
      collaborator,
      req
    );
    
    return collaborator;
  }

  /**
   * Update collaborator permission
   */
  async updateCollaboratorPermission(baseId: string, userId: string, permissionLevel: string, req?: any): Promise<any> {
    const before = await BaseModel.getCollaborators(baseId).then(
      collaborators => collaborators.find(c => c.user_id === userId)
    );
    
    const after = await BaseModel.updateCollaboratorPermission(baseId, userId, permissionLevel);
    
    // Log the action
    await this.logAction(
      'update_collaborator',
      { id: baseId, collaborator: { user_id: userId, permission_level: permissionLevel } },
      before,
      after,
      req
    );
    
    return after;
  }

  /**
   * Remove collaborator from base
   */
  async removeCollaborator(baseId: string, userId: string, req?: any): Promise<boolean> {
    const before = await BaseModel.getCollaborators(baseId).then(
      collaborators => collaborators.find(c => c.user_id === userId)
    );
    
    const result = await BaseModel.removeCollaborator(baseId, userId);
    
    // Log the action
    await this.logAction(
      'remove_collaborator',
      { id: baseId, collaborator: { user_id: userId } },
      before,
      null,
      req
    );
    
    return result;
  }

  /**
   * Get base with tables and views
   */
  async getBaseWithTablesAndViews(baseId: string): Promise<any> {
    const base = await BaseModel.findById(baseId);
    
    if (!base) {
      return null;
    }
    
    const tables = await TableModel.findByBaseId(baseId);
    
    // Get views for each table
    const tablesWithViews = await Promise.all(
      tables.map(async (table) => {
        const views = await ViewModel.findByTableId(table.id);
        return {
          ...table,
          views,
        };
      })
    );
    
    return {
      ...base,
      tables: tablesWithViews,
    };
  }

  /**
   * Log an action
   */
  private async logAction(
    action: string,
    entity: any,
    before: any,
    after: any,
    req?: any
  ): Promise<void> {
    try {
      await AuditLogModel.create({
        user_id: req?.user?.id,
        action,
        entity_type: 'base',
        entity_id: entity.id,
        before,
        after,
        metadata: {
          ip_address: req?.ip,
          user_agent: req?.headers?.['user-agent'],
        },
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }
}