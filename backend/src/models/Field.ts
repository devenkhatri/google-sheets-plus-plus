import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type FieldType = 
  | 'text'
  | 'number'
  | 'singleSelect'
  | 'multiSelect'
  | 'date'
  | 'checkbox'
  | 'attachment'
  | 'formula'
  | 'lookup'
  | 'rollup'
  | 'link';

export interface Field {
  id: string;
  table_id: string;
  name: string;
  type: FieldType;
  options?: any;
  required: boolean;
  column_index: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFieldDTO {
  table_id: string;
  name: string;
  type: FieldType;
  options?: any;
  required?: boolean;
  column_index?: number;
  description?: string;
}

export interface UpdateFieldDTO {
  name?: string;
  type?: FieldType;
  options?: any;
  required?: boolean;
  column_index?: number;
  description?: string;
}

export class FieldModel {
  private static readonly tableName = 'fields';

  /**
   * Create a new field
   */
  static async create(fieldData: CreateFieldDTO): Promise<Field> {
    // If column index is not provided, get the next available index
    if (fieldData.column_index === undefined) {
      const maxIndexResult = await db(this.tableName)
        .where({ table_id: fieldData.table_id })
        .max('column_index as max_index')
        .first();
      
      const maxIndex = maxIndexResult?.max_index ?? -1;
      fieldData.column_index = maxIndex + 1;
    }
    
    const field: Partial<Field> = {
      ...fieldData,
      id: uuidv4(),
      required: fieldData.required ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const [createdField] = await db(this.tableName).insert(field).returning('*');
    return createdField;
  }

  /**
   * Find field by ID
   */
  static async findById(id: string): Promise<Field | null> {
    const field = await db(this.tableName).where({ id }).first();
    return field || null;
  }

  /**
   * Find fields by table ID
   */
  static async findByTableId(tableId: string): Promise<Field[]> {
    const fields = await db(this.tableName)
      .where({ table_id: tableId })
      .orderBy('column_index', 'asc');
    
    return fields;
  }

  /**
   * Update field
   */
  static async update(id: string, fieldData: UpdateFieldDTO): Promise<Field | null> {
    const updateData: Partial<Field> = {
      ...fieldData,
      updated_at: new Date(),
    };
    
    const [updatedField] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedField || null;
  }

  /**
   * Delete field
   */
  static async delete(id: string): Promise<boolean> {
    const deletedCount = await db(this.tableName).where({ id }).delete();
    return deletedCount > 0;
  }

  /**
   * Reorder fields
   */
  static async reorderFields(tableId: string, fieldIds: string[]): Promise<void> {
    // Start a transaction
    await db.transaction(async (trx) => {
      for (let i = 0; i < fieldIds.length; i++) {
        await trx(this.tableName)
          .where({ id: fieldIds[i], table_id: tableId })
          .update({ column_index: i, updated_at: new Date() });
      }
    });
  }

  /**
   * Get field with linked fields
   */
  static async getFieldWithLinks(id: string): Promise<any> {
    const field = await db(this.tableName).where({ id }).first();
    
    if (!field) {
      return null;
    }
    
    // Get linked fields if this is a link field
    if (field.type === 'link') {
      const links = await db('links')
        .select('links.*', 'target_fields.name as target_field_name', 'target_fields.table_id as target_table_id')
        .join('fields as target_fields', 'links.target_field_id', 'target_fields.id')
        .where('links.source_field_id', id);
      
      return {
        ...field,
        links,
      };
    }
    
    return field;
  }

  /**
   * Create link between fields
   */
  static async createLink(sourceFieldId: string, targetFieldId: string): Promise<any> {
    const [link] = await db('links')
      .insert({
        id: uuidv4(),
        source_field_id: sourceFieldId,
        target_field_id: targetFieldId,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    
    return link;
  }

  /**
   * Delete link between fields
   */
  static async deleteLink(sourceFieldId: string, targetFieldId: string): Promise<boolean> {
    const deletedCount = await db('links')
      .where({
        source_field_id: sourceFieldId,
        target_field_id: targetFieldId,
      })
      .delete();
    
    return deletedCount > 0;
  }
}