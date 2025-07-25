import { useState, useEffect, useCallback } from 'react';
import { offlineStorageService } from '../services/offlineStorageService';
import { backgroundSyncService } from '../services/backgroundSyncService';
import { conflictResolutionService, ConflictData } from '../services/conflictResolutionService';

interface OfflineSyncState {
  isOnline: boolean;
  syncInProgress: boolean;
  pendingChanges: number;
  conflicts: ConflictData[];
  lastSyncTime?: number;
  storageSize: {
    records: number;
    tables: number;
    bases: number;
    pendingChanges: number;
  };
}

interface OfflineSyncActions {
  syncNow: () => Promise<void>;
  forceSyncFromServer: () => Promise<void>;
  resetAndResync: () => Promise<void>;
  resolveConflict: (entityId: string, strategy: 'local' | 'remote' | 'merge', mergedData?: any) => Promise<void>;
  clearOfflineData: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState & OfflineSyncActions {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    syncInProgress: false,
    pendingChanges: 0,
    conflicts: [],
    storageSize: {
      records: 0,
      tables: 0,
      bases: 0,
      pendingChanges: 0,
    },
  });

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Trigger sync when coming back online
      backgroundSyncService.syncNow();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update sync status periodically
  useEffect(() => {
    const updateSyncStatus = async () => {
      try {
        const syncStatus = await backgroundSyncService.getSyncStatus();
        const conflicts = conflictResolutionService.getAllConflicts();
        const storageSize = await offlineStorageService.getStorageSize();

        setState(prev => ({
          ...prev,
          syncInProgress: syncStatus.syncInProgress,
          pendingChanges: syncStatus.pendingChanges,
          lastSyncTime: syncStatus.lastSyncTime,
          conflicts,
          storageSize,
        }));
      } catch (error) {
        console.error('Failed to update sync status:', error);
      }
    };

    // Initial update
    updateSyncStatus();

    // Update every 5 seconds
    const interval = setInterval(updateSyncStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Start background sync service
  useEffect(() => {
    backgroundSyncService.start();

    return () => {
      backgroundSyncService.stop();
    };
  }, []);

  const syncNow = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, syncInProgress: true }));
      await backgroundSyncService.syncNow();
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, syncInProgress: false }));
    }
  }, []);

  const forceSyncFromServer = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, syncInProgress: true }));
      await backgroundSyncService.forceSyncFromServer();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, syncInProgress: false }));
    }
  }, []);

  const resetAndResync = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, syncInProgress: true }));
      await backgroundSyncService.resetAndResync();
    } catch (error) {
      console.error('Reset and resync failed:', error);
      throw error;
    } finally {
      setState(prev => ({ ...prev, syncInProgress: false }));
    }
  }, []);

  const resolveConflict = useCallback(async (
    entityId: string,
    strategy: 'local' | 'remote' | 'merge',
    mergedData?: any
  ) => {
    try {
      await conflictResolutionService.resolveConflict(entityId, {
        strategy,
        mergedData,
        resolvedBy: 'user',
        resolvedAt: Date.now(),
      });

      // Update conflicts in state
      const updatedConflicts = conflictResolutionService.getAllConflicts();
      setState(prev => ({ ...prev, conflicts: updatedConflicts }));
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }, []);

  const clearOfflineData = useCallback(async () => {
    try {
      await offlineStorageService.clearAllData();
      setState(prev => ({
        ...prev,
        pendingChanges: 0,
        conflicts: [],
        storageSize: {
          records: 0,
          tables: 0,
          bases: 0,
          pendingChanges: 0,
        },
      }));
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, []);

  return {
    ...state,
    syncNow,
    forceSyncFromServer,
    resetAndResync,
    resolveConflict,
    clearOfflineData,
  };
}