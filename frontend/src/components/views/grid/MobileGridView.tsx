import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Card, 
  CardContent, 
  Divider,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  useTheme
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useVirtualizer } from '@tanstack/react-virtual';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { recordService } from '../../../services/recordService';
import { viewService } from '../../../services/viewService';
import LoadingSpinner from '../../ui/LoadingSpinner';
import GridToolbar from './GridToolbar';
import PullToRefresh from '../../ui/PullToRefresh';
import MobileFilterSort from '../../ui/MobileFilterSort';
import { RootState } from '../../../store';
import { fetchRecords, updateRecord } from '../../../store/slices/recordSlice';
import { setCurrentView } from '../../../store/slices/viewSlice';
import { measureAsyncFunction } from '../../../utils/performanceMonitoring';

interface MobileGridViewProps {
  tableId: string;
  viewId: string;
}

const MobileGridView: React.FC<MobileGridViewProps> = ({ tableId, viewId }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  
  // Get records and fields from Redux store
  const records = useSelector((state: RootState) => state.records.records || []);
  const fields = useSelector((state: RootState) => 
    state.tables.byId && state.tables.byId[tableId] ? state.tables.byId[tableId].fields : []
  );
  const view = useSelector((state: RootState) => 
    state.views.byId && state.views.byId[viewId] ? state.views.byId[viewId] : null
  );
  
  // Pagination state
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20); // Smaller page size for mobile
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  
  // Track if we've loaded all records
  const allRecordsLoaded = React.useRef<boolean>(false);
  
  // Container ref for virtualization
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  // Get visible fields based on view configuration
  const visibleFields = useMemo(() => {
    if (!view || !fields || fields.length === 0) return fields || [];
    
    return fields.filter(field => {
      // If field visibility is not defined, show all fields
      if (!view.fieldVisibility) return true;
      
      // If field is explicitly set to visible or not defined, show it
      return view.fieldVisibility[field.id] !== false;
    });
  }, [fields, view]);
  
  // Set up row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Card height estimate
    overscan: 5,
  });
  
  // Refresh function for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await loadData(1, false);
  }, []);

  // Load data with pagination
  const loadData = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
        allRecordsLoaded.current = false;
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      
      // Load view details (only on first page)
      if (page === 1) {
        const viewData = await measureAsyncFunction('load-view', 
          async () => await viewService.getView(viewId)
        );
        dispatch(setCurrentView(viewData));
      }
      
      // Calculate offset based on page and page size
      const offset = (page - 1) * pageSize;
      
      // Load records with pagination, filters and sorts from the view
      const result = await measureAsyncFunction('load-records', 
        async () => await recordService.getRecords(tableId, {
          limit: pageSize,
          offset,
          filters: view?.filters || [],
          sorts: view?.sorts || [],
        })
      );
      
      // Update total records count
      setTotalRecords(result.total);
      
      // Update current page
      setCurrentPage(page);
      
      // Check if we've loaded all records
      if (result.records.length < pageSize) {
        allRecordsLoaded.current = true;
      }
      
      // Update records in Redux store
      dispatch(fetchRecords({
        tableId,
        options: {
          filters: view?.filters || [],
          sorts: view?.sorts || [],
          limit: pageSize,
          offset,
        },
        records: result.records,
        append,
        total: result.total
      }));
      
    } catch (err: any) {
      console.error('Error loading grid data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [tableId, viewId, dispatch, pageSize, view]);
  
  // Load data on component mount
  useEffect(() => {
    loadData(1, false);
  }, [loadData]);
  
  // Handle scroll to load more data
  useEffect(() => {
    const handleScroll = () => {
      if (!parentRef.current || loading || isLoadingMore || allRecordsLoaded.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
      
      // Load more when user scrolls to 80% of the way down
      if (scrollTop + clientHeight > scrollHeight * 0.8) {
        loadData(currentPage + 1, true);
      }
    };
    
    const scrollElement = parentRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [loadData, loading, isLoadingMore, currentPage]);
  
  // Open edit dialog for a record
  const handleEditRecord = (record: any) => {
    setCurrentRecord(record);
    
    // Initialize edit values with current record values
    const initialValues: Record<string, any> = {};
    visibleFields.forEach(field => {
      initialValues[field.id] = record.fields[field.id] || '';
    });
    
    setEditValues(initialValues);
    setEditDialogOpen(true);
  };
  
  // Handle field value change in dialog
  const handleFieldChange = (fieldId: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };
  
  // Save record changes
  const handleSaveRecord = async () => {
    if (!currentRecord) return;
    
    try {
      // Optimistically update the UI
      dispatch(updateRecord({
        id: currentRecord.id,
        updates: {
          fields: editValues
        }
      }));
      
      // Update on the server
      await recordService.updateRecord(currentRecord.id, {
        fields: editValues
      });
      
      // Close dialog
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Error updating record:', err);
      // Reload data to revert to correct state
      loadData();
    }
  };
  
  // Get display value for a field based on its type
  const getDisplayValue = (field: any, value: any) => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    
    switch (field.type) {
      case 'checkbox':
        return value ? '✓' : '✗';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'multiSelect':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        return String(value);
    }
  };
  
  // Render loading state
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Render error state
  if (error) {
    return (
      <Box p={2} textAlign="center">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <GridToolbar 
        tableId={tableId} 
        viewId={viewId} 
        onRefresh={() => loadData()}
        selectedCells={null}
        onCopy={() => {}}
      />
      
      <PullToRefresh onRefresh={handleRefresh}>
        <Box 
          ref={parentRef}
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            pt: 1
          }}
        >
        <Box
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const record = records[virtualRow.index];
            if (!record) return null;
            
            // Get primary field (first field) for card title
            const primaryField = visibleFields[0];
            const primaryValue = primaryField ? record.fields[primaryField.id] : '';
            
            // Get first 3 fields for card preview (excluding primary)
            const previewFields = visibleFields.slice(1, 4);
            
            return (
              <Card
                key={record.id}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                  mb: 1,
                  borderRadius: 2,
                  boxShadow: 1,
                  '&:active': {
                    backgroundColor: theme.palette.action.selected,
                  },
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                      {primaryValue || 'Untitled Record'}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditRecord(record)}
                      sx={{ ml: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Divider sx={{ mb: 1 }} />
                  
                  {previewFields.map(field => (
                    <Box key={field.id} sx={{ display: 'flex', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: '40%', fontWeight: 500 }}>
                        {field.name}:
                      </Typography>
                      <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                        {getDisplayValue(field, record.fields[field.id])}
                      </Typography>
                    </Box>
                  ))}
                  
                  {previewFields.length < visibleFields.length - 1 && (
                    <Typography variant="caption" color="text.secondary">
                      +{visibleFields.length - previewFields.length - 1} more fields
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
        
        {isLoadingMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <LoadingSpinner size={24} />
          </Box>
        )}
        </Box>
      </PullToRefresh>
      
      {/* Mobile Filter and Sort Controls */}
      <MobileFilterSort
        fields={fields}
        viewId={viewId}
        currentFilters={view?.filters || []}
        currentSorts={view?.sorts || []}
        onApply={() => loadData()}
      />
      
      {/* Edit Record Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: '100%',
            m: { xs: 1, sm: 2 }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Edit Record</Typography>
          <IconButton edge="end" onClick={() => setEditDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <List sx={{ pt: 0 }}>
            {visibleFields.map(field => (
              <ListItem key={field.id} sx={{ px: 0, py: 1 }}>
                <ListItemText 
                  primary={field.name} 
                  primaryTypographyProps={{ fontWeight: 500 }}
                  sx={{ mb: 0.5 }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={editValues[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  type={field.type === 'number' ? 'number' : 'text'}
                  multiline={field.type === 'text' && String(editValues[field.id] || '').length > 50}
                  rows={3}
                  InputProps={{
                    sx: { 
                      borderRadius: 1,
                      fontSize: '0.9rem'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRecord}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileGridView;