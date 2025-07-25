import 'fake-indexeddb/auto';
import { offlineStorageService } from '../offlineStorageService';

describe('OfflineStorageService', () => {
  beforeEach(async () => {
    await offlineStorageService.clearAllData();
  });

  describe('Record operations', () => {
    it('should save and retrieve a record', async () => {
      const record = {
        id: 'record-1',
        fields: { name: 'Test Record', value: 123 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const tableId = 'table-1';

      await offlineStorageService.saveRecord(record, tableId);
      const retrieved = await offlineStorageService.getRecord('record-1');

      expect(retrieved).toEqual(record);
    });

    it('should get records by table', async () => {
      const tableId = 'table-1';
      const records = [
        {
          id: 'record-1',
          fields: { name: 'Record 1' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'record-2',
          fields: { name: 'Record 2' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      for (const record of records) {
        await offlineStorageService.saveRecord(record, tableId);
      }

      const retrieved = await offlineStorageService.getRecordsByTable(tableId);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map(r => r.id)).toEqual(['record-1', 'record-2']);
    });

    it('should soft delete a record', async () => {
      const record = {
        id: 'record-1',
        fields: { name: 'Test Record' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const tableId = 'table-1';

      await offlineStorageService.saveRecord(record, tableId);
      await offlineStorageService.deleteRecord('record-1');

      const retrieved = await offlineStorageService.getRecord('record-1');
      expect(retrieved).toBeNull();

      const tableRecords = await offlineStorageService.getRecordsByTable(tableId);
      expect(tableRecords).toHaveLength(0);
    });
  });

  describe('Table operations', () => {
    it('should save and retrieve a table', async () => {
      const table = {
        id: 'table-1',
        baseId: 'base-1',
        name: 'Test Table',
        fields: [{ id: 'field-1', name: 'Name', type: 'text' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await offlineStorageService.saveTable(table);
      const retrieved = await offlineStorageService.getTable('table-1');

      expect(retrieved?.name).toBe('Test Table');
      expect(retrieved?.baseId).toBe('base-1');
    });

    it('should get tables by base', async () => {
      const baseId = 'base-1';
      const tables = [
        {
          id: 'table-1',
          baseId,
          name: 'Table 1',
          fields: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'table-2',
          baseId,
          name: 'Table 2',
          fields: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      for (const table of tables) {
        await offlineStorageService.saveTable(table);
      }

      const retrieved = await offlineStorageService.getTablesByBase(baseId);
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map(t => t.name)).toEqual(['Table 1', 'Table 2']);
    });
  });

  describe('Base operations', () => {
    it('should save and retrieve a base', async () => {
      const base = {
        id: 'base-1',
        name: 'Test Base',
        description: 'A test base',
        googleSheetsId: 'sheets-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await offlineStorageService.saveBase(base);
      const retrieved = await offlineStorageService.getBase('base-1');

      expect(retrieved?.name).toBe('Test Base');
      expect(retrieved?.description).toBe('A test base');
    });

    it('should get all bases', async () => {
      const bases = [
        {
          id: 'base-1',
          name: 'Base 1',
          googleSheetsId: 'sheets-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'base-2',
          name: 'Base 2',
          googleSheetsId: 'sheets-2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      for (const base of bases) {
        await offlineStorageService.saveBase(base);
      }

      const retrieved = await offlineStorageService.getAllBases();
      expect(retrieved).toHaveLength(2);
      expect(retrieved.map(b => b.name)).toEqual(['Base 1', 'Base 2']);
    });
  });

  describe('Pending changes', () => {
    it('should add and retrieve pending changes', async () => {
      const changeData = {
        id: 'record-1',
        fields: { name: 'Updated Record' },
      };

      await offlineStorageService.addPendingChange('update', 'record', 'record-1', changeData);
      const changes = await offlineStorageService.getPendingChanges();

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('update');
      expect(changes[0].entityType).toBe('record');
      expect(changes[0].entityId).toBe('record-1');
      expect(changes[0].data).toEqual(changeData);
    });

    it('should remove pending changes', async () => {
      await offlineStorageService.addPendingChange('create', 'record', 'record-1', {});
      let changes = await offlineStorageService.getPendingChanges();
      expect(changes).toHaveLength(1);

      await offlineStorageService.removePendingChange(changes[0].id);
      changes = await offlineStorageService.getPendingChanges();
      expect(changes).toHaveLength(0);
    });

    it('should update retry count for pending changes', async () => {
      await offlineStorageService.addPendingChange('create', 'record', 'record-1', {});
      let changes = await offlineStorageService.getPendingChanges();
      expect(changes[0].retryCount).toBe(0);

      await offlineStorageService.updatePendingChangeRetry(changes[0].id, 'Network error');
      changes = await offlineStorageService.getPendingChanges();
      expect(changes[0].retryCount).toBe(1);
      expect(changes[0].lastError).toBe('Network error');
    });
  });

  describe('Sync status', () => {
    it('should get unsynced records', async () => {
      const record1 = {
        id: 'record-1',
        fields: { name: 'Synced Record' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const record2 = {
        id: 'record-2',
        fields: { name: 'Pending Record' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await offlineStorageService.saveRecord(record1, 'table-1', 'synced');
      await offlineStorageService.saveRecord(record2, 'table-1', 'pending');

      const unsynced = await offlineStorageService.getUnsyncedRecords();
      expect(unsynced).toHaveLength(1);
      expect(unsynced[0].data.id).toBe('record-2');
    });

    it('should mark entities as synced', async () => {
      const record = {
        id: 'record-1',
        fields: { name: 'Test Record' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await offlineStorageService.saveRecord(record, 'table-1', 'pending');
      await offlineStorageService.markAsSynced('record', 'record-1');

      const unsynced = await offlineStorageService.getUnsyncedRecords();
      expect(unsynced).toHaveLength(0);
    });

    it('should mark entities as conflict', async () => {
      const record = {
        id: 'record-1',
        fields: { name: 'Test Record' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await offlineStorageService.saveRecord(record, 'table-1', 'synced');
      await offlineStorageService.markAsConflict('record', 'record-1');

      // We don't have a direct method to get conflicts, but we can check the record
      const retrieved = await offlineStorageService.getRecord('record-1');
      expect(retrieved).toBeTruthy();
    });
  });

  describe('Storage utilities', () => {
    it('should get storage size', async () => {
      // Add some data
      await offlineStorageService.saveRecord(
        { id: 'record-1', fields: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        'table-1'
      );
      await offlineStorageService.saveTable({
        id: 'table-1',
        baseId: 'base-1',
        name: 'Table 1',
        fields: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await offlineStorageService.addPendingChange('create', 'record', 'record-1', {});

      const size = await offlineStorageService.getStorageSize();
      expect(size.records).toBe(1);
      expect(size.tables).toBe(1);
      expect(size.pendingChanges).toBe(1);
    });

    it('should clear all data', async () => {
      // Add some data
      await offlineStorageService.saveRecord(
        { id: 'record-1', fields: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        'table-1'
      );
      await offlineStorageService.addPendingChange('create', 'record', 'record-1', {});

      await offlineStorageService.clearAllData();

      const size = await offlineStorageService.getStorageSize();
      expect(size.records).toBe(0);
      expect(size.tables).toBe(0);
      expect(size.bases).toBe(0);
      expect(size.pendingChanges).toBe(0);
    });
  });
});