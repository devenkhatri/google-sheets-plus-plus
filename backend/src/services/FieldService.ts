import { FieldModel, Field, CreateFieldDTO, UpdateFieldDTO, FieldType } from '../models/Field';
import { TableModel } from '../models/Table';
import { BaseModel } from '../models/Base';
import { GoogleSheetsService } from './GoogleSheetsService';
import { FormulaEngine, FormulaContext } from './FormulaEngine';
import { FormulaValidationService, ValidationResult } from './FormulaValidationService';
import { LinkService } from './LinkService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { AuditLogModel } from '../models/AuditLog';

export class FieldService {
  private sheetsService: GoogleSheetsService;
  private formulaEngine: FormulaEngine;
  private formulaValidationService: FormulaValidationService;
  private linkService: LinkService;

  constructor() {
    this.sheetsService = GoogleSheetsService.getInstance();
    this.formulaEngine = new FormulaEngine();
    this.formulaValidationService = new FormulaValidationService();
    this.linkService = new LinkService();
  }

  /**
   * Create a new field
   */
  async createField(tableId: string, userId: string, fieldData: CreateFieldDTO): Promise<Field> {
    try {
      logger.info(`Creating field "${fieldData.name}" in table ${tableId} for user ${userId}`);
      
      // Get table
      const table = await TableModel.findById(tableId);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const base = await BaseModel.findById(table.base_id);
      
      if (!base) {
        throw new AppError('Base not found', 404);
      }
      
      const { hasAccess, permissionLevel } = await BaseModel.checkUserAccess(base.id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this base', 403);
      }
      
      // Only owner or editor can create fields
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to create fields in this table', 403);
      }
      
      // Validate field type
      if (!this.isValidFieldType(fieldData.type)) {
        throw new AppError(`Invalid field type: ${fieldData.type}`, 400);
      }
      
      // Validate field options based on type
      this.validateFieldOptions(fieldData.type, fieldData.options);
      
      // Create field
      const field = await FieldModel.create(fieldData);
      
      // Update Google Sheets header
      await this.updateGoogleSheetsHeader(base.google_sheets_id, table.google_sheet_name, field);
      
      // Log the action
      await this.logAction('create_field', userId, field, null, field);
      
      logger.info(`Field created with ID ${field.id}`);
      
      return field;
    } catch (error) {
      logger.error('Error creating field:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create field', 500);
    }
  }

  /**
   * Get field by ID
   */
  async getField(fieldId: string, userId: string): Promise<Field> {
    // Get field
    const field = await FieldModel.findById(fieldId);
    
    if (!field) {
      throw new AppError('Field not found', 404);
    }
    
    // Get table
    const table = await TableModel.findById(field.table_id);
    
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    // Check if user has access to base
    const { hasAccess } = await BaseModel.checkUserAccess(table.base_id, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this field', 403);
    }
    
    return field;
  }

  /**
   * Get fields by table ID
   */
  async getFields(tableId: string, userId: string): Promise<Field[]> {
    // Get table
    const table = await TableModel.findById(tableId);
    
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    // Check if user has access to base
    const { hasAccess } = await BaseModel.checkUserAccess(table.base_id, userId);
    
    if (!hasAccess) {
      throw new AppError('You do not have access to this table', 403);
    }
    
    // Get fields
    return FieldModel.findByTableId(tableId);
  }

  /**
   * Update field
   */
  async updateField(fieldId: string, userId: string, fieldData: UpdateFieldDTO): Promise<Field> {
    try {
      // Get field
      const field = await FieldModel.findById(fieldId);
      
      if (!field) {
        throw new AppError('Field not found', 404);
      }
      
      // Get table
      const table = await TableModel.findById(field.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const base = await BaseModel.findById(table.base_id);
      
      if (!base) {
        throw new AppError('Base not found', 404);
      }
      
      const { hasAccess, permissionLevel } = await BaseModel.checkUserAccess(base.id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this field', 403);
      }
      
      // Only owner or editor can update fields
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to update this field', 403);
      }
      
      // Validate field type if changing
      if (fieldData.type && !this.isValidFieldType(fieldData.type)) {
        throw new AppError(`Invalid field type: ${fieldData.type}`, 400);
      }
      
      // Validate field options based on type
      if (fieldData.options) {
        this.validateFieldOptions(fieldData.type || field.type, fieldData.options);
      }
      
      // Update field
      const updatedField = await FieldModel.update(fieldId, fieldData);
      
      if (!updatedField) {
        throw new AppError('Failed to update field', 500);
      }
      
      // Update Google Sheets header if name changed
      if (fieldData.name && fieldData.name !== field.name) {
        await this.updateGoogleSheetsHeader(base.google_sheets_id, table.google_sheet_name, updatedField);
      }
      
      // Log the action
      await this.logAction('update_field', userId, updatedField, field, updatedField);
      
      return updatedField;
    } catch (error) {
      logger.error(`Error updating field ${fieldId}:`, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to update field', 500);
    }
  }

  /**
   * Delete field
   */
  async deleteField(fieldId: string, userId: string): Promise<void> {
    try {
      // Get field
      const field = await FieldModel.findById(fieldId);
      
      if (!field) {
        throw new AppError('Field not found', 404);
      }
      
      // Get table
      const table = await TableModel.findById(field.table_id);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const base = await BaseModel.findById(table.base_id);
      
      if (!base) {
        throw new AppError('Base not found', 404);
      }
      
      const { hasAccess, permissionLevel } = await BaseModel.checkUserAccess(base.id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this field', 403);
      }
      
      // Only owner or editor can delete fields
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to delete this field', 403);
      }
      
      // Delete field
      await FieldModel.delete(fieldId);
      
      // Log the action
      await this.logAction('delete_field', userId, field, field, null);
    } catch (error) {
      logger.error(`Error deleting field ${fieldId}:`, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete field', 500);
    }
  }

  /**
   * Reorder fields
   */
  async reorderFields(tableId: string, userId: string, fieldIds: string[]): Promise<void> {
    try {
      // Get table
      const table = await TableModel.findById(tableId);
      
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const base = await BaseModel.findById(table.base_id);
      
      if (!base) {
        throw new AppError('Base not found', 404);
      }
      
      const { hasAccess, permissionLevel } = await BaseModel.checkUserAccess(base.id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this table', 403);
      }
      
      // Only owner or editor can reorder fields
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to reorder fields in this table', 403);
      }
      
      // Get existing fields
      const existingFields = await FieldModel.findByTableId(tableId);
      
      // Validate field IDs
      if (fieldIds.length !== existingFields.length) {
        throw new AppError('Invalid field IDs', 400);
      }
      
      const existingFieldIds = existingFields.map((field) => field.id);
      
      for (const fieldId of fieldIds) {
        if (!existingFieldIds.includes(fieldId)) {
          throw new AppError(`Field with ID ${fieldId} not found in table`, 400);
        }
      }
      
      // Reorder fields
      await FieldModel.reorderFields(tableId, fieldIds);
      
      // Log the action
      await this.logAction(
        'reorder_fields',
        userId,
        { table_id: tableId, field_ids: fieldIds },
        { field_ids: existingFieldIds },
        { field_ids: fieldIds }
      );
    } catch (error) {
      logger.error(`Error reordering fields in table ${tableId}:`, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to reorder fields', 500);
    }
  }

  /**
   * Create link between fields
   */
  async createLink(
    sourceFieldId: string,
    targetFieldId: string,
    userId: string
  ): Promise<any> {
    try {
      // Get source field
      const sourceField = await FieldModel.findById(sourceFieldId);
      
      if (!sourceField) {
        throw new AppError('Source field not found', 404);
      }
      
      // Get target field
      const targetField = await FieldModel.findById(targetFieldId);
      
      if (!targetField) {
        throw new AppError('Target field not found', 404);
      }
      
      // Validate field types
      if (sourceField.type !== 'link') {
        throw new AppError('Source field must be a link field', 400);
      }
      
      if (targetField.type !== 'link') {
        throw new AppError('Target field must be a link field', 400);
      }
      
      // Get tables
      const sourceTable = await TableModel.findById(sourceField.table_id);
      const targetTable = await TableModel.findById(targetField.table_id);
      
      if (!sourceTable || !targetTable) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if both tables are in the same base
      if (sourceTable.base_id !== targetTable.base_id) {
        throw new AppError('Cannot link fields from different bases', 400);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await BaseModel.checkUserAccess(sourceTable.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this base', 403);
      }
      
      // Only owner or editor can create links
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to create links in this base', 403);
      }
      
      // Create link
      const link = await FieldModel.createLink(sourceFieldId, targetFieldId);
      
      // Log the action
      await this.logAction(
        'create_link',
        userId,
        { source_field_id: sourceFieldId, target_field_id: targetFieldId },
        null,
        link
      );
      
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
   * Delete link between fields
   */
  async deleteLink(
    sourceFieldId: string,
    targetFieldId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get source field
      const sourceField = await FieldModel.findById(sourceFieldId);
      
      if (!sourceField) {
        throw new AppError('Source field not found', 404);
      }
      
      // Get target field
      const targetField = await FieldModel.findById(targetFieldId);
      
      if (!targetField) {
        throw new AppError('Target field not found', 404);
      }
      
      // Get tables
      const sourceTable = await TableModel.findById(sourceField.table_id);
      
      if (!sourceTable) {
        throw new AppError('Table not found', 404);
      }
      
      // Check if user has access to base
      const { hasAccess, permissionLevel } = await BaseModel.checkUserAccess(sourceTable.base_id, userId);
      
      if (!hasAccess) {
        throw new AppError('You do not have access to this base', 403);
      }
      
      // Only owner or editor can delete links
      if (permissionLevel !== 'owner' && permissionLevel !== 'editor') {
        throw new AppError('You do not have permission to delete links in this base', 403);
      }
      
      // Delete link
      const result = await FieldModel.deleteLink(sourceFieldId, targetFieldId);
      
      // Log the action
      await this.logAction(
        'delete_link',
        userId,
        { source_field_id: sourceFieldId, target_field_id: targetFieldId },
        { source_field_id: sourceFieldId, target_field_id: targetFieldId },
        null
      );
      
      return result;
    } catch (error) {
      logger.error(`Error deleting link between fields ${sourceFieldId} and ${targetFieldId}:`, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete link', 500);
    }
  }

  /**
   * Check if field type is valid
   */
  private isValidFieldType(type: string): boolean {
    const validTypes: FieldType[] = [
      'text',
      'number',
      'singleSelect',
      'multiSelect',
      'date',
      'checkbox',
      'attachment',
      'formula',
      'lookup',
      'rollup',
      'link',
    ];
    
    return validTypes.includes(type as FieldType);
  }

  /**
   * Validate field options based on type
   */
  private async validateFieldOptions(type: string, options: any): Promise<void> {
    if (!options) {
      return;
    }
    
    switch (type) {
      case 'singleSelect':
      case 'multiSelect':
        if (!options.choices || !Array.isArray(options.choices)) {
          throw new AppError(`${type} field requires 'choices' array in options`, 400);
        }
        break;
      
      case 'number':
        if (options.precision !== undefined && typeof options.precision !== 'number') {
          throw new AppError('Number field precision must be a number', 400);
        }
        if (options.format && !['decimal', 'integer', 'percent', 'currency'].includes(options.format)) {
          throw new AppError('Invalid number format', 400);
        }
        break;
      
      case 'date':
        if (options.format && !['date', 'datetime', 'time'].includes(options.format)) {
          throw new AppError('Invalid date format', 400);
        }
        break;
      
      case 'formula':
        if (!options.formula || typeof options.formula !== 'string') {
          throw new AppError('Formula field requires a formula string', 400);
        }
        // Validate formula syntax and dependencies
        await this.validateFormula(options.formula, type);
        break;
      
      case 'lookup':
        if (!options.linkFieldId || typeof options.linkFieldId !== 'string') {
          throw new AppError('Lookup field requires a linkFieldId', 400);
        }
        if (!options.targetFieldId || typeof options.targetFieldId !== 'string') {
          throw new AppError('Lookup field requires a targetFieldId', 400);
        }
        
        // Validate link field exists and is a link field
        const linkField = await FieldModel.findById(options.linkFieldId);
        if (!linkField) {
          throw new AppError('Link field not found', 404);
        }
        if (linkField.type !== 'link') {
          throw new AppError('Link field must be of type "link"', 400);
        }
        
        // Validate target field exists
        const targetField = await FieldModel.findById(options.targetFieldId);
        if (!targetField) {
          throw new AppError('Target field not found', 404);
        }
        
        // Validate that the link field has a link to the target field's table
        const links = await this.linkService.getLinksForField(options.linkFieldId);
        const targetFieldTable = await TableModel.findById(targetField.table_id);
        
        if (!targetFieldTable) {
          throw new AppError('Target field table not found', 404);
        }
        
        let validLink = false;
        for (const link of links) {
          const otherFieldId = link.source_field_id === options.linkFieldId 
            ? link.target_field_id 
            : link.source_field_id;
          
          const otherField = await FieldModel.findById(otherFieldId);
          if (otherField && otherField.table_id === targetField.table_id) {
            validLink = true;
            break;
          }
        }
        
        if (!validLink) {
          throw new AppError('Link field does not connect to the target field\'s table', 400);
        }
        break;
      
      case 'rollup':
        if (!options.linkFieldId || typeof options.linkFieldId !== 'string') {
          throw new AppError('Rollup field requires a linkFieldId', 400);
        }
        if (!options.targetFieldId || typeof options.targetFieldId !== 'string') {
          throw new AppError('Rollup field requires a targetFieldId', 400);
        }
        if (!options.function || !['sum', 'avg', 'min', 'max', 'count'].includes(options.function)) {
          throw new AppError('Invalid rollup function', 400);
        }
        
        // Validate link field exists and is a link field
        const rollupLinkField = await FieldModel.findById(options.linkFieldId);
        if (!rollupLinkField) {
          throw new AppError('Link field not found', 404);
        }
        if (rollupLinkField.type !== 'link') {
          throw new AppError('Link field must be of type "link"', 400);
        }
        
        // Validate target field exists
        const rollupTargetField = await FieldModel.findById(options.targetFieldId);
        if (!rollupTargetField) {
          throw new AppError('Target field not found', 404);
        }
        
        // For numeric functions, validate that the target field is a number type
        if (['sum', 'avg', 'min', 'max'].includes(options.function) && 
            rollupTargetField.type !== 'number' && 
            rollupTargetField.type !== 'formula' && 
            rollupTargetField.type !== 'rollup') {
          throw new AppError(`Rollup function "${options.function}" requires a numeric target field`, 400);
        }
        
        // Validate that the link field has a link to the target field's table
        const rollupLinks = await this.linkService.getLinksForField(options.linkFieldId);
        const rollupTargetFieldTable = await TableModel.findById(rollupTargetField.table_id);
        
        if (!rollupTargetFieldTable) {
          throw new AppError('Target field table not found', 404);
        }
        
        let rollupValidLink = false;
        for (const link of rollupLinks) {
          const otherFieldId = link.source_field_id === options.linkFieldId 
            ? link.target_field_id 
            : link.source_field_id;
          
          const otherField = await FieldModel.findById(otherFieldId);
          if (otherField && otherField.table_id === rollupTargetField.table_id) {
            rollupValidLink = true;
            break;
          }
        }
        
        if (!rollupValidLink) {
          throw new AppError('Link field does not connect to the target field\'s table', 400);
        }
        break;
        
      case 'link':
        // No specific validation needed for link fields at creation time
        // Links are established separately after fields are created
        break;
    }
  }

  /**
   * Update Google Sheets header
   */
  private async updateGoogleSheetsHeader(
    spreadsheetId: string,
    sheetName: string,
    field: Field
  ): Promise<void> {
    try {
      // Get all fields for the table
      const fields = await FieldModel.findByTableId(field.table_id);
      
      // Sort fields by column index
      fields.sort((a, b) => a.column_index - b.column_index);
      
      // Create header row
      const headerRow = fields.map((f) => f.name);
      
      // Update header row in Google Sheets
      await this.sheetsService.updateValues(
        spreadsheetId,
        `${sheetName}!A1:${this.columnIndexToLetter(fields.length)}1`,
        [headerRow]
      );
    } catch (error) {
      logger.error(`Error updating Google Sheets header for field ${field.id}:`, error);
      // Continue even if Google Sheets update fails
    }
  }

  /**
   * Convert column index to letter (e.g., 0 -> A, 25 -> Z, 26 -> AA)
   */
  private columnIndexToLetter(index: number): string {
    let letter = '';
    
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    
    return letter;
  }

  /**
   * Validate formula field
   */
  async validateFormula(formula: string, tableId: string): Promise<ValidationResult> {
    try {
      // Get all fields in the table for dependency validation
      const fields = await FieldModel.findByTableId(tableId);
      
      // Validate formula
      const validation = this.formulaValidationService.validateFormula(formula, fields);
      
      return validation;
    } catch (error) {
      logger.error('Error validating formula:', error);
      return {
        valid: false,
        error: 'Failed to validate formula'
      };
    }
  }

  /**
   * Get formula autocomplete suggestions
   */
  async getFormulaAutoComplete(
    formula: string,
    cursorPosition: number,
    tableId: string
  ): Promise<any> {
    try {
      // Get all fields in the table
      const fields = await FieldModel.findByTableId(tableId);
      
      // Get autocomplete suggestions
      const suggestions = this.formulaValidationService.getAutoComplete(
        formula,
        cursorPosition,
        fields
      );
      
      return suggestions;
    } catch (error) {
      logger.error('Error getting formula autocomplete:', error);
      return { suggestions: [], position: cursorPosition };
    }
  }

  /**
   * Get formula syntax highlighting
   */
  getFormulaSyntaxHighlighting(formula: string): any {
    try {
      return this.formulaValidationService.getSyntaxHighlighting(formula);
    } catch (error) {
      logger.error('Error getting syntax highlighting:', error);
      return [];
    }
  }

  /**
   * Evaluate formula for a record
   */
  async evaluateFormula(
    formula: string,
    recordId: string,
    tableId: string
  ): Promise<any> {
    try {
      // This would need to be implemented with the RecordService
      // For now, return a placeholder
      const fields = await FieldModel.findByTableId(tableId);
      
      // Create a mock context - in real implementation, get actual record data
      const context: FormulaContext = {
        currentRecord: {
          id: recordId,
          table_id: tableId,
          fields: {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: '',
          last_modified_by: ''
        },
        allRecords: [],
        fields,
        tableId
      };
      
      const result = this.formulaEngine.evaluateFormula(formula, context);
      return result;
    } catch (error) {
      logger.error('Error evaluating formula:', error);
      return {
        value: null,
        type: 'error',
        error: 'Failed to evaluate formula'
      };
    }
  }

  /**
   * Get formula dependencies
   */
  getFormulaDependencies(formula: string): any {
    try {
      return this.formulaEngine.getDependencies(formula);
    } catch (error) {
      logger.error('Error getting formula dependencies:', error);
      return [];
    }
  }

  /**
   * Update dependent formula fields when a field changes
   */
  async updateDependentFormulas(
    changedFieldId: string,
    tableId: string
  ): Promise<void> {
    try {
      // Get all formula fields in the table
      const fields = await FieldModel.findByTableId(tableId);
      const formulaFields = fields.filter(f => f.type === 'formula' && f.options?.formula);
      
      // Find fields that depend on the changed field
      const changedField = fields.find(f => f.id === changedFieldId);
      if (!changedField) return;
      
      const dependentFields = formulaFields.filter(field => {
        const dependencies = this.getFormulaDependencies(field.options.formula);
        return dependencies.some((dep: any) => dep.fieldName === changedField.name);
      });
      
      // Update each dependent field
      for (const field of dependentFields) {
        // In a real implementation, this would trigger recalculation of all records
        // For now, just log the dependency update
        logger.info(`Formula field "${field.name}" depends on changed field "${changedField.name}"`);
      }
    } catch (error) {
      logger.error('Error updating dependent formulas:', error);
    }
  }

  /**
   * Log an action
   */
  private async logAction(
    action: string,
    userId: string,
    entity: any,
    before: any,
    after: any
  ): Promise<void> {
    try {
      await AuditLogModel.create({
        user_id: userId,
        action,
        entity_type: 'field',
        entity_id: entity.id,
        before,
        after,
      });
    } catch (error) {
      logger.error('Failed to log action:', error);
    }
  }
}