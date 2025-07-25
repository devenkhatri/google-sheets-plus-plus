import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Card, 
  CardContent, 
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  useTheme
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { viewService } from '../../../services/viewService';
import { recordService } from '../../../services/recordService';
import PullToRefresh from '../../ui/PullToRefresh';
import MobileFilterSort from '../../ui/MobileFilterSort';
import LoadingSpinner from '../../ui/LoadingSpinner';
import GalleryToolbar from './GalleryToolbar';
import GalleryLightbox from './GalleryLightbox';
import { RootState } from '../../../store';
import { fetchRecords, updateRecord } from '../../../store/slices/recordSlice';
import { setCurrentView } from '../../../store/slices/viewSlice';
import { 
  debounce, 
  optimizeImageUrl, 
  triggerHapticFeedback, 
  createIntersectionObserver,
  getConnectionSpeed,
  prefersReducedMotion
} from '../../../utils/mobileOptimizations';

interface MobileGalleryViewProps {
  tableId: string;
  viewId: string;
}

const MobileGalleryView: React.FC<MobileGalleryViewProps> = ({ tableId, viewId }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageField, setImageField] = useState<string>('');
  const [titleField, setTitleField] = useState<string>('');
  const [displayFields, setDisplayFields] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [visibleImages, setVisibleImages] = useState<Set<string>>(new Set());
  
  // Refs
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const imageRefs = useRef<Map<string, HTMLElement>>(new Map());
  
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
  
  // Get attachment fields for image selection
  const attachmentFields = useMemo(() => {
    if (!fields) return [];
    return fields.filter(field => field.type === 'attachment');
  }, [fields]);
  
  // Filter records based on search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm || !records) return records;
    
    return records.filter(record => {
      // Search in all fields
      for (const fieldId in record.fields) {
        const value = record.fields[fieldId];
        if (typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
      }
      return false;
    });
  }, [records, searchTerm]);
  
  // Get images for lightbox
  const galleryImages = useMemo(() => {
    if (!imageField || !filteredRecords) return [];
    
    return filteredRecords
      .map(record => {
        const attachments = record.fields[imageField];
        if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
          return null;
        }
        
        // Return the first attachment URL
        return {
          recordId: record.id,
          url: attachments[0].url,
          thumbnailUrl: attachments[0].thumbnailUrl || attachments[0].url,
          filename: attachments[0].filename || 'Image',
        };
      })
      .filter(Boolean); // Remove null entries
  }, [filteredRecords, imageField]);
  
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
      
      // Set image field from view configuration
      const configImageField = viewData.configuration?.imageField;
      if (configImageField) {
        setImageField(configImageField);
      } else if (attachmentFields.length > 0) {
        // Use first attachment field by default
        setImageField(attachmentFields[0].id);
      }
      
      // Set title field from view configuration
      const configTitleField = viewData.configuration?.titleField;
      if (configTitleField) {
        setTitleField(configTitleField);
      } else if (fields.length > 0) {
        // Use first text field by default
        const firstTextField = fields.find(field => field.type === 'text');
        if (firstTextField) {
          setTitleField(firstTextField.id);
        } else {
          setTitleField(fields[0].id);
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
      console.error('Error loading gallery data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tableId, viewId, dispatch, fields, attachmentFields]);
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Handle image field change
  const handleImageFieldChange = async (fieldId: string) => {
    setImageField(fieldId);
    
    try {
      if (!view) return;
      
      const updatedConfiguration = {
        ...view.configuration,
        imageField: fieldId,
      };
      
      await viewService.updateView(viewId, {
        configuration: updatedConfiguration,
      });
    } catch (err) {
      console.error('Error updating image field:', err);
    }
  };
  
  // Handle title field change
  const handleTitleFieldChange = async (fieldId: string) => {
    setTitleField(fieldId);
    
    try {
      if (!view) return;
      
      const updatedConfiguration = {
        ...view.configuration,
        titleField: fieldId,
      };
      
      await viewService.updateView(viewId, {
        configuration: updatedConfiguration,
      });
    } catch (err) {
      console.error('Error updating title field:', err);
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
  
  // Handle search with debouncing for better performance
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term);
    }, 300),
    []
  );
  
  const handleSearch = (term: string) => {
    debouncedSearch(term);
  };
  
  // Handle card click
  const handleCardClick = (recordId: string) => {
    // Find the index of the clicked record in the filtered records
    const index = filteredRecords.findIndex(record => record.id === recordId);
    if (index !== -1) {
      setSelectedImageIndex(index);
      setLightboxOpen(true);
    }
  };
  
  // Handle edit record
  const handleEditRecord = (record: any, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
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
  
  // Handle lightbox close
  const handleLightboxClose = () => {
    setLightboxOpen(false);
  };
  
  // Handle lightbox navigation
  const handleLightboxNavigation = (newIndex: number) => {
    setSelectedImageIndex(newIndex);
  };
  
  // Handle add record
  const handleAddRecord = () => {
    console.log('Add record');
    // TODO: Open add record modal
  };
  
  // Handle pull-to-refresh with enhanced feedback
  const handlePullToRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      // Provide initial haptic feedback when refresh starts
      triggerHapticFeedback(50);
      
      await loadData();
      
      // Provide success haptic feedback pattern on completion
      triggerHapticFeedback([40, 30, 80]);
    } catch (err) {
      console.error('Error refreshing data:', err);
      
      // Provide error haptic feedback
      triggerHapticFeedback([10, 30, 10, 30, 10]);
    } finally {
      // Animate the pull distance back to 0 for a smooth transition
      const startTime = Date.now();
      const startDistance = pullDistance;
      const duration = 300; // ms
      
      const animatePullReset = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Use easeOutCubic easing function for natural feel
        const easing = 1 - Math.pow(1 - progress, 3);
        const newDistance = startDistance * (1 - easing);
        
        setPullDistance(newDistance);
        
        if (progress < 1) {
          requestAnimationFrame(animatePullReset);
        } else {
          setPullDistance(0);
          setRefreshing(false);
        }
      };
      
      requestAnimationFrame(animatePullReset);
    }
  };
  
  // Handle pull gesture with enhanced feedback
  const handlePullGesture = useCallback((deltaY: number, isFinal: boolean) => {
    if (deltaY < 0) return; // Only handle downward pulls
    
    const maxPullDistance = 120;
    
    // Add resistance as we approach max distance for a more natural feel
    let newPullDistance;
    if (deltaY <= 80) {
      // Linear response for initial pull
      newPullDistance = deltaY * 0.5;
    } else {
      // Logarithmic response for further pulls to create resistance
      newPullDistance = 40 + 20 * Math.log10(1 + (deltaY - 80) / 20);
    }
    
    newPullDistance = Math.min(newPullDistance, maxPullDistance);
    setPullDistance(newPullDistance);
    
    // Provide subtle haptic feedback at threshold
    if (newPullDistance >= 60 && pullDistance < 60) {
      triggerHapticFeedback(20);
    }
    
    if (isFinal) {
      if (newPullDistance > 60) {
        handlePullToRefresh();
      } else {
        // Animate the pull distance back to 0 for a smooth transition
        const startTime = Date.now();
        const startDistance = newPullDistance;
        const duration = 300; // ms
        
        const animatePullReset = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Use easeOutCubic easing function for natural feel
          const easing = 1 - Math.pow(1 - progress, 3);
          const newDistance = startDistance * (1 - easing);
          
          setPullDistance(newDistance);
          
          if (progress < 1) {
            requestAnimationFrame(animatePullReset);
          } else {
            setPullDistance(0);
          }
        };
        
        requestAnimationFrame(animatePullReset);
      }
    }
  }, [pullDistance]);
  
  // Add touch event listeners for pull-to-refresh
  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let isScrolledToTop = true;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      const scrollContainer = document.querySelector('[data-scroll-container]') as HTMLElement;
      isScrolledToTop = scrollContainer ? scrollContainer.scrollTop === 0 : true;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrolledToTop) return;
      
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      if (deltaY > 0) {
        e.preventDefault();
        handlePullGesture(deltaY, false);
      }
    };
    
    const handleTouchEnd = () => {
      if (!isScrolledToTop) return;
      
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        handlePullGesture(deltaY, true);
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handlePullGesture]);
  
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
  
  // If no attachment field is available for images
  if (attachmentFields.length === 0) {
    return (
      <Box p={2} textAlign="center">
        <Typography>
          Gallery view works best with attachment fields. Please add one to your table.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <GalleryToolbar
        tableId={tableId}
        viewId={viewId}
        fields={fields}
        attachmentFields={attachmentFields}
        imageField={imageField}
        titleField={titleField}
        displayFields={displayFields}
        cardSize="medium"
        searchTerm={searchTerm}
        onRefresh={loadData}
        onImageFieldChange={handleImageFieldChange}
        onTitleFieldChange={handleTitleFieldChange}
        onDisplayFieldsChange={handleDisplayFieldsChange}
        onCardSizeChange={() => {}}
        onSearch={handleSearch}
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
        {/* Mobile search bar */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton 
                    edge="end" 
                    onClick={() => handleSearch('')}
                    size="small"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: { 
                borderRadius: 4,
                backgroundColor: theme.palette.background.default
              }
            }}
          />
        </Box>
        
        {/* Enhanced pull-to-refresh indicator */}
        {pullDistance > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: `translateX(-50%) translateY(${Math.min(pullDistance - 20, 40)}px)`,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: theme.palette.background.paper,
              boxShadow: 3,
              transition: refreshing ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {refreshing ? (
              // Show progress indicator when refreshing
              <CircularProgress 
                size={28} 
                thickness={4}
                sx={{ color: theme.palette.primary.main }}
              />
            ) : (
              // Show pull indicator with rotation based on pull distance
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  transform: `rotate(${Math.min(pullDistance * 3, 180)}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: pullDistance > 60 ? theme.palette.primary.main : theme.palette.text.secondary,
                  fontSize: pullDistance > 60 ? '1.5rem' : '1.2rem',
                  opacity: Math.min(pullDistance / 60, 1)
                }}
              >
                {pullDistance > 60 ? '↻' : '↓'}
              </Box>
            )}
          </Box>
        )}
        
        {/* Pull-to-refresh status text */}
        {pullDistance > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: Math.min(pullDistance + 30, 90),
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              borderRadius: 1,
              px: 2,
              py: 0.5,
              opacity: Math.min(pullDistance / 40, 1),
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
              {refreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </Typography>
          </Box>
        )}

        {filteredRecords.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
            <Typography variant="body1" color="text.secondary" align="center">
              {searchTerm ? 'No records match your search.' : 'No records found.'}
            </Typography>
          </Box>
        ) : (
          <Box 
            data-scroll-container
            sx={{ 
              overflowY: 'auto', 
              flex: 1, 
              p: 2,
              position: 'relative',
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
              scrollbarWidth: 'thin', // Firefox
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '3px',
              }
            }}
          >
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 2,
                // Add a pull-to-refresh indicator space at the top
                '&::before': {
                  content: '""',
                  display: 'block',
                  height: '20px',
                  marginTop: '-20px',
                }
              }}
            >
              {filteredRecords.map((record) => {
                // Get title from record
                const title = titleField ? record.fields[titleField] : 'Untitled Record';
                
                // Get image from record
                const attachments = imageField ? record.fields[imageField] : null;
                const hasImage = attachments && Array.isArray(attachments) && attachments.length > 0;
                const imageUrl = hasImage ? attachments[0].thumbnailUrl || attachments[0].url : null;
                
                // Get fields to display
                const fieldsToDisplay = fields.filter(field => 
                  displayFields.includes(field.id) && field.id !== titleField
                ).slice(0, 3);
                
                // Get first single select field for color coding
                const singleSelectField = fields.find(field => field.type === 'singleSelect');
                const singleSelectValue = singleSelectField ? record.fields[singleSelectField.id] : null;
                const singleSelectOption = singleSelectField && singleSelectValue ? 
                  singleSelectField.options?.choices?.find((opt: any) => opt.value === singleSelectValue) : null;
                const cardColor = singleSelectOption?.color;
                
                return (
                  <Card
                    key={record.id}
                    onClick={() => hasImage && handleCardClick(record.id)}
                    sx={{
                      borderRadius: 2,
                      boxShadow: 1,
                      overflow: 'hidden',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderTop: cardColor ? `4px solid ${cardColor}` : undefined,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:active': {
                        transform: 'scale(0.98)',
                        boxShadow: 2,
                      },
                    }}
                  >
                    {hasImage && (
                      <Box sx={{ position: 'relative', height: 180 }}>
                        <CardMedia
                          component="img"
                          height="180"
                          image={imageUrl || ''}
                          alt={title || 'Image'}
                          sx={{ 
                            objectFit: 'cover',
                            backgroundColor: 'action.hover',
                            transition: 'transform 0.3s ease',
                            '&:active': {
                              transform: 'scale(1.02)'
                            }
                          }}
                          loading="lazy" // Use native lazy loading
                        />
                        {/* Image loading skeleton */}
                        <Box 
                          sx={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'action.hover',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                            '&[data-loading="true"]': {
                              opacity: 1
                            }
                          }}
                          data-loading={!imageUrl}
                        >
                          <CircularProgress size={24} />
                        </Box>
                      </Box>
                    )}
                    
                    <CardContent sx={{ 
                      p: 2, 
                      '&:last-child': { pb: 2 },
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {title || 'Untitled Record'}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleEditRecord(record, e)}
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
                      
                      <Divider sx={{ mb: 1.5 }} />
                      
                      <Box sx={{ flex: 1 }}>
                        {fieldsToDisplay.map(field => {
                          const value = record.fields[field.id];
                          const displayValue = getDisplayValue(field, value);
                          
                          // Special handling for different field types
                          if (field.type === 'singleSelect' && value) {
                            const option = field.options?.choices?.find((opt: any) => opt.value === value);
                            if (option) {
                              return (
                                <Box key={field.id} sx={{ display: 'flex', mb: 0.75, alignItems: 'center' }}>
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
                            <Box key={field.id} sx={{ display: 'flex', mb: 0.75 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ minWidth: '40%', fontWeight: 500 }}>
                                {field.name}:
                              </Typography>
                              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                {displayValue}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
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
                  py: 1.5,
                  mb: 2
                }}
              >
                Add Record
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
      </PullToRefresh>
      
      {/* Lightbox for full-size image viewing */}
      <GalleryLightbox
        open={lightboxOpen}
        onClose={handleLightboxClose}
        images={galleryImages}
        currentIndex={selectedImageIndex}
        onNavigate={handleLightboxNavigation}
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

export default MobileGalleryView;