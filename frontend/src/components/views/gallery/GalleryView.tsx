import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Grid, useMediaQuery, useTheme } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { viewService } from '../../../services/viewService';
import { recordService } from '../../../services/recordService';
import LoadingSpinner from '../../ui/LoadingSpinner';
import GalleryToolbar from './GalleryToolbar';
import GalleryCard from './GalleryCard';
import GalleryLightbox from './GalleryLightbox';
import { RootState } from '../../../store';
import { fetchRecords } from '../../../store/slices/recordSlice';
import { setCurrentView } from '../../../store/slices/viewSlice';

interface GalleryViewProps {
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

const GalleryView: React.FC<GalleryViewProps> = ({ tableId, viewId }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageField, setImageField] = useState<string>('');
  const [titleField, setTitleField] = useState<string>('');
  const [displayFields, setDisplayFields] = useState<string[]>([]);
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  
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
      
      // Set card size from view configuration
      const configCardSize = viewData.configuration?.cardSize;
      if (configCardSize) {
        setCardSize(configCardSize);
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
  
  // Handle card size change
  const handleCardSizeChange = async (size: 'small' | 'medium' | 'large') => {
    setCardSize(size);
    
    try {
      if (!view) return;
      
      const updatedConfiguration = {
        ...view.configuration,
        cardSize: size,
      };
      
      await viewService.updateView(viewId, {
        configuration: updatedConfiguration,
      });
    } catch (err) {
      console.error('Error updating card size:', err);
    }
  };
  
  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
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
  
  // Handle lightbox close
  const handleLightboxClose = () => {
    setLightboxOpen(false);
  };
  
  // Handle lightbox navigation
  const handleLightboxNavigation = (newIndex: number) => {
    setSelectedImageIndex(newIndex);
  };
  
  // Determine grid columns based on card size and screen size
  const getGridColumns = () => {
    if (isMobile) return 1;
    if (isTablet) {
      return cardSize === 'small' ? 3 : cardSize === 'medium' ? 2 : 1;
    }
    return cardSize === 'small' ? 4 : cardSize === 'medium' ? 3 : 2;
  };
  
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
  
  // If no attachment field is available for images
  if (attachmentFields.length === 0) {
    return (
      <Box p={3} textAlign="center">
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
        cardSize={cardSize}
        searchTerm={searchTerm}
        onRefresh={loadData}
        onImageFieldChange={handleImageFieldChange}
        onTitleFieldChange={handleTitleFieldChange}
        onDisplayFieldsChange={handleDisplayFieldsChange}
        onCardSizeChange={handleCardSizeChange}
        onSearch={handleSearch}
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
          overflow: 'hidden',
          p: 2,
        }}
      >
        {filteredRecords.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm ? 'No records match your search.' : 'No records found.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            <Grid container spacing={2}>
              {filteredRecords.map((record) => (
                <Grid item xs={12} sm={12 / getGridColumns()} key={record.id}>
                  <GalleryCard
                    record={record}
                    fields={fields}
                    imageField={imageField}
                    titleField={titleField}
                    displayFields={displayFields}
                    onClick={() => handleCardClick(record.id)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
      
      {/* Lightbox for full-size image viewing */}
      <GalleryLightbox
        open={lightboxOpen}
        onClose={handleLightboxClose}
        images={galleryImages}
        currentIndex={selectedImageIndex}
        onNavigate={handleLightboxNavigation}
      />
    </Box>
  );
};

export default GalleryView;