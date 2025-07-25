import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import { useGoogleSheetsSync } from '../hooks/useGoogleSheetsSync';

interface GoogleSheetsSyncProps {
  spreadsheetId: string;
  sheetName: string;
  tableId: string;
  records: any[];
  fields: any[];
  onSyncComplete: (records: any[]) => void;
}

const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({
  spreadsheetId,
  sheetName,
  tableId,
  records,
  fields,
  onSyncComplete,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localSpreadsheetId, setLocalSpreadsheetId] = useState(spreadsheetId);
  const [localSheetName, setLocalSheetName] = useState(sheetName);
  
  const { syncStatus, syncFromSheets, syncToSheets, isSyncing, error } = useGoogleSheetsSync({
    spreadsheetId,
    sheetName,
    tableId,
  });
  
  // Handle sync from Google Sheets
  const handleSyncFrom = async () => {
    try {
      const syncedRecords = await syncFromSheets();
      onSyncComplete(syncedRecords);
    } catch (error) {
      console.error('Error syncing from Google Sheets:', error);
    }
  };
  
  // Handle sync to Google Sheets
  const handleSyncTo = async () => {
    try {
      await syncToSheets(records, fields);
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
    }
  };
  
  // Handle settings save
  const handleSaveSettings = () => {
    // In a real implementation, you would update the settings in the database
    // For now, we'll just close the dialog
    setSettingsOpen(false);
  };
  
  // Render sync status
  const renderSyncStatus = () => {
    if (!syncStatus) {
      return (
        <Chip
          label="Not synced yet"
          color="default"
          size="small"
          variant="outlined"
        />
      );
    }
    
    switch (syncStatus.status) {
      case 'in_progress':
        return (
          <Chip
            label="Syncing..."
            color="primary"
            size="small"
            icon={<CircularProgress size={16} />}
          />
        );
      case 'completed':
        return (
          <Chip
            label="Synced"
            color="success"
            size="small"
            variant="outlined"
          />
        );
      case 'failed':
        return (
          <Chip
            label="Sync failed"
            color="error"
            size="small"
            variant="outlined"
          />
        );
      default:
        return (
          <Chip
            label="Unknown status"
            color="default"
            size="small"
            variant="outlined"
          />
        );
    }
  };
  
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Sync Error</AlertTitle>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mr: 2 }}>
          Google Sheets Sync
        </Typography>
        {renderSyncStatus()}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          startIcon={<SettingsIcon />}
          onClick={() => setSettingsOpen(true)}
        >
          Settings
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          onClick={handleSyncFrom}
          disabled={isSyncing}
        >
          Import from Sheets
        </Button>
        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={handleSyncTo}
          disabled={isSyncing}
        >
          Export to Sheets
        </Button>
        <Button
          variant="contained"
          startIcon={<SyncIcon />}
          onClick={handleSyncFrom}
          disabled={isSyncing}
        >
          {isSyncing ? <CircularProgress size={24} /> : 'Sync Now'}
        </Button>
      </Box>
      
      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Google Sheets Sync Settings</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Spreadsheet ID"
            value={localSpreadsheetId}
            onChange={(e) => setLocalSpreadsheetId(e.target.value)}
            margin="normal"
            helperText="The ID of the Google Sheets spreadsheet"
          />
          <TextField
            fullWidth
            label="Sheet Name"
            value={localSheetName}
            onChange={(e) => setLocalSheetName(e.target.value)}
            margin="normal"
            helperText="The name of the sheet within the spreadsheet"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveSettings} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoogleSheetsSync;