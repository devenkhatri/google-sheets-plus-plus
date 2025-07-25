import { offlineStorageService } from './offlineStorageService';
import { conflictResolutionService } from './conflictResolutionService';
import { recordService } from './recordService';
import { tableService } from './tableService';
import { baseService } from './baseService';

interface SyncResult {
  success: boolean;
  error?: string;
  conflictDetected?: boolean;
}

interface SyncStats {
  totalPending: number;
  synced: number;
  failed: number;
  conflicts: number;
}

class BackgroundSyncService {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_COUNT = 3;
  // private readonly RETRY_DELAY = 5000; // 5 seconds

  /**
   * Start background sync process
   */
  start(): void {
    if (this.syncInterval) {
      this.stop();
    }

    this.syncInterval = setInterval(() => {
      this.syncPendingChanges();
    }, this.SYNC_INTERVAL);

    // Initial sync
    this.syncPendingChanges();
  }

  /**
   * Stop background sync process
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manually trigger sync
   */
  async syncNow(): Promise<SyncStats> {
    return await this.syncPendingChanges();
  }

  /**
   * Sync all pending changes
   */
  private async syncPendingChanges(): Promise<SyncStats> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return { totalPending: 0, synced: 0, failed: 0, conflicts: 0 };
    }

    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync...');
      return { totalPending: 0, synced: 0, failed: 0, conflicts: 0 };
    }

    this.syncInProgress = true;
    const stats: SyncStats = { totalPending: 0, synced: 0, failed: 0, conflicts: 0 };

    try {
      // Get all pending changes
      const pendingChanges = await offlineStorageService.getPendingChanges();
      stats.totalPending = pendingChanges.length;

      if (pendingChanges.length === 0) {
        return stats;
      }

      console.log(`Starting sync of ${pendingChanges.length} pending changes...`);

      // Process changes in order of timestamp
      for (const change of pendingChanges) {
        try {
          // Skip if max retries exceeded
          if (change.retryCount >= this.MAX_RETRY_COUNT) {
            console.warn(`Max retries exceeded for change ${change.id}, skipping...`);
            stats.failed++;
            continue;
          }

          const result = await this.syncSingleChange(change);
          
          if (result.success) {
            await offlineStorageService.removePendingChange(change.id);
            await offlineStorageService.markAsSynced(change.entityType, change.entityId);
            stats.synced++;
          } else if (result.conflictDetected) {
            stats.conflicts++;
          } else {
            await offlineStorageService.updatePendingChangeRetry(change.id, result.error);
            stats.failed++;
          }
        } catch (error) {
          console.error(`Error syncing change ${change.id}:`, error);
          await offlineStorageService.updatePendingChangeRetry(
            change.id, 
            error instanceof Error ? error.message : 'Unknown error'
          );
          stats.failed++;
        }
      }

      console.log('Sync completed:', stats);
      return stats;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single change
   */
  private async syncSingleChange(change: any): Promise<SyncResult> {
    try {
      switch (change.entityType) {
        case 'record':
          return await this.syncRecord(change);
        case 'table':
          return await this.syncTable(change);
        case 'base':
          return await this.syncBase(change);
        default:
          return { success: false, error: `Unknown entity type: ${change.entityType}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sync record changes
   */
  private async syncRecord(change: any): Promise<SyncResult> {
    try {
      switch (change.type) {
        case 'create':
          await recordService.createRecord(change.data.tableId, change.data);
          break;
          
        case 'update':
          // Check for conflicts before updating
          const existingRecord = await recordService.getRecord(change.entityId);
          if (existingRecord) {
            const conflict = await conflictResolutionService.detectConflicts(
              'record',
              change.entityId,
              change.data,
              existingRecord
            );
            
            if (conflict) {
              return { success: false, conflictDetected: true };
            }
          }
          
          await recordService.updateRecord(change.entityId, change.data);
          break;
          
        case 'delete':
          await recordService.deleteRecord(change.entityId);
          break;
          
        default:
          return { success: false, error: `Unknown change type: ${change.type}` };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Record sync failed' 
      };
    }
  }

  /**
   * Sync table changes
   */
  private async syncTable(change: any): Promise<SyncResult> {
    try {
      switch (change.type) {
        case 'create':
          await tableService.createTable(change.data.baseId, change.data);
          break;
          
        case 'update':
          // Check for conflicts before updating
          const existingTable = await tableService.getTable(change.entityId);
          if (existingTable) {
            const conflict = await conflictResolutionService.detectConflicts(
              'table',
              change.entityId,
              change.data,
              existingTable
            );
            
            if (conflict) {
              return { success: false, conflictDetected: true };
            }
          }
          
          await tableService.updateTable(change.entityId, change.data);
          break;
          
        case 'delete':
          await tableService.deleteTable(change.entityId);
          break;
          
        default:
          return { success: false, error: `Unknown change type: ${change.type}` };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Table sync failed' 
      };
    }
  }

  /**
   * Sync base changes
   */
  private async syncBase(change: any): Promise<SyncResult> {
    try {
      switch (change.type) {
        case 'create':
          await baseService.createBase(change.data);
          break;
          
        case 'update':
          // Check for conflicts before updating
          const existingBase = await baseService.getBase(change.entityId);
          if (existingBase) {
            const conflict = await conflictResolutionService.detectConflicts(
              'base',
              change.entityId,
              change.data,
              existingBase
            );
            
            if (conflict) {
              return { success: false, conflictDetected: true };
            }
          }
          
          await baseService.updateBase(change.entityId, change.data);
          break;
          
        case 'delete':
          await baseService.deleteBase(change.entityId);
          break;
          
        default:
          return { success: false, error: `Unknown change type: ${change.type}` };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Base sync failed' 
      };
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    syncInProgress: boolean;
    pendingChanges: number;
    lastSyncTime?: number;
  }> {
    const pendingChanges = await offlineStorageService.getPendingChanges();
    
    return {
      isOnline: navigator.onLine,
      syncInProgress: this.syncInProgress,
      pendingChanges: pendingChanges.length,
      lastSyncTime: this.getLastSyncTime(),
    };
  }

  /**
   * Get last sync time from localStorage
   */
  private getLastSyncTime(): number | undefined {
    const lastSync = localStorage.getItem('lastSyncTime');
    return lastSync ? parseInt(lastSync, 10) : undefined;
  }

  /**
   * Set last sync time in localStorage
   */
  private setLastSyncTime(): void {
    localStorage.setItem('lastSyncTime', Date.now().toString());
  }

  /**
   * Force sync all data from server
   */
  async forceSyncFromServer(): Promise<void> {
    console.log('Starting force sync from server...');
    
    try {
      // Get all bases and sync them
      const bases = await baseService.getAllBases();
      for (const base of bases) {
        await offlineStorageService.saveBase(base, 'synced');
        
        // Get tables for this base
        const tables = await tableService.getTablesByBase(base.id);
        for (const table of tables) {
          await offlineStorageService.saveTable(table, 'synced');
          
          // Get records for this table
          const records = await recordService.getRecords(table.id);
          for (const record of records) {
            await offlineStorageService.saveRecord(record, table.id, 'synced');
          }
        }
      }
      
      this.setLastSyncTime();
      console.log('Force sync completed successfully');
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Clear all offline data and resync
   */
  async resetAndResync(): Promise<void> {
    console.log('Resetting offline data and resyncing...');
    
    await offlineStorageService.clearAllData();
    await this.forceSyncFromServer();
  }
}

export const backgroundSyncService = new BackgroundSyncService();