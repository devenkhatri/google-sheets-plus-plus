/**
 * Performance monitoring utility for the frontend application
 * Collects performance metrics and sends them to the backend for analysis
 */

// Types for performance metrics
export interface PerformanceMetrics {
  // Navigation timing metrics
  navigationStart: number;
  loadEventEnd: number;
  domComplete: number;
  domInteractive: number;
  
  // Resource timing metrics
  resources: ResourceMetric[];
  
  // Custom metrics
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  
  // Application-specific metrics
  timeToInteractive?: number;
  apiResponseTimes: ApiResponseMetric[];
  renderTimes: RenderTimeMetric[];
}

export interface ResourceMetric {
  name: string;
  initiatorType: string;
  duration: number;
  size?: number;
}

export interface ApiResponseMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
}

export interface RenderTimeMetric {
  component: string;
  duration: number;
  timestamp: number;
}

// Singleton class for performance monitoring
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isEnabled: boolean;
  private apiResponseTimes: ApiResponseMetric[] = [];
  private renderTimes: RenderTimeMetric[] = [];
  private metricsEndpoint: string;
  
  private constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production' && 
                     import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';
    this.metricsEndpoint = `${import.meta.env.VITE_API_URL}/metrics`;
    
    if (this.isEnabled) {
      this.initializeObservers();
    }
  }
  
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Initialize performance observers for Web Vitals
   */
  private initializeObservers(): void {
    // First Contentful Paint
    this.observePaint('first-contentful-paint');
    
    // Largest Contentful Paint
    this.observePaint('largest-contentful-paint');
    
    // First Input Delay
    this.observeFirstInput();
    
    // Cumulative Layout Shift
    this.observeLayoutShift();
    
    // Send metrics on page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics();
    });
    
    // Also send metrics periodically
    setInterval(() => {
      this.sendMetrics();
    }, 60000); // Every minute
  }
  
  /**
   * Observe paint timing events
   */
  private observePaint(type: string): void {
    if (!window.PerformanceObserver) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (type === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = lastEntry.startTime;
        } else if (type === 'largest-contentful-paint') {
          this.metrics.largestContentfulPaint = lastEntry.startTime;
        }
      });
      
      observer.observe({ type, buffered: true });
    } catch (e) {
      console.error(`Failed to observe ${type}:`, e);
    }
  }
  
  /**
   * Observe first input delay
   */
  private observeFirstInput(): void {
    if (!window.PerformanceObserver) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0];
        this.metrics.firstInputDelay = (firstInput as any).processingStart - firstInput.startTime;
      });
      
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.error('Failed to observe first-input:', e);
    }
  }
  
  /**
   * Observe layout shifts
   */
  private observeLayoutShift(): void {
    if (!window.PerformanceObserver) return;
    
    try {
      let cumulativeLayoutShift = 0;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count layout shifts without recent user input
          if (!(entry as any).hadRecentInput) {
            cumulativeLayoutShift += (entry as any).value;
          }
        }
        
        this.metrics.cumulativeLayoutShift = cumulativeLayoutShift;
      });
      
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.error('Failed to observe layout-shift:', e);
    }
  }
  
  /**
   * Get basic navigation timing metrics
   */
  private get navigationTiming(): {
    navigationStart: number;
    loadEventEnd: number;
    domComplete: number;
    domInteractive: number;
  } {
    const timing = performance.timing || {};
    
    return {
      navigationStart: timing.navigationStart || 0,
      loadEventEnd: timing.loadEventEnd || 0,
      domComplete: timing.domComplete || 0,
      domInteractive: timing.domInteractive || 0
    };
  }
  
  /**
   * Get resource timing metrics
   */
  private get resourceTiming(): ResourceMetric[] {
    const resources: ResourceMetric[] = [];
    
    performance.getEntriesByType('resource').forEach((entry) => {
      resources.push({
        name: entry.name,
        initiatorType: (entry as any).initiatorType,
        duration: entry.duration,
        size: (entry as any).transferSize || undefined
      });
    });
    
    return resources;
  }
  
  /**
   * Get all collected metrics
   */
  private get metrics(): PerformanceMetrics {
    const timing = this.navigationTiming;
    
    return {
      ...timing,
      resources: this.resourceTiming,
      apiResponseTimes: this.apiResponseTimes,
      renderTimes: this.renderTimes,
      timeToInteractive: timing.domInteractive - timing.navigationStart
    };
  }
  
  /**
   * Record API response time
   */
  public recordApiCall(endpoint: string, method: string, duration: number, status: number): void {
    if (!this.isEnabled) return;
    
    this.apiResponseTimes.push({
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now()
    });
    
    // Keep only the last 100 API calls
    if (this.apiResponseTimes.length > 100) {
      this.apiResponseTimes.shift();
    }
  }
  
  /**
   * Record component render time
   */
  public recordRenderTime(component: string, duration: number): void {
    if (!this.isEnabled) return;
    
    this.renderTimes.push({
      component,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only the last 100 render times
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }
  }
  
  /**
   * Send collected metrics to the backend
   */
  private sendMetrics(): void {
    if (!this.isEnabled || !navigator.onLine) return;
    
    const metrics = this.metrics;
    
    // Use sendBeacon for reliable delivery, even on page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(metrics)], { type: 'application/json' });
      navigator.sendBeacon(this.metricsEndpoint, blob);
    } else {
      // Fallback to fetch
      fetch(this.metricsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
        keepalive: true
      }).catch(error => {
        console.error('Failed to send performance metrics:', error);
      });
    }
    
    // Clear collected metrics after sending
    this.apiResponseTimes = [];
    this.renderTimes = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Higher-order component for measuring render times
export function withPerformanceTracking<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return function PerformanceTrackedComponent(props: P) {
    React.useEffect(() => {
      const startTime = performance.now();
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordRenderTime(componentName, renderTime);
    }, []);
    
    return <Component {...props} />;
  };
}

// API call wrapper for measuring response times
export async function measureApiCall<T>(
  endpoint: string,
  method: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const response = await apiCall();
    const duration = performance.now() - startTime;
    
    // Assume status 200 for successful calls
    performanceMonitor.recordApiCall(endpoint, method, duration, 200);
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // Assume status 500 for failed calls
    performanceMonitor.recordApiCall(endpoint, method, duration, 500);
    
    throw error;
  }
}

// Generic async function wrapper for measuring execution times
export async function measureAsyncFunction<T>(
  functionName: string,
  asyncFunction: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await asyncFunction();
    const duration = performance.now() - startTime;
    
    // Record as a render time metric for now
    performanceMonitor.recordRenderTime(functionName, duration);
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // Still record the timing even for failed calls
    performanceMonitor.recordRenderTime(`${functionName}-error`, duration);
    
    throw error;
  }
}