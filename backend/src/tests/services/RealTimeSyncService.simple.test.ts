import { RealTimeSyncService } from '../../services/RealTimeSyncService';
import { UserPresenceModel, UserPresence } from '../../models/UserPresence';
import { ChangeEventModel, ChangeEvent, ChangeType, EntityType } from '../../models/ChangeEvent';
import { RecordModel } from '../../models/Record';

// Mock dependencies
jest.mock('../../models/UserPresence');
jest.mock('../../models/ChangeEvent');
jest.mock('../../models/Record');
jest.mock('../../config/redis', () => ({
  redisClient: {
    keys: jest.fn(),
    sMembers: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    sAdd: jest.fn(),
    sRem: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    zAdd: jest.fn(),
    zRange: jest.fn()
  }
}));

// Mock Socket.IO
const mockSocket = {
  id: 'socket1',
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
  on: jest.fn(),
  disconnect: jest.fn()
};

const mockIo = {
  on: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
  sockets: {
    sockets: new Map([['socket1', mockSocket]])
  }
};

describe('RealTimeSyncService - Unit Tests', () => {
  let syncService: RealTimeSyncService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize service with mock IO
    syncService = RealTimeSyncService.getInstance(mockIo as any);
  });
  
  describe('Delta Calculation', () => {
    test('should calculate delta between record versions', () => {
      // Create test records
      const oldRecord = {
        id: 'record1',
        table_id: 'table1',
        row_index: 0,
        fields: {
          field1: 'old value 1',
          field2: 'value 2',
          field3: 'value 3'
        },
        deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const newRecord = {
        id: 'record1',
        table_id: 'table1',
        row_index: 0,
        fields: {
          field1: 'new value 1',
          field2: 'value 2',
          field4: 'new field'
        },
        deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Calculate delta
      const delta = syncService.calculateDelta(oldRecord, newRecord);
      
      // Verify delta
      expect(delta).toEqual([
        {
          fieldId: 'field1',
          oldValue: 'old value 1',
          newValue: 'new value 1'
        },
        {
          fieldId: 'field3',
          oldValue: 'value 3',
          newValue: undefined
        },
        {
          fieldId: 'field4',
          oldValue: undefined,
          newValue: 'new field'
        }
      ]);
    });
    
    test('should return empty delta for identical records', () => {
      const record = {
        id: 'record1',
        table_id: 'table1',
        row_index: 0,
        fields: {
          field1: 'value 1',
          field2: 'value 2'
        },
        deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const delta = syncService.calculateDelta(record, record);
      
      expect(delta).toEqual([]);
    });
  });
  
  describe('Conflict Resolution', () => {
    test('should resolve conflicts with newer version', async () => {
      // Mock ChangeEventModel.getEntityVersion
      (ChangeEventModel.getEntityVersion as jest.Mock).mockResolvedValue(1);
      
      // Create test changes
      const changes = [
        {
          fieldId: 'field1',
          oldValue: 'old value',
          newValue: 'new value'
        }
      ];
      
      // Resolve conflict
      const result = await syncService.resolveConflict('record1', changes, 2);
      
      // Verify result
      expect(result).toEqual({
        resolved: true,
        winningChanges: changes
      });
    });
    
    test('should reject conflicts with older version', async () => {
      // Mock ChangeEventModel.getEntityVersion
      (ChangeEventModel.getEntityVersion as jest.Mock).mockResolvedValue(2);
      
      // Create test changes
      const changes = [
        {
          fieldId: 'field1',
          oldValue: 'old value',
          newValue: 'new value'
        }
      ];
      
      // Resolve conflict
      const result = await syncService.resolveConflict('record1', changes, 1);
      
      // Verify result
      expect(result).toEqual({
        resolved: false
      });
    });
  });
  
  describe('Broadcasting', () => {
    test('should broadcast change events', async () => {
      // Create test change event
      const changeEvent: ChangeEvent = {
        id: 'change1',
        type: ChangeType.UPDATE,
        entityType: EntityType.RECORD,
        entityId: 'record1',
        tableId: 'table1',
        baseId: 'base1',
        userId: 'user1',
        timestamp: new Date(),
        version: 1
      };
      
      // Set up spy for socket.io emit
      const emitSpy = jest.fn();
      (mockIo.to as jest.Mock).mockReturnValue({ emit: emitSpy });
      
      // Broadcast change
      await syncService.broadcastChange(changeEvent);
      
      // Verify emit is called
      expect(mockIo.to).toHaveBeenCalledWith('table:table1');
      expect(emitSpy).toHaveBeenCalledWith('record_change', changeEvent);
    });
    
    test('should process batch changes efficiently', async () => {
      // Create test batch changes
      const batchChanges: ChangeEvent[] = [
        {
          id: 'change1',
          type: ChangeType.UPDATE,
          entityType: EntityType.RECORD,
          entityId: 'record1',
          tableId: 'table1',
          baseId: 'base1',
          userId: 'user1',
          timestamp: new Date(),
          version: 1
        },
        {
          id: 'change2',
          type: ChangeType.CREATE,
          entityType: EntityType.RECORD,
          entityId: 'record2',
          tableId: 'table1',
          baseId: 'base1',
          userId: 'user2',
          timestamp: new Date(),
          version: 2
        }
      ];
      
      // Set up spy for socket.io emit
      const emitSpy = jest.fn();
      (mockIo.to as jest.Mock).mockReturnValue({ emit: emitSpy });
      
      // Process batch changes
      await syncService.processBatchChanges(batchChanges);
      
      // Verify batch emit is called
      expect(mockIo.to).toHaveBeenCalledWith('table:table1');
      expect(emitSpy).toHaveBeenCalledWith('batch_changes', batchChanges);
    });
  });
  
  describe('Connection Statistics', () => {
    test('should provide connection statistics', () => {
      const stats = syncService.getConnectionStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('authenticatedUsers');
      expect(stats).toHaveProperty('tableSubscriptions');
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.authenticatedUsers).toBe('number');
      expect(typeof stats.tableSubscriptions).toBe('number');
    });
  });
  
  describe('Cleanup Operations', () => {
    test('should clean up stale presence data', async () => {
      const { redisClient } = require('../../config/redis');
      
      // Mock Redis methods
      (redisClient.keys as jest.Mock).mockResolvedValue(['table_users:table1']);
      (redisClient.sMembers as jest.Mock).mockResolvedValue(['user1', 'user2']);
      
      // Mock stale presence
      const stalePresence: UserPresence = {
        userId: 'user1',
        userName: 'User One',
        tableId: 'table1',
        viewId: 'view1',
        lastSeen: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        color: '#FF5733'
      };
      
      const activePresence: UserPresence = {
        userId: 'user2',
        userName: 'User Two',
        tableId: 'table1',
        viewId: 'view1',
        lastSeen: new Date(), // Current time
        color: '#33FF57'
      };
      
      (UserPresenceModel.getPresence as jest.Mock)
        .mockResolvedValueOnce(stalePresence)
        .mockResolvedValueOnce(activePresence);
      (UserPresenceModel.removePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Set up spy for socket.io emit
      const emitSpy = jest.fn();
      (mockIo.to as jest.Mock).mockReturnValue({ emit: emitSpy });
      
      // Clean up stale presence
      await syncService.cleanupStalePresence();
      
      // Verify stale presence is removed
      expect(UserPresenceModel.removePresence).toHaveBeenCalledWith('user1', 'table1');
      expect(UserPresenceModel.removePresence).not.toHaveBeenCalledWith('user2', 'table1');
      
      // Verify user left event is broadcast
      expect(mockIo.to).toHaveBeenCalledWith('table:table1');
      expect(emitSpy).toHaveBeenCalledWith('user_left', {
        userId: 'user1',
        tableId: 'table1'
      });
    });
  });
});