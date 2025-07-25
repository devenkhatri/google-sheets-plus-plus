import { TableModel, Table, CreateTableDTO, UpdateTableDTO } from '../models/Table';
import { FieldModel } from '../models/Field';
import { ViewModel } from '../models/View';
import { AuditLogModel } from '../models/AuditLog';

export class TableRepository {
  /**
   * Create a new table
   */
  async create(tableData: CreateTableDTO, req?: any): Promise<Table> {
    const table = await TableModel.create(tableData);
    
    // Create default views
    await ViewModel.createDefaultViews(table.id);
    
    // Log the action
    await this.logAction('create', table, null, table, req);
    
    return table;
  }

  /**
   * Find table by ID
   */
  async findById(id: string): Promise<Table | null> {
    return TableModel.findById(id);
  }

  /**
   * Find tables by base ID
   */
  async findByBaseId(baseId: string): Promise<Table[]> {
    return TableModel.findByBaseId(baseId);
  }

  /**
   * Update table
   */
  async update(id: string, tableData: UpdateTableDTO, req?: any): Promise<Table | null> {
    const before = await TableModel.findById(id);
    if (!before) {
      return null;
    }
    
    const after = await TableModel.update(id, tableData);
    
    // Log the action
    await this.logAction('update', after, before, after, req);
    
    return after;
  }

  /**
   * Delete table
   */
  async delete(id: string, req?: any): Promise<boolean> {
    const table = await TableModel.findById(id);
    if (!table) {
      return false;
    }
    
    const result = await TableModel.delete(id);
    
    // Log the action
    await this.logAction('delete', table, table, null, req);
    
    return result;
  }

  /**
   * Get table with fields
   */
  async getTableWithFields(id: string): Promise<any> {
    return TableModel.getTableWithFields(id);
  }

  /**
   * Get table with fields and views
   */
  async getTableWithFieldsAndViews(id: string): Promise<any> {
    const table = await TableModel.findById(id);
    
    if (!table) {
      return null;
    }
    
    const fields = await FieldModel.findByTableId(id);
    const views = await ViewModel.findByTableId(id);
    
    return {
      ...table,
      fields,
      views,
    };
  }

  /**
   * Update record count
   */
  async updateRecordCount(id: string, count: number): Promise<void> {
    await TableModel.updateRecordCount(id, count);
  }

  /**
   * Increment record count
   */
  async incrementRecordCount(id: string, increment: number = 1): Promise<void> {
    await TableModel.incrementRecordCount(id, increment);
  }

  /**
   * Decrement record count
   */
  async decrementRecordCount(id: string, decrement: number = 1): Promise<void> {
    await TableModel.decrementRecordCount(id, decrement);
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
        entity_type: 'table',
        entity_id: entity.id,
        before,
        after,
        metadata: {
          base_id: entity.base_id,
          ip_address: req?.ip,
          user_agent: req?.headers?.['user-agent'],
        },
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }
}