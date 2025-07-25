/**
 * Mobile-specific performance optimizations and utilities
 */

// Debounce function for search and other frequent operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for scroll and gesture events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Intersection Observer for lazy loading
export const createIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver => {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
};

// Haptic feedback utility
export const triggerHapticFeedback = (pattern?: number | number[]): void => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern || 50);
  }
};

// Check if device supports touch
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Get device pixel ratio for high-DPI displays
export const getDevicePixelRatio = (): number => {
  return window.devicePixelRatio || 1;
};

// Optimize image loading for mobile
export const optimizeImageUrl = (url: string, width?: number, height?: number): string => {
  if (!url) return '';
  
  // If it's a data URL or blob URL, return as-is
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // Add image optimization parameters if supported by the service
  const urlObj = new URL(url);
  
  if (width) {
    urlObj.searchParams.set('w', width.toString());
  }
  
  if (height) {
    urlObj.searchParams.set('h', height.toString());
  }
  
  // Add format optimization for modern browsers
  if (supportsWebP()) {
    urlObj.searchParams.set('f', 'webp');
  }
  
  return urlObj.toString();
};

// Check WebP support
export const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

// Memory-efficient array chunking for virtual scrolling
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

// Calculate visible items for virtual scrolling
export const calculateVisibleRange = (
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
): { start: number; end: number } => {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);
  
  return { start, end };
};

// Preload images for better UX
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Batch DOM updates for better performance
export const batchDOMUpdates = (callback: () => void): void => {
  requestAnimationFrame(() => {
    callback();
  });
};

// Safe area insets for devices with notches
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
  };
};

// Network-aware loading
export const getConnectionSpeed = (): 'slow' | 'fast' | 'unknown' => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return 'unknown';
  
  const slowConnections = ['slow-2g', '2g', '3g'];
  return slowConnections.includes(connection.effectiveType) ? 'slow' : 'fast';
};

// Reduce motion preference
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Dark mode preference
export const prefersDarkMode = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};