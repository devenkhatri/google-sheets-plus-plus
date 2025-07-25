import { Field } from '../../models/Field';
import { 
  FilterConditionParser, 
  FilterConfig, 
  FilterCondition, 
  FilterGroup, 
  FilterSuggestion,
  FilterOperatorMetadata
} from './FilterConditionParser';
import { 
  SortingEngine, 
  SortConfig, 
  SortConfigSet,
  SortMetadata
} from './SortingEngine';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import { QueryOptions } from '../../models/Record';
import { performance } from 'perf_hooks';

/**
 * Class for handling filtering and sorting operations
 */
export class FilterEngine {
  /**
   * Apply filters and sorts to a database query
   */
  static applyFiltersAndSortsToQuery(
    query: any,
    tableId: string,
    options: QueryOptions,
    fields: Field[]
  ): any {
    try {
      const { filters, sorts, includeDeleted = false, limit = 100, offset = 0 } = options;
      
      // Start with base query
      let baseQuery = query.where({ table_id: tableId }).limit(limit).offset(offset);
      
      // Apply deleted filter
      if (!includeDeleted) {
        baseQuery = baseQuery.where({ deleted: false });
      }
      
      // Apply filters if provided
      if (filters && filters.length > 0) {
        baseQuery = this.applyFiltersToQuery(baseQuery, filters, fields);
      }
      
      // Apply sorts if provided
      if (sorts && sorts.length > 0) {
        baseQuery = this.applySortsToQuery(baseQuery, sorts, fields);
      } else {
        // Default sort by row index
        baseQuery = baseQuery.orderBy('row_index', 'asc');
      }
      
      return baseQuery;
    } catch (error) {
      logger.error('Error applying filters and sorts to query:', error);
      throw error;
    }
  }

  /**
   * Apply filters to a database query
   */
  static applyFiltersToQuery(query: any, filters: any[], fields: Field[]): any {
    try {
      // Convert simple filter array to filter config
      const filterConfig: FilterConfig = {
        root: {
          logicalOperator: 'AND',
          conditions: filters.map(filter => ({
            fieldId: filter.fieldId,
            operator: filter.operator,
            value: filter.value
          }))
        }
      };
      
      // Validate filter config
      const isValid = FilterConditionParser.validateFilterConfig(filterConfig, fields);
      
      if (!isValid) {
        logger.warn('Invalid filter configuration, ignoring filters');
        return query;
      }
      
      // Generate SQL for filter config
      const { sql, params } = FilterConditionParser.generateSqlForFilterConfig(filterConfig);
      
      // Apply SQL to query
      return query.whereRaw(sql, params);
    } catch (error) {
      logger.error('Error applying filters to query:', error);
      return query; // Return original query on error
    }
  }

  /**
   * Apply sorts to a database query
   */
  static applySortsToQuery(query: any, sorts: any[], fields: Field[]): any {
    try {
      // Convert sorts to sort configs
      const sortConfigs: SortConfig[] = sorts.map(sort => ({
        fieldId: sort.fieldId,
        direction: sort.direction
      }));
      
      // Validate each sort config
      const validSortConfigs = sortConfigs.filter(config => 
        SortingEngine.validateSortConfig(config, fields)
      );
      
      if (validSortConfigs.length === 0) {
        logger.warn('No valid sort configurations found, using default sort');
        return query.orderBy('row_index', 'asc');
      }
      
      // Generate ORDER BY clause
      const orderByClause = SortingEngine.generateSqlOrderBy(validSortConfigs);
      
      // Apply ORDER BY to query
      return query.orderByRaw(orderByClause);
    } catch (error) {
      logger.error('Error applying sorts to query:', error);
      return query.orderBy('row_index', 'asc'); // Return default sort on error
    }
  }

  /**
   * Apply filters and sorts to records in memory
   * Useful for client-side filtering and sorting
   */
  static filterAndSortRecords(
    records: any[],
    filters: FilterCondition[],
    sorts: SortConfig[],
    fields: Field[]
  ): any[] {
    try {
      let filteredRecords = records;
      
      // Apply filters if provided
      if (filters && filters.length > 0) {
        filteredRecords = this.filterRecords(filteredRecords, filters, fields);
      }
      
      // Apply sorts if provided
      if (sorts && sorts.length > 0) {
        filteredRecords = SortingEngine.sortRecords(filteredRecords, sorts, fields);
      } else {
        // Default sort by row index
        filteredRecords = [...filteredRecords].sort((a, b) => a.row_index - b.row_index);
      }
      
      return filteredRecords;
    } catch (error) {
      logger.error('Error filtering and sorting records:', error);
      return records; // Return original records on error
    }
  }

  /**
   * Filter records in memory
   */
  static filterRecords(records: any[], filters: FilterCondition[], fields: Field[]): any[] {
    try {
      if (!filters || filters.length === 0) {
        return records;
      }
      
      // Convert simple filter array to filter config
      const filterConfig: FilterConfig = {
        root: {
          logicalOperator: 'AND',
          conditions: filters
        }
      };
      
      // Validate filter config
      const isValid = FilterConditionParser.validateFilterConfig(filterConfig, fields);
      
      if (!isValid) {
        logger.warn('Invalid filter configuration, ignoring filters');
        return records;
      }
      
      return records.filter(record => this.evaluateFilterGroup(record, filterConfig.root, fields));
    } catch (error) {
      logger.error('Error filtering records:', error);
      return records; // Return original records on error
    }
  }

  /**
   * Evaluate a filter group against a record
   */
  static evaluateFilterGroup(record: any, group: FilterGroup, fields: Field[]): boolean {
    try {
      const { logicalOperator, conditions } = group;
      
      if (!conditions || conditions.length === 0) {
        return true;
      }
      
      const results = conditions.map(condition => {
        if ('logicalOperator' in condition) {
          // This is a nested group
          return this.evaluateFilterGroup(record, condition as FilterGroup, fields);
        } else {
          // This is a condition
          return this.evaluateFilterCondition(record, condition as FilterCondition, fields);
        }
      });
      
      if (logicalOperator === 'AND') {
        return results.every(result => result);
      } else {
        return results.some(result => result);
      }
    } catch (error) {
      logger.error('Error evaluating filter group:', error);
      return true; // Default to true on error
    }
  }

  /**
   * Evaluate a filter condition against a record
   */
  static evaluateFilterCondition(record: any, condition: FilterCondition, fields: Field[]): boolean {
    try {
      const { fieldId, operator, value } = condition;
      const recordValue = record.fields[fieldId];
      const field = fields.find(f => f.id === fieldId);
      
      if (!field) {
        return true; // Field not found, default to true
      }
      
      switch (operator) {
        case 'equals':
          return recordValue === value;
          
        case 'notEquals':
          return recordValue !== value;
          
        case 'contains':
          return String(recordValue).toLowerCase().includes(String(value).toLowerCase());
          
        case 'notContains':
          return !String(recordValue).toLowerCase().includes(String(value).toLowerCase());
          
        case 'startsWith':
          return String(recordValue).toLowerCase().startsWith(String(value).toLowerCase());
          
        case 'endsWith':
          return String(recordValue).toLowerCase().endsWith(String(value).toLowerCase());
          
        case 'isEmpty':
          return recordValue === undefined || recordValue === null || recordValue === '';
          
        case 'isNotEmpty':
          return recordValue !== undefined && recordValue !== null && recordValue !== '';
          
        case 'greaterThan':
          return Number(recordValue) > Number(value);
          
        case 'lessThan':
          return Number(recordValue) < Number(value);
          
        case 'greaterThanOrEqual':
          return Number(recordValue) >= Number(value);
          
        case 'lessThanOrEqual':
          return Number(recordValue) <= Number(value);
          
        case 'before':
          return new Date(recordValue) < new Date(value);
          
        case 'after':
          return new Date(recordValue) > new Date(value);
          
        case 'onOrBefore':
          return new Date(recordValue) <= new Date(value);
          
        case 'onOrAfter':
          return new Date(recordValue) >= new Date(value);
          
        case 'exactDate':
          const recordDate = new Date(recordValue);
          const valueDate = new Date(value);
          return recordDate.toDateString() === valueDate.toDateString();
          
        case 'isChecked':
          return recordValue === true || recordValue === 'true';
          
        case 'isNotChecked':
          return recordValue === false || recordValue === 'false' || recordValue === null || recordValue === undefined;
          
        case 'hasOption':
          return recordValue === value;
          
        case 'hasNotOption':
          return recordValue !== value;
          
        case 'hasAllOptions':
          if (!Array.isArray(recordValue)) {
            return false;
          }
          return value.every((v: any) => recordValue.includes(v));
          
        case 'hasAnyOption':
          if (!Array.isArray(recordValue)) {
            return false;
          }
          return value.some((v: any) => recordValue.includes(v));
          
        default:
          return true; // Unknown operator, default to true
      }
    } catch (error) {
      logger.error('Error evaluating filter condition:', error);
      return true; // Default to true on error
    }
  }

  /**
   * Get filter suggestions for a field
   */
  static getFilterSuggestions(field: Field, partialValue?: string): FilterSuggestion[] {
    return FilterConditionParser.generateFilterSuggestions(field, partialValue);
  }

  /**
   * Get available operators for a field
   */
  static getAvailableOperators(field: Field): FilterOperator[] {
    return FilterConditionParser.getAvailableOperatorsForFieldType(field.type);
  }
  
  /**
   * Get operator metadata for display in UI
   */
  static getOperatorMetadata(operator: FilterOperator): FilterOperatorMetadata {
    return FilterConditionParser.getOperatorMetadata(operator);
  }
  
  /**
   * Get all operator metadata
   */
  static getAllOperatorMetadata(): Record<FilterOperator, FilterOperatorMetadata> {
    return FilterConditionParser.getAllOperatorsWithMetadata();
  }

  /**
   * Get recommended sort fields for a view type
   */
  static getRecommendedSortFields(fields: Field[], viewType: string): Field[] {
    return SortingEngine.getRecommendedSortFields(fields, viewType);
  }
  
  /**
   * Create a new filter configuration with a single condition
   */
  static createFilterConfig(fieldId: string, operator: FilterOperator, value?: any): FilterConfig {
    const condition = FilterConditionParser.createFilterCondition(fieldId, operator, value);
    const group = FilterConditionParser.createFilterGroup('AND');
    const configWithCondition = FilterConditionParser.addConditionToGroup(group, condition);
    
    return {
      root: configWithCondition,
      version: '1.0'
    };
  }
  
  /**
   * Add a condition to a filter configuration
   */
  static addConditionToFilterConfig(
    config: FilterConfig, 
    fieldId: string, 
    operator: FilterOperator, 
    value?: any, 
    parentGroupId?: string
  ): FilterConfig {
    const condition = FilterConditionParser.createFilterCondition(fieldId, operator, value);
    
    if (!parentGroupId) {
      // Add to root group
      const updatedRoot = FilterConditionParser.addConditionToGroup(config.root, condition);
      return {
        ...config,
        root: updatedRoot
      };
    }
    
    // Find the parent group and add the condition
    // This would require a more complex traversal of the filter tree
    // For now, we'll just add to the root group
    const updatedRoot = FilterConditionParser.addConditionToGroup(config.root, condition);
    return {
      ...config,
      root: updatedRoot
    };
  }
  
  /**
   * Add a nested group to a filter configuration
   */
  static addGroupToFilterConfig(
    config: FilterConfig, 
    logicalOperator: LogicalOperator = 'AND', 
    parentGroupId?: string
  ): FilterConfig {
    const newGroup = FilterConditionParser.createFilterGroup(logicalOperator);
    
    if (!parentGroupId) {
      // Add to root group
      const updatedRoot = FilterConditionParser.addNestedGroupToGroup(config.root, newGroup);
      return {
        ...config,
        root: updatedRoot
      };
    }
    
    // Find the parent group and add the nested group
    // This would require a more complex traversal of the filter tree
    // For now, we'll just add to the root group
    const updatedRoot = FilterConditionParser.addNestedGroupToGroup(config.root, newGroup);
    return {
      ...config,
      root: updatedRoot
    };
  }
  
  /**
   * Remove a condition or group from a filter configuration
   */
  static removeFromFilterConfig(config: FilterConfig, id: string): FilterConfig {
    const updatedRoot = FilterConditionParser.removeFromGroup(config.root, id);
    return {
      ...config,
      root: updatedRoot
    };
  }
  
  /**
   * Update a condition in a filter configuration
   */
  static updateConditionInFilterConfig(
    config: FilterConfig, 
    id: string, 
    updates: Partial<FilterCondition>
  ): FilterConfig {
    const updatedRoot = FilterConditionParser.updateConditionInGroup(config.root, id, updates);
    return {
      ...config,
      root: updatedRoot
    };
  }
  
  /**
   * Update a group's logical operator in a filter configuration
   */
  static updateGroupOperatorInFilterConfig(
    config: FilterConfig, 
    id: string, 
    logicalOperator: LogicalOperator
  ): FilterConfig {
    const updatedRoot = FilterConditionParser.updateGroupOperator(config.root, id, logicalOperator);
    return {
      ...config,
      root: updatedRoot
    };
  }
  
  /**
   * Optimize a filter configuration for performance
   */
  static optimizeFilterConfig(config: FilterConfig): FilterConfig {
    return FilterConditionParser.optimizeFilterConfig(config);
  }
  
  /**
   * Create a new sort configuration
   */
  static createSortConfig(fieldId: string, direction: SortDirection = 'asc'): SortConfigSet {
    const sortConfig = SortingEngine.createSortConfig(fieldId, direction, 0);
    return {
      sorts: [sortConfig],
      version: '1.0'
    };
  }
  
  /**
   * Add a sort to a sort configuration
   */
  static addSortToConfig(config: SortConfigSet, fieldId: string, direction: SortDirection = 'asc'): SortConfigSet {
    // Find the highest priority
    const highestPriority = config.sorts.reduce(
      (max, sort) => Math.max(max, sort.priority !== undefined ? sort.priority : 0), 
      -1
    );
    
    const newSort = SortingEngine.createSortConfig(fieldId, direction, highestPriority + 1);
    
    return {
      ...config,
      sorts: [...config.sorts, newSort]
    };
  }
  
  /**
   * Remove a sort from a sort configuration
   */
  static removeSortFromConfig(config: SortConfigSet, sortId: string): SortConfigSet {
    const filteredSorts = config.sorts.filter(sort => sort.id !== sortId);
    
    // Update priorities to be sequential
    const updatedSorts = SortingEngine.updateSortPriorities(filteredSorts);
    
    return {
      ...config,
      sorts: updatedSorts
    };
  }
  
  /**
   * Update a sort in a sort configuration
   */
  static updateSortInConfig(
    config: SortConfigSet, 
    sortId: string, 
    updates: Partial<SortConfig>
  ): SortConfigSet {
    const updatedSorts = config.sorts.map(sort => {
      if (sort.id === sortId) {
        return { ...sort, ...updates };
      }
      return sort;
    });
    
    return {
      ...config,
      sorts: updatedSorts
    };
  }
  
  /**
   * Reorder sorts in a sort configuration
   */
  static reorderSortsInConfig(config: SortConfigSet, sortIds: string[]): SortConfigSet {
    // Create a map of sort IDs to their new priorities
    const priorityMap = new Map<string, number>();
    sortIds.forEach((id, index) => {
      priorityMap.set(id, index);
    });
    
    // Update priorities based on the new order
    const updatedSorts = config.sorts.map(sort => {
      if (sort.id && priorityMap.has(sort.id)) {
        return { ...sort, priority: priorityMap.get(sort.id) };
      }
      return sort;
    });
    
    // Sort by priority
    const sortedSorts = updatedSorts.sort((a, b) => {
      const priorityA = a.priority !== undefined ? a.priority : Number.MAX_SAFE_INTEGER;
      const priorityB = b.priority !== undefined ? b.priority : Number.MAX_SAFE_INTEGER;
      return priorityA - priorityB;
    });
    
    return {
      ...config,
      sorts: sortedSorts
    };
  }
  
  /**
   * Get sort metadata for UI display
   */
  static getSortMetadata(sortConfigs: SortConfig[], fields: Field[]): SortMetadata[] {
    return SortingEngine.getAllSortMetadata(sortConfigs, fields);
  }
  
  /**
   * Optimize sort configurations for performance
   */
  static optimizeSortConfigs(sortConfigs: SortConfig[], fields: Field[]): SortConfig[] {
    return SortingEngine.optimizeSortConfigs(sortConfigs, fields);
  }
  
  /**
   * Measure filter and sort performance
   */
  static measurePerformance(
    records: any[], 
    filters: FilterCondition[], 
    sorts: SortConfig[], 
    fields: Field[]
  ): { filterTime: number; sortTime: number; totalTime: number } {
    const startTotal = performance.now();
    
    // Measure filter time
    const startFilter = performance.now();
    const filteredRecords = this.filterRecords(records, filters, fields);
    const endFilter = performance.now();
    const filterTime = endFilter - startFilter;
    
    // Measure sort time
    const startSort = performance.now();
    const sortedRecords = SortingEngine.sortRecords(filteredRecords, sorts, fields);
    const endSort = performance.now();
    const sortTime = endSort - startSort;
    
    const endTotal = performance.now();
    const totalTime = endTotal - startTotal;
    
    return { filterTime, sortTime, totalTime };
  }
}