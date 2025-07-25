import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, useMediaQuery, useTheme } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSelector, useDispatch } from 'react-redux';
import { viewService } from '../../../services/viewService';
import { recordService } from '../../../services/recordService';
import LoadingSpinner from '../../ui/LoadingSpinner';
import KanbanToolbar from './KanbanToolbar';
import KanbanColumn from './KanbanColumn';
import { RootState } from '../../../store';
import { fetchRecords, updateRecord } from '../../../store/slices/recordSlice';
import { setCurrentView } from '../../../store/slices/viewSlice';

interface KanbanViewProps {
  tableId: string;
  viewId: string;
}

interface Field {
  id: string;
  name: string;
  type: string;
  options?: any;
}

interface Record {
  id: string;
  table_id: string;
  fields: any;
  row_index: number;
}

const KanbanView: React.FC<KanbanViewProps> = ({ tableId, viewId }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupByField, setGroupByField] = useState<string>('');
  const [displayFields, setDisplayFields] = useState<string[]>([]);
  
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
    
    const groups: Record<string, Record[]> = {};
    
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
  
  // Handle card click
  const handleCardClick = (recordId: string) => {
    console.log('Card clicked:', recordId);
    // TODO: Open record detail modal
  };
  
  // Handle card move between columns
  const handleCardMove = async (recordId: string, newValue: any) => {
    try {
      // Find the record
      const record = records.find(r => r.id === recordId);
      if (!record) return;
      
      // Optimistically update the UI
      dispatch(updateRecord({
        id: recordId,
        updates: {
          fields: {
            [groupByField]: newValue
          }
        }
      }));
      
      // Update on the server
      await recordService.updateRecord(recordId, {
        fields: {
          [groupByField]: newValue
        }
      });
    } catch (err) {
      console.error('Error moving card:', err);
      // Reload data to revert to correct state
      loadData();
    }
  };
  
  // Handle add record
  const handleAddRecord = () => {
    console.log('Add record');
    // TODO: Open add record modal
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
  
  // If no single select field is available for grouping
  if (!groupField) {
    return (
      <Box p={3} textAlign="center">
        <Typography>
          Kanban view requires a single select field. Please add one to your table.
        </Typography>
      </Box>
    );
  }
  
  return (
    <DndProvider backend={HTML5Backend}>
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
            p: 1,
          }}
        >
          <Box 
            sx={{ 
              display: 'flex',
              overflowX: 'auto',
              overflowY: 'hidden',
              flex: 1,
              pb: 1,
              px: 1,
              // Add responsive styles for mobile
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            {/* Render columns based on group options */}
            {groupOptions.map((option: any) => (
              <KanbanColumn
                key={option.value}
                title={option.label}
                color={option.color}
                records={groupedRecords[option.value] || []}
                fields={fields}
                displayFields={displayFields}
                groupByField={groupByField}
                onCardClick={handleCardClick}
                onCardMove={handleCardMove}
                columnValue={option.value}
              />
            ))}
            
            {/* Empty column */}
            <KanbanColumn
              title="No value"
              records={groupedRecords['__empty__'] || []}
              fields={fields}
              displayFields={displayFields}
              groupByField={groupByField}
              onCardClick={handleCardClick}
              onCardMove={handleCardMove}
              columnValue={null}
            />
          </Box>
        </Paper>
      </Box>
    </DndProvider>
  );
};

export default KanbanView;