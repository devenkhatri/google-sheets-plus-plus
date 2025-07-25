import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Checkbox, MenuItem, Select, Chip, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isValid, parseISO } from 'date-fns';
import AttachmentIcon from '@mui/icons-material/AttachFile';

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

interface GridCellProps {
  record: Record;
  field: Field;
  rowIndex: number;
  colIndex: number;
  top: number;
  left: number;
  width: number;
  height: number;
  isSelected: boolean;
  isFrozen: boolean;
  onClick: (rowIndex: number, colIndex: number, event: React.MouseEvent) => void;
  onChange: (recordId: string, fieldId: string, value: any) => void;
}

const GridCell: React.FC<GridCellProps> = ({
  record,
  field,
  rowIndex,
  colIndex,
  top,
  left,
  width,
  height,
  isSelected,
  isFrozen,
  onClick,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<any>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get the value from the record
  const value = record.fields[field.id];

  // Initialize edit value when starting to edit
  useEffect(() => {
    if (isEditing) {
      setEditValue(value);
      // Focus the input when editing starts
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  }, [isEditing, value]);

  // Handle click on cell
  const handleCellClick = (e: React.MouseEvent) => {
    onClick(rowIndex, colIndex, e);
    
    // Double click to edit
    if (e.detail === 2) {
      setIsEditing(true);
    }
  };

  // Handle key press in cell
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing) {
      // Start editing on Enter or any printable character
      if (e.key === 'Enter' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) {
        setIsEditing(true);
        if (e.key.length === 1) {
          setEditValue(e.key);
        }
        e.preventDefault();
      }
    } else {
      // Save on Enter, cancel on Escape
      if (e.key === 'Enter' && !e.shiftKey) {
        handleSave();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        e.preventDefault();
      }
    }
  };

  // Handle save
  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(record.id, field.id, editValue);
    }
  };

  // Handle blur (save when clicking outside)
  const handleBlur = () => {
    if (isEditing) {
      handleSave();
    }
  };

  // Handle change for different field types
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any, newValue?: any) => {
    if (newValue !== undefined) {
      setEditValue(newValue);
    } else {
      setEditValue(e.target.value);
    }
  };

  // Render cell content based on field type
  const renderCellContent = () => {
    if (isEditing) {
      return renderEditor();
    }

    return renderValue();
  };

  // Render the value display
  const renderValue = () => {
    switch (field.type) {
      case 'text':
        return (
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value || ''}
          </Typography>
        );
      
      case 'number':
        return (
          <Typography
            variant="body2"
            align="right"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value !== undefined && value !== null ? value : ''}
          </Typography>
        );
      
      case 'checkbox':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Checkbox
              checked={Boolean(value)}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onChange(record.id, field.id, !value);
              }}
              sx={{ p: 0 }}
            />
          </Box>
        );
      
      case 'date':
        return (
          <Typography variant="body2">
            {value && isValid(parseISO(value)) ? format(parseISO(value), 'MMM d, yyyy') : ''}
          </Typography>
        );
      
      case 'singleSelect':
        if (!value) return null;
        
        const option = field.options?.choices?.find((c: any) => c.value === value);
        if (!option) return value;
        
        return (
          <Chip
            label={option.label}
            size="small"
            sx={{
              backgroundColor: option.color || 'primary.main',
              color: 'white',
              height: 20,
              fontSize: '0.75rem',
            }}
          />
        );
      
      case 'multiSelect':
        if (!value || !Array.isArray(value) || value.length === 0) return null;
        
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {value.map((val: string) => {
              const option = field.options?.choices?.find((c: any) => c.value === val);
              if (!option) return val;
              
              return (
                <Chip
                  key={val}
                  label={option.label}
                  size="small"
                  sx={{
                    backgroundColor: option.color || 'primary.main',
                    color: 'white',
                    height: 20,
                    fontSize: '0.75rem',
                  }}
                />
              );
            })}
          </Box>
        );
      
      case 'attachment':
        if (!value || !Array.isArray(value) || value.length === 0) return null;
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AttachmentIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2">{value.length} file(s)</Typography>
          </Box>
        );
      
      case 'formula':
      case 'lookup':
      case 'rollup':
        // These are read-only fields
        return (
          <Typography
            variant="body2"
            sx={{
              fontStyle: 'italic',
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value !== undefined && value !== null ? value : ''}
          </Typography>
        );
      
      case 'link':
        if (!value || !Array.isArray(value) || value.length === 0) return null;
        
        return (
          <Typography
            variant="body2"
            sx={{
              color: 'primary.main',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value.length} linked record(s)
          </Typography>
        );
      
      default:
        return value;
    }
  };

  // Render the appropriate editor based on field type
  const renderEditor = () => {
    switch (field.type) {
      case 'text':
        return (
          <TextField
            inputRef={inputRef}
            value={editValue || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            variant="outlined"
            size="small"
            fullWidth
            autoFocus
            sx={{ m: 0 }}
          />
        );
      
      case 'number':
        return (
          <TextField
            inputRef={inputRef}
            type="number"
            value={editValue !== null ? editValue : ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            variant="outlined"
            size="small"
            fullWidth
            autoFocus
            sx={{ m: 0 }}
          />
        );
      
      case 'checkbox':
        // Checkbox is directly editable in view mode
        return renderValue();
      
      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              value={editValue ? parseISO(editValue) : null}
              onChange={(newValue) => {
                setEditValue(newValue ? format(newValue, 'yyyy-MM-dd') : null);
              }}
              onClose={handleSave}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  variant: 'outlined',
                  onBlur: handleBlur,
                  onKeyDown: handleKeyDown,
                  autoFocus: true,
                },
              }}
            />
          </LocalizationProvider>
        );
      
      case 'singleSelect':
        return (
          <Select
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            size="small"
            fullWidth
            autoFocus
            sx={{ m: 0 }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {field.options?.choices?.map((choice: any) => (
              <MenuItem key={choice.value} value={choice.value}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: choice.color || 'primary.main',
                      mr: 1,
                    }}
                  />
                  {choice.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        );
      
      case 'multiSelect':
        return (
          <Select
            multiple
            value={editValue || []}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            size="small"
            fullWidth
            autoFocus
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => {
                  const choice = field.options?.choices?.find((c: any) => c.value === value);
                  return (
                    <Chip
                      key={value}
                      label={choice?.label || value}
                      size="small"
                      sx={{
                        backgroundColor: choice?.color || 'primary.main',
                        color: 'white',
                        height: 20,
                        fontSize: '0.75rem',
                      }}
                    />
                  );
                })}
              </Box>
            )}
            sx={{ m: 0 }}
          >
            {field.options?.choices?.map((choice: any) => (
              <MenuItem key={choice.value} value={choice.value}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: choice.color || 'primary.main',
                      mr: 1,
                    }}
                  />
                  {choice.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        );
      
      case 'attachment':
      case 'formula':
      case 'lookup':
      case 'rollup':
      case 'link':
        // These fields have special editors or are read-only
        setIsEditing(false);
        return renderValue();
      
      default:
        return (
          <TextField
            inputRef={inputRef}
            value={editValue || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            variant="outlined"
            size="small"
            fullWidth
            autoFocus
            sx={{ m: 0 }}
          />
        );
    }
  };

  return (
    <Box
      ref={cellRef}
      sx={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        padding: isEditing ? 0 : '0 8px',
        backgroundColor: isSelected ? 'action.selected' : 'background.paper',
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        overflow: 'hidden',
        zIndex: isFrozen ? 5 : 1,
        '&:hover': {
          backgroundColor: isSelected ? 'action.selected' : 'action.hover',
        },
        ...(isFrozen && {
          position: 'sticky',
          left: 0,
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
        }),
      }}
      onClick={handleCellClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {renderCellContent()}
    </Box>
  );
};

export default GridCell;