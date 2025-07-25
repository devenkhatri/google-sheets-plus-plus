import React from 'react';
import { Box, CircularProgress, Typography, useTheme, useMediaQuery } from '@mui/material';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  transparent?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  fullScreen = false,
  overlay = false,
  transparent = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 48;
      case 'medium':
      default:
        return 36;
    }
  };
  
  const spinnerSize = getSpinnerSize();
  
  const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...(fullScreen && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: theme.zIndex.modal,
    }),
    ...(overlay && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: theme.zIndex.modal - 1,
    }),
    ...(fullScreen || overlay) && {
      backgroundColor: transparent 
        ? 'rgba(255, 255, 255, 0.7)' 
        : theme.palette.background.paper,
      // Add safe area padding for mobile devices
      paddingTop: isMobile && fullScreen ? 'env(safe-area-inset-top)' : undefined,
      paddingBottom: isMobile && fullScreen ? 'env(safe-area-inset-bottom)' : undefined,
    },
    minHeight: fullScreen || overlay ? undefined : isMobile ? '150px' : '200px',
  } as const;
  
  return (
    <Box sx={containerStyles}>
      <CircularProgress
        size={spinnerSize}
        thickness={4}
        color="primary"
        aria-label="Loading"
      />
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, textAlign: 'center' }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;