# Real-time Synchronization Service

The Real-time Synchronization Service provides WebSocket-based real-time collaboration features for the Airtable clone application. It enables multiple users to work simultaneously on the same data with live updates, conflict resolution, and presence tracking.

## Features

### 1. WebSocket Server for Real-time Communication
- Socket.IO-based WebSocket server
- Connection management and authentication
- Room-based table subscriptions
- Automatic reconnection handling

### 2. Change Event Broadcasting System
- Real-time broadcasting of data changes
- Event-driven architecture for scalability
- Support for different entity types (records, fields, tables, views, bases)
- Batch processing for efficient updates

### 3. Conflict Resolution for Concurrent Edits
- Version-based conflict detection
- Last-write-wins strategy with intelligent merging
- Field-level conflict resolution
- Automatic rollback for rejected changes

### 4. User Presence Tracking and Cursor Synchronization
- Real-time user presence indicators
- Cursor position tracking and broadcasting
- Selection range synchronization
- User color assignment for visual distinction
- Heartbeat mechanism for connection health

### 5. Offline Support with Change Queuing
- Offline change detection and storage
- Automatic synchronization on reconnection
- Change queue management
- Conflict resolution for offline changes

### 6. Delta Synchronization
- Efficient bandwidth usage through delta updates
- Field-level change tracking
- Minimal payload sizes
- Optimized for large datasets

## Architecture

### Core Components

#### RealTimeSyncService
The main service class that manages all real-time functionality:

```typescript
class RealTimeSyncService {
  // Singleton pattern for global access
  static getInstance(io?: Server): RealTimeSyncService
  
  // Core functionality
  broadcastChange(change: ChangeEvent): Promise<void>
  calculateDelta(oldRecord: Record, newRecord: Record): FieldChange[]
  resolveConflict(recordId: string, changes: FieldChange[], version: number): Promise<ConflictResult>
  
  // Batch operations
  processBatchChanges(changes: ChangeEvent[]): Promise<void>
  
  // Maintenance
  cleanupStalePresence(): Promise<void>
  getConnectionStats(): ConnectionStats
}
```

#### UserPresenceModel
Manages user presence data in Redis:

```typescript
class UserPresenceModel {
  static updatePresence(presence: UserPresence): Promise<void>
  static getPresence(userId: string, tableId: string): Promise<UserPresence | null>
  static getTableUsers(tableId: string): Promise<UserPresence[]>
  static removePresence(userId: string, tableId: string): Promise<void>
  static assignUserColor(userId: string, tableId: string): Promise<string>
}
```

#### ChangeEventModel
Manages change events and versioning:

```typescript
class ChangeEventModel {
  static create(event: Omit<ChangeEvent, 'id' | 'timestamp' | 'version'>): Promise<ChangeEvent>
  static getRecentTableEvents(tableId: string, limit?: number): Promise<ChangeEvent[]>
  static getEntityVersion(entityType: EntityType, entityId: string): Promise<number>
  static storeOfflineChange(userId: string, change: ChangeEvent): Promise<void>
  static getOfflineChanges(userId: string): Promise<ChangeEvent[]>
  static clearOfflineChanges(userId: string): Promise<void>
}
```

### Data Models

#### ChangeEvent
```typescript
interface ChangeEvent {
  id: string;
  type: ChangeType;
  entityType: EntityType;
  entityId: string;
  tableId?: string;
  baseId?: string;
  userId: string;
  timestamp: Date;
  changes?: FieldChange[];
  metadata?: { [key: string]: any };
  version: number;
}
```

#### UserPresence
```typescript
interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  tableId: string;
  viewId: string;
  cursor?: CursorPosition;
  selection?: Selection;
  lastSeen: Date;
  color?: string;
}
```

#### FieldChange
```typescript
interface FieldChange {
  fieldId: string;
  oldValue?: any;
  newValue?: any;
}
```

## WebSocket Events

### Client to Server Events

#### Authentication
```typescript
socket.emit('authenticate', {
  userId: string;
  userName: string;
  avatarUrl?: string;
});
```

#### Table Subscription
```typescript
socket.emit('subscribe_to_table', {
  tableId: string;
  viewId: string;
});
```

#### Cursor Position Updates
```typescript
socket.emit('cursor_position', {
  tableId: string;
  cursor: {
    recordId: string;
    fieldId: string;
    x?: number;
    y?: number;
  };
});
```

#### Record Changes
```typescript
socket.emit('record_change', {
  type: ChangeType;
  recordId: string;
  tableId: string;
  baseId: string;
  changes?: FieldChange[];
  metadata?: { [key: string]: any };
});
```

#### Offline Changes Sync
```typescript
socket.emit('sync_offline_changes', changes: ChangeEvent[]);
```

#### Connection Recovery
```typescript
socket.emit('recover_connection', {
  tableId: string;
  viewId?: string;
  lastEventId?: string;
  lastVersion?: number;
});
```

#### Heartbeat
```typescript
socket.emit('heartbeat', { tableId: string });
```

### Server to Client Events

#### User Events
```typescript
socket.emit('user_joined', presence: UserPresence);
socket.emit('user_left', { userId: string; tableId: string });
socket.emit('user_reconnected', presence: UserPresence);
```

#### Change Events
```typescript
socket.emit('record_change', change: ChangeEvent);
socket.emit('batch_changes', changes: ChangeEvent[]);
socket.emit('missed_events', events: ChangeEvent[]);
```

#### Presence Events
```typescript
socket.emit('cursor_position', { userId: string; cursor: CursorPosition });
socket.emit('selection', { userId: string; selection: Selection });
socket.emit('table_users', users: UserPresence[]);
```

#### System Events
```typescript
socket.emit('offline_changes', changes: ChangeEvent[]);
socket.emit('offline_sync_complete');
socket.emit('connection_recovered', { timestamp: Date; missedEventsCount: number });
socket.emit('heartbeat_ack', { timestamp: Date });
socket.emit('recent_changes', changes: ChangeEvent[]);
socket.emit('error', { message: string });
```

## API Endpoints

### GET /api/v1/sync/stats
Get connection statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConnections": 42,
    "authenticatedUsers": 38,
    "tableSubscriptions": 156
  }
}
```

### POST /api/v1/sync/cleanup
Trigger cleanup of stale presence data.

**Response:**
```json
{
  "success": true,
  "message": "Stale presence data cleaned up successfully"
}
```

### POST /api/v1/sync/batch-changes
Process batch changes.

**Request:**
```json
{
  "changes": [
    {
      "type": "update",
      "entityType": "record",
      "entityId": "record1",
      "tableId": "table1",
      "baseId": "base1",
      "userId": "user1",
      "changes": [
        {
          "fieldId": "field1",
          "oldValue": "old",
          "newValue": "new"
        }
      ]
    }
  ]
}
```

## Usage Examples

### Frontend Integration

#### Establishing Connection
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

// Authenticate
socket.emit('authenticate', {
  userId: currentUser.id,
  userName: currentUser.name,
  avatarUrl: currentUser.avatar
});

// Subscribe to table
socket.emit('subscribe_to_table', {
  tableId: 'table_123',
  viewId: 'view_456'
});
```

#### Handling Real-time Updates
```typescript
// Listen for record changes
socket.on('record_change', (change: ChangeEvent) => {
  // Update local state
  dispatch(updateRecord(change));
});

// Listen for user presence
socket.on('user_joined', (presence: UserPresence) => {
  dispatch(addUserPresence(presence));
});

socket.on('cursor_position', ({ userId, cursor }) => {
  dispatch(updateUserCursor(userId, cursor));
});
```

#### Sending Changes
```typescript
// Send record update
socket.emit('record_change', {
  type: 'update',
  recordId: 'record_123',
  tableId: 'table_123',
  baseId: 'base_123',
  changes: [
    {
      fieldId: 'field_456',
      oldValue: 'old value',
      newValue: 'new value'
    }
  ]
});

// Update cursor position
socket.emit('cursor_position', {
  tableId: 'table_123',
  cursor: {
    recordId: 'record_123',
    fieldId: 'field_456',
    x: 100,
    y: 200
  }
});
```

### Backend Integration

#### Service Initialization
```typescript
import { setupRealTimeSyncHandlers } from './socket/realTimeSyncHandler';

// In your main server file
const io = new Server(httpServer);
setupRealTimeSyncHandlers(io);
```

#### Broadcasting Changes from Services
```typescript
import { RealTimeSyncService } from '../services/RealTimeSyncService';

// In your record service
const syncService = RealTimeSyncService.getInstance();

// Create change event
const changeEvent = await ChangeEventModel.create({
  type: ChangeType.UPDATE,
  entityType: EntityType.RECORD,
  entityId: recordId,
  tableId: tableId,
  baseId: baseId,
  userId: userId,
  changes: fieldChanges
});

// Broadcast to connected clients
await syncService.broadcastChange(changeEvent);
```

## Performance Considerations

### Scalability
- Redis-based storage for horizontal scaling
- Room-based broadcasting to minimize network traffic
- Efficient delta synchronization
- Batch processing for bulk operations

### Memory Management
- TTL-based cleanup for change events (24 hours)
- Automatic stale presence removal (5 minutes)
- Connection pooling for database operations

### Network Optimization
- Delta-only updates to minimize bandwidth
- Compression for large payloads
- Intelligent batching of related changes
- Heartbeat mechanism for connection health

## Testing

The service includes comprehensive test coverage:

### Unit Tests (`RealTimeSyncService.simple.test.ts`)
- Delta calculation
- Conflict resolution
- Broadcasting functionality
- Connection statistics
- Cleanup operations

### Integration Tests (`RealTimeSyncService.integration.test.ts`)
- Multi-user collaboration scenarios
- Offline support workflows
- Connection recovery
- Performance monitoring

### Running Tests
```bash
# Run all real-time sync tests
npm test -- --testPathPattern="RealTimeSyncService\.(simple|integration)\.test\.ts" --setupFilesAfterEnv=

# Run specific test file
npm test -- --testPathPattern=RealTimeSyncService.simple.test.ts --setupFilesAfterEnv=
```

## Monitoring and Debugging

### Connection Statistics
Monitor real-time connection health:
```typescript
const stats = syncService.getConnectionStats();
console.log(`Active connections: ${stats.totalConnections}`);
console.log(`Authenticated users: ${stats.authenticatedUsers}`);
console.log(`Table subscriptions: ${stats.tableSubscriptions}`);
```

### Logging
The service uses Winston for structured logging:
- Connection events
- Authentication status
- Error conditions
- Performance metrics

### Health Checks
- Heartbeat mechanism for connection health
- Automatic reconnection handling
- Stale connection cleanup
- Redis connection monitoring

## Security Considerations

### Authentication
- JWT-based user authentication
- Socket-level authentication verification
- Permission-based table access

### Data Validation
- Input sanitization for all events
- Type checking for change events
- Rate limiting for WebSocket connections

### Privacy
- User-specific data isolation
- Secure presence information handling
- Audit logging for sensitive operations

## Future Enhancements

### Planned Features
- Operational transformation for better conflict resolution
- Voice and video collaboration integration
- Advanced presence features (typing indicators, etc.)
- Performance analytics and monitoring dashboard
- Mobile-optimized WebSocket handling

### Scalability Improvements
- Microservice architecture for large deployments
- Message queue integration for better reliability
- Advanced caching strategies
- Load balancing for WebSocket connections