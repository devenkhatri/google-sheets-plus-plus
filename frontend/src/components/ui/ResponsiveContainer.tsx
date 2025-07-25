import React from 'react';
import { Box, BoxProps, useTheme, useMediaQuery } from '@mui/material';

interface ResponsiveContainerProps extends BoxProps {
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  children: React.ReactNode;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  maxWidth = 'lg',
  disableGutters = false,
  children,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const getMaxWidthValue = (): string | undefined => {
    if (!maxWidth) return undefined;
    
    const maxWidthValues = {
      xs: '444px',
      sm: '600px',
      md: '900px',
      lg: '1200px',
      xl: '1536px',
    };
    
    return maxWidthValues[maxWidth];
  };
  
  return (
    <Box
      width="100%"
      maxWidth={getMaxWidthValue()}
      mx="auto"
      px={disableGutters ? 0 : isMobile ? 2 : 3}
      {...props}
    >
      {children}
    </Box>
  );
};

export default ResponsiveContainer;