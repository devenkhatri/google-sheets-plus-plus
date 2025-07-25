import { Server } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioc } from 'socket.io-client';
import { RealTimeSyncService } from '../../services/RealTimeSyncService';
import { UserPresenceModel, UserPresence } from '../../models/UserPresence';
import { ChangeEventModel, ChangeEvent, ChangeType, EntityType } from '../../models/ChangeEvent';
import { RecordModel } from '../../models/Record';
import { redisClient } from '../../config/redis';

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

describe('RealTimeSyncService', () => {
  let httpServer: any;
  let ioServer: Server;
  let clientSocket1: any;
  let clientSocket2: any;
  let port: number;
  let syncService: RealTimeSyncService;
  
  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    
    // Create Socket.IO server
    ioServer = new Server(httpServer);
    
    // Start server
    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;
      
      // Initialize RealTimeSyncService
      syncService = RealTimeSyncService.getInstance(ioServer);
      
      done();
    });
  });
  
  afterAll(() => {
    // Close server and sockets
    ioServer.close();
    httpServer.close();
    
    // Reset mocks
    jest.resetAllMocks();
  });
  
  beforeEach((done) => {
    // Create client sockets
    clientSocket1 = ioc(`http://localhost:${port}`);
    clientSocket2 = ioc(`http://localhost:${port}`);
    
    // Wait for connections
    let connected = 0;
    const onConnect = () => {
      connected++;
      if (connected === 2) done();
    };
    
    clientSocket1.on('connect', onConnect);
    clientSocket2.on('connect', onConnect);
  });
  
  afterEach(() => {
    // Disconnect client sockets
    if (clientSocket1 && clientSocket1.connected) {
      clientSocket1.disconnect();
    }
    
    if (clientSocket2 && clientSocket2.connected) {
      clientSocket2.disconnect();
    }
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('User Presence', () => {
    test('should handle user authentication', (done) => {
      // Mock ChangeEventModel.getOfflineChanges
      (ChangeEventModel.getOfflineChanges as jest.Mock).mockResolvedValue([]);
      
      // Authenticate user
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One',
        avatarUrl: 'https://example.com/avatar1.png'
      });
      
      // Wait for authentication to complete
      setTimeout(() => {
        // Verify socket is authenticated
        expect(ChangeEventModel.getOfflineChanges).toHaveBeenCalledWith('user1');
        done();
      }, 100);
    });
    
    test('should handle table subscription', (done) => {
      // Mock UserPresenceModel methods
      (UserPresenceModel.assignUserColor as jest.Mock).mockResolvedValue('#FF5733');
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      (UserPresenceModel.getTableUsers as jest.Mock).mockResolvedValue([]);
      (ChangeEventModel.getRecentTableEvents as jest.Mock).mockResolvedValue([]);
      
      // Authenticate user
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      // Subscribe to table
      clientSocket1.emit('subscribe_to_table', {
        tableId: 'table1',
        viewId: 'view1'
      });
      
      // Wait for subscription to complete
      setTimeout(() => {
        // Verify presence is updated
        expect(UserPresenceModel.assignUserColor).toHaveBeenCalledWith('user1', 'table1');
        expect(UserPresenceModel.updatePresence).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user1',
            userName: 'User One',
            tableId: 'table1',
            viewId: 'view1',
            color: '#FF5733'
          })
        );
        expect(UserPresenceModel.getTableUsers).toHaveBeenCalledWith('table1');
        expect(ChangeEventModel.getRecentTableEvents).toHaveBeenCalledWith('table1', 50);
        done();
      }, 100);
    });
    
    test('should handle cursor position updates', (done) => {
      // Mock UserPresenceModel methods
      const mockPresence: UserPresence = {
        userId: 'user1',
        userName: 'User One',
        tableId: 'table1',
        viewId: 'view1',
        lastSeen: new Date(),
        color: '#FF5733'
      };
      
      (UserPresenceModel.getPresence as jest.Mock).mockResolvedValue(mockPresence);
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Authenticate user
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      // Update cursor position
      clientSocket1.emit('cursor_position', {
        tableId: 'table1',
        cursor: {
          recordId: 'record1',
          fieldId: 'field1',
          x: 10,
          y: 20
        }
      });
      
      // Wait for update to complete
      setTimeout(() => {
        // Verify presence is updated
        expect(UserPresenceModel.getPresence).toHaveBeenCalledWith('user1', 'table1');
        expect(UserPresenceModel.updatePresence).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user1',
            userName: 'User One',
            tableId: 'table1',
            viewId: 'view1',
            cursor: {
              recordId: 'record1',
              fieldId: 'field1',
              x: 10,
              y: 20
            }
          })
        );
        done();
      }, 100);
    });
    
    test('should handle user disconnection', (done) => {
      // Mock UserPresenceModel methods
      (UserPresenceModel.removePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Set up socket to table mapping
      const socketUserMap = (syncService as any).socketUserMap;
      const socketTableMap = (syncService as any).socketTableMap;
      
      // Authenticate user
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      // Subscribe to table
      clientSocket1.emit('subscribe_to_table', {
        tableId: 'table1',
        viewId: 'view1'
      });
      
      // Wait for subscription to complete
      setTimeout(() => {
        // Disconnect client
        clientSocket1.disconnect();
        
        // Wait for disconnect to complete
        setTimeout(() => {
          // Verify presence is removed
          expect(UserPresenceModel.removePresence).toHaveBeenCalledWith('user1', 'table1');
          done();
        }, 100);
      }, 100);
    });
  });
  
  describe('Change Events', () => {
    test('should handle record changes', (done) => {
      // Mock ChangeEventModel methods
      const mockChangeEvent: ChangeEvent = {
        id: 'change1',
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
            oldValue: 'old value',
            newValue: 'new value'
          }
        ]
      };
      
      (ChangeEventModel.create as jest.Mock).mockResolvedValue(mockChangeEvent);
      (UserPresenceModel.getPresence as jest.Mock).mockResolvedValue({
        userId: 'user1',
        userName: 'User One',
        tableId: 'table1',
        viewId: 'view1',
        lastSeen: new Date()
      });
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Authenticate user
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      // Send record change
      clientSocket1.emit('record_change', {
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
      
      // Wait for change to complete
      setTimeout(() => {
        // Verify change event is created
        expect(ChangeEventModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: ChangeType.UPDATE,
            entityType: EntityType.RECORD,
            entityId: 'record1',
            tableId: 'table1',
            baseId: 'base1',
            userId: 'user1',
            changes: [
              {
                fieldId: 'field1',
                oldValue: 'old value',
                newValue: 'new value'
              }
            ]
          })
        );
        
        // Verify presence is updated
        expect(UserPresenceModel.getPresence).toHaveBeenCalledWith('user1', 'table1');
        expect(UserPresenceModel.updatePresence).toHaveBeenCalled();
        done();
      }, 100);
    });
    
    test('should handle offline changes sync', (done) => {
      // Mock methods
      (ChangeEventModel.clearOfflineChanges as jest.Mock).mockResolvedValue(undefined);
      
      // Set up spy for applyRecordChange
      const applyRecordChangeSpy = jest.spyOn(
        RealTimeSyncService.prototype as any, 
        'applyRecordChange'
      ).mockResolvedValue(undefined);
      
      // Authenticate user
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      // Send offline changes
      const offlineChanges: ChangeEvent[] = [
        {
          id: 'change1',
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
              oldValue: 'old value',
              newValue: 'new value'
            }
          ]
        }
      ];
      
      clientSocket1.emit('sync_offline_changes', offlineChanges);
      
      // Set up listener for completion event
      clientSocket1.on('offline_sync_complete', () => {
        // Verify changes are applied
        expect(applyRecordChangeSpy).toHaveBeenCalledWith(offlineChanges[0]);
        expect(ChangeEventModel.clearOfflineChanges).toHaveBeenCalledWith('user1');
        done();
      });
    });
  });
  
  describe('Conflict Resolution', () => {
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
      const emitSpy = jest.spyOn(ioServer.to('table:table1'), 'emit');
      
      // Broadcast change
      await syncService.broadcastChange(changeEvent);
      
      // Verify emit is called
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
      const emitSpy = jest.spyOn(ioServer.to('table:table1'), 'emit');
      
      // Process batch changes
      await syncService.processBatchChanges(batchChanges);
      
      // Verify batch emit is called
      expect(emitSpy).toHaveBeenCalledWith('batch_changes', batchChanges);
    });
  });

  describe('Connection Recovery', () => {
    test('should handle connection recovery', (done) => {
      // Mock methods
      const mockMissedEvents: ChangeEvent[] = [
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
      
      (ChangeEventModel.getRecentTableEvents as jest.Mock).mockResolvedValue(mockMissedEvents);
      (UserPresenceModel.assignUserColor as jest.Mock).mockResolvedValue('#FF5733');
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Authenticate user
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      // Set up listener for missed events
      clientSocket1.on('missed_events', (events: ChangeEvent[]) => {
        expect(events).toEqual(mockMissedEvents);
      });
      
      // Set up listener for connection recovered
      clientSocket1.on('connection_recovered', (data: { timestamp: Date; missedEventsCount: number }) => {
        expect(data.missedEventsCount).toBe(1);
        done();
      });
      
      // Trigger connection recovery
      clientSocket1.emit('recover_connection', {
        tableId: 'table1',
        lastEventId: 'old_event',
        lastVersion: 1
      });
    });

    test('should handle heartbeat with acknowledgment', (done) => {
      // Mock UserPresenceModel methods
      const mockPresence: UserPresence = {
        userId: 'user1',
        userName: 'User One',
        tableId: 'table1',
        viewId: 'view1',
        lastSeen: new Date(),
        color: '#FF5733'
      };
      
      (UserPresenceModel.getPresence as jest.Mock).mockResolvedValue(mockPresence);
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Authenticate user
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      // Set up listener for heartbeat acknowledgment
      clientSocket1.on('heartbeat_ack', (data: { timestamp: Date }) => {
        expect(data.timestamp).toBeDefined();
        done();
      });
      
      // Send heartbeat
      clientSocket1.emit('heartbeat', { tableId: 'table1' });
    });
  });

  describe('Multi-user Collaboration', () => {
    test('should handle multiple users in same table', (done) => {
      // Mock UserPresenceModel methods
      (UserPresenceModel.assignUserColor as jest.Mock)
        .mockResolvedValueOnce('#FF5733')
        .mockResolvedValueOnce('#33FF57');
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      (UserPresenceModel.getTableUsers as jest.Mock).mockResolvedValue([]);
      (ChangeEventModel.getRecentTableEvents as jest.Mock).mockResolvedValue([]);
      
      // Authenticate both users
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      clientSocket2.emit('authenticate', {
        userId: 'user2',
        userName: 'User Two'
      });
      
      // Set up listener for user joined event on client 1
      clientSocket1.on('user_joined', (presence: UserPresence) => {
        expect(presence.userId).toBe('user2');
        expect(presence.userName).toBe('User Two');
        done();
      });
      
      // Subscribe both users to same table
      setTimeout(() => {
        clientSocket1.emit('subscribe_to_table', {
          tableId: 'table1',
          viewId: 'view1'
        });
        
        setTimeout(() => {
          clientSocket2.emit('subscribe_to_table', {
            tableId: 'table1',
            viewId: 'view1'
          });
        }, 50);
      }, 50);
    });

    test('should broadcast cursor movements between users', (done) => {
      // Mock UserPresenceModel methods
      const mockPresence: UserPresence = {
        userId: 'user1',
        userName: 'User One',
        tableId: 'table1',
        viewId: 'view1',
        lastSeen: new Date(),
        color: '#FF5733'
      };
      
      (UserPresenceModel.getPresence as jest.Mock).mockResolvedValue(mockPresence);
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Authenticate both users
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      clientSocket2.emit('authenticate', {
        userId: 'user2',
        userName: 'User Two'
      });
      
      // Set up listener for cursor position on client 2
      clientSocket2.on('cursor_position', (data: { userId: string; cursor: any }) => {
        expect(data.userId).toBe('user1');
        expect(data.cursor.recordId).toBe('record1');
        expect(data.cursor.fieldId).toBe('field1');
        done();
      });
      
      // Send cursor position from client 1
      setTimeout(() => {
        clientSocket1.emit('cursor_position', {
          tableId: 'table1',
          cursor: {
            recordId: 'record1',
            fieldId: 'field1',
            x: 100,
            y: 200
          }
        });
      }, 100);
    });

    test('should handle concurrent record edits', (done) => {
      // Mock ChangeEventModel methods
      const mockChangeEvent1: ChangeEvent = {
        id: 'change1',
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
            oldValue: 'original',
            newValue: 'user1_edit'
          }
        ]
      };
      
      const mockChangeEvent2: ChangeEvent = {
        id: 'change2',
        type: ChangeType.UPDATE,
        entityType: EntityType.RECORD,
        entityId: 'record1',
        tableId: 'table1',
        baseId: 'base1',
        userId: 'user2',
        timestamp: new Date(),
        version: 2,
        changes: [
          {
            fieldId: 'field1',
            oldValue: 'original',
            newValue: 'user2_edit'
          }
        ]
      };
      
      (ChangeEventModel.create as jest.Mock)
        .mockResolvedValueOnce(mockChangeEvent1)
        .mockResolvedValueOnce(mockChangeEvent2);
      (UserPresenceModel.getPresence as jest.Mock).mockResolvedValue({
        userId: 'user1',
        userName: 'User One',
        tableId: 'table1',
        viewId: 'view1',
        lastSeen: new Date()
      });
      (UserPresenceModel.updatePresence as jest.Mock).mockResolvedValue(undefined);
      
      // Authenticate both users
      clientSocket1.emit('authenticate', {
        userId: 'user1',
        userName: 'User One'
      });
      
      clientSocket2.emit('authenticate', {
        userId: 'user2',
        userName: 'User Two'
      });
      
      let changesReceived = 0;
      
      // Set up listeners for record changes
      clientSocket1.on('record_change', (change: ChangeEvent) => {
        expect(change.userId).toBe('user2');
        changesReceived++;
        if (changesReceived === 2) done();
      });
      
      clientSocket2.on('record_change', (change: ChangeEvent) => {
        expect(change.userId).toBe('user1');
        changesReceived++;
        if (changesReceived === 2) done();
      });
      
      // Send concurrent record changes
      setTimeout(() => {
        clientSocket1.emit('record_change', {
          type: ChangeType.UPDATE,
          recordId: 'record1',
          tableId: 'table1',
          baseId: 'base1',
          changes: mockChangeEvent1.changes
        });
        
        clientSocket2.emit('record_change', {
          type: ChangeType.UPDATE,
          recordId: 'record1',
          tableId: 'table1',
          baseId: 'base1',
          changes: mockChangeEvent2.changes
        });
      }, 100);
    });
  });

  describe('Performance and Cleanup', () => {
    test('should provide connection statistics', () => {
      const stats = syncService.getConnectionStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('authenticatedUsers');
      expect(stats).toHaveProperty('tableSubscriptions');
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.authenticatedUsers).toBe('number');
      expect(typeof stats.tableSubscriptions).toBe('number');
    });

    test('should clean up stale presence data', async () => {
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
      const emitSpy = jest.spyOn(ioServer.to('table:table1'), 'emit');
      
      // Clean up stale presence
      await syncService.cleanupStalePresence();
      
      // Verify stale presence is removed
      expect(UserPresenceModel.removePresence).toHaveBeenCalledWith('user1', 'table1');
      expect(UserPresenceModel.removePresence).not.toHaveBeenCalledWith('user2', 'table1');
      
      // Verify user left event is broadcast
      expect(emitSpy).toHaveBeenCalledWith('user_left', {
        userId: 'user1',
        tableId: 'table1'
      });
    });
  });
});