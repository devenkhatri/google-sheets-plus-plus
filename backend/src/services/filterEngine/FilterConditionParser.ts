import { Field, FieldType } from '../../models/Field';
import { logger } from '../../utils/logger';

/**
 * Filter operator types supported by the system
 */
export type FilterOperator = 
  // Text operators
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'startsWith'
  | 'endsWith'
  // Number operators
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  // Date operators
  | 'before'
  | 'after'
  | 'onOrBefore'
  | 'onOrAfter'
  | 'exactDate'
  // Boolean operators
  | 'isChecked'
  | 'isNotChecked'
  // Select operators
  | 'hasOption'
  | 'hasNotOption'
  | 'hasAllOptions'
  | 'hasAnyOption';

/**
 * Logical operators for combining multiple filters
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Filter condition structure
 */
export interface FilterCondition {
  fieldId: string;
  operator: FilterOperator;
  value?: any;
  id?: string; // Unique identifier for the condition
}

/**
 * Filter group structure for combining multiple conditions
 */
export interface FilterGroup {
  logicalOperator: LogicalOperator;
  conditions: (FilterCondition | FilterGroup)[];
  id?: string; // Unique identifier for the group
}

/**
 * Complete filter configuration
 */
export interface FilterConfig {
  root: FilterGroup;
  version?: string; // For tracking schema versions
}

/**
 * Filter suggestion type
 */
export interface FilterSuggestion {
  value: string;
  label: string;
  type?: string;
}

/**
 * Filter operator metadata
 */
export interface FilterOperatorMetadata {
  label: string;
  requiresValue: boolean;
  valueType?: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiSelect';
  description?: string;
}

/**
 * Filter operator display information
 */
export const FILTER_OPERATOR_METADATA: Record<FilterOperator, FilterOperatorMetadata> = {
  // Text operators
  equals: { label: 'equals', requiresValue: true, valueType: 'text', description: 'Exact match' },
  notEquals: { label: 'does not equal', requiresValue: true, valueType: 'text', description: 'Not an exact match' },
  contains: { label: 'contains', requiresValue: true, valueType: 'text', description: 'Contains the text' },
  notContains: { label: 'does not contain', requiresValue: true, valueType: 'text', description: 'Does not contain the text' },
  isEmpty: { label: 'is empty', requiresValue: false, description: 'Has no value' },
  isNotEmpty: { label: 'is not empty', requiresValue: false, description: 'Has any value' },
  startsWith: { label: 'starts with', requiresValue: true, valueType: 'text', description: 'Begins with the text' },
  endsWith: { label: 'ends with', requiresValue: true, valueType: 'text', description: 'Ends with the text' },
  
  // Number operators
  greaterThan: { label: 'greater than', requiresValue: true, valueType: 'number', description: '>' },
  lessThan: { label: 'less than', requiresValue: true, valueType: 'number', description: '<' },
  greaterThanOrEqual: { label: 'greater than or equal to', requiresValue: true, valueType: 'number', description: '>=' },
  lessThanOrEqual: { label: 'less than or equal to', requiresValue: true, valueType: 'number', description: '<=' },
  
  // Date operators
  before: { label: 'is before', requiresValue: true, valueType: 'date', description: 'Before the date' },
  after: { label: 'is after', requiresValue: true, valueType: 'date', description: 'After the date' },
  onOrBefore: { label: 'is on or before', requiresValue: true, valueType: 'date', description: 'On or before the date' },
  onOrAfter: { label: 'is on or after', requiresValue: true, valueType: 'date', description: 'On or after the date' },
  exactDate: { label: 'is exactly', requiresValue: true, valueType: 'date', description: 'Exactly on the date' },
  
  // Boolean operators
  isChecked: { label: 'is checked', requiresValue: false, description: 'Is true/checked' },
  isNotChecked: { label: 'is not checked', requiresValue: false, description: 'Is false/unchecked' },
  
  // Select operators
  hasOption: { label: 'is', requiresValue: true, valueType: 'select', description: 'Has the selected option' },
  hasNotOption: { label: 'is not', requiresValue: true, valueType: 'select', description: 'Does not have the selected option' },
  hasAllOptions: { label: 'has all of', requiresValue: true, valueType: 'multiSelect', description: 'Has all the selected options' },
  hasAnyOption: { label: 'has any of', requiresValue: true, valueType: 'multiSelect', description: 'Has at least one of the selected options' }
};

/**
 * Class for parsing and validating filter conditions
 */
export class FilterConditionParser {
  /**
   * Validate a filter condition against a field
   */
  static validateCondition(condition: FilterCondition, field: Field): boolean {
    try {
      const { operator, value } = condition;
      const fieldType = field.type;

      // Check if operator is valid for the field type
      if (!this.isOperatorValidForFieldType(operator, fieldType)) {
        logger.warn(`Invalid operator ${operator} for field type ${fieldType}`);
        return false;
      }

      // Validate value based on operator and field type
      switch (operator) {
        // Operators that don't require a value
        case 'isEmpty':
        case 'isNotEmpty':
        case 'isChecked':
        case 'isNotChecked':
          return true;

        // Operators that require a string value
        case 'equals':
        case 'notEquals':
        case 'contains':
        case 'notContains':
        case 'startsWith':
        case 'endsWith':
          if (fieldType === 'text' || fieldType === 'singleSelect') {
            return typeof value === 'string';
          }
          return false;

        // Operators that require a numeric value
        case 'greaterThan':
        case 'lessThan':
        case 'greaterThanOrEqual':
        case 'lessThanOrEqual':
          if (fieldType === 'number') {
            return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
          }
          return false;

        // Operators that require a date value
        case 'before':
        case 'after':
        case 'onOrBefore':
        case 'onOrAfter':
        case 'exactDate':
          if (fieldType === 'date') {
            return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
          }
          return false;

        // Operators that require an array of options
        case 'hasOption':
        case 'hasNotOption':
          if (fieldType === 'singleSelect' || fieldType === 'multiSelect') {
            return typeof value === 'string';
          }
          return false;

        case 'hasAllOptions':
        case 'hasAnyOption':
          if (fieldType === 'multiSelect') {
            return Array.isArray(value) && value.every(item => typeof item === 'string');
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      logger.error('Error validating filter condition:', error);
      return false;
    }
  }

  /**
   * Check if an operator is valid for a field type
   */
  static isOperatorValidForFieldType(operator: FilterOperator, fieldType: FieldType): boolean {
    const validOperatorsByType: Record<FieldType, FilterOperator[]> = {
      text: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty', 'startsWith', 'endsWith'],
      number: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'isEmpty', 'isNotEmpty'],
      singleSelect: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty', 'hasOption', 'hasNotOption'],
      multiSelect: ['isEmpty', 'isNotEmpty', 'hasOption', 'hasNotOption', 'hasAllOptions', 'hasAnyOption'],
      date: ['before', 'after', 'onOrBefore', 'onOrAfter', 'exactDate', 'isEmpty', 'isNotEmpty'],
      checkbox: ['isChecked', 'isNotChecked'],
      attachment: ['isEmpty', 'isNotEmpty'],
      formula: ['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'isEmpty', 'isNotEmpty'],
      lookup: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
      rollup: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'isEmpty', 'isNotEmpty'],
      link: ['isEmpty', 'isNotEmpty']
    };

    return validOperatorsByType[fieldType]?.includes(operator) || false;
  }

  /**
   * Get available operators for a field type
   */
  static getAvailableOperatorsForFieldType(fieldType: FieldType): FilterOperator[] {
    const validOperatorsByType: Record<FieldType, FilterOperator[]> = {
      text: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty', 'startsWith', 'endsWith'],
      number: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'isEmpty', 'isNotEmpty'],
      singleSelect: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty', 'hasOption', 'hasNotOption'],
      multiSelect: ['isEmpty', 'isNotEmpty', 'hasOption', 'hasNotOption', 'hasAllOptions', 'hasAnyOption'],
      date: ['before', 'after', 'onOrBefore', 'onOrAfter', 'exactDate', 'isEmpty', 'isNotEmpty'],
      checkbox: ['isChecked', 'isNotChecked'],
      attachment: ['isEmpty', 'isNotEmpty'],
      formula: ['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'isEmpty', 'isNotEmpty'],
      lookup: ['equals', 'notEquals', 'contains', 'notContains', 'isEmpty', 'isNotEmpty'],
      rollup: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'isEmpty', 'isNotEmpty'],
      link: ['isEmpty', 'isNotEmpty']
    };

    return validOperatorsByType[fieldType] || [];
  }

  /**
   * Validate a filter group
   */
  static validateFilterGroup(group: FilterGroup, fields: Field[]): boolean {
    if (!group.conditions || !Array.isArray(group.conditions) || group.conditions.length === 0) {
      return false;
    }

    return group.conditions.every(item => {
      if ('logicalOperator' in item) {
        // This is a nested group
        return this.validateFilterGroup(item as FilterGroup, fields);
      } else {
        // This is a condition
        const condition = item as FilterCondition;
        const field = fields.find(f => f.id === condition.fieldId);
        return field ? this.validateCondition(condition, field) : false;
      }
    });
  }

  /**
   * Validate a complete filter configuration
   */
  static validateFilterConfig(config: FilterConfig, fields: Field[]): boolean {
    if (!config.root) {
      return false;
    }

    return this.validateFilterGroup(config.root, fields);
  }

  /**
   * Generate SQL WHERE clause for a filter condition
   */
  static generateSqlForCondition(condition: FilterCondition, paramIndex: number): { sql: string; params: any[]; nextParamIndex: number } {
    const { fieldId, operator, value } = condition;
    let sql = '';
    const params: any[] = [];
    let nextParamIndex = paramIndex;

    switch (operator) {
      case 'equals':
        sql = `fields->>'${fieldId}' = $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'notEquals':
        sql = `(fields->>'${fieldId}' != $${nextParamIndex} OR fields->>'${fieldId}' IS NULL)`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'contains':
        sql = `fields->>'${fieldId}' ILIKE $${nextParamIndex}`;
        params.push(`%${value}%`);
        nextParamIndex++;
        break;
      case 'notContains':
        sql = `(fields->>'${fieldId}' NOT ILIKE $${nextParamIndex} OR fields->>'${fieldId}' IS NULL)`;
        params.push(`%${value}%`);
        nextParamIndex++;
        break;
      case 'startsWith':
        sql = `fields->>'${fieldId}' ILIKE $${nextParamIndex}`;
        params.push(`${value}%`);
        nextParamIndex++;
        break;
      case 'endsWith':
        sql = `fields->>'${fieldId}' ILIKE $${nextParamIndex}`;
        params.push(`%${value}`);
        nextParamIndex++;
        break;
      case 'isEmpty':
        sql = `(fields->>'${fieldId}' IS NULL OR fields->>'${fieldId}' = '')`;
        break;
      case 'isNotEmpty':
        sql = `(fields->>'${fieldId}' IS NOT NULL AND fields->>'${fieldId}' != '')`;
        break;
      case 'greaterThan':
        sql = `(fields->>'${fieldId}')::numeric > $${nextParamIndex}`;
        params.push(Number(value));
        nextParamIndex++;
        break;
      case 'lessThan':
        sql = `(fields->>'${fieldId}')::numeric < $${nextParamIndex}`;
        params.push(Number(value));
        nextParamIndex++;
        break;
      case 'greaterThanOrEqual':
        sql = `(fields->>'${fieldId}')::numeric >= $${nextParamIndex}`;
        params.push(Number(value));
        nextParamIndex++;
        break;
      case 'lessThanOrEqual':
        sql = `(fields->>'${fieldId}')::numeric <= $${nextParamIndex}`;
        params.push(Number(value));
        nextParamIndex++;
        break;
      case 'before':
        sql = `fields->>'${fieldId}' < $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'after':
        sql = `fields->>'${fieldId}' > $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'onOrBefore':
        sql = `fields->>'${fieldId}' <= $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'onOrAfter':
        sql = `fields->>'${fieldId}' >= $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'exactDate':
        sql = `fields->>'${fieldId}' = $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'isChecked':
        sql = `fields->>'${fieldId}' = 'true'`;
        break;
      case 'isNotChecked':
        sql = `(fields->>'${fieldId}' = 'false' OR fields->>'${fieldId}' IS NULL)`;
        break;
      case 'hasOption':
        sql = `fields->>'${fieldId}' = $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'hasNotOption':
        sql = `fields->>'${fieldId}' != $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'hasAllOptions':
        // For JSON array containing all specified options
        sql = `(fields->>'${fieldId}')::jsonb @> $${nextParamIndex}::jsonb`;
        params.push(JSON.stringify(value));
        nextParamIndex++;
        break;
      case 'hasAnyOption':
        // For JSON array containing any of the specified options
        const orClauses = value.map((_: any, i: number) => {
          params.push(value[i]);
          return `fields->>'${fieldId}' LIKE '%' || $${nextParamIndex + i} || '%'`;
        });
        sql = `(${orClauses.join(' OR ')})`;
        nextParamIndex += value.length;
        break;
      default:
        sql = '1=1'; // Default to true if operator not recognized
    }

    return { sql, params, nextParamIndex };
  }

  /**
   * Generate SQL WHERE clause for a filter group
   */
  static generateSqlForGroup(group: FilterGroup, paramIndex: number): { sql: string; params: any[]; nextParamIndex: number } {
    if (!group.conditions || group.conditions.length === 0) {
      return { sql: '1=1', params: [], nextParamIndex: paramIndex };
    }

    const results = group.conditions.map(item => {
      if ('logicalOperator' in item) {
        // This is a nested group
        return this.generateSqlForGroup(item as FilterGroup, paramIndex);
      } else {
        // This is a condition
        return this.generateSqlForCondition(item as FilterCondition, paramIndex);
      }
    });

    const sqlParts = results.map(r => r.sql);
    const params = results.reduce((acc, r) => [...acc, ...r.params], [] as any[]);
    const nextParamIndex = results.reduce((max, r) => Math.max(max, r.nextParamIndex), paramIndex);

    const logicalOp = group.logicalOperator === 'OR' ? ' OR ' : ' AND ';
    const sql = `(${sqlParts.join(logicalOp)})`;

    return { sql, params, nextParamIndex };
  }

  /**
   * Generate SQL WHERE clause for a complete filter configuration
   */
  static generateSqlForFilterConfig(config: FilterConfig): { sql: string; params: any[] } {
    if (!config.root) {
      return { sql: '1=1', params: [] };
    }

    const { sql, params } = this.generateSqlForGroup(config.root, 1);
    return { sql, params };
  }

  /**
   * Generate filter suggestions based on field type and existing value
   */
  static generateFilterSuggestions(field: Field, partialValue?: string): FilterSuggestion[] {
    const fieldType = field.type;
    const suggestions: FilterSuggestion[] = [];

    switch (fieldType) {
      case 'singleSelect':
      case 'multiSelect':
        // Get options from field configuration
        const options = field.options?.choices || [];
        const filteredOptions = partialValue 
          ? options.filter(option => option.toLowerCase().includes(partialValue.toLowerCase()))
          : options;
        
        return filteredOptions.slice(0, 10).map(option => ({
          value: option,
          label: option,
          type: 'option'
        }));

      case 'text':
        // For text fields, we could suggest common values from existing records
        // This would require additional data that we don't have here
        return [];

      case 'number':
        // Suggest common number operations
        return [
          { value: '0', label: '0', type: 'value' },
          { value: '10', label: '10', type: 'value' },
          { value: '100', label: '100', type: 'value' },
          { value: '1000', label: '1000', type: 'value' }
        ];

      case 'date':
        // Suggest common date values
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        return [
          { value: today.toISOString(), label: 'Today', type: 'date' },
          { value: tomorrow.toISOString(), label: 'Tomorrow', type: 'date' },
          { value: yesterday.toISOString(), label: 'Yesterday', type: 'date' },
          { value: nextWeek.toISOString(), label: 'Next week', type: 'date' },
          { value: lastWeek.toISOString(), label: 'Last week', type: 'date' },
          { value: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), label: 'This month', type: 'date' },
          { value: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString(), label: 'Last month', type: 'date' },
          { value: new Date(today.getFullYear(), 0, 1).toISOString(), label: 'This year', type: 'date' },
          { value: new Date(today.getFullYear() - 1, 0, 1).toISOString(), label: 'Last year', type: 'date' }
        ];

      case 'checkbox':
        return [
          { value: 'true', label: 'Checked', type: 'boolean' },
          { value: 'false', label: 'Unchecked', type: 'boolean' }
        ];

      default:
        return [];
    }
  }
  
  /**
   * Get operator metadata for a specific operator
   */
  static getOperatorMetadata(operator: FilterOperator): FilterOperatorMetadata {
    return FILTER_OPERATOR_METADATA[operator];
  }
  
  /**
   * Get all available operators with metadata
   */
  static getAllOperatorsWithMetadata(): Record<FilterOperator, FilterOperatorMetadata> {
    return FILTER_OPERATOR_METADATA;
  }
  
  /**
   * Parse a filter string into a filter condition
   * This is useful for natural language filter input
   */
  static parseFilterString(filterString: string, fields: Field[]): FilterCondition | null {
    try {
      // Simple parsing for now - format: "fieldName operator value"
      const parts = filterString.split(' ');
      if (parts.length < 2) return null;
      
      const fieldName = parts[0];
      const field = fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
      if (!field) return null;
      
      const operatorText = parts[1].toLowerCase();
      let operator: FilterOperator | undefined;
      let value: any;
      
      // Map common text to operators
      switch (operatorText) {
        case '=':
        case 'equals':
        case 'is':
          operator = 'equals';
          value = parts.slice(2).join(' ');
          break;
        case '!=':
        case 'not':
        case 'isnot':
          operator = 'notEquals';
          value = parts.slice(2).join(' ');
          break;
        case '>':
        case 'greaterthan':
          operator = 'greaterThan';
          value = parseFloat(parts[2]);
          break;
        case '<':
        case 'lessthan':
          operator = 'lessThan';
          value = parseFloat(parts[2]);
          break;
        case '>=':
        case 'greaterthanorequal':
          operator = 'greaterThanOrEqual';
          value = parseFloat(parts[2]);
          break;
        case '<=':
        case 'lessthanorequal':
          operator = 'lessThanOrEqual';
          value = parseFloat(parts[2]);
          break;
        case 'contains':
        case 'has':
          operator = 'contains';
          value = parts.slice(2).join(' ');
          break;
        case 'startswith':
        case 'begins':
          operator = 'startsWith';
          value = parts.slice(2).join(' ');
          break;
        case 'endswith':
        case 'ends':
          operator = 'endsWith';
          value = parts.slice(2).join(' ');
          break;
        case 'empty':
        case 'isempty':
          operator = 'isEmpty';
          break;
        case 'notempty':
        case 'isnotempty':
          operator = 'isNotEmpty';
          break;
        default:
          return null;
      }
      
      if (!operator || !this.isOperatorValidForFieldType(operator, field.type)) {
        return null;
      }
      
      return {
        fieldId: field.id,
        operator,
        value
      };
    } catch (error) {
      logger.error('Error parsing filter string:', error);
      return null;
    }
  }
  
  /**
   * Create a new filter group with a single condition
   */
  static createFilterGroup(logicalOperator: LogicalOperator = 'AND'): FilterGroup {
    return {
      id: this.generateId(),
      logicalOperator,
      conditions: []
    };
  }
  
  /**
   * Create a new filter condition
   */
  static createFilterCondition(fieldId: string, operator: FilterOperator, value?: any): FilterCondition {
    return {
      id: this.generateId(),
      fieldId,
      operator,
      value
    };
  }
  
  /**
   * Add a condition to a filter group
   */
  static addConditionToGroup(group: FilterGroup, condition: FilterCondition): FilterGroup {
    return {
      ...group,
      conditions: [...group.conditions, condition]
    };
  }
  
  /**
   * Add a nested group to a filter group
   */
  static addNestedGroupToGroup(parentGroup: FilterGroup, childGroup: FilterGroup): FilterGroup {
    return {
      ...parentGroup,
      conditions: [...parentGroup.conditions, childGroup]
    };
  }
  
  /**
   * Remove a condition or group from a filter group by ID
   */
  static removeFromGroup(group: FilterGroup, id: string): FilterGroup {
    return {
      ...group,
      conditions: group.conditions.filter(item => {
        if ('operator' in item) {
          // This is a condition
          return item.id !== id;
        } else {
          // This is a nested group
          if (item.id === id) {
            return false;
          }
          // Recursively remove from nested groups
          return this.removeFromGroup(item, id);
        }
      })
    };
  }
  
  /**
   * Update a condition in a filter group by ID
   */
  static updateConditionInGroup(group: FilterGroup, id: string, updates: Partial<FilterCondition>): FilterGroup {
    return {
      ...group,
      conditions: group.conditions.map(item => {
        if ('operator' in item) {
          // This is a condition
          if (item.id === id) {
            return { ...item, ...updates };
          }
          return item;
        } else {
          // This is a nested group
          return this.updateConditionInGroup(item, id, updates);
        }
      })
    };
  }
  
  /**
   * Update a group's logical operator
   */
  static updateGroupOperator(group: FilterGroup, id: string, logicalOperator: LogicalOperator): FilterGroup {
    if (group.id === id) {
      return {
        ...group,
        logicalOperator
      };
    }
    
    return {
      ...group,
      conditions: group.conditions.map(item => {
        if ('logicalOperator' in item) {
          // This is a nested group
          return this.updateGroupOperator(item, id, logicalOperator);
        }
        return item;
      })
    };
  }
  
  /**
   * Generate a unique ID for filter conditions and groups
   */
  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Optimize a filter configuration by removing unnecessary nesting and empty groups
   */
  static optimizeFilterConfig(config: FilterConfig): FilterConfig {
    const optimizedRoot = this.optimizeFilterGroup(config.root);
    return {
      ...config,
      root: optimizedRoot
    };
  }
  
  /**
   * Optimize a filter group by removing unnecessary nesting and empty groups
   */
  private static optimizeFilterGroup(group: FilterGroup): FilterGroup {
    // Remove empty conditions
    let conditions = group.conditions.filter(item => {
      if ('logicalOperator' in item) {
        // This is a nested group
        return item.conditions.length > 0;
      }
      return true;
    });
    
    // Recursively optimize nested groups
    conditions = conditions.map(item => {
      if ('logicalOperator' in item) {
        // This is a nested group
        return this.optimizeFilterGroup(item);
      }
      return item;
    });
    
    // Flatten nested groups with same logical operator
    const flattenedConditions: (FilterCondition | FilterGroup)[] = [];
    conditions.forEach(item => {
      if ('logicalOperator' in item && item.logicalOperator === group.logicalOperator) {
        // Flatten nested group with same logical operator
        flattenedConditions.push(...item.conditions);
      } else {
        flattenedConditions.push(item);
      }
    });
    
    return {
      ...group,
      conditions: flattenedConditions
    };
  }
}