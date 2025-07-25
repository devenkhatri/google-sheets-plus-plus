import React, { useState, useCallback } from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import { triggerHapticFeedback } from '../../utils/mobileOptimizations';

interface TouchFeedbackProps {
  children: React.ReactNode;
  onTap?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  hapticFeedback?: boolean;
  longPressDelay?: number;
  className?: string;
  sx?: any;
}

const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  onTap,
  onLongPress,
  disabled = false,
  hapticFeedback = true,
  longPressDelay = 500,
  className,
  sx,
}) => {
  const theme = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    setIsPressed(true);
    
    if (onLongPress) {
      const timer = setTimeout(() => {
        if (hapticFeedback) {
          triggerHapticFeedback([50, 50, 50]);
        }
        onLongPress();
        setIsPressed(false);
      }, longPressDelay);
      
      setLongPressTimer(timer);
    }
  }, [disabled, onLongPress, hapticFeedback, longPressDelay]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    setIsPressed(false);
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (onTap) {
      if (hapticFeedback) {
        triggerHapticFeedback(25);
      }
      onTap();
    }
  }, [disabled, longPressTimer, onTap, hapticFeedback]);

  const handleTouchCancel = useCallback(() => {
    setIsPressed(false);
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  return (
    <Box
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      sx={{
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'all 0.15s ease-out',
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        backgroundColor: isPressed 
          ? alpha(theme.palette.primary.main, 0.08)
          : 'transparent',
        borderRadius: 1,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default TouchFeedback;