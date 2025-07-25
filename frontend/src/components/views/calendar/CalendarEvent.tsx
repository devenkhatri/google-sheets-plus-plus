import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface CalendarEventProps {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  color?: string;
  onClick?: (id: string) => void;
  isMultiDay?: boolean;
  isStart?: boolean;
  isEnd?: boolean;
  isRecurring?: boolean;
}

const CalendarEvent: React.FC<CalendarEventProps> = ({
  id,
  title,
  start,
  end,
  color = '#1976d2',
  onClick,
  isMultiDay = false,
  isStart = true,
  isEnd = true,
  isRecurring = false
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(id);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayTitle = isMultiDay 
    ? title 
    : `${formatTime(start)} - ${end ? formatTime(end) : ''} ${title}`;

  return (
    <Tooltip title={title} arrow>
      <Box
        onClick={handleClick}
        sx={{
          backgroundColor: alpha(color, 0.8),
          color: 'white',
          borderRadius: isMultiDay ? 0 : '4px',
          borderTopLeftRadius: isStart ? '4px' : 0,
          borderBottomLeftRadius: isStart ? '4px' : 0,
          borderTopRightRadius: isEnd ? '4px' : 0,
          borderBottomRightRadius: isEnd ? '4px' : 0,
          padding: '2px 4px',
          margin: '1px 0',
          cursor: 'pointer',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.75rem',
          position: 'relative',
          '&:hover': {
            backgroundColor: alpha(color, 0.9),
          },
          ...(isRecurring && {
            '&::after': {
              content: '""',
              position: 'absolute',
              right: 4,
              top: 4,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'white',
            }
          })
        }}
      >
        <Typography
          variant="caption"
          component="div"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 500
          }}
        >
          {displayTitle}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default CalendarEvent;