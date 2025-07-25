import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Tabs, 
  Tab, 
  Card, 
  CardContent, 
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  useTheme,
  CircularProgress,
  Chip,
  Fade
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SwipeLeftIcon from '@mui/icons-material/SwipeLeft';
import SwipeRightIcon from '@mui/icons-material/SwipeRight';
import { viewService } from '../../../services/viewService';
import { recordService } from '../../../services/recordService';
import PullToRefresh from '../../ui/PullToRefresh';
import MobileFilterSort from '../../ui/MobileFilterSort';
import LoadingSpinner from '../../ui/LoadingSpinner';
import KanbanToolbar from './KanbanToolbar';
import { RootState } from '../../../store';
import { fetchRecords, updateRecord } from '../../../store/slices/recordSlice';
import { setCurrentView } from '../../../store/slices/viewSlice';
import { useTouchGestures } from '../../../utils/touchGestures';
import { 
  debounce, 
  triggerHapticFeedback, 
  isTouchDevice,
  getSafeAreaInsets,
  prefersReducedMotion
} from '../../../utils/mobileOptimizations';

interface MobileKanbanViewProps {
  tableId: string;
  viewId: string;
}

const MobileKanbanView: React.FC<MobileKanbanViewProps> = ({ tableId, viewId }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupByField, setGroupByField] = useState<string>('');
  const [displayFields, setDisplayFields] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  
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
  
  // Get the single select field used for grouping
  const groupField = useMemo(() => {
    if (!groupByField || !fields) return null;
    return fields.find(field => field.id === groupByField);
  }, [groupByField, fields]);
  
  // Get the options for the group field
  const groupOptions = useMemo(() => {
    if (!groupField || !groupField.options || !groupField.options.choices) {
      return [];
    }
    return groupField.options.choices;
  }, [groupField]);
  
  // Group records by the selected field
  const groupedRecords = useMemo(() => {
    if (!groupByField || !groupOptions || !records) {
      return {};
    }
    
    const groups: Record<string, any[]> = {};
    
    // Initialize groups with empty arrays
    groupOptions.forEach((option: any) => {
      groups[option.value] = [];
    });
    
    // Add a group for empty values
    groups['__empty__'] = [];
    
    // Group records
    records.forEach(record => {
      const value = record.fields[groupByField];
      if (value && groups[value]) {
        groups[value].push(record);
      } else {
        groups['__empty__'].push(record);
      }
    });
    
    return groups;
  }, [groupByField, groupOptions, records]);
  
  // Get all group keys including empty
  const allGroupKeys = useMemo(() => {
    if (!groupOptions) return ['__empty__'];
    return [...groupOptions.map((opt: any) => opt.value), '__empty__'];
  }, [groupOptions]);
  
  // Refs for swipe container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for swipe animation
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeIndicatorVisible, setSwipeIndicatorVisible] = useState(false);
  
  // Handle swipe gestures for tab navigation with enhanced feedback
  useTouchGestures(containerRef, {
    onSwipeLeft: () => {
      if (activeTab < allGroupKeys.length - 1) {
        // Provide haptic feedback with pattern for better experience
        triggerHapticFeedback([40, 30, 40]);
        
        // Show swipe direction indicator
        setSwipeDirection('left');
        setSwipeIndicatorVisible(true);
        setTimeout(() => setSwipeIndicatorVisible(false), 800);
        
        setActiveTab(activeTab + 1);
      } else {
        // Provide "edge" feedback when at the last tab
        triggerHapticFeedback([10, 30, 60]);
        
        // Visual bounce effect for edge feedback
        if (containerRef.current) {
          containerRef.current.style.transform = 'translateX(-30px)';
          containerRef.current.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.style.transform = '';
            }
          }, 200);
        }
      }
    },
    onSwipeRight: () => {
      if (activeTab > 0) {
        // Provide haptic feedback with pattern for better experience
        triggerHapticFeedback([40, 30, 40]);
        
        // Show swipe direction indicator
        setSwipeDirection('right');
        setSwipeIndicatorVisible(true);
        setTimeout(() => setSwipeIndicatorVisible(false), 800);
        
        setActiveTab(activeTab - 1);
      } else {
        // Provide "edge" feedback when at the first tab
        triggerHapticFeedback([10, 30, 60]);
        
        // Visual bounce effect for edge feedback
        if (containerRef.current) {
          containerRef.current.style.transform = 'translateX(30px)';
          containerRef.current.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.style.transform = '';
            }
          }, 200);
        }
      }
    },
    onPan: (event) => {
      // Skip animations if user prefers reduced motion
      const reduceMotion = prefersReducedMotion();
      
      // Add visual feedback during panning with improved performance
      if (containerRef.current) {
        // Calculate resistance at edges
        let translateX = event.deltaX * 0.5;
        if ((activeTab === 0 && translateX > 0) || 
            (activeTab === allGroupKeys.length - 1 && translateX < 0)) {
          translateX = translateX * 0.3; // Add resistance at edges
        }
        
        translateX = Math.min(Math.max(-120, translateX), 120);
        
        if (!reduceMotion) {
          containerRef.current.style.transform = `translateX(${translateX}px)`;
          containerRef.current.style.transition = 'none';
          
          // Add opacity and scale feedback for better visual indication
          const opacity = Math.max(0.8, 1 - Math.abs(translateX) / 300);
          const scale = Math.max(0.97, 1 - Math.abs(translateX) / 1000);
          containerRef.current.style.opacity = opacity.toString();
          containerRef.current.style.transform += ` scale(${scale})`;
        }
        
        if (event.isFinal) {
          containerRef.current.style.transform = '';
          containerRef.current.style.opacity = '';
          containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
          
          // Enhanced swipe threshold detection with velocity consideration
          const threshold = 40;
          const velocity = Math.abs(event.velocity);
          const adjustedThreshold = threshold * (velocity > 0.5 ? 0.7 : 1);
          
          if (Math.abs(event.deltaX) > adjustedThreshold) {
            if (event.deltaX > 0 && activeTab > 0) {
              setSwipeDirection('right');
              setSwipeIndicatorVisible(true);
              setTimeout(() => setSwipeIndicatorVisible(false), 800);
              setActiveTab(activeTab - 1);
              triggerHapticFeedback([40, 30, 40]);
            } else if (event.deltaX < 0 && activeTab < allGroupKeys.length - 1) {
              setSwipeDirection('left');
              setSwipeIndicatorVisible(true);
              setTimeout(() => setSwipeIndicatorVisible(false), 800);
              setActiveTab(activeTab + 1);
              triggerHapticFeedback([40, 30, 40]);
            }
          }
        }
      }
    }
  });
  
  // Refresh function for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await loadData();
  }, []);
  
  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load view details
      const viewData = await viewService.getView(viewId);
      dispatch(setCurrentView(viewData));
      
      // Set group by field from view configuration
      const configGroupByField = viewData.configuration?.groupByField;
      if (configGroupByField) {
        setGroupByField(configGroupByField);
      } else {
        // Find the first single select field if none is configured
        const firstSingleSelectField = fields.find(field => field.type === 'singleSelect');
        if (firstSingleSelectField) {
          setGroupByField(firstSingleSelectField.id);
        }
      }
      
      // Set display fields from view configuration
      const configDisplayFields = viewData.configuration?.cardFields;
      if (configDisplayFields && configDisplayFields.length > 0) {
        setDisplayFields(configDisplayFields);
      } else {
        // Use first 3 fields by default
        setDisplayFields(fields.slice(0, 3).map(field => field.id));
      }
      
      // Load records with filters and sorts from the view
      dispatch(fetchRecords({
        tableId,
        options: {
          filters: viewData.filters,
          sorts: viewData.sorts,
        }
      }));
      
    } catch (err: any) {
      console.error('Error loading kanban data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tableId, viewId, dispatch, fields]);
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Handle group by field change
  const handleGroupByChange = async (fieldId: string) => {
    setGroupByField(fieldId);
    
    try {
      if (!view) return;
      
      const updatedConfiguration = {
        ...view.configuration,
        groupByField: fieldId,
      };
      
      await viewService.updateView(viewId, {
        configuration: updatedConfiguration,
      });
    } catch (err) {
      console.error('Error updating group by field:', err);
    }
  };
  
  // Handle display fields change
  const handleDisplayFieldsChange = async (fieldIds: string[]) => {
    setDisplayFields(fieldIds);
    
    try {
      if (!view) return;
      
      const updatedConfiguration = {
        ...view.configuration,
        cardFields: fieldIds,
      };
      
      await viewService.updateView(viewId, {
        configuration: updatedConfiguration,
      });
    } catch (err) {
      console.error('Error updating display fields:', err);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Open edit dialog for a record
  const handleEditRecord = (record: any) => {
    setCurrentRecord(record);
    
    // Initialize edit values with current record values
    const initialValues: Record<string, any> = {};
    fields.forEach(field => {
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
  
  // Handle add record
  const handleAddRecord = () => {
    console.log('Add record');
    // TODO: Open add record modal
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
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <Box p={2} textAlign="center">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  // If no single select field is available for grouping
  if (!groupField) {
    return (
      <Box p={2} textAlign="center">
        <Typography>
          Kanban view requires a single select field. Please add one to your table.
        </Typography>
      </Box>
    );
  }
  
  // Get current group key and label
  const currentGroupKey = allGroupKeys[activeTab];
  const currentGroupLabel = currentGroupKey === '__empty__' 
    ? 'No value' 
    : groupOptions.find((opt: any) => opt.value === currentGroupKey)?.label || 'Unknown';
  const currentGroupColor = currentGroupKey === '__empty__' 
    ? undefined 
    : groupOptions.find((opt: any) => opt.value === currentGroupKey)?.color;
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <KanbanToolbar
        tableId={tableId}
        viewId={viewId}
        fields={fields}
        groupByField={groupByField}
        displayFields={displayFields}
        onRefresh={loadData}
        onGroupByChange={handleGroupByChange}
        onDisplayFieldsChange={handleDisplayFieldsChange}
        onAddRecord={handleAddRecord}
      />
      
      <PullToRefresh onRefresh={handleRefresh}>
        <Paper 
          elevation={0} 
          sx={{ 
            flex: 1, 
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {/* Tabs for column navigation */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            minHeight: '48px',
            '& .MuiTab-root': {
              minHeight: '48px',
              py: 1.5
            }
          }}
        >
          {groupOptions.map((option: any, index: number) => (
            <Tab 
              key={option.value} 
              label={option.label} 
              sx={{ 
                color: option.color,
                fontWeight: activeTab === index ? 'bold' : 'normal'
              }} 
            />
          ))}
          <Tab label="No value" />
        </Tabs>
        
        {/* Current column content */}
        <Box 
          ref={containerRef}
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            p: 2,
            position: 'relative'
          }}
        >
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: currentGroupColor,
                fontWeight: 'bold'
              }}
            >
              {currentGroupLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {groupedRecords[currentGroupKey]?.length || 0} records
            </Typography>
          </Box>
          
          {/* Cards in current column */}
          {groupedRecords[currentGroupKey]?.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '200px',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3
            }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                No records in this column
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={handleAddRecord}
                sx={{ borderRadius: 2 }}
              >
                Add Record
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {groupedRecords[currentGroupKey].map(record => {
                // Get primary field (first field) for card title
                const primaryField = fields[0];
                const primaryValue = primaryField ? record.fields[primaryField.id] : '';
                
                // Get fields to display (excluding primary)
                const fieldsToDisplay = fields.filter(field => 
                  displayFields.includes(field.id) && field.id !== primaryField.id
                ).slice(0, 3);
                
                return (
                  <Card
                    key={record.id}
                    sx={{
                      borderRadius: 2,
                      boxShadow: 1,
                      borderLeft: '4px solid',
                      borderColor: currentGroupColor || theme.palette.primary.main,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:active': {
                        backgroundColor: theme.palette.action.selected,
                        transform: 'scale(0.98)',
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
                          sx={{ 
                            ml: 1,
                            backgroundColor: 'background.paper',
                            boxShadow: 1,
                            '&:active': {
                              backgroundColor: 'action.selected',
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Divider sx={{ mb: 1 }} />
                      
                      {fieldsToDisplay.map(field => {
                        const value = record.fields[field.id];
                        const displayValue = getDisplayValue(field, value);
                        
                        // Special handling for different field types
                        if (field.type === 'singleSelect' && value) {
                          const option = field.options?.choices?.find((opt: any) => opt.value === value);
                          if (option) {
                            return (
                              <Box key={field.id} sx={{ display: 'flex', mb: 0.5, alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ minWidth: '40%', fontWeight: 500 }}>
                                  {field.name}:
                                </Typography>
                                <Chip 
                                  label={option.label} 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: option.color,
                                    color: theme.palette.getContrastText(option.color || '#000'),
                                    height: 24,
                                    fontSize: '0.75rem'
                                  }}
                                />
                              </Box>
                            );
                          }
                        }
                        
                        // Default display for other field types
                        return (
                          <Box key={field.id} sx={{ display: 'flex', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: '40%', fontWeight: 500 }}>
                              {field.name}:
                            </Typography>
                            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                              {displayValue}
                            </Typography>
                          </Box>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Add record button at the bottom */}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddRecord}
                sx={{ 
                  borderRadius: 2,
                  borderStyle: 'dashed',
                  py: 1.5
                }}
              >
                Add Record
              </Button>
            </Box>
          )}
          
          {/* Swipe indicator with improved visibility */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            mt: 2,
            mb: 1,
            position: 'relative'
          }}>
            {/* Pagination dots */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {allGroupKeys.map((_, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    width: index === activeTab ? 16 : 8, 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: index === activeTab ? 'primary.main' : 'action.disabled',
                    transition: 'width 0.3s ease, background-color 0.3s ease',
                    '&:hover': {
                      backgroundColor: index === activeTab ? 'primary.main' : 'action.hover',
                      cursor: 'pointer'
                    }
                  }}
                  onClick={() => setActiveTab(index)}
                />
              ))}
            </Box>
            
            {/* Column navigation buttons for accessibility */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {activeTab > 0 && (
                <Button 
                  size="small" 
                  onClick={() => setActiveTab(activeTab - 1)}
                  startIcon={<SwipeRightIcon fontSize="small" />}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Previous
                </Button>
              )}
              {activeTab < allGroupKeys.length - 1 && (
                <Button 
                  size="small" 
                  onClick={() => setActiveTab(activeTab + 1)}
                  endIcon={<SwipeLeftIcon fontSize="small" />}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Next
                </Button>
              )}
            </Box>
            
            {/* Swipe hint text with icon */}
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              mb: 2,
              mt: 1,
              py: 0.5,
              px: 1.5,
              borderRadius: 5,
              backgroundColor: 'background.paper',
              boxShadow: 1
            }}>
              <SwipeRightIcon fontSize="small" sx={{ color: 'action.active' }} />
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontWeight: 'medium' }}
              >
                Swipe to navigate
              </Typography>
              <SwipeLeftIcon fontSize="small" sx={{ color: 'action.active' }} />
            </Box>
            
            {/* Animated swipe direction indicator */}
            <Fade in={swipeIndicatorVisible}>
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: swipeDirection === 'right' ? '10%' : 'auto',
                right: swipeDirection === 'left' ? '10%' : 'auto',
                transform: 'translateY(-50%)',
                zIndex: 10,
                backgroundColor: 'background.paper',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 2,
                opacity: 0.9
              }}>
                {swipeDirection === 'left' ? (
                  <SwipeLeftIcon color="primary" />
                ) : (
                  <SwipeRightIcon color="primary" />
                )}
              </Box>
            </Fade>
          </Box>
        </Box>
      </Paper>
      </PullToRefresh>
      
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
          {fields.map(field => (
            <Box key={field.id} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {field.name}
              </Typography>
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
            </Box>
          ))}
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
      
      {/* Mobile Filter and Sort Controls */}
      <MobileFilterSort
        fields={fields}
        viewId={viewId}
        currentFilters={view?.filters || []}
        currentSorts={view?.sorts || []}
        onApply={loadData}
      />
    </Box>
  );
};

export default MobileKanbanView;