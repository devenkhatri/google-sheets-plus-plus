import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import { conflictResolutionService } from '../conflictResolutionService';
import { offlineStorageService } from '../offlineStorageService';

describe('ConflictResolutionService', () => {
  beforeEach(async () => {
    await offlineStorageService.clearAllData();
    conflictResolutionService.clearAllConflicts();
  });

  describe('Conflict detection', () => {
    it('should detect conflicts when versions differ', async () => {
      const localData = {
        id: 'record-1',
        data: { name: 'Local Name', value: 100 },
        version: 2,
        lastModified: Date.now(),
      };

      const remoteData = {
        id: 'record-1',
        data: { name: 'Remote Name', value: 200 },
        version: 1,
        lastModified: Date.now() - 1000,
      };

      const conflict = await conflictResolutionService.detectConflicts(
        'record',
        'record-1',
        localData,
        remoteData
      );

      expect(conflict).toBeTruthy();
      expect(conflict?.conflictFields).toEqual(['name', 'value']);
      expect(conflict?.entityId).toBe('record-1');
      expect(conflict?.entityType).toBe('record');
    });

    it('should not detect conflicts when data is identical', async () => {
      const localData = {
        id: 'record-1',
        data: { name: 'Same Name', value: 100 },
        version: 1,
        lastModified: Date.now(),
      };

      const remoteData = {
        id: 'record-1',
        data: { name: 'Same Name', value: 100 },
        version: 1,
        lastModified: Date.now(),
      };

      const conflict = await conflictResolutionService.detectConflicts(
        'record',
        'record-1',
        localData,
        remoteData
      );

      expect(conflict).toBeNull();
    });

    it('should not detect conflicts when versions are the same', async () => {
      const localData = {
        id: 'record-1',
        data: { name: 'Local Name', value: 100 },
        version: 1,
        lastModified: Date.now(),
      };

      const remoteData = {
        id: 'record-1',
        data: { name: 'Remote Name', value: 200 },
        version: 1,
        lastModified: Date.now(),
      };

      const conflict = await conflictResolutionService.detectConflicts(
        'record',
        'record-1',
        localData,
        remoteData
      );

      expect(conflict).toBeNull();
    });
  });

  describe('Conflict resolution', () => {
    let testConflict: any;

    beforeEach(async () => {
      const localData = {
        id: 'record-1',
        tableId: 'table-1',
        data: { name: 'Local Name', value: 100 },
        version: 2,
        lastModified: Date.now(),
      };

      const remoteData = {
        id: 'record-1',
        tableId: 'table-1',
        data: { name: 'Remote Name', value: 200 },
        version: 1,
        lastModified: Date.now() - 1000,
      };

      testConflict = await conflictResolutionService.detectConflicts(
        'record',
        'record-1',
        localData,
        remoteData
      );
    });

    it('should resolve conflict using local strategy', async () => {
      const resolved = await conflictResolutionService.resolveConflict('record-1', {
        strategy: 'local',
        resolvedBy: 'user',
        resolvedAt: Date.now(),
      });

      expect(resolved.data.name).toBe('Local Name');
      expect(resolved.data.value).toBe(100);
      expect(resolved.conflictResolution.strategy).toBe('local');
    });

    it('should resolve conflict using remote strategy', async () => {
      const resolved = await conflictResolutionService.resolveConflict('record-1', {
        strategy: 'remote',
        resolvedBy: 'user',
        resolvedAt: Date.now(),
      });

      expect(resolved.data.name).toBe('Remote Name');
      expect(resolved.data.value).toBe(200);
      expect(resolved.conflictResolution.strategy).toBe('remote');
    });

    it('should resolve conflict using merge strategy', async () => {
      const resolved = await conflictResolutionService.resolveConflict('record-1', {
        strategy: 'merge',
        resolvedBy: 'user',
        resolvedAt: Date.now(),
      });

      // Merge should prefer local changes when local is newer
      expect(resolved.data.name).toBe('Local Name');
      expect(resolved.data.value).toBe(100);
      expect(resolved.conflictResolution.strategy).toBe('merge');
      expect(resolved.version).toBeGreaterThan(2);
    });

    it('should resolve conflict using manual strategy', async () => {
      const manualData = {
        id: 'record-1',
        tableId: 'table-1',
        data: { name: 'Manual Name', value: 300 },
        version: 3,
        lastModified: Date.now(),
      };

      const resolved = await conflictResolutionService.resolveConflict('record-1', {
        strategy: 'manual',
        mergedData: manualData,
        resolvedBy: 'user',
        resolvedAt: Date.now(),
      });

      expect(resolved.data.name).toBe('Manual Name');
      expect(resolved.data.value).toBe(300);
      expect(resolved.conflictResolution.strategy).toBe('manual');
    });

    it('should throw error for manual strategy without merged data', async () => {
      await expect(
        conflictResolutionService.resolveConflict('record-1', {
          strategy: 'manual',
          resolvedBy: 'user',
          resolvedAt: Date.now(),
        })
      ).rejects.toThrow('Manual resolution requires merged data');
    });
  });

  describe('Conflict management', () => {
    it('should get all conflicts', async () => {
      const localData1 = {
        id: 'record-1',
        data: { name: 'Local 1' },
        version: 2,
        lastModified: Date.now(),
      };
      const remoteData1 = {
        id: 'record-1',
        data: { name: 'Remote 1' },
        version: 1,
        lastModified: Date.now() - 1000,
      };

      const localData2 = {
        id: 'record-2',
        data: { name: 'Local 2' },
        version: 2,
        lastModified: Date.now(),
      };
      const remoteData2 = {
        id: 'record-2',
        data: { name: 'Remote 2' },
        version: 1,
        lastModified: Date.now() - 1000,
      };

      await conflictResolutionService.detectConflicts('record', 'record-1', localData1, remoteData1);
      await conflictResolutionService.detectConflicts('record', 'record-2', localData2, remoteData2);

      const conflicts = conflictResolutionService.getAllConflicts();
      expect(conflicts).toHaveLength(2);
      expect(conflicts.map(c => c.entityId)).toEqual(['record-1', 'record-2']);
    });

    it('should get specific conflict', async () => {
      const localData = {
        id: 'record-1',
        data: { name: 'Local Name' },
        version: 2,
        lastModified: Date.now(),
      };
      const remoteData = {
        id: 'record-1',
        data: { name: 'Remote Name' },
        version: 1,
        lastModified: Date.now() - 1000,
      };

      await conflictResolutionService.detectConflicts('record', 'record-1', localData, remoteData);

      const conflict = conflictResolutionService.getConflict('record-1');
      expect(conflict).toBeTruthy();
      expect(conflict?.entityId).toBe('record-1');
    });

    it('should auto-resolve conflicts', async () => {
      const localData = {
        id: 'record-1',
        tableId: 'table-1',
        data: { name: 'Local Name' },
        version: 2,
        lastModified: Date.now(),
      };
      const remoteData = {
        id: 'record-1',
        tableId: 'table-1',
        data: { name: 'Remote Name' },
        version: 1,
        lastModified: Date.now() - 1000,
      };

      await conflictResolutionService.detectConflicts('record', 'record-1', localData, remoteData);
      expect(conflictResolutionService.getAllConflicts()).toHaveLength(1);

      await conflictResolutionService.autoResolveConflicts('local');
      expect(conflictResolutionService.getAllConflicts()).toHaveLength(0);
    });
  });

  describe('Conflict callbacks', () => {
    it('should call conflict callback when conflict is detected', async () => {
      const callback = vi.fn();
      conflictResolutionService.onConflict('record-1', callback);

      const localData = {
        id: 'record-1',
        data: { name: 'Local Name' },
        version: 2,
        lastModified: Date.now(),
      };
      const remoteData = {
        id: 'record-1',
        data: { name: 'Remote Name' },
        version: 1,
        lastModified: Date.now() - 1000,
      };

      await conflictResolutionService.detectConflicts('record', 'record-1', localData, remoteData);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'record-1',
          entityType: 'record',
        })
      );
    });

    it('should unregister conflict callback', async () => {
      const callback = vi.fn();
      conflictResolutionService.onConflict('record-1', callback);
      conflictResolutionService.offConflict('record-1');

      const localData = {
        id: 'record-1',
        data: { name: 'Local Name' },
        version: 2,
        lastModified: Date.now(),
      };
      const remoteData = {
        id: 'record-1',
        data: { name: 'Remote Name' },
        version: 1,
        lastModified: Date.now() - 1000,
      };

      await conflictResolutionService.detectConflicts('record', 'record-1', localData, remoteData);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});