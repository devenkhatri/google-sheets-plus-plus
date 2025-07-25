import React, { useState } from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { ConflictData } from '../services/conflictResolutionService';

interface OfflineSyncStatusProps {
  className?: string;
}

export const OfflineSyncStatus: React.FC<OfflineSyncStatusProps> = ({ className }) => {
  const {
    isOnline,
    syncInProgress,
    pendingChanges,
    conflicts,
    lastSyncTime,
    storageSize,
    syncNow,
    forceSyncFromServer,
    resetAndResync,
    resolveConflict,
    clearOfflineData,
  } = useOfflineSync();

  const [showDetails, setShowDetails] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null);

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleResolveConflict = async (
    conflict: ConflictData,
    strategy: 'local' | 'remote' | 'merge'
  ) => {
    try {
      await resolveConflict(conflict.entityId, strategy);
      setSelectedConflict(null);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  return (
    <div className={`offline-sync-status ${className || ''}`}>
      {/* Status indicator */}
      <div className="sync-indicator">
        <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
        <span className="status-text">
          {isOnline ? 'Online' : 'Offline'}
          {syncInProgress && ' (Syncing...)'}
        </span>
        
        {pendingChanges > 0 && (
          <span className="pending-badge">{pendingChanges} pending</span>
        )}
        
        {conflicts.length > 0 && (
          <span className="conflict-badge">{conflicts.length} conflicts</span>
        )}
      </div>

      {/* Sync controls */}
      <div className="sync-controls">
        <button
          onClick={syncNow}
          disabled={syncInProgress || !isOnline}
          className="sync-button"
        >
          {syncInProgress ? 'Syncing...' : 'Sync Now'}
        </button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="details-button"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Detailed status */}
      {showDetails && (
        <div className="sync-details">
          <div className="detail-section">
            <h4>Sync Status</h4>
            <p>Last sync: {formatLastSync(lastSyncTime)}</p>
            <p>Pending changes: {pendingChanges}</p>
            <p>Conflicts: {conflicts.length}</p>
          </div>

          <div className="detail-section">
            <h4>Storage Usage</h4>
            <p>Records: {storageSize.records}</p>
            <p>Tables: {storageSize.tables}</p>
            <p>Bases: {storageSize.bases}</p>
            <p>Pending changes: {storageSize.pendingChanges}</p>
          </div>

          <div className="detail-section">
            <h4>Actions</h4>
            <button
              onClick={forceSyncFromServer}
              disabled={syncInProgress || !isOnline}
              className="action-button"
            >
              Force Sync from Server
            </button>
            <button
              onClick={resetAndResync}
              disabled={syncInProgress || !isOnline}
              className="action-button warning"
            >
              Reset & Resync
            </button>
            <button
              onClick={clearOfflineData}
              disabled={syncInProgress}
              className="action-button danger"
            >
              Clear Offline Data
            </button>
          </div>

          {/* Conflicts section */}
          {conflicts.length > 0 && (
            <div className="detail-section">
              <h4>Conflicts</h4>
              {conflicts.map((conflict) => (
                <div key={conflict.entityId} className="conflict-item">
                  <div className="conflict-header">
                    <span className="conflict-type">
                      {conflict.entityType} - {conflict.entityId}
                    </span>
                    <span className="conflict-time">
                      {new Date(conflict.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="conflict-fields">
                    Conflicting fields: {conflict.conflictFields.join(', ')}
                  </div>
                  <div className="conflict-actions">
                    <button
                      onClick={() => handleResolveConflict(conflict, 'local')}
                      className="resolve-button local"
                    >
                      Use Local
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conflict, 'remote')}
                      className="resolve-button remote"
                    >
                      Use Remote
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conflict, 'merge')}
                      className="resolve-button merge"
                    >
                      Auto Merge
                    </button>
                    <button
                      onClick={() => setSelectedConflict(conflict)}
                      className="resolve-button manual"
                    >
                      Manual Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual conflict resolution modal */}
      {selectedConflict && (
        <div className="conflict-modal-overlay">
          <div className="conflict-modal">
            <div className="modal-header">
              <h3>Resolve Conflict</h3>
              <button
                onClick={() => setSelectedConflict(null)}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="conflict-comparison">
                <div className="version-column">
                  <h4>Local Version</h4>
                  <pre>{JSON.stringify(selectedConflict.localVersion, null, 2)}</pre>
                </div>
                <div className="version-column">
                  <h4>Remote Version</h4>
                  <pre>{JSON.stringify(selectedConflict.remoteVersion, null, 2)}</pre>
                </div>
              </div>
              
              <div className="conflicting-fields">
                <h4>Conflicting Fields:</h4>
                <ul>
                  {selectedConflict.conflictFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={() => handleResolveConflict(selectedConflict, 'local')}
                className="resolve-button local"
              >
                Use Local Version
              </button>
              <button
                onClick={() => handleResolveConflict(selectedConflict, 'remote')}
                className="resolve-button remote"
              >
                Use Remote Version
              </button>
              <button
                onClick={() => handleResolveConflict(selectedConflict, 'merge')}
                className="resolve-button merge"
              >
                Auto Merge
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .offline-sync-status {
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 12px;
          margin: 8px 0;
        }

        .sync-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.online {
          background-color: #4caf50;
        }

        .status-dot.offline {
          background-color: #f44336;
        }

        .pending-badge,
        .conflict-badge {
          background: #ff9800;
          color: white;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 12px;
        }

        .conflict-badge {
          background: #f44336;
        }

        .sync-controls {
          display: flex;
          gap: 8px;
        }

        .sync-button,
        .details-button,
        .action-button {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        }

        .sync-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-button.warning {
          background: #ff9800;
          color: white;
          border-color: #ff9800;
        }

        .action-button.danger {
          background: #f44336;
          color: white;
          border-color: #f44336;
        }

        .sync-details {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #ddd;
        }

        .detail-section {
          margin-bottom: 16px;
        }

        .detail-section h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .detail-section p {
          margin: 4px 0;
          font-size: 13px;
        }

        .conflict-item {
          border: 1px solid #f44336;
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 8px;
          background: #fff5f5;
        }

        .conflict-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .conflict-type {
          font-weight: 600;
        }

        .conflict-time {
          font-size: 12px;
          color: #666;
        }

        .conflict-fields {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }

        .conflict-actions {
          display: flex;
          gap: 4px;
        }

        .resolve-button {
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
        }

        .resolve-button.local {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .resolve-button.remote {
          background: #4caf50;
          color: white;
          border-color: #4caf50;
        }

        .resolve-button.merge {
          background: #ff9800;
          color: white;
          border-color: #ff9800;
        }

        .resolve-button.manual {
          background: #9c27b0;
          color: white;
          border-color: #9c27b0;
        }

        .conflict-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .conflict-modal {
          background: white;
          border-radius: 8px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #ddd;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }

        .modal-content {
          padding: 16px;
        }

        .conflict-comparison {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .version-column {
          flex: 1;
        }

        .version-column h4 {
          margin: 0 0 8px 0;
        }

        .version-column pre {
          background: #f5f5f5;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
          overflow-x: auto;
        }

        .conflicting-fields ul {
          margin: 8px 0;
          padding-left: 20px;
        }

        .modal-actions {
          padding: 16px;
          border-top: 1px solid #ddd;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};