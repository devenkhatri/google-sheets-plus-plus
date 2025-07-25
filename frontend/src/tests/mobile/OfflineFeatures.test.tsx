import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { Provider } from 'react-redux';
import { OfflineSyncStatus } from '../../components/OfflineSyncStatus';
import { offlineStorageService } from '../../services/offlineStorageService';
import { conflictResolutionService } from '../../services/conflictResolutionService';
import { backgroundSyncService } from '../../services/backgroundSyncService';

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: vi.fn(),
  close: vi.fn(),
  createObjectStore: vi.fn(),
  deleteObjectStore: vi.fn()
};

const mockIDBTransaction = {
  objectStore: vi.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null
};

const mockIDBObjectStore = {
  add: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  getAll: vi.fn(),
  count: vi.fn(),
  createIndex: vi.fn(),
  index: vi.fn()
};

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null
};

// Mock IndexedDB API
Object.defineProperty(window, 'indexedDB', {
  value: {
    open: vi.fn().mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        request.result = mockIDBDatabase;
        if (request.onsuccess) request.onsuccess({ target: request });
      }, 0);
      return request;
    }),
    deleteDatabase: vi.fn(),
    cmp: vi.fn()
  },
  configurable: true
});

// Mock redux store
const mockStore = (state: any) => ({
  getState: () => state,
  subscribe: vi.fn(),
  dispatch: vi.fn(),
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('Offline Features Tests', () => {
  let store: any;
  
  beforeEach(() => {
    store = mockStore({
      ui: {
        isOffline: false,
        syncStatus: 'idle',
        pendingChanges: 0
      }
    });
    
    vi.clearAllMocks();
    
    // Reset online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OfflineSyncStatus Component', () => {
    test('shows online status when connected', () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <OfflineSyncStatus />
          </ThemeProvider>
        </Provider>
      );

      // Should not show offline indicator when online
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    });

    test('shows offline status when disconnected', () => {
      const offlineStore = mockStore({
        ui: {
          isOffline: true,
          syncStatus: 'offline',
          pendingChanges: 3
        }
      });

      render(
        <Provider store={offlineStore}>
          <ThemeProvider theme={theme}>
            <OfflineSyncStatus />
          </ThemeProvider>
        </Provider>
      );

      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    test('shows sync status when syncing', () => {
      const syncingStore = mockStore({
        ui: {
          isOffline: false,
          syncStatus: 'syncing',
          pendingChanges: 2
        }
      });

      render(
        <Provider store={syncingStore}>
          <ThemeProvider theme={theme}>
            <OfflineSyncStatus />
          </ThemeProvider>
        </Provider>
      );

      expect(screen.getByText(/syncing/i)).toBeInTheDocument();
    });
  });

  describe('Offline Storage Service', () => {
    test('can store data offline', async () => {
      const testData = { id: '1', name: 'Test Record', value: 'test' };
      
      mockIDBObjectStore.add.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = testData.id;
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });

      mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);

      const result = await offlineStorageService.storeRecord('table1', testData);
      
      expect(result).toBeDefined();
    });

    test('can retrieve data from offline storage', async () => {
      const testData = { id: '1', name: 'Test Record', value: 'test' };
      
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = testData;
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });

      mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);

      const result = await offlineStorageService.getRecord('table1', '1');
      
      expect(result).toEqual(testData);
    });

    test('can get all records from offline storage', async () => {
      const testData = [
        { id: '1', name: 'Test Record 1' },
        { id: '2', name: 'Test Record 2' }
      ];
      
      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = testData;
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });

      mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);

      const result = await offlineStorageService.getAllRecords('table1');
      
      expect(result).toEqual(testData);
    });

    test('can delete records from offline storage', async () => {
      mockIDBObjectStore.delete.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = undefined;
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });

      mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
      mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);

      await offlineStorageService.deleteRecord('table1', '1');
      
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('Conflict Resolution Service', () => {
    test('detects conflicts between local and remote data', () => {
      const localRecord = {
        id: '1',
        name: 'Local Name',
        updated_at: '2023-01-01T10:00:00Z'
      };

      const remoteRecord = {
        id: '1',
        name: 'Remote Name',
        updated_at: '2023-01-01T11:00:00Z'
      };

      const hasConflict = conflictResolutionService.hasConflict(localRecord, remoteRecord);
      
      expect(hasConflict).toBe(true);
    });

    test('resolves conflicts using last-write-wins strategy', () => {
      const localRecord = {
        id: '1',
        name: 'Local Name',
        updated_at: '2023-01-01T10:00:00Z'
      };

      const remoteRecord = {
        id: '1',
        name: 'Remote Name',
        updated_at: '2023-01-01T11:00:00Z'
      };

      const resolved = conflictResolutionService.resolveConflict(
        localRecord, 
        remoteRecord, 
        'last-write-wins'
      );
      
      expect(resolved.name).toBe('Remote Name');
      expect(resolved.updated_at).toBe('2023-01-01T11:00:00Z');
    });

    test('can merge non-conflicting fields', () => {
      const localRecord = {
        id: '1',
        name: 'Local Name',
        description: 'Local Description',
        updated_at: '2023-01-01T10:00:00Z'
      };

      const remoteRecord = {
        id: '1',
        name: 'Remote Name',
        value: 'Remote Value',
        updated_at: '2023-01-01T11:00:00Z'
      };

      const resolved = conflictResolutionService.resolveConflict(
        localRecord, 
        remoteRecord, 
        'merge'
      );
      
      expect(resolved.name).toBe('Remote Name'); // Remote wins for conflicting field
      expect(resolved.description).toBe('Local Description'); // Local field preserved
      expect(resolved.value).toBe('Remote Value'); // Remote field added
    });
  });

  describe('Background Sync Service', () => {
    test('queues changes for sync when offline', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const change = {
        id: '1',
        type: 'update',
        table: 'table1',
        data: { name: 'Updated Name' },
        timestamp: Date.now()
      };

      await backgroundSyncService.queueChange(change);
      
      const pendingChanges = await backgroundSyncService.getPendingChanges();
      expect(pendingChanges).toContain(change);
    });

    test('syncs changes when coming back online', async () => {
      const mockSyncFunction = vi.fn().mockResolvedValue(true);
      
      // Queue some changes while offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      await backgroundSyncService.queueChange({
        id: '1',
        type: 'update',
        table: 'table1',
        data: { name: 'Updated Name' },
        timestamp: Date.now()
      });

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      await backgroundSyncService.syncPendingChanges(mockSyncFunction);
      
      expect(mockSyncFunction).toHaveBeenCalled();
    });

    test('handles sync failures gracefully', async () => {
      const mockSyncFunction = vi.fn().mockRejectedValue(new Error('Sync failed'));
      
      await backgroundSyncService.queueChange({
        id: '1',
        type: 'update',
        table: 'table1',
        data: { name: 'Updated Name' },
        timestamp: Date.now()
      });

      // Should not throw error
      await expect(backgroundSyncService.syncPendingChanges(mockSyncFunction))
        .resolves.not.toThrow();
    });
  });

  describe('Network State Detection', () => {
    test('detects online/offline state changes', () => {
      let isOnline = navigator.onLine;
      expect(isOnline).toBe(true);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      isOnline = navigator.onLine;
      expect(isOnline).toBe(false);
    });

    test('can listen for online/offline events', () => {
      const onlineHandler = vi.fn();
      const offlineHandler = vi.fn();

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
      expect(offlineHandler).toHaveBeenCalled();

      // Simulate online event
      window.dispatchEvent(new Event('online'));
      expect(onlineHandler).toHaveBeenCalled();

      // Cleanup
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    });
  });

  describe('Data Synchronization', () => {
    test('handles partial sync failures', async () => {
      const changes = [
        { id: '1', type: 'update', table: 'table1', data: { name: 'Name 1' } },
        { id: '2', type: 'update', table: 'table1', data: { name: 'Name 2' } },
        { id: '3', type: 'update', table: 'table1', data: { name: 'Name 3' } }
      ];

      const mockSyncFunction = vi.fn()
        .mockResolvedValueOnce(true)  // First change succeeds
        .mockRejectedValueOnce(new Error('Network error'))  // Second fails
        .mockResolvedValueOnce(true); // Third succeeds

      for (const change of changes) {
        await backgroundSyncService.queueChange(change);
      }

      await backgroundSyncService.syncPendingChanges(mockSyncFunction);

      // Should have attempted to sync all changes
      expect(mockSyncFunction).toHaveBeenCalledTimes(3);
    });

    test('preserves change order during sync', async () => {
      const changes = [
        { id: '1', type: 'create', table: 'table1', data: { name: 'First' }, timestamp: 1000 },
        { id: '1', type: 'update', table: 'table1', data: { name: 'Second' }, timestamp: 2000 },
        { id: '1', type: 'update', table: 'table1', data: { name: 'Third' }, timestamp: 3000 }
      ];

      const syncCalls: any[] = [];
      const mockSyncFunction = vi.fn().mockImplementation((change) => {
        syncCalls.push(change);
        return Promise.resolve(true);
      });

      for (const change of changes) {
        await backgroundSyncService.queueChange(change);
      }

      await backgroundSyncService.syncPendingChanges(mockSyncFunction);

      // Changes should be synced in timestamp order
      expect(syncCalls[0].timestamp).toBeLessThan(syncCalls[1].timestamp);
      expect(syncCalls[1].timestamp).toBeLessThan(syncCalls[2].timestamp);
    });
  });
});