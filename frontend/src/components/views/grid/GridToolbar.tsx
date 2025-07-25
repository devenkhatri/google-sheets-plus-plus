import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  IconButton, 
  Tooltip, 
  Menu, 
  MenuItem, 
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography
} from '@mui/material';
import {
  Add,
  Refresh,
  FilterList,
  Sort,
  ViewColumn,
  Search,
  ContentCopy,
  ContentPaste,
  Delete,
  MoreVert,
  Close
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { viewService } from '../../../services/viewService';
import { recordService } from '../../../services/recordService';
import { RootState } from '../../../store';
import CustomButton from '../../ui/Button';

interface GridToolbarProps {
  tableId: string;
  viewId: string;
  onRefresh: () => void;
  selectedCells: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  onCopy: () => void;
}

const GridToolbar: React.FC<GridToolbarProps> = ({
  tableId,
  viewId,
  onRefresh,
  selectedCells,
  onCopy,
}) => {
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const view = useSelector((state: RootState) => state.views.byId?.[viewId]);
  const fields = useSelector((state: RootState) => state.tables.byId?.[tableId]?.fields || []);
  
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddRecord = async () => {
    try {
      await recordService.createRecord(tableId, {});
      onRefresh();
    } catch (error) {
      console.error('Error adding record:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedCells) return;
    
    const { startRow, endRow } = selectedCells;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    
    const records = useSelector((state: RootState) => state.records.records);
    const selectedRecords = records.slice(minRow, maxRow + 1);
    
    try {
      const updates = selectedRecords.map(record => ({
        id: record.id,
        deleted: true
      }));
      
      await recordService.bulkUpdateRecords(updates);
      onRefresh();
    } catch (error) {
      console.error('Error deleting records:', error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Implement search logic here
  };

  const handleOpenFilterDialog = () => {
    setFilterDialogOpen(true);
    handleMenuClose();
  };

  const handleOpenSortDialog = () => {
    setSortDialogOpen(true);
    handleMenuClose();
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Left section */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CustomButton
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Add />}
            onClick={handleAddRecord}
            sx={{ mr: 1 }}
          >
            Add record
          </CustomButton>
          
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={onRefresh}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Filter">
            <IconButton size="small" onClick={handleOpenFilterDialog}>
              <FilterList fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Sort">
            <IconButton size="small" onClick={handleOpenSortDialog}>
              <Sort fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Column visibility">
            <IconButton size="small">
              <ViewColumn fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {selectedCells && (
            <>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={onCopy}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Delete selected">
                <IconButton size="small" onClick={handleDeleteSelected}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          
          <Tooltip title="More options">
            <IconButton size="small" onClick={handleMenuClick}>
              <MoreVert fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleOpenFilterDialog}>
              <FilterList fontSize="small" sx={{ mr: 1 }} />
              Filter
            </MenuItem>
            <MenuItem onClick={handleOpenSortDialog}>
              <Sort fontSize="small" sx={{ mr: 1 }} />
              Sort
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <ViewColumn fontSize="small" sx={{ mr: 1 }} />
              Show/hide fields
            </MenuItem>
            {selectedCells && (
              <MenuItem onClick={handleDeleteSelected}>
                <Delete fontSize="small" sx={{ mr: 1 }} />
                Delete selected
              </MenuItem>
            )}
          </Menu>
        </Box>
        
        {/* Right section */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    edge="end"
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{ width: 200 }}
          />
        </Box>
      </Box>
      
      {/* Filter Dialog */}
      <FilterDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        fields={fields}
        viewId={viewId}
        currentFilters={view?.filters || []}
        onApply={onRefresh}
      />
      
      {/* Sort Dialog */}
      <SortDialog
        open={sortDialogOpen}
        onClose={() => setSortDialogOpen(false)}
        fields={fields}
        viewId={viewId}
        currentSorts={view?.sorts || []}
        onApply={onRefresh}
      />
    </>
  );
};

// Filter Dialog Component
interface FilterDialogProps {
  open: boolean;
  onClose: () => void;
  fields: any[];
  viewId: string;
  currentFilters: any[];
  onApply: () => void;
}

const FilterDialog: React.FC<FilterDialogProps> = ({
  open,
  onClose,
  fields,
  viewId,
  currentFilters,
  onApply,
}) => {
  const [filters, setFilters] = useState<any[]>(currentFilters);
  
  const handleAddFilter = () => {
    if (fields.length === 0) return;
    
    setFilters([
      ...filters,
      {
        fieldId: fields[0].id,
        operator: 'equals',
        value: '',
      },
    ]);
  };
  
  const handleRemoveFilter = (index: number) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };
  
  const handleFilterChange = (index: number, key: string, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = {
      ...newFilters[index],
      [key]: value,
    };
    setFilters(newFilters);
  };
  
  const handleApply = async () => {
    try {
      await viewService.updateViewFilters(viewId, filters);
      onApply();
      onClose();
    } catch (error) {
      console.error('Error updating filters:', error);
    }
  };
  
  const getOperatorOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'text':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts with' },
          { value: 'endsWith', label: 'Ends with' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' },
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Does not equal' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'lessThan', label: 'Less than' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' },
        ];
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' },
        ];
      case 'checkbox':
        return [
          { value: 'equals', label: 'Is checked' },
          { value: 'notEquals', label: 'Is not checked' },
        ];
      case 'singleSelect':
      case 'multiSelect':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Does not equal' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' },
        ];
      default:
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Does not equal' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' },
        ];
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Filter Records</DialogTitle>
      <DialogContent>
        {filters.length === 0 ? (
          <Typography color="textSecondary" sx={{ my: 2 }}>
            No filters applied. Add a filter to narrow down records.
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            {filters.map((filter, index) => {
              const field = fields.find(f => f.id === filter.fieldId);
              const operatorOptions = field ? getOperatorOptions(field.type) : [];
              
              return (
                <Box key={index} sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                  <TextField
                    select
                    label="Field"
                    value={filter.fieldId}
                    onChange={(e) => handleFilterChange(index, 'fieldId', e.target.value)}
                    size="small"
                    sx={{ width: 200, mr: 1 }}
                  >
                    {fields.map((field) => (
                      <MenuItem key={field.id} value={field.id}>
                        {field.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  
                  <TextField
                    select
                    label="Operator"
                    value={filter.operator}
                    onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                    size="small"
                    sx={{ width: 150, mr: 1 }}
                  >
                    {operatorOptions.map((op) => (
                      <MenuItem key={op.value} value={op.value}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  
                  {!['isEmpty', 'isNotEmpty'].includes(filter.operator) && (
                    <TextField
                      label="Value"
                      value={filter.value}
                      onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                      size="small"
                      sx={{ width: 200, mr: 1 }}
                    />
                  )}
                  
                  <IconButton onClick={() => handleRemoveFilter(index)} size="small">
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}
        
        <Button
          startIcon={<Add />}
          onClick={handleAddFilter}
          sx={{ mt: 1 }}
        >
          Add filter
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Sort Dialog Component
interface SortDialogProps {
  open: boolean;
  onClose: () => void;
  fields: any[];
  viewId: string;
  currentSorts: any[];
  onApply: () => void;
}

const SortDialog: React.FC<SortDialogProps> = ({
  open,
  onClose,
  fields,
  viewId,
  currentSorts,
  onApply,
}) => {
  const [sorts, setSorts] = useState<any[]>(currentSorts);
  
  const handleAddSort = () => {
    if (fields.length === 0) return;
    
    setSorts([
      ...sorts,
      {
        fieldId: fields[0].id,
        direction: 'asc',
      },
    ]);
  };
  
  const handleRemoveSort = (index: number) => {
    const newSorts = [...sorts];
    newSorts.splice(index, 1);
    setSorts(newSorts);
  };
  
  const handleSortChange = (index: number, key: string, value: any) => {
    const newSorts = [...sorts];
    newSorts[index] = {
      ...newSorts[index],
      [key]: value,
    };
    setSorts(newSorts);
  };
  
  const handleApply = async () => {
    try {
      await viewService.updateViewSorts(viewId, sorts);
      onApply();
      onClose();
    } catch (error) {
      console.error('Error updating sorts:', error);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sort Records</DialogTitle>
      <DialogContent>
        {sorts.length === 0 ? (
          <Typography color="textSecondary" sx={{ my: 2 }}>
            No sorting applied. Add a sort to order records.
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            {sorts.map((sort, index) => (
              <Box key={index} sx={{ display: 'flex', mb: 2, alignItems: 'center' }}>
                <TextField
                  select
                  label="Field"
                  value={sort.fieldId}
                  onChange={(e) => handleSortChange(index, 'fieldId', e.target.value)}
                  size="small"
                  sx={{ width: 200, mr: 1 }}
                >
                  {fields.map((field) => (
                    <MenuItem key={field.id} value={field.id}>
                      {field.name}
                    </MenuItem>
                  ))}
                </TextField>
                
                <TextField
                  select
                  label="Direction"
                  value={sort.direction}
                  onChange={(e) => handleSortChange(index, 'direction', e.target.value)}
                  size="small"
                  sx={{ width: 150, mr: 1 }}
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </TextField>
                
                <IconButton onClick={() => handleRemoveSort(index)} size="small">
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
        
        <Button
          startIcon={<Add />}
          onClick={handleAddSort}
          sx={{ mt: 1 }}
        >
          Add sort
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          Apply Sorts
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GridToolbar;