import { offlineStorageService } from './offlineStorageService';

export interface ConflictData {
  entityType: 'record' | 'table' | 'base';
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  conflictFields: string[];
  timestamp: number;
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  mergedData?: any;
  resolvedBy: string;
  resolvedAt: number;
}

class ConflictResolutionService {
  private conflicts: Map<string, ConflictData> = new Map();
  private resolutionCallbacks: Map<string, (conflict: ConflictData) => void> = new Map();

  /**
   * Detect conflicts between local and remote data
   */
  async detectConflicts(
    entityType: 'record' | 'table' | 'base',
    entityId: string,
    localData: any,
    remoteData: any
  ): Promise<ConflictData | null> {
    // If versions are the same, no conflict
    if (localData.version === remoteData.version) {
      return null;
    }

    // If local version is newer, check for conflicts
    if (localData.lastModified > remoteData.lastModified) {
      const conflictFields = this.findConflictingFields(localData, remoteData);
      
      if (conflictFields.length > 0) {
        const conflict: ConflictData = {
          entityType,
          entityId,
          localVersion: localData,
          remoteVersion: remoteData,
          conflictFields,
          timestamp: Date.now(),
        };

        this.conflicts.set(entityId, conflict);
        await offlineStorageService.markAsConflict(entityType, entityId);
        
        // Notify conflict callback if registered
        const callback = this.resolutionCallbacks.get(entityId);
        if (callback) {
          callback(conflict);
        }

        return conflict;
      }
    }

    return null;
  }

  /**
   * Find fields that have conflicting values
   */
  private findConflictingFields(localData: any, remoteData: any): string[] {
    const conflictFields: string[] = [];
    
    // Compare all fields in the data
    const allFields = new Set([
      ...Object.keys(localData.data || localData),
      ...Object.keys(remoteData.data || remoteData),
    ]);

    for (const field of allFields) {
      const localValue = (localData.data || localData)[field];
      const remoteValue = (remoteData.data || remoteData)[field];
      
      if (!this.isEqual(localValue, remoteValue)) {
        conflictFields.push(field);
      }
    }

    return conflictFields;
  }

  /**
   * Deep equality check for values
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      
      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => this.isEqual(item, b[index]));
      }
      
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => this.isEqual(a[key], b[key]));
    }
    
    return false;
  }

  /**
   * Resolve conflict with specified strategy
   */
  async resolveConflict(
    entityId: string,
    resolution: ConflictResolution
  ): Promise<any> {
    const conflict = this.conflicts.get(entityId);
    if (!conflict) {
      throw new Error(`No conflict found for entity ${entityId}`);
    }

    let resolvedData: any;

    switch (resolution.strategy) {
      case 'local':
        resolvedData = conflict.localVersion;
        break;
        
      case 'remote':
        resolvedData = conflict.remoteVersion;
        break;
        
      case 'merge':
        resolvedData = this.mergeData(conflict.localVersion, conflict.remoteVersion);
        break;
        
      case 'manual':
        if (!resolution.mergedData) {
          throw new Error('Manual resolution requires merged data');
        }
        resolvedData = resolution.mergedData;
        break;
        
      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }

    // Update the resolved data with conflict resolution metadata
    resolvedData.conflictResolution = {
      strategy: resolution.strategy,
      resolvedBy: resolution.resolvedBy,
      resolvedAt: resolution.resolvedAt,
      originalConflict: {
        localVersion: conflict.localVersion.version,
        remoteVersion: conflict.remoteVersion.version,
        conflictFields: conflict.conflictFields,
      },
    };

    // Save resolved data to offline storage
    switch (conflict.entityType) {
      case 'record':
        await offlineStorageService.saveRecord(resolvedData, conflict.localVersion.tableId, 'pending');
        break;
      case 'table':
        await offlineStorageService.saveTable(resolvedData, 'pending');
        break;
      case 'base':
        await offlineStorageService.saveBase(resolvedData, 'pending');
        break;
    }

    // Remove conflict from memory
    this.conflicts.delete(entityId);

    return resolvedData;
  }

  /**
   * Merge local and remote data using a simple strategy
   */
  private mergeData(localData: any, remoteData: any): any {
    const merged = { ...remoteData };
    
    // Use local changes for fields that were modified more recently
    if (localData.lastModified > remoteData.lastModified) {
      // Merge field by field, preferring local changes
      const localFields = localData.data || localData;
      const remoteFields = remoteData.data || remoteData;
      
      merged.data = { ...remoteFields, ...localFields };
    }
    
    // Update metadata
    merged.version = Math.max(localData.version || 1, remoteData.version || 1) + 1;
    merged.lastModified = Date.now();
    
    return merged;
  }

  /**
   * Get all current conflicts
   */
  getAllConflicts(): ConflictData[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get conflict for specific entity
   */
  getConflict(entityId: string): ConflictData | undefined {
    return this.conflicts.get(entityId);
  }

  /**
   * Register callback for conflict notifications
   */
  onConflict(entityId: string, callback: (conflict: ConflictData) => void): void {
    this.resolutionCallbacks.set(entityId, callback);
  }

  /**
   * Unregister conflict callback
   */
  offConflict(entityId: string): void {
    this.resolutionCallbacks.delete(entityId);
  }

  /**
   * Auto-resolve conflicts using default strategy
   */
  async autoResolveConflicts(strategy: 'local' | 'remote' | 'merge' = 'merge'): Promise<void> {
    const conflicts = this.getAllConflicts();
    
    for (const conflict of conflicts) {
      try {
        await this.resolveConflict(conflict.entityId, {
          strategy,
          resolvedBy: 'auto-resolver',
          resolvedAt: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to auto-resolve conflict for ${conflict.entityId}:`, error);
      }
    }
  }

  /**
   * Clear all conflicts
   */
  clearAllConflicts(): void {
    this.conflicts.clear();
    this.resolutionCallbacks.clear();
  }
}

export const conflictResolutionService = new ConflictResolutionService();