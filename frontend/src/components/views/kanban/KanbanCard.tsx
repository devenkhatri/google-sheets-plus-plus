import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Chip, Avatar } from '@mui/material';
import { useDrag } from 'react-dnd';
import { styled } from '@mui/material/styles';

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

interface KanbanCardProps {
  record: Record;
  fields: Field[];
  displayFields: string[];
  groupByField: string;
  onClick?: (recordId: string) => void;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[3],
  },
}));

const KanbanCard: React.FC<KanbanCardProps> = ({
  record,
  fields,
  displayFields,
  groupByField,
  onClick,
}) => {
  // Set up drag and drop
  const [{ isDragging }, drag] = useDrag({
    type: 'KANBAN_CARD',
    item: { 
      recordId: record.id,
      currentValue: record.fields[groupByField],
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  // Get the fields to display on the card
  const visibleFields = useMemo(() => {
    return fields.filter(field => displayFields.includes(field.id));
  }, [fields, displayFields]);

  // Get the title field (first visible field)
  const titleField = visibleFields[0];
  
  // Format field value based on type
  const formatFieldValue = (field: Field, value: any) => {
    if (value === null || value === undefined) return '';
    
    switch (field.type) {
      case 'checkbox':
        return value ? '✓' : '✗';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'singleSelect':
        const option = field.options?.choices?.find((c: any) => c.value === value);
        return (
          <Chip 
            size="small" 
            label={option?.label || value} 
            sx={{ 
              backgroundColor: option?.color || 'grey.300',
              color: theme => theme.palette.getContrastText(option?.color || theme.palette.grey[300]),
              height: 20,
              fontSize: '0.75rem',
            }} 
          />
        );
      case 'multiSelect':
        if (!Array.isArray(value)) return value;
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {value.map((val: string, i: number) => {
              const option = field.options?.choices?.find((c: any) => c.value === val);
              return (
                <Chip 
                  key={i}
                  size="small" 
                  label={option?.label || val} 
                  sx={{ 
                    backgroundColor: option?.color || 'grey.300',
                    color: theme => theme.palette.getContrastText(option?.color || theme.palette.grey[300]),
                    height: 20,
                    fontSize: '0.75rem',
                  }} 
                />
              );
            })}
          </Box>
        );
      case 'attachment':
        if (!Array.isArray(value) || value.length === 0) return null;
        return (
          <Box sx={{ mt: 1 }}>
            <Avatar 
              variant="rounded" 
              src={value[0].url} 
              alt={value[0].filename}
              sx={{ width: '100%', height: 120, objectFit: 'cover' }}
            />
          </Box>
        );
      default:
        return String(value);
    }
  };

  return (
    <StyledCard 
      ref={drag}
      sx={{ 
        opacity: isDragging ? 0.5 : 1,
        mb: 1,
      }}
      onClick={() => onClick?.(record.id)}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {titleField && (
          <Typography variant="subtitle2" gutterBottom noWrap>
            {formatFieldValue(titleField, record.fields[titleField.id])}
          </Typography>
        )}
        
        {visibleFields.slice(1).map((field) => (
          <Box key={field.id} sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {field.name}
            </Typography>
            <Box sx={{ mt: 0.25 }}>
              {formatFieldValue(field, record.fields[field.id])}
            </Box>
          </Box>
        ))}
      </CardContent>
    </StyledCard>
  );
};

export default KanbanCard;