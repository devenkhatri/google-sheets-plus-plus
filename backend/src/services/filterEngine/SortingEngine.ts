import { Field, FieldType } from '../../models/Field';
import { logger } from '../../utils/logger';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration for a single field
 */
export interface SortConfig {
  fieldId: string;
  direction: SortDirection;
  id?: string; // Unique identifier for the sort
  priority?: number; // Priority for multi-level sorting (lower number = higher priority)
}

/**
 * Complete sort configuration
 */
export interface SortConfigSet {
  sorts: SortConfig[];
  version?: string; // For tracking schema versions
}

/**
 * Sort metadata for UI display
 */
export interface SortMetadata {
  fieldId: string;
  fieldName: string;
  fieldType: FieldType;
  direction: SortDirection;
  priority: number;
  id: string;
}

/**
 * Class for handling sorting operations
 */
export class SortingEngine {
  /**
   * Validate a sort configuration
   */
  static validateSortConfig(sortConfig: SortConfig, fields: Field[]): boolean {
    try {
      const { fieldId } = sortConfig;
      
      // Check if field exists
      const field = fields.find(f => f.id === fieldId);
      if (!field) {
        logger.warn(`Field with ID ${fieldId} not found for sorting`);
        return false;
      }
      
      // All field types can be sorted
      return true;
    } catch (error) {
      logger.error('Error validating sort configuration:', error);
      return false;
    }
  }

  /**
   * Generate SQL ORDER BY clause for a sort configuration
   */
  static generateSqlOrderBy(sortConfigs: SortConfig[]): string {
    if (!sortConfigs || sortConfigs.length === 0) {
      return 'row_index ASC';
    }

    const orderClauses = sortConfigs.map(config => {
      const { fieldId, direction } = config;
      const dir = direction.toUpperCase();
      
      // For JSON fields, we need to extract the value and handle nulls
      return `fields->>'${fieldId}' ${dir} NULLS LAST`;
    });

    // Add row_index as the final sort to ensure consistent ordering
    orderClauses.push('row_index ASC');
    
    return orderClauses.join(', ');
  }

  /**
   * Generate SQL ORDER BY clause for a specific field type
   */
  static generateFieldTypeSqlOrderBy(fieldId: string, fieldType: FieldType, direction: SortDirection): string {
    const dir = direction.toUpperCase();
    
    switch (fieldType) {
      case 'number':
        // Cast to numeric for proper number sorting
        return `(fields->>'${fieldId}')::numeric ${dir} NULLS LAST`;
        
      case 'date':
        // Cast to timestamp for proper date sorting
        return `(fields->>'${fieldId}')::timestamp ${dir} NULLS LAST`;
        
      case 'checkbox':
        // Sort booleans with true first for ascending
        return `(fields->>'${fieldId}')::boolean ${dir} NULLS LAST`;
        
      default:
        // Default text sorting
        return `fields->>'${fieldId}' ${dir} NULLS LAST`;
    }
  }

  /**
   * Get recommended sort fields based on view type
   */
  static getRecommendedSortFields(fields: Field[], viewType: string): Field[] {
    switch (viewType) {
      case 'kanban':
        // For kanban, recommend single select fields first
        return [
          ...fields.filter(f => f.type === 'singleSelect'),
          ...fields.filter(f => f.type !== 'singleSelect')
        ];
        
      case 'calendar':
        // For calendar, recommend date fields first
        return [
          ...fields.filter(f => f.type === 'date'),
          ...fields.filter(f => f.type !== 'date')
        ];
        
      case 'gallery':
        // For gallery, recommend attachment fields first
        return [
          ...fields.filter(f => f.type === 'attachment'),
          ...fields.filter(f => f.type !== 'attachment')
        ];
        
      case 'grid':
      default:
        // For grid, no specific recommendation
        return fields;
    }
  }

  /**
   * Apply in-memory sorting to records
   * Useful for client-side sorting or when database sorting is not available
   */
  static sortRecords(records: any[], sortConfigs: SortConfig[], fields: Field[]): any[] {
    if (!sortConfigs || sortConfigs.length === 0) {
      return [...records].sort((a, b) => a.row_index - b.row_index);
    }

    // Sort the sort configs by priority if available
    const prioritizedSorts = [...sortConfigs].sort((a, b) => {
      const priorityA = a.priority !== undefined ? a.priority : Number.MAX_SAFE_INTEGER;
      const priorityB = b.priority !== undefined ? b.priority : Number.MAX_SAFE_INTEGER;
      return priorityA - priorityB;
    });

    return [...records].sort((a, b) => {
      for (const config of prioritizedSorts) {
        const { fieldId, direction } = config;
        const field = fields.find(f => f.id === fieldId);
        
        if (!field) continue;
        
        const valueA = a.fields[fieldId];
        const valueB = b.fields[fieldId];
        
        // Handle null/undefined values
        if (valueA === undefined || valueA === null) {
          return direction === 'asc' ? 1 : -1; // Nulls last for asc, first for desc
        }
        if (valueB === undefined || valueB === null) {
          return direction === 'asc' ? -1 : 1; // Nulls last for asc, first for desc
        }
        
        let comparison = 0;
        
        switch (field.type) {
          case 'number':
            comparison = Number(valueA) - Number(valueB);
            break;
            
          case 'date':
            comparison = new Date(valueA).getTime() - new Date(valueB).getTime();
            break;
            
          case 'checkbox':
            comparison = (valueA === true ? 1 : 0) - (valueB === true ? 1 : 0);
            break;
            
          case 'singleSelect':
          case 'multiSelect':
            // For select fields, use string comparison
            if (Array.isArray(valueA) && Array.isArray(valueB)) {
              // For multiSelect, compare first values
              comparison = String(valueA[0] || '').localeCompare(String(valueB[0] || ''));
            } else {
              comparison = String(valueA).localeCompare(String(valueB));
            }
            break;
            
          default:
            comparison = String(valueA).localeCompare(String(valueB));
        }
        
        if (comparison !== 0) {
          return direction === 'asc' ? comparison : -comparison;
        }
      }
      
      // If all sort fields are equal, sort by row_index
      return a.row_index - b.row_index;
    });
  }
  
  /**
   * Create a new sort configuration
   */
  static createSortConfig(fieldId: string, direction: SortDirection = 'asc', priority?: number): SortConfig {
    return {
      id: this.generateId(),
      fieldId,
      direction,
      priority
    };
  }
  
  /**
   * Generate a unique ID for sort configs
   */
  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Get sort metadata for UI display
   */
  static getSortMetadata(sortConfig: SortConfig, fields: Field[]): SortMetadata | null {
    const field = fields.find(f => f.id === sortConfig.fieldId);
    
    if (!field) {
      return null;
    }
    
    return {
      fieldId: sortConfig.fieldId,
      fieldName: field.name,
      fieldType: field.type,
      direction: sortConfig.direction,
      priority: sortConfig.priority !== undefined ? sortConfig.priority : 0,
      id: sortConfig.id || this.generateId()
    };
  }
  
  /**
   * Get all sort metadata for UI display
   */
  static getAllSortMetadata(sortConfigs: SortConfig[], fields: Field[]): SortMetadata[] {
    return sortConfigs
      .map(config => this.getSortMetadata(config, fields))
      .filter((metadata): metadata is SortMetadata => metadata !== null)
      .sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Update sort priority based on field order
   */
  static updateSortPriorities(sortConfigs: SortConfig[]): SortConfig[] {
    return sortConfigs.map((config, index) => ({
      ...config,
      priority: index
    }));
  }
  
  /**
   * Optimize sort configurations for performance
   */
  static optimizeSortConfigs(sortConfigs: SortConfig[], fields: Field[]): SortConfig[] {
    // Remove sorts for fields that don't exist
    const validSorts = sortConfigs.filter(config => 
      fields.some(field => field.id === config.fieldId)
    );
    
    // Ensure all sorts have priorities
    const withPriorities = validSorts.map((config, index) => ({
      ...config,
      priority: config.priority !== undefined ? config.priority : index
    }));
    
    // Sort by priority
    return withPriorities.sort((a, b) => a.priority! - b.priority!);
  }
}