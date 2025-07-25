import React from 'react';
import { Paper, Typography, Box, Badge } from '@mui/material';
import { useDrop } from 'react-dnd';
import { styled } from '@mui/material/styles';
import KanbanCard from './KanbanCard';

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

interface KanbanColumnProps {
  title: string;
  color?: string;
  records: Record[];
  fields: Field[];
  displayFields: string[];
  groupByField: string;
  onCardClick: (recordId: string) => void;
  onCardMove: (recordId: string, value: any) => void;
  columnValue: any;
}

const ColumnContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: 280,
  height: '100%',
  margin: theme.spacing(0, 1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  flexShrink: 0,
}));

const ColumnHeader = styled(Box)<{ color?: string }>(({ theme, color }) => ({
  padding: theme.spacing(1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: color || theme.palette.grey[100],
  borderTopLeftRadius: theme.shape.borderRadius,
  borderTopRightRadius: theme.shape.borderRadius,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const ColumnContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  overflowY: 'auto',
  flexGrow: 1,
}));

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  color,
  records,
  fields,
  displayFields,
  groupByField,
  onCardClick,
  onCardMove,
  columnValue,
}) => {
  // Set up drop target
  const [{ isOver }, drop] = useDrop({
    accept: 'KANBAN_CARD',
    drop: (item: { recordId: string; currentValue: any }) => {
      if (item.currentValue !== columnValue) {
        onCardMove(item.recordId, columnValue);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <ColumnContainer 
      ref={drop}
      sx={{ 
        boxShadow: isOver ? 3 : 1,
        borderColor: isOver ? 'primary.main' : 'divider',
        borderWidth: isOver ? 2 : 1,
        borderStyle: 'solid',
      }}
    >
      <ColumnHeader color={color}>
        <Typography variant="subtitle2" fontWeight={600}>
          {title}
        </Typography>
        <Badge 
          badgeContent={records.length} 
          color="primary"
          sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
        />
      </ColumnHeader>
      <ColumnContent>
        {records.map((record) => (
          <KanbanCard
            key={record.id}
            record={record}
            fields={fields}
            displayFields={displayFields}
            groupByField={groupByField}
            onClick={onCardClick}
          />
        ))}
        {records.length === 0 && (
          <Box 
            sx={{ 
              height: 80, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 1,
              border: '2px dashed',
              borderColor: 'divider',
              mt: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Drop cards here
            </Typography>
          </Box>
        )}
      </ColumnContent>
    </ColumnContainer>
  );
};

export default KanbanColumn;