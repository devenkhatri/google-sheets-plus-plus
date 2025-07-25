import React, { useState, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addDays,
  isSameDay,
  isSameMonth,
  format,
  parseISO,
  isValid,
  addHours,
  setHours,
  setMinutes,
  isWithinInterval
} from 'date-fns';

import CalendarToolbar, { CalendarViewType } from './CalendarToolbar';
import CalendarHeader from './CalendarHeader';
import CalendarEvent from './CalendarEvent';
import { updateView } from '../../../store/slices/viewSlice';
import { RootState } from '../../../store';

interface CalendarViewProps {
  viewId: string;
  tableId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  color?: string;
  isRecurring?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ viewId, tableId }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const view = useSelector((state: RootState) => 
    state.views.views.find(v => v.id === viewId)
  );
  
  const fields = useSelector((state: RootState) => 
    state.tables.tables.find(t => t.id === tableId)?.fields || []
  );
  
  const records = useSelector((state: RootState) => 
    state.records.records.filter(r => r.tableId === tableId)
  );

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [dateField, setDateField] = useState<string | undefined>(
    view?.configuration?.dateField || fields.find(f => f.type === 'date')?.id
  );

  // Get all date fields from the table
  const dateFields = useMemo(() => 
    fields.filter(field => field.type === 'date').map(field => ({
      id: field.id,
      name: field.name
    })),
    [fields]
  );

  // Update view configuration when date field changes
  useEffect(() => {
    if (view && dateField && view.configuration?.dateField !== dateField) {
      dispatch(updateView({
        viewId,
        viewData: {
          configuration: {
            ...view.configuration,
            dateField
          }
        }
      }));
    }
  }, [dateField, view, viewId, dispatch]);

  // Initialize date field if not set
  useEffect(() => {
    if (!dateField && dateFields.length > 0) {
      setDateField(dateFields[0].id);
    }
  }, [dateField, dateFields]);

  // Get title field (usually the first text field)
  const titleField = useMemo(() => 
    fields.find(field => field.type === 'text')?.id,
    [fields]
  );

  // Get color field (single select or multi select)
  const colorField = useMemo(() => 
    view?.configuration?.colorField || 
    fields.find(field => field.type === 'singleSelect' || field.type === 'multiSelect')?.id,
    [fields, view]
  );

  // Calculate dates to display based on view type
  const dates = useMemo(() => {
    if (viewType === 'day') {
      return [currentDate];
    } else if (viewType === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    } else {
      const start = startOfMonth(currentDate);
      const firstDay = startOfWeek(start, { weekStartsOn: 0 });
      const lastDay = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      return eachDayOfInterval({ start: firstDay, end: lastDay });
    }
  }, [currentDate, viewType]);

  // Parse records into calendar events
  const events: CalendarEvent[] = useMemo(() => {
    if (!dateField || !titleField) return [];

    return records
      .filter(record => {
        const dateValue = record.fields[dateField];
        if (!dateValue) return false;
        
        let date: Date | null = null;
        
        // Handle different date formats
        if (typeof dateValue === 'string') {
          date = parseISO(dateValue);
        } else if (dateValue instanceof Date) {
          date = dateValue;
        }
        
        return date && isValid(date);
      })
      .map(record => {
        const dateValue = record.fields[dateField];
        let start: Date;
        
        if (typeof dateValue === 'string') {
          start = parseISO(dateValue);
        } else {
          start = dateValue as Date;
        }
        
        // Set default time to 9:00 AM if not specified
        if (start.getHours() === 0 && start.getMinutes() === 0) {
          start = setHours(setMinutes(start, 0), 9);
        }
        
        // Default end time is 1 hour after start
        const end = record.fields.endDate 
          ? (typeof record.fields.endDate === 'string' 
              ? parseISO(record.fields.endDate) 
              : record.fields.endDate as Date)
          : addHours(start, 1);
        
        // Get title from the record
        const title = record.fields[titleField]?.toString() || 'Untitled Event';
        
        // Get color based on color field if available
        let color = theme.palette.primary.main;
        if (colorField && record.fields[colorField]) {
          const colorValue = record.fields[colorField];
          if (typeof colorValue === 'string') {
            // For single select fields
            const option = fields.find(f => f.id === colorField)?.options?.choices?.find(
              (c: any) => c.value === colorValue
            );
            if (option?.color) {
              color = option.color;
            }
          } else if (Array.isArray(colorValue) && colorValue.length > 0) {
            // For multi select fields, use the first selected option's color
            const option = fields.find(f => f.id === colorField)?.options?.choices?.find(
              (c: any) => c.value === colorValue[0]
            );
            if (option?.color) {
              color = option.color;
            }
          }
        }
        
        // Check if event is recurring
        const isRecurring = Boolean(record.fields.recurring);
        
        return {
          id: record.id,
          title,
          start,
          end,
          color,
          isRecurring
        };
      });
  }, [records, dateField, titleField, colorField, fields, theme.palette.primary.main]);

  // Handle event click
  const handleEventClick = (eventId: string) => {
    // Open record edit modal or navigate to record detail
    console.log('Event clicked:', eventId);
    // Implementation would depend on the application's navigation/modal system
  };

  // Handle date field change
  const handleDateFieldChange = (fieldId: string) => {
    setDateField(fieldId);
  };

  // Handle date cell click for creating new events
  const handleDateCellClick = (date: Date) => {
    // Open create record modal with the date pre-filled
    console.log('Create event on:', format(date, 'yyyy-MM-dd'));
    // Implementation would depend on the application's record creation system
  };

  // Render time slots for day and week views
  const renderTimeSlots = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Time labels */}
        <Box sx={{ 
          width: '60px', 
          borderRight: '1px solid',
          borderColor: 'divider',
          flexShrink: 0
        }}>
          {hours.map(hour => (
            <Box 
              key={hour} 
              sx={{ 
                height: '60px', 
                borderBottom: '1px solid',
                borderColor: 'divider',
                padding: '4px',
                textAlign: 'right'
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </Typography>
            </Box>
          ))}
        </Box>
        
        {/* Day columns */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${dates.length}, 1fr)`,
          width: '100%',
          position: 'relative'
        }}>
          {dates.map((date, dateIndex) => (
            <Box 
              key={dateIndex}
              sx={{ 
                borderRight: dateIndex < dates.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              {hours.map(hour => (
                <Box 
                  key={hour}
                  onClick={() => handleDateCellClick(setHours(date, hour))}
                  sx={{ 
                    height: '60px', 
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                />
              ))}
              
              {/* Render events for this day */}
              <Box sx={{ position: 'absolute', width: `${100 / dates.length}%`, left: `${(dateIndex * 100) / dates.length}%` }}>
                {events
                  .filter(event => isSameDay(event.start, date))
                  .map(event => {
                    const startHour = event.start.getHours() + (event.start.getMinutes() / 60);
                    const endHour = event.end 
                      ? event.end.getHours() + (event.end.getMinutes() / 60)
                      : startHour + 1;
                    const duration = endHour - startHour;
                    
                    return (
                      <Box
                        key={event.id}
                        sx={{
                          position: 'absolute',
                          top: `${startHour * 60}px`,
                          height: `${duration * 60}px`,
                          width: 'calc(100% - 8px)',
                          left: '4px',
                        }}
                      >
                        <CalendarEvent
                          id={event.id}
                          title={event.title}
                          start={event.start}
                          end={event.end}
                          color={event.color}
                          onClick={handleEventClick}
                          isRecurring={event.isRecurring}
                        />
                      </Box>
                    );
                  })}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const weeks = [];
    let week = [];
    
    for (let i = 0; i < dates.length; i++) {
      week.push(dates[i]);
      
      if (week.length === 7 || i === dates.length - 1) {
        weeks.push([...week]);
        week = [];
      }
    }
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {weeks.map((weekDates, weekIndex) => (
          <Box 
            key={weekIndex}
            sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              flex: 1,
              minHeight: '100px'
            }}
          >
            {weekDates.map((date, dayIndex) => {
              const isCurrentMonth = isSameMonth(date, currentDate);
              const dayEvents = events.filter(event => isSameDay(event.start, date));
              
              return (
                <Box
                  key={dayIndex}
                  onClick={() => handleDateCellClick(date)}
                  sx={{
                    borderRight: dayIndex < 6 ? '1px solid' : 'none',
                    borderBottom: weekIndex < weeks.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    backgroundColor: isCurrentMonth ? 'background.paper' : 'action.hover',
                    padding: '4px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isCurrentMonth ? 'text.primary' : 'text.disabled',
                      fontWeight: isSameDay(date, new Date()) ? 'bold' : 'normal'
                    }}
                  >
                    {date.getDate()}
                  </Typography>
                  
                  <Box sx={{ mt: 1 }}>
                    {dayEvents.slice(0, 4).map(event => (
                      <CalendarEvent
                        key={event.id}
                        id={event.id}
                        title={event.title}
                        start={event.start}
                        end={event.end}
                        color={event.color}
                        onClick={handleEventClick}
                        isMultiDay={false}
                        isRecurring={event.isRecurring}
                      />
                    ))}
                    
                    {dayEvents.length > 4 && (
                      <Typography variant="caption" color="text.secondary">
                        +{dayEvents.length - 4} more
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    );
  };

  // Render multi-day events that span across days
  const renderMultiDayEvents = () => {
    if (viewType === 'month') return null;
    
    // Find events that span multiple days
    const multiDayEvents = events.filter(event => {
      if (!event.end) return false;
      
      const startDate = new Date(event.start);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(event.end);
      endDate.setHours(23, 59, 59, 999);
      
      return (endDate.getTime() - startDate.getTime()) > 24 * 60 * 60 * 1000;
    });
    
    if (multiDayEvents.length === 0) return null;
    
    return (
      <Box sx={{ 
        borderBottom: '1px solid',
        borderColor: 'divider',
        padding: '4px 0',
        marginLeft: viewType === 'day' ? 0 : '60px'
      }}>
        {multiDayEvents.map((event, index) => {
          const eventStart = new Date(event.start);
          eventStart.setHours(0, 0, 0, 0);
          
          const eventEnd = new Date(event.end || event.start);
          eventEnd.setHours(23, 59, 59, 999);
          
          // Check which days of the current view this event spans
          const visibleDates = dates.filter(date => 
            isWithinInterval(date, { start: eventStart, end: eventEnd })
          );
          
          if (visibleDates.length === 0) return null;
          
          const firstVisibleDate = visibleDates[0];
          const lastVisibleDate = visibleDates[visibleDates.length - 1];
          
          const isStartVisible = isSameDay(firstVisibleDate, eventStart);
          const isEndVisible = isSameDay(lastVisibleDate, eventEnd);
          
          const startIndex = dates.findIndex(date => isSameDay(date, firstVisibleDate));
          const endIndex = dates.findIndex(date => isSameDay(date, lastVisibleDate));
          
          if (startIndex === -1) return null;
          
          const width = ((endIndex - startIndex + 1) / dates.length) * 100;
          const left = (startIndex / dates.length) * 100;
          
          return (
            <Box
              key={`${event.id}-${index}`}
              sx={{
                position: 'relative',
                height: '24px',
                marginBottom: '2px'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: `${left}%`,
                  width: `${width}%`,
                  height: '100%'
                }}
              >
                <CalendarEvent
                  id={event.id}
                  title={event.title}
                  start={event.start}
                  end={event.end}
                  color={event.color}
                  onClick={handleEventClick}
                  isMultiDay={true}
                  isStart={isStartVisible}
                  isEnd={isEndVisible}
                  isRecurring={event.isRecurring}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Paper 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
      elevation={0}
    >
      <CalendarToolbar
        currentDate={currentDate}
        viewType={viewType}
        onDateChange={setCurrentDate}
        onViewTypeChange={setViewType}
        onFilterClick={() => console.log('Filter clicked')}
        onSortClick={() => console.log('Sort clicked')}
        dateField={dateField}
        availableDateFields={dateFields}
        onDateFieldChange={handleDateFieldChange}
      />
      
      <CalendarHeader dates={dates} viewType={viewType} />
      
      {viewType !== 'month' && renderMultiDayEvents()}
      
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        position: 'relative'
      }}>
        {viewType === 'month' ? renderMonthView() : renderTimeSlots()}
      </Box>
    </Paper>
  );
};

export default CalendarView;