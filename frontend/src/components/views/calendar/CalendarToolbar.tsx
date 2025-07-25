import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  IconButton, 
  Typography, 
  Menu, 
  MenuItem, 
  Tooltip,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewDay as ViewDayIcon,
  ViewWeek as ViewWeekIcon,
  CalendarViewMonth as CalendarViewMonthIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { format, addMonths, addWeeks, addDays } from 'date-fns';

export type CalendarViewType = 'day' | 'week' | 'month';

interface CalendarToolbarProps {
  currentDate: Date;
  viewType: CalendarViewType;
  onDateChange: (date: Date) => void;
  onViewTypeChange: (viewType: CalendarViewType) => void;
  onFilterClick?: () => void;
  onSortClick?: () => void;
  dateField?: string;
  availableDateFields?: { id: string; name: string }[];
  onDateFieldChange?: (fieldId: string) => void;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  currentDate,
  viewType,
  onDateChange,
  onViewTypeChange,
  onFilterClick,
  onSortClick,
  dateField,
  availableDateFields,
  onDateFieldChange
}) => {
  const [dateFieldsAnchorEl, setDateFieldsAnchorEl] = useState<null | HTMLElement>(null);

  const handlePrevious = () => {
    if (viewType === 'day') {
      onDateChange(addDays(currentDate, -1));
    } else if (viewType === 'week') {
      onDateChange(addWeeks(currentDate, -1));
    } else {
      onDateChange(addMonths(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewType === 'day') {
      onDateChange(addDays(currentDate, 1));
    } else if (viewType === 'week') {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const handleViewTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newViewType: CalendarViewType | null
  ) => {
    if (newViewType !== null) {
      onViewTypeChange(newViewType);
    }
  };

  const handleDateFieldClick = (event: React.MouseEvent<HTMLElement>) => {
    setDateFieldsAnchorEl(event.currentTarget);
  };

  const handleDateFieldClose = () => {
    setDateFieldsAnchorEl(null);
  };

  const handleDateFieldSelect = (fieldId: string) => {
    if (onDateFieldChange) {
      onDateFieldChange(fieldId);
    }
    handleDateFieldClose();
  };

  const getDateRangeText = () => {
    if (viewType === 'day') {
      return format(currentDate, 'MMMM d, yyyy');
    } else if (viewType === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${format(startOfWeek, 'MMMM d')} - ${format(endOfWeek, 'd, yyyy')}`;
      } else if (startOfWeek.getFullYear() === endOfWeek.getFullYear()) {
        return `${format(startOfWeek, 'MMMM d')} - ${format(endOfWeek, 'MMMM d, yyyy')}`;
      } else {
        return `${format(startOfWeek, 'MMMM d, yyyy')} - ${format(endOfWeek, 'MMMM d, yyyy')}`;
      }
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  const selectedDateFieldName = availableDateFields?.find(field => field.id === dateField)?.name || 'Date';

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      p: 1,
      borderBottom: '1px solid',
      borderColor: 'divider'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleDateFieldClick}
          sx={{ mr: 2 }}
        >
          {selectedDateFieldName}
        </Button>
        <Menu
          anchorEl={dateFieldsAnchorEl}
          open={Boolean(dateFieldsAnchorEl)}
          onClose={handleDateFieldClose}
        >
          {availableDateFields?.map((field) => (
            <MenuItem 
              key={field.id} 
              onClick={() => handleDateFieldSelect(field.id)}
              selected={field.id === dateField}
            >
              {field.name}
            </MenuItem>
          ))}
        </Menu>

        <Button 
          variant="outlined" 
          size="small" 
          onClick={handleToday}
          startIcon={<TodayIcon />}
          sx={{ mr: 2 }}
        >
          Today
        </Button>

        <IconButton onClick={handlePrevious} size="small">
          <ChevronLeftIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ mx: 2 }}>
          {getDateRangeText()}
        </Typography>
        
        <IconButton onClick={handleNext} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={viewType}
          exclusive
          onChange={handleViewTypeChange}
          size="small"
          sx={{ mr: 2 }}
        >
          <ToggleButton value="day">
            <Tooltip title="Day view">
              <ViewDayIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="week">
            <Tooltip title="Week view">
              <ViewWeekIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="month">
            <Tooltip title="Month view">
              <CalendarViewMonthIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        {onFilterClick && (
          <Tooltip title="Filter">
            <IconButton onClick={onFilterClick} size="small" sx={{ mr: 1 }}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        )}
        
        {onSortClick && (
          <Tooltip title="Sort">
            <IconButton onClick={onSortClick} size="small">
              <SortIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default CalendarToolbar;