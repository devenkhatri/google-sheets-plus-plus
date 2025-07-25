import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { FieldModel, Field } from '../models/Field';
import { TableModel } from '../models/Table';
import { RecordModel, Record } from '../models/Record';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * Interface for link record
 */
export interface LinkRecord {
  id: string;
  link_id: string;
  source_record_id: string;
  target_record_id: string;
  created_at: Date;
}

/**
 * Interface for link
 */
export interface Link {
  id: string;
  source_field_id: string;
  target_field_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Service for managing links between tables
 */
export class LinkService {
  /**
   * Create a link between two fields
   */
  async createLink(sourceFieldId: string, targetFieldId: string): Promise<Link> {
    try {
      // Get source and target fields
      const sourceField = await FieldModel.findById(sourceFieldId);
      const targetField = await FieldModel.findById(targetFieldId);
      
      if (!sourceField || !targetField) {
        throw new AppError('One or both fields not found', 404);
      }
      
      // Check if fields are in different tables
      if (sourceField.table_id === targetField.table_id) {
        throw new AppError('Cannot link fields in the same table', 400);
      }
      
      // Check if fields are of type 'link'
      if (sourceField.type !== 'link') {
        throw new AppError('Source field must be of type "link"', 400);
      }
      
      if (targetField.type !== 'link') {
        throw new AppError('Target field must be of type "link"', 400);
      }
      
      // Check for circular references
      if (await this.wouldCreateCircularReference(sourceField.table_id, targetField.table_id)) {
        throw new AppError('This link would create a circular reference', 400);
      }
      
      // Create link
      const [link] = await db('links').insert({
        id: uuidv4(),
        source_field_id: sourceFieldId,
        target_field_id: targetFieldId,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning('*');
      
      return link;
    } catch (error) {
      logger.error(`Error creating link between fields ${sourceFieldId} and ${targetFieldId}:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create link', 500);
    }
  }
  
  /**
   * Delete a link
   */
  async deleteLink(linkId: string): Promise<boolean> {
    try {
      // Delete link records first (should cascade, but being explicit)
      await db('link_records').where({ link_id: linkId }).delete();
      
      // Delete link
      const deletedCount = await db('links').where({ id: linkId }).delete();
      
      return deletedCount > 0;
    } catch (error) {
      logger.error(`Error deleting link ${linkId}:`, error);
      throw new AppError('Failed to delete link', 500);
    }
  }
  
  /**
   * Get links for a field
   */
  async getLinksForField(fieldId: string): Promise<Link[]> {
    try {
      // Get links where this field is either source or target
      const links = await db('links')
        .where({ source_field_id: fieldId })
        .orWhere({ target_field_id: fieldId });
      
      return links;
    } catch (error) {
      logger.error(`Error getting links for field ${fieldId}:`, error);
      throw new AppError('Failed to get links', 500);
    }
  }
  
  /**
   * Link two records
   */
  async linkRecords(linkId: string, sourceRecordId: string, targetRecordId: string): Promise<LinkRecord> {
    try {
      // Get link
      const link = await db('links').where({ id: linkId }).first();
      
      if (!link) {
        throw new AppError('Link not found', 404);
      }
      
      // Get source and target records
      const sourceRecord = await RecordModel.findById(sourceRecordId);
      const targetRecord = await RecordModel.findById(targetRecordId);
      
      if (!sourceRecord || !targetRecord) {
        throw new AppError('One or both records not found', 404);
      }
      
      // Get source and target fields
      const sourceField = await FieldModel.findById(link.source_field_id);
      const targetField = await FieldModel.findById(link.target_field_id);
      
      if (!sourceField || !targetField) {
        throw new AppError('One or both fields not found', 404);
      }
      
      // Check if records belong to the correct tables
      if (sourceRecord.table_id !== sourceField.table_id) {
        throw new AppError('Source record does not belong to the source table', 400);
      }
      
      if (targetRecord.table_id !== targetField.table_id) {
        throw new AppError('Target record does not belong to the target table', 400);
      }
      
      // Create link record
      const [linkRecord] = await db('link_records').insert({
        id: uuidv4(),
        link_id: linkId,
        source_record_id: sourceRecordId,
        target_record_id: targetRecordId,
        created_at: new Date(),
      }).returning('*');
      
      // Update the fields in both records to reflect the link
      await this.updateRecordFieldsForLink(sourceRecord, targetRecord, sourceField, targetField);
      
      return linkRecord;
    } catch (error) {
      logger.error(`Error linking records ${sourceRecordId} and ${targetRecordId}:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to link records', 500);
    }
  }
  
  /**
   * Unlink two records
   */
  async unlinkRecords(linkId: string, sourceRecordId: string, targetRecordId: string): Promise<boolean> {
    try {
      // Delete link record
      const deletedCount = await db('link_records')
        .where({
          link_id: linkId,
          source_record_id: sourceRecordId,
          target_record_id: targetRecordId,
        })
        .delete();
      
      if (deletedCount > 0) {
        // Get link
        const link = await db('links').where({ id: linkId }).first();
        
        if (link) {
          // Get source and target records
          const sourceRecord = await RecordModel.findById(sourceRecordId);
          const targetRecord = await RecordModel.findById(targetRecordId);
          
          if (sourceRecord && targetRecord) {
            // Get source and target fields
            const sourceField = await FieldModel.findById(link.source_field_id);
            const targetField = await FieldModel.findById(link.target_field_id);
            
            if (sourceField && targetField) {
              // Update the fields in both records to reflect the unlink
              await this.updateRecordFieldsForUnlink(sourceRecord, targetRecord, sourceField, targetField);
            }
          }
        }
      }
      
      return deletedCount > 0;
    } catch (error) {
      logger.error(`Error unlinking records ${sourceRecordId} and ${targetRecordId}:`, error);
      throw new AppError('Failed to unlink records', 500);
    }
  }
  
  /**
   * Get linked records for a record and field
   */
  async getLinkedRecords(recordId: string, fieldId: string): Promise<Record[]> {
    try {
      // Get record
      const record = await RecordModel.findById(recordId);
      
      if (!record) {
        throw new AppError('Record not found', 404);
      }
      
      // Get field
      const field = await FieldModel.findById(fieldId);
      
      if (!field) {
        throw new AppError('Field not found', 404);
      }
      
      // Check if field belongs to the record's table
      if (field.table_id !== record.table_id) {
        throw new AppError('Field does not belong to the record\'s table', 400);
      }
      
      // Check if field is a link field
      if (field.type !== 'link') {
        throw new AppError('Field is not a link field', 400);
      }
      
      // Get links where this field is the source
      const links = await db('links').where({ source_field_id: fieldId });
      
      if (links.length === 0) {
        return [];
      }
      
      // Get linked records
      const linkedRecords: Record[] = [];
      
      for (const link of links) {
        const linkRecords = await db('link_records')
          .where({
            link_id: link.id,
            source_record_id: recordId,
          })
          .select('target_record_id');
        
        if (linkRecords.length > 0) {
          const targetRecordIds = linkRecords.map(lr => lr.target_record_id);
          
          // Get target records
          for (const targetRecordId of targetRecordIds) {
            const targetRecord = await RecordModel.findById(targetRecordId);
            if (targetRecord) {
              linkedRecords.push(targetRecord);
            }
          }
        }
      }
      
      return linkedRecords;
    } catch (error) {
      logger.error(`Error getting linked records for record ${recordId} and field ${fieldId}:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get linked records', 500);
    }
  }
  
  /**
   * Get lookup value for a record and field
   */
  async getLookupValue(recordId: string, fieldId: string): Promise<any> {
    try {
      // Get field
      const field = await FieldModel.findById(fieldId);
      
      if (!field) {
        throw new AppError('Field not found', 404);
      }
      
      // Check if field is a lookup field
      if (field.type !== 'lookup') {
        throw new AppError('Field is not a lookup field', 400);
      }
      
      // Get lookup options
      const { linkFieldId, targetFieldId } = field.options || {};
      
      if (!linkFieldId || !targetFieldId) {
        throw new AppError('Lookup field is not properly configured', 400);
      }
      
      // Get link field
      const linkField = await FieldModel.findById(linkFieldId);
      
      if (!linkField) {
        throw new AppError('Link field not found', 404);
      }
      
      // Get target field
      const targetField = await FieldModel.findById(targetFieldId);
      
      if (!targetField) {
        throw new AppError('Target field not found', 404);
      }
      
      // Get linked records
      const linkedRecords = await this.getLinkedRecords(recordId, linkFieldId);
      
      if (linkedRecords.length === 0) {
        return null;
      }
      
      // Get values from linked records
      const values = linkedRecords.map(record => record.fields[targetFieldId]);
      
      // Return first value for single lookup
      return values[0];
    } catch (error) {
      logger.error(`Error getting lookup value for record ${recordId} and field ${fieldId}:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get lookup value', 500);
    }
  }
  
  /**
   * Get rollup value for a record and field
   */
  async getRollupValue(recordId: string, fieldId: string): Promise<any> {
    try {
      // Get field
      const field = await FieldModel.findById(fieldId);
      
      if (!field) {
        throw new AppError('Field not found', 404);
      }
      
      // Check if field is a rollup field
      if (field.type !== 'rollup') {
        throw new AppError('Field is not a rollup field', 400);
      }
      
      // Get rollup options
      const { linkFieldId, targetFieldId, function: rollupFunction } = field.options || {};
      
      if (!linkFieldId || !targetFieldId || !rollupFunction) {
        throw new AppError('Rollup field is not properly configured', 400);
      }
      
      // Get link field
      const linkField = await FieldModel.findById(linkFieldId);
      
      if (!linkField) {
        throw new AppError('Link field not found', 404);
      }
      
      // Get target field
      const targetField = await FieldModel.findById(targetFieldId);
      
      if (!targetField) {
        throw new AppError('Target field not found', 404);
      }
      
      // Get linked records
      const linkedRecords = await this.getLinkedRecords(recordId, linkFieldId);
      
      if (linkedRecords.length === 0) {
        return null;
      }
      
      // Get values from linked records
      const values = linkedRecords
        .map(record => record.fields[targetFieldId])
        .filter(value => value !== null && value !== undefined)
        .map(value => {
          // Convert string numbers to actual numbers
          if (typeof value === 'string' && !isNaN(Number(value))) {
            return Number(value);
          }
          return value;
        });
      
      // Calculate rollup value based on function
      switch (rollupFunction) {
        case 'sum':
          if (values.length === 0) return 0;
          return values.reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
        
        case 'avg':
          if (values.length === 0) return 0;
          const sum = values.reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
          return sum / values.length;
        
        case 'min':
          if (values.length === 0) return null;
          return Math.min(...values.filter(v => typeof v === 'number'));
        
        case 'max':
          if (values.length === 0) return null;
          return Math.max(...values.filter(v => typeof v === 'number'));
        
        case 'count':
          return values.length;
        
        default:
          throw new AppError(`Unsupported rollup function: ${rollupFunction}`, 400);
      }
    } catch (error) {
      logger.error(`Error getting rollup value for record ${recordId} and field ${fieldId}:`, error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get rollup value', 500);
    }
  }
  
  /**
   * Update lookup and rollup fields for a record
   */
  async updateDependentFields(recordId: string): Promise<void> {
    try {
      // Get record
      const record = await RecordModel.findById(recordId);
      
      if (!record) {
        throw new AppError('Record not found', 404);
      }
      
      // Get fields for the table
      const fields = await FieldModel.findByTableId(record.table_id);
      
      // Find lookup and rollup fields
      const lookupFields = fields.filter(field => field.type === 'lookup');
      const rollupFields = fields.filter(field => field.type === 'rollup');
      
      // Update lookup fields
      for (const field of lookupFields) {
        const lookupValue = await this.getLookupValue(recordId, field.id);
        
        // Update record with lookup value
        await RecordModel.update(recordId, {
          fields: {
            ...record.fields,
            [field.id]: lookupValue,
          },
        });
      }
      
      // Update rollup fields
      for (const field of rollupFields) {
        const rollupValue = await this.getRollupValue(recordId, field.id);
        
        // Update record with rollup value
        await RecordModel.update(recordId, {
          fields: {
            ...record.fields,
            [field.id]: rollupValue,
          },
        });
      }
      
      // Update records that link to this record
      await this.updateRecordsThatLinkTo(record);
    } catch (error) {
      logger.error(`Error updating dependent fields for record ${recordId}:`, error);
      // Don't throw here to prevent cascading failures
    }
  }
  
  /**
   * Update records that link to a given record
   */
  private async updateRecordsThatLinkTo(record: Record): Promise<void> {
    try {
      // Get fields for the table
      const fields = await FieldModel.findByTableId(record.table_id);
      
      // Find link fields
      const linkFields = fields.filter(field => field.type === 'link');
      
      for (const linkField of linkFields) {
        // Get links where this field is the target
        const links = await db('links').where({ target_field_id: linkField.id });
        
        for (const link of links) {
          // Get link records where this record is the target
          const linkRecords = await db('link_records')
            .where({
              link_id: link.id,
              target_record_id: record.id,
            })
            .select('source_record_id');
          
          // Update dependent fields for each source record
          for (const lr of linkRecords) {
            await this.updateDependentFields(lr.source_record_id);
          }
        }
      }
    } catch (error) {
      logger.error(`Error updating records that link to record ${record.id}:`, error);
    }
  }
  
  /**
   * Check if creating a link would create a circular reference
   */
  private async wouldCreateCircularReference(sourceTableId: string, targetTableId: string): Promise<boolean> {
    // If source and target are the same, it's a circular reference
    if (sourceTableId === targetTableId) {
      return true;
    }
    
    // Check if there's already a path from target to source
    return this.isTableReachable(targetTableId, sourceTableId, new Set());
  }
  
  /**
   * Check if target table is reachable from source table through links
   */
  private async isTableReachable(
    sourceTableId: string,
    targetTableId: string,
    visited: Set<string>
  ): Promise<boolean> {
    // If we've already visited this table, avoid infinite recursion
    if (visited.has(sourceTableId)) {
      return false;
    }
    
    // Mark this table as visited
    visited.add(sourceTableId);
    
    // Get all link fields in the source table
    const fields = await FieldModel.findByTableId(sourceTableId);
    const linkFields = fields.filter(field => field.type === 'link');
    
    for (const field of linkFields) {
      // Get links where this field is the source
      const links = await db('links').where({ source_field_id: field.id });
      
      for (const link of links) {
        // Get target field
        const targetField = await FieldModel.findById(link.target_field_id);
        
        if (!targetField) continue;
        
        // If target field's table is our target, we found a path
        if (targetField.table_id === targetTableId) {
          return true;
        }
        
        // Recursively check if target is reachable from this table
        if (await this.isTableReachable(targetField.table_id, targetTableId, visited)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Update record fields to reflect a new link
   */
  private async updateRecordFieldsForLink(
    sourceRecord: Record,
    targetRecord: Record,
    sourceField: Field,
    targetField: Field
  ): Promise<void> {
    try {
      // Update source record
      const sourceFieldValue = sourceRecord.fields[sourceField.id] || [];
      if (!Array.isArray(sourceFieldValue)) {
        sourceRecord.fields[sourceField.id] = [targetRecord.id];
      } else if (!sourceFieldValue.includes(targetRecord.id)) {
        sourceFieldValue.push(targetRecord.id);
      }
      
      await RecordModel.update(sourceRecord.id, {
        fields: sourceRecord.fields,
      });
      
      // Update target record
      const targetFieldValue = targetRecord.fields[targetField.id] || [];
      if (!Array.isArray(targetFieldValue)) {
        targetRecord.fields[targetField.id] = [sourceRecord.id];
      } else if (!targetFieldValue.includes(sourceRecord.id)) {
        targetFieldValue.push(sourceRecord.id);
      }
      
      await RecordModel.update(targetRecord.id, {
        fields: targetRecord.fields,
      });
      
      // Update dependent fields
      await this.updateDependentFields(sourceRecord.id);
      await this.updateDependentFields(targetRecord.id);
    } catch (error) {
      logger.error('Error updating record fields for link:', error);
    }
  }
  
  /**
   * Update record fields to reflect an unlink
   */
  private async updateRecordFieldsForUnlink(
    sourceRecord: Record,
    targetRecord: Record,
    sourceField: Field,
    targetField: Field
  ): Promise<void> {
    try {
      // Update source record
      const sourceFieldValue = sourceRecord.fields[sourceField.id] || [];
      if (Array.isArray(sourceFieldValue)) {
        sourceRecord.fields[sourceField.id] = sourceFieldValue.filter(id => id !== targetRecord.id);
      }
      
      await RecordModel.update(sourceRecord.id, {
        fields: sourceRecord.fields,
      });
      
      // Update target record
      const targetFieldValue = targetRecord.fields[targetField.id] || [];
      if (Array.isArray(targetFieldValue)) {
        targetRecord.fields[targetField.id] = targetFieldValue.filter(id => id !== sourceRecord.id);
      }
      
      await RecordModel.update(targetRecord.id, {
        fields: targetRecord.fields,
      });
      
      // Update dependent fields
      await this.updateDependentFields(sourceRecord.id);
      await this.updateDependentFields(targetRecord.id);
    } catch (error) {
      logger.error('Error updating record fields for unlink:', error);
    }
  }
}