import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { Refresh, KeyboardArrowDown } from '@mui/icons-material';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { triggerHapticFeedback } from '../../utils/mobileOptimizations';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}) => {
  const theme = useTheme();
  const { containerRef, state, indicatorStyle } = usePullToRefresh({
    onRefresh,
    threshold,
    resistance,
    enabled,
  });
  
  const { isPulling, isRefreshing, canRefresh, pullDistance } = state;
  
  // Calculate rotation for the arrow icon
  const getArrowRotation = () => {
    if (isRefreshing) return 0;
    if (canRefresh) return 180;
    return Math.min((pullDistance / threshold) * 180, 180);
  };
  
  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        height: '100%',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
      }}
    >
      {/* Pull-to-refresh indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: threshold,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          zIndex: 1000,
          transition: isRefreshing ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
          ...indicatorStyle,
        }}
      >
        {isRefreshing ? (
          <>
            <CircularProgress size={24} sx={{ mb: 1 }} />
            <Typography variant="body2" color="textSecondary">
              Refreshing...
            </Typography>
          </>
        ) : (
          <>
            <Box
              sx={{
                transform: `rotate(${getArrowRotation()}deg)`,
                transition: 'transform 0.2s ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
              }}
            >
              {canRefresh ? (
                <Refresh sx={{ fontSize: 24 }} />
              ) : (
                <KeyboardArrowDown sx={{ fontSize: 24 }} />
              )}
            </Box>
            <Typography variant="body2" color="textSecondary">
              {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
            </Typography>
          </>
        )}
      </Box>
      
      {/* Content */}
      <Box
        sx={{
          paddingTop: (isPulling || isRefreshing) ? `${threshold}px` : 0,
          transition: isRefreshing ? 'none' : 'padding-top 0.2s ease-out',
          minHeight: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default PullToRefresh;