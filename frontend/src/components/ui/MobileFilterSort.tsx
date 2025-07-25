import React, { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  MenuItem,
  Button,
  Chip,
  Stack,
  Fab,
  Badge,
  useTheme,
  useMediaQuery,
  SwipeableDrawer,
  AppBar,
  Toolbar,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  FilterList,
  Sort,
  Close,
  Add,
  Delete,
  Clear,
  Check
} from '@mui/icons-material';
import { viewService } from '../../services/viewService';

interface MobileFilterSortProps {
  fields: any[];
  viewId: string;
  currentFilters: any[];
  currentSorts: any[];
  onApply: () => void;
}

const MobileFilterSort: React.FC<MobileFilterSortProps> = ({
  fields,
  viewId,
  currentFilters,
  currentSorts,
  onApply,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<any[]>(currentFilters);
  const [sorts, setSorts] = useState<any[]>(currentSorts);
  
  // Don't render on desktop
  if (!isMobile) {
    return null;
  }
  
  const activeFiltersCount = currentFilters.length;
  const activeSortsCount = currentSorts.length;
  
  const handleOpenFilterDrawer = () => {
    setFilters([...currentFilters]);
    setFilterDrawerOpen(true);
  };
  
  const handleOpenSortDrawer = () => {
    setSorts([...currentSorts]);
    setSortDrawerOpen(true);
  };
  
  const handleCloseFilterDrawer = () => {
    setFilterDrawerOpen(false);
  };
  
  const handleCloseSortDrawer = () => {
    setSortDrawerOpen(false);
  };
  
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
  
  const handleApplyFilters = async () => {
    try {
      await viewService.updateViewFilters(viewId, filters);
      onApply();
      handleCloseFilterDrawer();
    } catch (error) {
      console.error('Error updating filters:', error);
    }
  };
  
  const handleApplySorts = async () => {
    try {
      await viewService.updateViewSorts(viewId, sorts);
      onApply();
      handleCloseSortDrawer();
    } catch (error) {
      console.error('Error updating sorts:', error);
    }
  };
  
  const handleClearFilters = () => {
    setFilters([]);
  };
  
  const handleClearSorts = () => {
    setSorts([]);
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
    <>
      {/* Floating Action Buttons */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 80, // Above bottom navigation
          right: 16,
          zIndex: theme.zIndex.speedDial,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Fab
          size="small"
          color="primary"
          onClick={handleOpenSortDrawer}
          aria-label={`Sort records${activeSortsCount > 0 ? ` (${activeSortsCount} active)` : ''}`}
          sx={{
            backgroundColor: activeSortsCount > 0 ? theme.palette.secondary.main : theme.palette.primary.main,
          }}
        >
          <Badge badgeContent={activeSortsCount} color="error">
            <Sort />
          </Badge>
        </Fab>
        
        <Fab
          size="small"
          color="primary"
          onClick={handleOpenFilterDrawer}
          aria-label={`Filter records${activeFiltersCount > 0 ? ` (${activeFiltersCount} active)` : ''}`}
          sx={{
            backgroundColor: activeFiltersCount > 0 ? theme.palette.secondary.main : theme.palette.primary.main,
          }}
        >
          <Badge badgeContent={activeFiltersCount} color="error">
            <FilterList />
          </Badge>
        </Fab>
      </Box>
      
      {/* Filter Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={handleCloseFilterDrawer}
        onOpen={handleOpenFilterDrawer}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            height: '90vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          },
        }}
      >
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Filter Records
            </Typography>
            <IconButton edge="end" onClick={handleCloseFilterDrawer}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {filters.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary" gutterBottom>
                No filters applied
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Add a filter to narrow down records
              </Typography>
            </Box>
          ) : (
            <List>
              {filters.map((filter, index) => {
                const field = fields.find(f => f.id === filter.fieldId);
                const operatorOptions = field ? getOperatorOptions(field.type) : [];
                
                return (
                  <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'stretch', py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Filter {index + 1}
                      </Typography>
                      <IconButton size="small" onClick={() => handleRemoveFilter(index)}>
                        <Delete />
                      </IconButton>
                    </Box>
                    
                    <TextField
                      select
                      label="Field"
                      value={filter.fieldId}
                      onChange={(e) => handleFilterChange(index, 'fieldId', e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 2 }}
                    >
                      {fields.map((field) => (
                        <MenuItem key={field.id} value={field.id}>
                          {field.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    
                    <TextField
                      select
                      label="Condition"
                      value={filter.operator}
                      onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 2 }}
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
                        fullWidth
                        size="small"
                      />
                    )}
                    
                    {index < filters.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
        
        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              startIcon={<Add />}
              onClick={handleAddFilter}
              variant="outlined"
              fullWidth
            >
              Add Filter
            </Button>
            {filters.length > 0 && (
              <Button
                startIcon={<Clear />}
                onClick={handleClearFilters}
                variant="outlined"
                color="error"
              >
                Clear All
              </Button>
            )}
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Button
              onClick={handleCloseFilterDrawer}
              variant="outlined"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyFilters}
              variant="contained"
              fullWidth
              startIcon={<Check />}
            >
              Apply Filters
            </Button>
          </Stack>
        </Box>
      </SwipeableDrawer>
      
      {/* Sort Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={sortDrawerOpen}
        onClose={handleCloseSortDrawer}
        onOpen={handleOpenSortDrawer}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            height: '90vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          },
        }}
      >
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Sort Records
            </Typography>
            <IconButton edge="end" onClick={handleCloseSortDrawer}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {sorts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary" gutterBottom>
                No sorting applied
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Add a sort to order records
              </Typography>
            </Box>
          ) : (
            <List>
              {sorts.map((sort, index) => (
                <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'stretch', py: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Sort {index + 1}
                    </Typography>
                    <IconButton size="small" onClick={() => handleRemoveSort(index)}>
                      <Delete />
                    </IconButton>
                  </Box>
                  
                  <TextField
                    select
                    label="Field"
                    value={sort.fieldId}
                    onChange={(e) => handleSortChange(index, 'fieldId', e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 2 }}
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
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="asc">Ascending (A → Z)</MenuItem>
                    <MenuItem value="desc">Descending (Z → A)</MenuItem>
                  </TextField>
                  
                  {index < sorts.length - 1 && <Divider sx={{ mt: 2 }} />}
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        
        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              startIcon={<Add />}
              onClick={handleAddSort}
              variant="outlined"
              fullWidth
            >
              Add Sort
            </Button>
            {sorts.length > 0 && (
              <Button
                startIcon={<Clear />}
                onClick={handleClearSorts}
                variant="outlined"
                color="error"
              >
                Clear All
              </Button>
            )}
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Button
              onClick={handleCloseSortDrawer}
              variant="outlined"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplySorts}
              variant="contained"
              fullWidth
              startIcon={<Check />}
            >
              Apply Sorts
            </Button>
          </Stack>
        </Box>
      </SwipeableDrawer>
    </>
  );
};

export default MobileFilterSort;