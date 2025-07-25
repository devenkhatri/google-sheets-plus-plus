import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  FormGroup,
  Checkbox,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  LinearProgress,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CloudDownload as DownloadIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  importData,
  getImportProgress,
  clearImportJob,
  selectImportExport,
  selectCurrentImportJobId,
  selectImportProgress
} from '../store/slices/importExportSlice';
import { importExportService } from '../services/importExportService';
import { MAX_IMPORT_FILE_SIZE } from '../config';

interface ImportExportDialogProps {
  open: boolean;
  onClose: () => void;
  tableId?: string;
  baseId?: string;
  viewId?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`import-export-tabpanel-${index}`}
      aria-labelledby={`import-export-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ImportExportDialog: React.FC<ImportExportDialogProps> = ({
  open,
  onClose,
  tableId,
  baseId,
  viewId
}) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(selectImportExport);
  const currentImportJobId = useAppSelector(selectCurrentImportJobId);
  const importProgress = useAppSelector(selectImportProgress);
  
  const [tabValue, setTabValue] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  
  // Import options
  const [detectFieldTypes, setDetectFieldTypes] = useState(true);
  const [headerRow, setHeaderRow] = useState(true);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [createTable, setCreateTable] = useState(!tableId);
  const [tableName, setTableName] = useState('');
  
  // Export options
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'json'>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [fileName, setFileName] = useState('');
  const [useViewFilters, setUseViewFilters] = useState(!!viewId);
  
  // Poll for import progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentImportJobId && importProgress?.status !== 'completed' && importProgress?.status !== 'failed') {
      interval = setInterval(() => {
        dispatch(getImportProgress(currentImportJobId));
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentImportJobId, importProgress, dispatch]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      dispatch(clearImportJob());
    };
  }, [dispatch]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFileError(null);
    
    if (!selectedFile) {
      return;
    }
    
    // Validate file size
    if (selectedFile.size > MAX_IMPORT_FILE_SIZE) {
      setFileError(`File size exceeds the maximum limit of ${MAX_IMPORT_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    
    // Validate file type
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['csv', 'xlsx', 'xls'].includes(fileExt)) {
      setFileError('Only CSV and Excel files are supported');
      return;
    }
    
    setFile(selectedFile);
    
    // Set default table name from file name
    if (!tableName) {
      setTableName(selectedFile.name.split('.')[0]);
    }
  };
  
  const handleImport = async () => {
    if (!file) {
      setFileError('Please select a file to import');
      return;
    }
    
    if (createTable && !baseId) {
      setFileError('Base ID is required when creating a new table');
      return;
    }
    
    if (createTable && !tableName) {
      setFileError('Table name is required when creating a new table');
      return;
    }
    
    if (!createTable && !tableId) {
      setFileError('Table ID is required when importing to an existing table');
      return;
    }
    
    await dispatch(importData({
      file,
      options: {
        detectFieldTypes,
        headerRow,
        sheetIndex,
        createTable,
        tableId: !createTable ? tableId : undefined,
        baseId: createTable ? baseId : undefined,
        tableName: createTable ? tableName : undefined
      }
    }));
  };
  
  const handleExport = () => {
    if (!tableId) {
      return;
    }
    
    importExportService.exportData(tableId, {
      format: exportFormat,
      includeHeaders,
      fileName: fileName || undefined,
      viewId: useViewFilters ? viewId : undefined
    });
    
    onClose();
  };
  
  const handleClose = () => {
    if (loading) {
      return;
    }
    
    dispatch(clearImportJob());
    onClose();
  };
  
  const renderImportProgress = () => {
    if (!importProgress) {
      return null;
    }
    
    const { totalRows, processedRows, status, errors, warnings } = importProgress;
    const progress = totalRows > 0 ? (processedRows / totalRows) * 100 : 0;
    
    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {status === 'completed' ? 'Import completed' : status === 'failed' ? 'Import failed' : 'Importing...'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {processedRows} of {totalRows} rows processed
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          color={status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'primary'} 
          sx={{ mb: 2 }}
        />
        
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Errors ({errors.length})</AlertTitle>
            <List dense>
              {errors.slice(0, 5).map((error, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ErrorIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Row ${error.row > 0 ? error.row : 'N/A'}${error.column ? `, Column ${error.column}` : ''}`}
                    secondary={error.message}
                  />
                </ListItem>
              ))}
              {errors.length > 5 && (
                <ListItem>
                  <ListItemText primary={`... and ${errors.length - 5} more errors`} />
                </ListItem>
              )}
            </List>
          </Alert>
        )}
        
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Warnings ({warnings.length})</AlertTitle>
            <List dense>
              {warnings.slice(0, 5).map((warning, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WarningIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Row ${warning.row}, Column ${warning.column}`}
                    secondary={warning.message}
                  />
                </ListItem>
              ))}
              {warnings.length > 5 && (
                <ListItem>
                  <ListItemText primary={`... and ${warnings.length - 5} more warnings`} />
                </ListItem>
              )}
            </List>
          </Alert>
        )}
        
        {status === 'completed' && (
          <Alert severity="success">
            <AlertTitle>Import Completed Successfully</AlertTitle>
            {processedRows} rows were imported successfully.
          </Alert>
        )}
      </Box>
    );
  };
  
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Import / Export Data
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={loading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        {!currentImportJobId ? (
          <>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="import export tabs">
              <Tab label="Import" id="import-export-tab-0" aria-controls="import-export-tabpanel-0" />
              <Tab label="Export" id="import-export-tab-1" aria-controls="import-export-tabpanel-1" />
            </Tabs>
            
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Import Data
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Import data from CSV or Excel files. You can create a new table or import to an existing one.
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ mb: 1 }}
                  >
                    Select File
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      hidden
                      onChange={handleFileChange}
                    />
                  </Button>
                  
                  {file && (
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </Typography>
                  )}
                  
                  {fileError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {fileError}
                    </Typography>
                  )}
                </Box>
                
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={detectFieldTypes}
                        onChange={(e) => setDetectFieldTypes(e.target.checked)}
                      />
                    }
                    label="Auto-detect field types"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={headerRow}
                        onChange={(e) => setHeaderRow(e.target.checked)}
                      />
                    }
                    label="First row contains headers"
                  />
                  
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <TextField
                      label="Sheet Index (for Excel files)"
                      type="number"
                      value={sheetIndex}
                      onChange={(e) => setSheetIndex(parseInt(e.target.value) || 0)}
                      InputProps={{ inputProps: { min: 0 } }}
                      size="small"
                      fullWidth
                    />
                  </Box>
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={createTable}
                        onChange={(e) => setCreateTable(e.target.checked)}
                        disabled={!baseId}
                      />
                    }
                    label="Create new table"
                  />
                  
                  {createTable && (
                    <TextField
                      label="Table Name"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      margin="normal"
                      required
                      fullWidth
                    />
                  )}
                </FormGroup>
              </Box>
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Export Data
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Export table data to various formats.
                </Typography>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel id="export-format-label">Export Format</InputLabel>
                  <Select
                    labelId="export-format-label"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'csv' | 'xlsx' | 'json')}
                    label="Export Format"
                  >
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="xlsx">Excel (XLSX)</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  label="File Name (optional)"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  margin="normal"
                  fullWidth
                  helperText="Leave blank to use default naming"
                />
                
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeHeaders}
                        onChange={(e) => setIncludeHeaders(e.target.checked)}
                      />
                    }
                    label="Include headers"
                  />
                  
                  {viewId && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={useViewFilters}
                          onChange={(e) => setUseViewFilters(e.target.checked)}
                        />
                      }
                      label="Use current view filters and field visibility"
                    />
                  )}
                </FormGroup>
              </Box>
            </TabPanel>
          </>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Import Progress
            </Typography>
            {renderImportProgress()}
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {currentImportJobId && importProgress?.status === 'completed' ? 'Close' : 'Cancel'}
        </Button>
        
        {!currentImportJobId && (
          tabValue === 0 ? (
            <Button
              onClick={handleImport}
              variant="contained"
              color="primary"
              startIcon={<UploadIcon />}
              disabled={loading || !file}
            >
              Import
            </Button>
          ) : (
            <Button
              onClick={handleExport}
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              disabled={!tableId}
            >
              Export
            </Button>
          )
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportExportDialog;