import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  syncFromGoogleSheets,
  syncToGoogleSheets,
  getSyncStatus,
  updateSyncStatus,
} from '../store/slices/googleSheetsSlice';
import { googleSheetsService } from '../services/googleSheetsService';

interface UseGoogleSheetsSyncProps {
  spreadsheetId: string;
  sheetName: string;
  tableId: string;
}

interface UseGoogleSheetsSyncResult {
  syncStatus: any;
  syncFromSheets: () => Promise<any[]>;
  syncToSheets: (records: any[], fields: any[]) => Promise<void>;
  isSyncing: boolean;
  error: string | null;
}

/**
 * Hook for Google Sheets synchronization
 */
export function useGoogleSheetsSync({
  spreadsheetId,
  sheetName,
  tableId,
}: UseGoogleSheetsSyncProps): UseGoogleSheetsSyncResult {
  const dispatch = useAppDispatch();
  const { syncStatus: allSyncStatus, loading, error } = useAppSelector((state) => state.googleSheets);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Get sync status for this table
  const syncStatus = allSyncStatus[tableId];
  
  // Subscribe to sync status updates
  useEffect(() => {
    // Get initial sync status
    dispatch(getSyncStatus(tableId));
    
    // Subscribe to sync status updates
    const unsubscribe = googleSheetsService.subscribeToTableSyncStatus(tableId, (status) => {
      dispatch(updateSyncStatus({ tableId, status }));
      
      // Update syncing state
      if (status.status === 'in_progress') {
        setIsSyncing(true);
      } else {
        setIsSyncing(false);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [dispatch, tableId]);
  
  // Sync from Google Sheets
  const syncFromSheets = useCallback(async () => {
    setIsSyncing(true);
    try {
      const resultAction = await dispatch(
        syncFromGoogleSheets({ spreadsheetId, sheetName, tableId })
      );
      
      if (syncFromGoogleSheets.fulfilled.match(resultAction)) {
        return resultAction.payload.records;
      }
      
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch, spreadsheetId, sheetName, tableId]);
  
  // Sync to Google Sheets
  const syncToSheets = useCallback(
    async (records: any[], fields: any[]) => {
      setIsSyncing(true);
      try {
        await dispatch(
          syncToGoogleSheets({ spreadsheetId, sheetName, tableId, records, fields })
        );
      } finally {
        setIsSyncing(false);
      }
    },
    [dispatch, spreadsheetId, sheetName, tableId]
  );
  
  return {
    syncStatus,
    syncFromSheets,
    syncToSheets,
    isSyncing: isSyncing || loading,
    error,
  };
}