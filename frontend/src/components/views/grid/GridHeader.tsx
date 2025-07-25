import React, { useState, useRef } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { 
  DragIndicator, 
  FilterList, 
  Sort, 
  MoreVert,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen
} from '@mui/icons-material';
import { useDrag, useDrop } from 'react-dnd';
import { Virtualizer } from '@tanstack/react-virtual';

interface Field {
  id: string;
  name: string;
  type: string;
  options?: any;
  required: boolean;
}

interface GridHeaderProps {
  fields: Field[];
  columnVirtualizer: Virtualizer<HTMLDivElement, Element>;
  columnWidths: Record<string, number>;
  frozenColumns: number;
  onColumnResize: (fieldId: string, width: number) => void;
  onColumnReorder: (sourceIndex: number, targetIndex: number) => void;
  onToggleColumnFreeze: (index: number) => void;
  headerRef: React.RefObject<HTMLDivElement>;
}

interface ColumnHeaderProps {
  field: Field;
  index: number;
  width: number;
  left: number;
  isFrozen: boolean;
  onResize: (fieldId: string, width: number) => void;
  onReorder: (sourceIndex: number, targetIndex: number) => void;
  onToggleFreeze: (index: number) => void;
}

const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  field,
  index,
  width,
  left,
  isFrozen,
  onResize,
  onReorder,
  onToggleFreeze,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Drag and drop for column reordering
  const [{ isDragging }, drag] = useDrag({
    type: 'column',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'column',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        onReorder(item.index, index);
        item.index = index;
      }
    },
  });

  // Handle column resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.max(80, startWidthRef.current + deltaX);
      onResize(field.id, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'number':
        return '🔢';
      case 'date':
        return '📅';
      case 'checkbox':
        return '☑️';
      case 'singleSelect':
        return '📋';
      case 'multiSelect':
        return '🏷️';
      case 'attachment':
        return '📎';
      case 'formula':
        return '🧮';
      case 'lookup':
        return '🔍';
      case 'rollup':
        return '📊';
      case 'link':
        return '🔗';
      default:
        return '📝';
    }
  };

  return (
    <Box
      ref={(node) => {
        drag(drop(node));
      }}
      sx={{
        position: 'absolute',
        top: 0,
        left: `${left}px`,
        width: `${width}px`,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: isFrozen ? 'grey.50' : 'background.paper',
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        zIndex: isFrozen ? 10 : 1,
        '&:hover': {
          backgroundColor: 'grey.100',
        },
      }}
    >
      {/* Field type icon */}
      <Box sx={{ px: 1, fontSize: '14px' }}>
        {getFieldTypeIcon(field.type)}
      </Box>

      {/* Field name */}
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {field.name}
      </Typography>

      {/* Frozen indicator */}
      {isFrozen && (
        <Tooltip title="Frozen column">
          <Lock sx={{ fontSize: 16, color: 'primary.main', mr: 0.5 }} />
        </Tooltip>
      )}

      {/* Menu button */}
      <IconButton
        size="small"
        onClick={handleMenuClick}
        sx={{ p: 0.5 }}
      >
        <MoreVert fontSize="small" />
      </IconButton>

      {/* Column menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => { onToggleFreeze(index); handleMenuClose(); }}>
          {isFrozen ? <LockOpen fontSize="small" sx={{ mr: 1 }} /> : <Lock fontSize="small" sx={{ mr: 1 }} />}
          {isFrozen ? 'Unfreeze column' : 'Freeze column'}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Sort fontSize="small" sx={{ mr: 1 }} />
          Sort A → Z
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Sort fontSize="small" sx={{ mr: 1, transform: 'rotate(180deg)' }} />
          Sort Z → A
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <FilterList fontSize="small" sx={{ mr: 1 }} />
          Filter
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <VisibilityOff fontSize="small" sx={{ mr: 1 }} />
          Hide field
        </MenuItem>
      </Menu>

      {/* Resize handle */}
      <Box
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'col-resize',
          backgroundColor: isResizing ? 'primary.main' : 'transparent',
          '&:hover': {
            backgroundColor: 'primary.main',
          },
        }}
      />
    </Box>
  );
};

const GridHeader: React.FC<GridHeaderProps> = ({
  fields,
  columnVirtualizer,
  columnWidths,
  frozenColumns,
  onColumnResize,
  onColumnReorder,
  onToggleColumnFreeze,
  headerRef,
}) => {
  return (
    <Box
      ref={headerRef}
      sx={{
        position: 'relative',
        height: 40,
        backgroundColor: 'background.paper',
        borderBottom: '2px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: `${columnVirtualizer.getTotalSize()}px`,
          height: '100%',
        }}
      >
        {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
          const field = fields[virtualColumn.index];
          if (!field) return null;

          const isFrozen = virtualColumn.index < frozenColumns;

          return (
            <ColumnHeader
              key={field.id}
              field={field}
              index={virtualColumn.index}
              width={virtualColumn.size}
              left={virtualColumn.start}
              isFrozen={isFrozen}
              onResize={onColumnResize}
              onReorder={onColumnReorder}
              onToggleFreeze={onToggleColumnFreeze}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default GridHeader;