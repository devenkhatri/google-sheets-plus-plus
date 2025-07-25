import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSelector, useDispatch } from 'react-redux';
import { recordService } from '../../../services/recordService';
import { viewService } from '../../../services/viewService';
import LoadingSpinner from '../../ui/LoadingSpinner';
import GridHeader from './GridHeader';
import GridCell from './GridCell';
import GridToolbar from './GridToolbar';
import { RootState } from '../../../store';
import { fetchRecords, updateRecord } from '../../../store/slices/recordSlice';
import { setCurrentView } from '../../../store/slices/viewSlice';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { performanceMonitor, withPerformanceTracking } from '../../../utils/performanceMonitoring';

interface GridViewProps {
  tableId: string;
  viewId: string;
}

interface Field {
  id: string;
  name: string;
  type: string;
  options?: any;
  required: boolean;
}

interface Record {
  id: string;
  table_id: string;
  row_index: number;
  fields: any;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

const GridView: React.FC<GridViewProps> = ({ tableId, viewId }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCells, setSelectedCells] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  
  // Get records and fields from Redux store
  const records = useSelector((state: RootState) => state.records.records || []);
  const fields = useSelector((state: RootState) => 
    state.tables.byId && state.tables.byId[tableId] ? state.tables.byId[tableId].fields : []
  );
  const view = useSelector((state: RootState) => 
    state.views.byId && state.views.byId[viewId] ? state.views.byId[viewId] : null
  );
  
  // Local state for column widths
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [frozenColumns, setFrozenColumns] = useState<number>(view?.configuration?.frozenColumns || 1);
  
  // Container refs for virtualization
  const parentRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  
  // Pagination state
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  
  // Track if we've loaded all records
  const allRecordsLoaded = useRef<boolean>(false);
  
  // Performance monitoring is handled by the HOC
  
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
  
  // Set up row virtualizer with optimized configuration
  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Default row height
    overscan: 5, // Reduced overscan for better performance
    measureElement: 
      typeof ResizeObserver !== 'undefined'
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });
  
  // Set up column virtualizer with optimized configuration
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleFields.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const fieldId = visibleFields[index]?.id;
      return fieldId && columnWidths[fieldId] ? columnWidths[fieldId] : 150;
    },
    overscan: 2, // Reduced overscan for better performance
    measureElement:
      typeof ResizeObserver !== 'undefined'
        ? (element) => element.getBoundingClientRect().width
        : undefined,
  });
  
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
        const viewData = await viewService.getView(viewId);
        dispatch(setCurrentView(viewData));
        
        // Initialize column widths from view configuration or defaults
        const initialColumnWidths: Record<string, number> = {};
        visibleFields.forEach((field) => {
          initialColumnWidths[field.id] = viewData.configuration?.columnWidths?.[field.id] || 150;
        });
        
        setColumnWidths(initialColumnWidths);
        setFrozenColumns(viewData.configuration?.frozenColumns || 1);
      }
      
      // Calculate offset based on page and page size
      const offset = (page - 1) * pageSize;
      
      // Load records with pagination, filters and sorts from the view
      const result = await recordService.getRecords(tableId, {
        limit: pageSize,
          offset,
          filters: view?.filters || [],
          sorts: view?.sorts || [],
        });
      
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
  }, [tableId, viewId, dispatch, visibleFields, pageSize, view]);
  
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
  
  // Handle cell selection
  const handleCellClick = (rowIndex: number, colIndex: number, event: React.MouseEvent) => {
    if (event.shiftKey && selectedCells) {
      // Extend selection
      setSelectedCells({
        startRow: selectedCells.startRow,
        startCol: selectedCells.startCol,
        endRow: rowIndex,
        endCol: colIndex,
      });
    } else {
      // New selection
      setSelectedCells({
        startRow: rowIndex,
        startCol: colIndex,
        endRow: rowIndex,
        endCol: colIndex,
      });
    }
  };
  
  // Handle cell value change
  const handleCellChange = async (recordId: string, fieldId: string, value: any) => {
    try {
      // Optimistically update the UI
      dispatch(updateRecord({
        id: recordId,
        updates: {
          fields: {
            [fieldId]: value
          }
        }
      }));
      
      // Update on the server
      await recordService.updateRecord(recordId, {
        fields: {
          [fieldId]: value
        }
      });
    } catch (err) {
      console.error('Error updating cell:', err);
      // Reload data to revert to correct state
      loadData();
    }
  };
  
  // Handle column resize
  const handleColumnResize = (fieldId: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [fieldId]: width,
    }));
    
    // Debounce saving to view configuration
    const saveColumnWidth = async () => {
      try {
        if (!view) return;
        
        const updatedConfiguration = {
          ...view.configuration,
          columnWidths: {
            ...(view.configuration?.columnWidths || {}),
            [fieldId]: width,
          },
        };
        
        await viewService.updateView(viewId, {
          configuration: updatedConfiguration,
        });
      } catch (err) {
        console.error('Error saving column width:', err);
      }
    };
    
    const timeoutId = setTimeout(saveColumnWidth, 500);
    return () => clearTimeout(timeoutId);
  };
  
  // Handle column reorder
  const handleColumnReorder = async (sourceIndex: number, targetIndex: number) => {
    // Reorder fields in the local state
    const newVisibleFields = [...visibleFields];
    const [movedField] = newVisibleFields.splice(sourceIndex, 1);
    newVisibleFields.splice(targetIndex, 0, movedField);
    
    // Update field visibility in the view
    const newFieldVisibility: Record<string, boolean> = {};
    newVisibleFields.forEach((field) => {
      newFieldVisibility[field.id] = true;
    });
    
    try {
      await viewService.updateViewFieldVisibility(viewId, newFieldVisibility);
    } catch (err) {
      console.error('Error reordering columns:', err);
    }
  };
  
  // Handle column freeze/unfreeze
  const handleToggleColumnFreeze = async (index: number) => {
    const newFrozenColumns = index + 1 === frozenColumns ? index : index + 1;
    setFrozenColumns(newFrozenColumns);
    
    try {
      if (!view) return;
      
      const updatedConfiguration = {
        ...view.configuration,
        frozenColumns: newFrozenColumns,
      };
      
      await viewService.updateView(viewId, {
        configuration: updatedConfiguration,
      });
    } catch (err) {
      console.error('Error updating frozen columns:', err);
    }
  };
  
  // Handle copy/paste
  const handleCopy = () => {
    if (!selectedCells) return;
    
    const { startRow, startCol, endRow, endCol } = selectedCells;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    let copyText = '';
    
    for (let i = minRow; i <= maxRow; i++) {
      const rowValues = [];
      for (let j = minCol; j <= maxCol; j++) {
        const record = records[i];
        const field = visibleFields[j];
        if (record && field) {
          const value = record.fields[field.id] || '';
          rowValues.push(value);
        }
      }
      copyText += rowValues.join('\t') + '\n';
    }
    
    navigator.clipboard.writeText(copyText);
  };
  
  // Handle paste
  const handlePaste = async (e: ClipboardEvent) => {
    if (!selectedCells) return;
    
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    
    const text = clipboardData.getData('text');
    const rows = text.split('\n').filter(row => row.trim());
    
    const { startRow, startCol } = selectedCells;
    
    // Batch updates for better performance
    const updates = [];
    
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = startRow + i;
      if (rowIndex >= records.length) continue;
      
      const record = records[rowIndex];
      const values = rows[i].split('\t');
      
      const fieldUpdates: Record<string, any> = {};
      
      for (let j = 0; j < values.length; j++) {
        const colIndex = startCol + j;
        if (colIndex >= visibleFields.length) continue;
        
        const field = visibleFields[colIndex];
        fieldUpdates[field.id] = values[j];
      }
      
      updates.push({
        id: record.id,
        fields: fieldUpdates,
      });
    }
    
    if (updates.length > 0) {
      try {
        // Optimistically update UI
        updates.forEach(update => {
          dispatch(updateRecord({
            id: update.id,
            updates: {
              fields: update.fields
            }
          }));
        });
        
        // Send to server
        await recordService.bulkUpdateRecords(updates);
      } catch (err) {
        console.error('Error pasting data:', err);
        loadData(); // Reload to revert to correct state
      }
    }
  };
  
  // Register keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'c',
        ctrlKey: true,
        action: handleCopy,
        description: 'Copy selected cells'
      },
      {
        key: 'c',
        metaKey: true,
        action: handleCopy,
        description: 'Copy selected cells'
      }
    ],
    enabled: true
  });
  
  // Listen for paste events
  useEffect(() => {
    const handlePasteEvent = (e: ClipboardEvent) => {
      if (document.activeElement?.closest('.grid-view')) {
        handlePaste(e);
      }
    };
    
    document.addEventListener('paste', handlePasteEvent);
    return () => {
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [selectedCells, records, visibleFields]);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box className="grid-view" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <GridToolbar 
        tableId={tableId} 
        viewId={viewId} 
        onRefresh={loadData} 
        selectedCells={selectedCells}
        onCopy={handleCopy}
      />
      
      <Paper 
        elevation={0} 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        {/* Header row */}
        <GridHeader 
          fields={visibleFields}
          columnVirtualizer={columnVirtualizer}
          columnWidths={columnWidths}
          frozenColumns={frozenColumns}
          onColumnResize={handleColumnResize}
          onColumnReorder={handleColumnReorder}
          onToggleColumnFreeze={handleToggleColumnFreeze}
          headerRef={headerRef}
        />
        
        {/* Data grid */}
        <Box 
          ref={parentRef}
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: `${columnVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map(rowVirtualItem => (
              columnVirtualizer.getVirtualItems().map(columnVirtualItem => {
                const record = records[rowVirtualItem.index];
                const field = visibleFields[columnVirtualItem.index];
                
                if (!record || !field) return null;
                
                const isFrozen = columnVirtualItem.index < frozenColumns;
                
                // Determine if cell is selected
                let isSelected = false;
                if (selectedCells) {
                  const { startRow, startCol, endRow, endCol } = selectedCells;
                  const minRow = Math.min(startRow, endRow);
                  const maxRow = Math.max(startRow, endRow);
                  const minCol = Math.min(startCol, endCol);
                  const maxCol = Math.max(startCol, endCol);
                  
                  isSelected = 
                    rowVirtualItem.index >= minRow && 
                    rowVirtualItem.index <= maxRow && 
                    columnVirtualItem.index >= minCol && 
                    columnVirtualItem.index <= maxCol;
                }
                
                return (
                  <GridCell
                    key={`${record.id}-${field.id}`}
                    record={record}
                    field={field}
                    rowIndex={rowVirtualItem.index}
                    colIndex={columnVirtualItem.index}
                    top={rowVirtualItem.start}
                    left={columnVirtualItem.start}
                    width={columnVirtualItem.size}
                    height={rowVirtualItem.size}
                    isSelected={isSelected}
                    isFrozen={isFrozen}
                    onClick={handleCellClick}
                    onChange={handleCellChange}
                  />
                );
              })
            ))}
          </Box>
        </Box>
        
        {/* Real-time connection indicator */}
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: 8, 
            right: 8, 
            display: 'flex', 
            alignItems: 'center',
            backgroundColor: 'background.paper',
            borderRadius: 1,
            px: 1,
            py: 0.5,
            boxShadow: 1,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'success.main',
              mr: 1,
            }}
          />
          <Typography variant="caption">
            Connected
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default GridView;