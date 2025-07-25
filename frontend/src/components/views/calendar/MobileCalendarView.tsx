import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  useTheme,
  Fade,
  Chip,
  Badge,
  CircularProgress
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  isValid,
  addMonths,
  subMonths,
  addDays,
  setHours,
  setMinutes,
  isToday,
  getDay
} from 'date-fns';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import TodayIcon from '@mui/icons-material/Today';
import EventIcon from '@mui/icons-material/Event';
import SwipeLeftIcon from '@mui/icons-material/SwipeLeft';
import SwipeRightIcon from '@mui/icons-material/SwipeRight';
import CalendarToolbar from './CalendarToolbar';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { RootState } from '../../../store';
import { fetchRecords, updateRecord } from '../../../store/slices/recordSlice';
import { setCurrentView } from '../../../store/slices/viewSlice';
import { viewService } from '../../../services/viewService';
import { recordService } from '../../../services/recordService';
import PullToRefresh from '../../ui/PullToRefresh';
import MobileFilterSort from '../../ui/MobileFilterSort';
import { useTouchGestures } from '../../../utils/touchGestures';
import { 
  debounce, 
  triggerHapticFeedback, 
  prefersReducedMotion,
  getSafeAreaInsets
} from '../../../utils/mobileOptimizations';

interface MobileCalendarViewProps {
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

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({ viewId, tableId }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateField, setDateField] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  
  // Dialog state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  
  // Get data from Redux store
  const view = useSelector((state: RootState) => 
    state.views.views.find(v => v.id === viewId)
  );
  
  const fields = useSelector((state: RootState) => 
    state.tables.tables.find(t => t.id === tableId)?.fields || []
  );
  
  const records = useSelector((state: RootState) => 
    state.records.records.filter(r => r.tableId === tableId)
  );
  
  // Get all date fields from the table
  const dateFields = useMemo(() => 
    fields.filter(field => field.type === 'date').map(field => ({
      id: field.id,
      name: field.name
    })),
    [fields]
  );
  
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
  
  // Calculate dates to display in the calendar
  const calendarDates = useMemo(() => {
    const start = startOfMonth(currentDate);
    const firstDay = startOfWeek(start, { weekStartsOn: 0 });
    const lastDay = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: firstDay, end: lastDay });
  }, [currentDate]);
  
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
          : addDays(start, 1);
        
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
  
  // Ref for swipe container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for swipe animation
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeIndicatorVisible, setSwipeIndicatorVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Handle swipe gestures for month navigation with enhanced feedback
  useTouchGestures(containerRef, {
    onSwipeLeft: () => {
      // Don't allow swipe during animation
      if (isAnimating) return;
      
      // Provide haptic feedback with pattern for better experience
      triggerHapticFeedback([40, 30, 40]);
      
      // Show swipe direction indicator
      setSwipeDirection('left');
      setSwipeIndicatorVisible(true);
      setTimeout(() => setSwipeIndicatorVisible(false), 800);
      
      // Set animating state
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 400);
      
      setCurrentDate(addMonths(currentDate, 1));
    },
    onSwipeRight: () => {
      // Don't allow swipe during animation
      if (isAnimating) return;
      
      // Provide haptic feedback with pattern for better experience
      triggerHapticFeedback([40, 30, 40]);
      
      // Show swipe direction indicator
      setSwipeDirection('right');
      setSwipeIndicatorVisible(true);
      setTimeout(() => setSwipeIndicatorVisible(false), 800);
      
      // Set animating state
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 400);
      
      setCurrentDate(subMonths(currentDate, 1));
    },
    onPan: (event) => {
      // Skip animations if user prefers reduced motion or during animation
      const reduceMotion = prefersReducedMotion();
      if (reduceMotion || isAnimating) return;
      
      // Add visual feedback during panning with improved performance
      if (containerRef.current) {
        const translateX = Math.min(Math.max(-100, event.deltaX * 0.3), 100);
        containerRef.current.style.transform = `translateX(${translateX}px)`;
        containerRef.current.style.transition = 'none';
        
        // Add scale and rotation effect for better visual feedback
        const scale = Math.max(0.95, 1 - Math.abs(translateX) / 500);
        const rotate = Math.min(Math.max(-1, translateX / 100), 1);
        containerRef.current.style.transform += ` scale(${scale}) rotate(${rotate}deg)`;
        
        // Add opacity feedback
        const opacity = Math.max(0.9, 1 - Math.abs(translateX) / 300);
        containerRef.current.style.opacity = opacity.toString();
        
        if (event.isFinal) {
          containerRef.current.style.transform = '';
          containerRef.current.style.opacity = '';
          containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
          
          // Enhanced swipe threshold detection with velocity consideration
          const threshold = 30;
          const velocity = Math.abs(event.velocity);
          const adjustedThreshold = threshold * (velocity > 0.5 ? 0.7 : 1);
          
          if (Math.abs(event.deltaX) > adjustedThreshold) {
            // Set animating state
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 400);
            
            if (event.deltaX > 0) {
              setSwipeDirection('right');
              setSwipeIndicatorVisible(true);
              setTimeout(() => setSwipeIndicatorVisible(false), 800);
              setCurrentDate(subMonths(currentDate, 1));
              triggerHapticFeedback([40, 30, 40]);
            } else {
              setSwipeDirection('left');
              setSwipeIndicatorVisible(true);
              setTimeout(() => setSwipeIndicatorVisible(false), 800);
              setCurrentDate(addMonths(currentDate, 1));
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
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load view details
      const viewData = await viewService.getView(viewId);
      dispatch(setCurrentView(viewData));
      
      // Set date field from view configuration
      const configDateField = viewData.configuration?.dateField;
      if (configDateField) {
        setDateField(configDateField);
      } else if (dateFields.length > 0) {
        setDateField(dateFields[0].id);
      }
      
      // Load records
      dispatch(fetchRecords({
        tableId,
        options: {
          filters: viewData.filters,
          sorts: viewData.sorts,
        }
      }));
      
    } catch (err: any) {
      console.error('Error loading calendar data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);
  
  // Handle date field change
  const handleDateFieldChange = async (fieldId: string) => {
    setDateField(fieldId);
    
    try {
      if (!view) return;
      
      const updatedConfiguration = {
        ...view.configuration,
        dateField: fieldId,
      };
      
      await viewService.updateView(viewId, {
        configuration: updatedConfiguration,
      });
    } catch (err) {
      console.error('Error updating date field:', err);
    }
  };
  
  // Handle month navigation
  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  // Handle date cell click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    
    // Find events for this date
    const eventsForDate = events.filter(event => 
      isSameDay(event.start, date)
    );
    
    setSelectedEvents(eventsForDate);
  };
  
  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setCurrentEvent(event);
    
    // Find the record for this event
    const record = records.find(r => r.id === event.id);
    if (!record) return;
    
    // Initialize edit values with current record values
    const initialValues: Record<string, any> = {};
    fields.forEach(field => {
      initialValues[field.id] = record.fields[field.id] || '';
    });
    
    setEditValues(initialValues);
    setEventDialogOpen(true);
  };
  
  // Handle field value change in dialog
  const handleFieldChange = (fieldId: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };
  
  // Save event changes
  const handleSaveEvent = async () => {
    if (!currentEvent) return;
    
    try {
      // Optimistically update the UI
      dispatch(updateRecord({
        id: currentEvent.id,
        updates: {
          fields: editValues
        }
      }));
      
      // Update on the server
      await recordService.updateRecord(currentEvent.id, {
        fields: editValues
      });
      
      // Close dialog
      setEventDialogOpen(false);
    } catch (err) {
      console.error('Error updating event:', err);
      // Reload data to revert to correct state
      loadData();
    }
  };
  
  // Handle add event
  const handleAddEvent = () => {
    console.log('Add event');
    // TODO: Open add event modal
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
  
  // If no date field is available
  if (dateFields.length === 0) {
    return (
      <Box p={2} textAlign="center">
        <Typography>
          Calendar view requires a date field. Please add one to your table.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CalendarToolbar
        currentDate={currentDate}
        viewType="month"
        onDateChange={setCurrentDate}
        onViewTypeChange={() => {}}
        onFilterClick={() => console.log('Filter clicked')}
        onSortClick={() => console.log('Sort clicked')}
        dateField={dateField}
        availableDateFields={dateFields}
        onDateFieldChange={handleDateFieldChange}
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
        {/* Month navigation */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <IconButton onClick={handlePreviousMonth}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          
          <Typography variant="h6" fontWeight="bold">
            {format(currentDate, 'MMMM yyyy')}
          </Typography>
          
          <IconButton onClick={handleNextMonth}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Weekday headers */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <Typography 
              key={day} 
              variant="body2" 
              align="center"
              fontWeight="medium"
              color={index === 0 || index === 6 ? 'text.secondary' : 'text.primary'}
            >
              {day}
            </Typography>
          ))}
        </Box>
        
        {/* Calendar grid with improved touch handling */}
        <Box 
          ref={containerRef}
          sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            flex: 1,
            overflow: 'auto',
            touchAction: 'pan-y', // Allow vertical scrolling but capture horizontal swipes
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            position: 'relative',
            animation: isAnimating ? `${swipeDirection === 'left' ? 'slideLeft' : 'slideRight'} 0.3s ease-out` : 'none',
            '@keyframes slideLeft': {
              from: { transform: 'translateX(50px)', opacity: 0.5 },
              to: { transform: 'translateX(0)', opacity: 1 }
            },
            '@keyframes slideRight': {
              from: { transform: 'translateX(-50px)', opacity: 0.5 },
              to: { transform: 'translateX(0)', opacity: 1 }
            }
          }}
        >
          {calendarDates.map((date, index) => {
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isTodayDate = isToday(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const dayEvents = events.filter(event => isSameDay(event.start, date));
            const isWeekend = getDay(date) === 0 || getDay(date) === 6;
            
            return (
              <Box
                key={index}
                onClick={() => handleDateClick(date)}
                sx={{
                  borderRight: (index + 1) % 7 !== 0 ? '1px solid' : 'none',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: isSelected 
                    ? 'action.selected' 
                    : isCurrentMonth 
                      ? isWeekend ? 'action.hover' : 'background.paper' 
                      : theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)',
                  padding: '4px',
                  minHeight: '70px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  '&:active': {
                    backgroundColor: theme.palette.action.selected,
                  }
                }}
              >
                {/* Date number with better styling */}
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 0.5
                }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isCurrentMonth 
                        ? isTodayDate ? 'primary.main' : isWeekend ? 'text.secondary' : 'text.primary' 
                        : 'text.disabled',
                      fontWeight: isTodayDate ? 'bold' : 'normal',
                      textAlign: 'center',
                      width: isTodayDate ? 24 : 'auto',
                      height: isTodayDate ? 24 : 'auto',
                      lineHeight: isTodayDate ? '24px' : 'inherit',
                      borderRadius: isTodayDate ? '50%' : 0,
                      backgroundColor: isTodayDate ? 'primary.light' : 'transparent',
                      color: isTodayDate ? 'primary.contrastText' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {date.getDate()}
                  </Typography>
                </Box>
                
                {/* Event indicators with improved styling */}
                {dayEvents.length > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5
                  }}>
                    {dayEvents.length <= 2 ? (
                      // Show individual indicators for 1-2 events
                      dayEvents.map((event, i) => (
                        <Box 
                          key={i}
                          sx={{ 
                            width: '100%',
                            height: '4px',
                            borderRadius: '2px',
                            backgroundColor: event.color || theme.palette.primary.main,
                            mb: 0.25,
                            opacity: isCurrentMonth ? 1 : 0.5
                          }}
                        />
                      ))
                    ) : (
                      // Show badge for 3+ events
                      <Badge
                        badgeContent={dayEvents.length}
                        color="primary"
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '0.6rem',
                            height: 16,
                            minWidth: 16,
                            padding: '0 4px'
                          }
                        }}
                      >
                        <EventIcon 
                          fontSize="small" 
                          sx={{ 
                            color: isCurrentMonth ? 'action.active' : 'action.disabled',
                            opacity: 0.7
                          }} 
                        />
                      </Badge>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
          
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
        
        {/* Enhanced calendar controls */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1.5,
          px: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: theme.palette.background.paper
        }}>
          {/* Previous month button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIosNewIcon fontSize="small" />}
            onClick={handlePreviousMonth}
            sx={{ 
              borderRadius: 2,
              minWidth: 'auto',
              px: 1,
              py: 0.5
            }}
          >
            Prev
          </Button>
          
          {/* Today button */}
          <Button
            variant="contained"
            size="small"
            startIcon={<TodayIcon fontSize="small" />}
            onClick={() => setCurrentDate(new Date())}
            sx={{ 
              borderRadius: 2,
              minWidth: 'auto',
              px: 1.5,
              py: 0.5
            }}
          >
            Today
          </Button>
          
          {/* Next month button */}
          <Button
            variant="outlined"
            size="small"
            endIcon={<ArrowForwardIosIcon fontSize="small" />}
            onClick={handleNextMonth}
            sx={{ 
              borderRadius: 2,
              minWidth: 'auto',
              px: 1,
              py: 0.5
            }}
          >
            Next
          </Button>
        </Box>
        
        {/* Swipe hint text with improved visibility */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
        }}>
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
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
              Swipe to change months
            </Typography>
            <SwipeLeftIcon fontSize="small" sx={{ color: 'action.active' }} />
          </Box>
        </Box>
      </Paper>
      </PullToRefresh>
      
      {/* Selected date events dialog */}
      {selectedDate && (
        <Dialog
          open={Boolean(selectedDate)}
          onClose={() => setSelectedDate(null)}
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
            <Typography variant="h6">
              {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
            </Typography>
            <IconButton edge="end" onClick={() => setSelectedDate(null)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent dividers>
            {selectedEvents.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 4
              }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  No events on this day
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />}
                  onClick={handleAddEvent}
                  sx={{ borderRadius: 2 }}
                >
                  Add Event
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selectedEvents.map(event => (
                  <Card
                    key={event.id}
                    sx={{
                      borderRadius: 2,
                      boxShadow: 1,
                      borderLeft: '4px solid',
                      borderColor: event.color || 'primary.main',
                      '&:active': {
                        backgroundColor: theme.palette.action.selected,
                      },
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {event.title}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        {format(event.start, 'h:mm a')} - {event.end && format(event.end, 'h:mm a')}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
                
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddEvent}
                  sx={{ 
                    borderRadius: 2,
                    borderStyle: 'dashed',
                    py: 1.5,
                    mt: 1
                  }}
                >
                  Add Event
                </Button>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      )}
      
      {/* Edit Event Dialog */}
      <Dialog 
        open={eventDialogOpen} 
        onClose={() => setEventDialogOpen(false)}
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
          <Typography variant="h6">Edit Event</Typography>
          <IconButton edge="end" onClick={() => setEventDialogOpen(false)}>
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
            onClick={() => setEventDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEvent}
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

export default MobileCalendarView;