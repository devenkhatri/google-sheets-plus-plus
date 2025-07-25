import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { triggerHapticFeedback } from '../utils/mobileOptimizations';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: UsePullToRefreshOptions) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const containerRef = useRef<HTMLElement>(null);
  
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false,
  });
  
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || !isMobile || state.isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only start pull-to-refresh if we're at the top of the container
    if (container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [enabled, isMobile, state.isRefreshing]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isMobile || !isDragging.current || state.isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only allow pull-to-refresh if we're at the top
    if (container.scrollTop > 0) {
      isDragging.current = false;
      setState(prev => ({ ...prev, isPulling: false, pullDistance: 0, canRefresh: false }));
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      // Apply resistance to the pull distance
      const pullDistance = Math.min(deltaY / resistance, threshold * 1.5);
      const canRefresh = pullDistance >= threshold;
      
      // Trigger haptic feedback when reaching refresh threshold
      if (canRefresh && !state.canRefresh) {
        triggerHapticFeedback(50);
      }
      
      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance,
        canRefresh,
      }));
    } else {
      setState(prev => ({ ...prev, isPulling: false, pullDistance: 0, canRefresh: false }));
    }
  }, [enabled, isMobile, threshold, resistance, state.isRefreshing]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isMobile || !isDragging.current) return;
    
    isDragging.current = false;
    
    if (state.canRefresh && !state.isRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true, isPulling: false }));
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error during pull-to-refresh:', error);
      } finally {
        setState(prev => ({ 
          ...prev, 
          isRefreshing: false, 
          pullDistance: 0, 
          canRefresh: false 
        }));
      }
    } else {
      setState(prev => ({ 
        ...prev, 
        isPulling: false, 
        pullDistance: 0, 
        canRefresh: false 
      }));
    }
  }, [enabled, isMobile, state.canRefresh, state.isRefreshing, onRefresh]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || !isMobile) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled, isMobile]);
  
  // Calculate transform and opacity for the pull indicator
  const getIndicatorStyle = () => {
    const { pullDistance, isPulling, isRefreshing, canRefresh } = state;
    
    if (!isPulling && !isRefreshing) {
      return {
        transform: 'translateY(-100%)',
        opacity: 0,
      };
    }
    
    const progress = Math.min(pullDistance / threshold, 1);
    const translateY = isRefreshing ? 0 : Math.max(pullDistance - threshold, -threshold);
    
    return {
      transform: `translateY(${translateY}px)`,
      opacity: isRefreshing ? 1 : progress,
      color: canRefresh ? theme.palette.success.main : theme.palette.text.secondary,
    };
  };
  
  return {
    containerRef,
    state,
    indicatorStyle: getIndicatorStyle(),
  };
};