import React from 'react';
import { Box, Typography } from '@mui/material';
import { format, isToday } from 'date-fns';

interface CalendarHeaderProps {
  dates: Date[];
  viewType: 'day' | 'week' | 'month';
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ dates, viewType }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: viewType === 'day' ? '1fr' : `repeat(${dates.length}, 1fr)`,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}
    >
      {dates.map((date, index) => (
        <Box
          key={index}
          sx={{
            p: 1,
            textAlign: 'center',
            borderRight: index < dates.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider'
          }}
        >
          <Typography
            variant="subtitle2"
            component="div"
            sx={{
              fontWeight: isToday(date) ? 'bold' : 'normal',
              color: isToday(date) ? 'primary.main' : 'text.primary'
            }}
          >
            {viewType === 'month' ? format(date, 'EEE') : format(date, 'EEEE')}
          </Typography>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: isToday(date) ? 'bold' : 'normal',
              color: isToday(date) ? 'primary.main' : 'text.primary',
              backgroundColor: isToday(date) ? 'primary.light' : 'transparent',
              borderRadius: isToday(date) ? '50%' : 0,
              width: isToday(date) ? '36px' : 'auto',
              height: isToday(date) ? '36px' : 'auto',
              display: isToday(date) ? 'flex' : 'block',
              alignItems: isToday(date) ? 'center' : 'normal',
              justifyContent: isToday(date) ? 'center' : 'normal',
              margin: isToday(date) ? '0 auto' : 0
            }}
          >
            {format(date, 'd')}
          </Typography>
          {viewType !== 'month' && (
            <Typography variant="caption" color="text.secondary">
              {format(date, 'MMM yyyy')}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default CalendarHeader;