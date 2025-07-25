import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { GoogleSheetsService } from '../services/GoogleSheetsService';

export interface Base {
  id: string;
  name: string;
  description?: string;
  google_sheets_id: string;
  owner_id: string;
  settings?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBaseDTO {
  name: string;
  description?: string;
  google_sheets_id?: string;
  owner_id: string;
  settings?: any;
}

export interface UpdateBaseDTO {
  name?: string;
  description?: string;
  settings?: any;
}

export class BaseModel {
  private static readonly tableName = 'bases';

  /**
   * Create a new base
   */
  static async create(baseData: CreateBaseDTO): Promise<Base> {
    let { google_sheets_id } = baseData;
    
    // If no Google Sheets ID is provided, create a new spreadsheet
    if (!google_sheets_id) {
      const sheetsService = GoogleSheetsService.getInstance();
      google_sheets_id = await sheetsService.createSpreadsheet(baseData.name);
    }
    
    const base: Partial<Base> = {
      ...baseData,
      id: uuidv4(),
      google_sheets_id,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdBase] = await db(this.tableName).insert(base).returning('*');
    return createdBase;
  }

  /**
   * Find base by ID
   */
  static async findById(id: string): Promise<Base | null> {
    const base = await db(this.tableName).where({ id }).first();
    return base || null;
  }

  /**
   * Find bases by owner ID
   */
  static async findByOwnerId(ownerId: string): Promise<Base[]> {
    const bases = await db(this.tableName).where({ owner_id: ownerId });
    return bases;
  }

  /**
   * Find bases accessible by user (owned or collaborated)
   */
  static async findAccessibleByUser(userId: string): Promise<Base[]> {
    const bases = await db(this.tableName)
      .select('bases.*')
      .where('bases.owner_id', userId)
      .union(function() {
        this.select('bases.*')
          .from('bases')
          .join('collaborators', 'bases.id', 'collaborators.base_id')
          .where('collaborators.user_id', userId);
      });
    
    return bases;
  }

  /**
   * Update base
   */
  static async update(id: string, baseData: UpdateBaseDTO): Promise<Base | null> {
    const updateData: Partial<Base> = {
      ...baseData,
      updated_at: new Date(),
    };
    
    const [updatedBase] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedBase || null;
  }

  /**
   * Delete base
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Check if user has access to base
   */
  static async checkUserAccess(baseId: string, userId: string): Promise<{ hasAccess: boolean; permissionLevel?: string }> {
    // Check if user is the owner
    const base = await db(this.tableName)
      .where({ id: baseId, owner_id: userId })
      .first();
    
    if (base) {
      return { hasAccess: true, permissionLevel: 'owner' };
    }
    
    // Check if user is a collaborator
    const collaborator = await db('collaborators')
      .where({ base_id: baseId, user_id: userId })
      .first();
    
    if (collaborator) {
      return { hasAccess: true, permissionLevel: collaborator.permission_level };
    }
    
    return { hasAccess: false };
  }

  /**
   * Get base collaborators
   */
  static async getCollaborators(baseId: string): Promise<any[]> {
    const collaborators = await db('collaborators')
      .select('collaborators.*', 'users.name', 'users.email', 'users.avatar_url')
      .join('users', 'collaborators.user_id', 'users.id')
      .where('collaborators.base_id', baseId);
    
    return collaborators;
  }

  /**
   * Add collaborator to base
   */
  static async addCollaborator(baseId: string, userId: string, permissionLevel: string): Promise<any> {
    const [collaborator] = await db('collaborators')
      .insert({
        id: uuidv4(),
        base_id: baseId,
        user_id: userId,
        permission_level: permissionLevel,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    
    return collaborator;
  }

  /**
   * Update collaborator permission
   */
  static async updateCollaboratorPermission(baseId: string, userId: string, permissionLevel: string): Promise<any> {
    const [collaborator] = await db('collaborators')
      .where({ base_id: baseId, user_id: userId })
      .update({
        permission_level: permissionLevel,
        updated_at: new Date(),
      })
      .returning('*');
    
    return collaborator;
  }

  /**
   * Remove collaborator from base
   */
  static async removeCollaborator(baseId: string, userId: string): Promise<boolean> {
    const deletedCount = await db('collaborators')
      .where({ base_id: baseId, user_id: userId })
      .delete();
    
    return deletedCount > 0;
  }
}