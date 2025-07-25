import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface OfflineDB extends DBSchema {
  records: {
    key: string;
    value: {
      id: string;
      tableId: string;
      data: any;
      lastModified: number;
      isDeleted: boolean;
      syncStatus: 'pending' | 'synced' | 'conflict';
      version: number;
    };
    indexes: {
      'by-table': string;
      'by-sync-status': string;
      'by-last-modified': number;
    };
  };
  tables: {
    key: string;
    value: {
      id: string;
      baseId: string;
      name: string;
      fields: any[];
      lastModified: number;
      syncStatus: 'pending' | 'synced' | 'conflict';
      version: number;
    };
    indexes: {
      'by-base': string;
      'by-sync-status': string;
    };
  };
  bases: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      googleSheetsId: string;
      lastModified: number;
      syncStatus: 'pending' | 'synced' | 'conflict';
      version: number;
    };
    indexes: {
      'by-sync-status': string;
    };
  };
  pendingChanges: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      entityType: 'record' | 'table' | 'base';
      entityId: string;
      data: any;
      timestamp: number;
      retryCount: number;
      lastError?: string;
    };
    indexes: {
      'by-timestamp': number;
      'by-entity-type': string;
      'by-retry-count': number;
    };
  };
}

class OfflineStorageService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private readonly DB_NAME = 'airtable-clone-offline';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Records store
        const recordsStore = db.createObjectStore('records', { keyPath: 'id' });
        recordsStore.createIndex('by-table', 'tableId');
        recordsStore.createIndex('by-sync-status', 'syncStatus');
        recordsStore.createIndex('by-last-modified', 'lastModified');

        // Tables store
        const tablesStore = db.createObjectStore('tables', { keyPath: 'id' });
        tablesStore.createIndex('by-base', 'baseId');
        tablesStore.createIndex('by-sync-status', 'syncStatus');

        // Bases store
        const basesStore = db.createObjectStore('bases', { keyPath: 'id' });
        basesStore.createIndex('by-sync-status', 'syncStatus');

        // Pending changes store
        const changesStore = db.createObjectStore('pendingChanges', { keyPath: 'id' });
        changesStore.createIndex('by-timestamp', 'timestamp');
        changesStore.createIndex('by-entity-type', 'entityType');
        changesStore.createIndex('by-retry-count', 'retryCount');
      },
    });
  }

  // Record operations
  async saveRecord(record: any, tableId: string, syncStatus: 'pending' | 'synced' = 'synced'): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const offlineRecord = {
      id: record.id,
      tableId,
      data: record,
      lastModified: Date.now(),
      isDeleted: false,
      syncStatus,
      version: record.version || 1,
    };

    await this.db.put('records', offlineRecord);
  }

  async getRecord(recordId: string): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const offlineRecord = await this.db.get('records', recordId);
    return offlineRecord?.isDeleted ? null : offlineRecord?.data || null;
  }

  async getRecordsByTable(tableId: string): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const records = await this.db.getAllFromIndex('records', 'by-table', tableId);
    return records
      .filter(record => !record.isDeleted)
      .map(record => record.data);
  }

  async deleteRecord(recordId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const existingRecord = await this.db.get('records', recordId);
    if (existingRecord) {
      existingRecord.isDeleted = true;
      existingRecord.lastModified = Date.now();
      existingRecord.syncStatus = 'pending';
      await this.db.put('records', existingRecord);
    }
  }

  // Table operations
  async saveTable(table: any, syncStatus: 'pending' | 'synced' = 'synced'): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const offlineTable = {
      id: table.id,
      baseId: table.baseId,
      name: table.name,
      fields: table.fields || [],
      lastModified: Date.now(),
      syncStatus,
      version: table.version || 1,
    };

    await this.db.put('tables', offlineTable);
  }

  async getTable(tableId: string): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const table = await this.db.get('tables', tableId);
    return table || null;
  }

  async getTablesByBase(baseId: string): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllFromIndex('tables', 'by-base', baseId);
  }

  // Base operations
  async saveBase(base: any, syncStatus: 'pending' | 'synced' = 'synced'): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const offlineBase = {
      id: base.id,
      name: base.name,
      description: base.description,
      googleSheetsId: base.googleSheetsId,
      lastModified: Date.now(),
      syncStatus,
      version: base.version || 1,
    };

    await this.db.put('bases', offlineBase);
  }

  async getBase(baseId: string): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.get('bases', baseId);
  }

  async getAllBases(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAll('bases');
  }

  // Pending changes operations
  async addPendingChange(
    type: 'create' | 'update' | 'delete',
    entityType: 'record' | 'table' | 'base',
    entityId: string,
    data: any
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const change = {
      id: `${type}-${entityType}-${entityId}-${Date.now()}`,
      type,
      entityType,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await this.db.put('pendingChanges', change);
  }

  async getPendingChanges(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllFromIndex('pendingChanges', 'by-timestamp');
  }

  async removePendingChange(changeId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('pendingChanges', changeId);
  }

  async updatePendingChangeRetry(changeId: string, error?: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const change = await this.db.get('pendingChanges', changeId);
    if (change) {
      change.retryCount += 1;
      change.lastError = error;
      await this.db.put('pendingChanges', change);
    }
  }

  // Sync status operations
  async getUnsyncedRecords(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllFromIndex('records', 'by-sync-status', 'pending');
  }

  async getUnsyncedTables(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllFromIndex('tables', 'by-sync-status', 'pending');
  }

  async getUnsyncedBases(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllFromIndex('bases', 'by-sync-status', 'pending');
  }

  async markAsSynced(entityType: 'record' | 'table' | 'base', entityId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const store = entityType === 'record' ? 'records' : entityType === 'table' ? 'tables' : 'bases';
    const entity = await this.db.get(store as any, entityId);
    
    if (entity) {
      entity.syncStatus = 'synced';
      await this.db.put(store as any, entity);
    }
  }

  async markAsConflict(entityType: 'record' | 'table' | 'base', entityId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const store = entityType === 'record' ? 'records' : entityType === 'table' ? 'tables' : 'bases';
    const entity = await this.db.get(store as any, entityId);
    
    if (entity) {
      entity.syncStatus = 'conflict';
      await this.db.put(store as any, entity);
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['records', 'tables', 'bases', 'pendingChanges'], 'readwrite');
    await Promise.all([
      tx.objectStore('records').clear(),
      tx.objectStore('tables').clear(),
      tx.objectStore('bases').clear(),
      tx.objectStore('pendingChanges').clear(),
    ]);
    await tx.done;
  }

  async getStorageSize(): Promise<{ records: number; tables: number; bases: number; pendingChanges: number }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const [records, tables, bases, pendingChanges] = await Promise.all([
      this.db.count('records'),
      this.db.count('tables'),
      this.db.count('bases'),
      this.db.count('pendingChanges'),
    ]);

    return { records, tables, bases, pendingChanges };
  }
}

export const offlineStorageService = new OfflineStorageService();