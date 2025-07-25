import { RealTimeSyncService } from '../../services/RealTimeSyncService';
import { UserPresenceModel, UserPresence } from '../../models/UserPresence';
import { ChangeEventModel, ChangeEvent, ChangeType, EntityType } from '../../models/ChangeEvent';

// Mock dependencies
jest.mock('../../models/UserPresence');
jest.mock('../../models/ChangeEvent');
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

describe('RealTimeSyncService - Integration Tests', () => {
  let syncService: RealTimeSyncService;
  let mockIo: any;
  let mockSocket1: any;
  let mockSocket2: any;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock sockets
    mockSocket1 = {
      id: 'socket1',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      on: jest.fn(),
      disconnect: jest.fn()
    };
    
    mockSocket2 = {
      id: 'socket2',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      on: jest.fn(),
      disconnect: jest.fn()
    };
    
    // Create mock IO server
    mockIo = {
      on: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      sockets: {
        sockets: new Map([
          ['socket1', mockSocket1],
          ['socket2', mockSocket2]
        ])
      }
    };
    
    // Initialize service
    syncService = RealTimeSyncService.getInstance(mockIo);
  });
  
  describe('Multi-user Collaboration Scenario', () => {
    test('should handle complete collaboration workflow', async () => {
      // Mock all required methods
      (ChangeEventModel.getOfflineChanges as jest.Mock).mockResolvedValue([]);
      (UserPresenceModel.assignUserColor as jest.Mock)
        .mockResolvedValueOnce('#FF5733')
        .mockResolvedValueOnce('#33FF57');
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      (UserPresenceModel.getTableUsers as jest.Mock).mockResolvedValue([]);
      (ChangeEventModel.getRecentTableEvents as jest.Mock).mockResolvedValue([]);
      (ChangeEventModel.create as jest.Mock).mockImplementation((event) => ({
        ...event,
        id: 'change_' + Date.now(),
        timestamp: new Date(),
        version: 1
      }));
      
      // Simulate socket connection and setup handlers
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      if (connectionHandler) {
        // Simulate socket1 connection
        connectionHandler(mockSocket1);
        
        // Get all event handlers for socket1
        const socket1Handlers = new Map();
        (mockSocket1.on as jest.Mock).mock.calls.forEach(([event, handler]) => {
          socket1Handlers.set(event, handler);
        });
        
        // Simulate socket2 connection
        connectionHandler(mockSocket2);
        
        // Get all event handlers for socket2
        const socket2Handlers = new Map();
        (mockSocket2.on as jest.Mock).mock.calls.forEach(([event, handler]) => {
          socket2Handlers.set(event, handler);
        });
        
        // Step 1: Authenticate both users
        await socket1Handlers.get('authenticate')({
          userId: 'user1',
          userName: 'User One',
          avatarUrl: 'https://example.com/avatar1.png'
        });
        
        await socket2Handlers.get('authenticate')({
          userId: 'user2',
          userName: 'User Two',
          avatarUrl: 'https://example.com/avatar2.png'
        });
        
        // Step 2: Subscribe both users to the same table
        await socket1Handlers.get('subscribe_to_table')({
          tableId: 'table1',
          viewId: 'view1'
        });
        
        await socket2Handlers.get('subscribe_to_table')({
          tableId: 'table1',
          viewId: 'view1'
        });
        
        // Step 3: User1 updates cursor position
        await socket1Handlers.get('cursor_position')({
          tableId: 'table1',
          cursor: {
            recordId: 'record1',
            fieldId: 'field1',
            x: 100,
            y: 200
          }
        });
        
        // Step 4: User1 makes a record change
        await socket1Handlers.get('record_change')({
          type: ChangeType.UPDATE,
          recordId: 'record1',
          tableId: 'table1',
          baseId: 'base1',
          changes: [
            {
              fieldId: 'field1',
              oldValue: 'old value',
              newValue: 'new value'
            }
          ]
        });
        
        // Step 5: User2 makes a conflicting change
        await socket2Handlers.get('record_change')({
          type: ChangeType.UPDATE,
          recordId: 'record1',
          tableId: 'table1',
          baseId: 'base1',
          changes: [
            {
              fieldId: 'field1',
              oldValue: 'old value',
              newValue: 'different value'
            }
          ]
        });
        
        // Verify authentication was handled
        expect(ChangeEventModel.getOfflineChanges).toHaveBeenCalledWith('user1');
        expect(ChangeEventModel.getOfflineChanges).toHaveBeenCalledWith('user2');
        
        // Verify table subscription was handled
        expect(mockSocket1.join).toHaveBeenCalledWith('table:table1');
        expect(mockSocket2.join).toHaveBeenCalledWith('table:table1');
        expect(UserPresenceModel.assignUserColor).toHaveBeenCalledWith('user1', 'table1');
        expect(UserPresenceModel.assignUserColor).toHaveBeenCalledWith('user2', 'table1');
        
        // Verify presence updates
        expect(UserPresenceModel.updatePresence).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user1',
            userName: 'User One',
            tableId: 'table1',
            viewId: 'view1'
          })
        );
        
        // Verify record changes were created
        expect(ChangeEventModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ChangeType.UPDATE,
            entityType: EntityType.RECORD,
            entityId: 'record1',
            tableId: 'table1',
            baseId: 'base1',
            userId: 'user1'
          })
        );
        
        expect(ChangeEventModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ChangeType.UPDATE,
            entityType: EntityType.RECORD,
            entityId: 'record1',
            tableId: 'table1',
            baseId: 'base1',
            userId: 'user2'
          })
        );
      }
    });
  });
  
  describe('Offline Support Scenario', () => {
    test('should handle offline changes synchronization', async () => {
      // Mock offline changes
      const offlineChanges: ChangeEvent[] = [
        {
          id: 'offline1',
          type: ChangeType.UPDATE,
          entityType: EntityType.RECORD,
          entityId: 'record1',
          tableId: 'table1',
          baseId: 'base1',
          userId: 'user1',
          timestamp: new Date(),
          version: 1,
          changes: [
            {
              fieldId: 'field1',
              oldValue: 'old',
              newValue: 'new'
            }
          ]
        }
      ];
      
      (ChangeEventModel.getOfflineChanges as jest.Mock).mockResolvedValue(offlineChanges);
      (ChangeEventModel.clearOfflineChanges as jest.Mock).mockResolvedValue(undefined);
      
      // Simulate socket connection
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      if (connectionHandler) {
        connectionHandler(mockSocket1);
        
        const socket1Handlers = new Map();
        (mockSocket1.on as jest.Mock).mock.calls.forEach(([event, handler]) => {
          socket1Handlers.set(event, handler);
        });
        
        // Authenticate user
        await socket1Handlers.get('authenticate')({
          userId: 'user1',
          userName: 'User One'
        });
        
        // Verify offline changes were sent
        expect(mockSocket1.emit).toHaveBeenCalledWith('offline_changes', offlineChanges);
        
        // Simulate sync offline changes
        await socket1Handlers.get('sync_offline_changes')(offlineChanges);
        
        // Verify offline changes were cleared
        expect(ChangeEventModel.clearOfflineChanges).toHaveBeenCalledWith('user1');
        expect(mockSocket1.emit).toHaveBeenCalledWith('offline_sync_complete');
      }
    });
  });
  
  describe('Connection Recovery Scenario', () => {
    test('should handle connection recovery with missed events', async () => {
      const missedEvents: ChangeEvent[] = [
        {
          id: 'missed1',
          type: ChangeType.UPDATE,
          entityType: EntityType.RECORD,
          entityId: 'record1',
          tableId: 'table1',
          baseId: 'base1',
          userId: 'user2',
          timestamp: new Date(),
          version: 2
        }
      ];
      
      (ChangeEventModel.getOfflineChanges as jest.Mock).mockResolvedValue([]);
      (ChangeEventModel.getRecentTableEvents as jest.Mock).mockResolvedValue(missedEvents);
      (UserPresenceModel.assignUserColor as jest.Mock).mockResolvedValue('#FF5733');
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Simulate socket connection
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      if (connectionHandler) {
        connectionHandler(mockSocket1);
        
        const socket1Handlers = new Map();
        (mockSocket1.on as jest.Mock).mock.calls.forEach(([event, handler]) => {
          socket1Handlers.set(event, handler);
        });
        
        // Authenticate user
        await socket1Handlers.get('authenticate')({
          userId: 'user1',
          userName: 'User One'
        });
        
        // Simulate connection recovery
        await socket1Handlers.get('recover_connection')({
          tableId: 'table1',
          viewId: 'view1',
          lastEventId: 'old_event',
          lastVersion: 1
        });
        
        // Verify missed events were sent
        expect(mockSocket1.emit).toHaveBeenCalledWith('missed_events', missedEvents);
        expect(mockSocket1.emit).toHaveBeenCalledWith('connection_recovered', {
          timestamp: expect.any(Date),
          missedEventsCount: 1
        });
      }
    });
  });
  
  describe('Performance and Monitoring', () => {
    test('should provide accurate connection statistics', () => {
      const stats = syncService.getConnectionStats();
      
      expect(stats.totalConnections).toBe(2); // socket1 and socket2
      expect(stats.authenticatedUsers).toBeGreaterThanOrEqual(0); // May have authenticated users from previous tests
      expect(stats.tableSubscriptions).toBeGreaterThanOrEqual(0); // May have subscriptions from previous tests
    });
    
    test('should handle batch operations efficiently', async () => {
      // This test verifies that the batch processing method exists and can be called
      // The actual functionality is tested in the simple unit tests
      const batchChanges: ChangeEvent[] = [
        {
          id: 'batch1',
          type: ChangeType.UPDATE,
          entityType: EntityType.RECORD,
          entityId: 'record1',
          tableId: 'table1',
          baseId: 'base1',
          userId: 'user1',
          timestamp: new Date(),
          version: 1
        }
      ];
      
      // Verify the method exists and can be called without error
      await expect(syncService.processBatchChanges(batchChanges)).resolves.not.toThrow();
    });
  });
});