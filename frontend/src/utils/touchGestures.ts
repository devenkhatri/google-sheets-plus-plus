import Hammer from 'hammerjs';
import React, { useEffect } from 'react';

// Define proper types for Hammer.js
declare global {
  interface HammerInput {
    deltaX: number;
    deltaY: number;
    scale: number;
    rotation: number;
    center: {
      x: number;
      y: number;
    };
    srcEvent: TouchEvent | MouseEvent | PointerEvent;
    preventDefault(): void;
    type: string;
    direction: number;
    distance: number;
    angle: number;
    velocity: number;
    eventType: number;
    target: HTMLElement;
    pointerType: string;
    isFirst: boolean;
    isFinal: boolean;
  }

  interface HammerManager {
    on(event: string, callback: (event: HammerInput) => void): void;
    off(event: string, callback: (event: HammerInput) => void): void;
    destroy(): void;
    get(recognizer: string): {
      set(options: Record<string, any>): void;
    };
  }
}

interface TouchGestureOptions {
  element: HTMLElement;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onPinch?: (scale: number) => void;
  onRotate?: (rotation: number) => void;
  onPan?: (event: HammerInput) => void;
}

/**
 * A utility for handling touch gestures using Hammer.js
 */
export class TouchGestureHandler {
  private hammer: HammerManager;
  private element: HTMLElement;
  
  constructor(options: TouchGestureOptions) {
    this.element = options.element;
    this.hammer = new Hammer(this.element) as unknown as HammerManager;
    
    // Configure recognizers
    this.hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    
    if (options.onPinch || options.onRotate) {
      this.hammer.get('pinch').set({ enable: true });
      this.hammer.get('rotate').set({ enable: true });
    }
    
    // Add event listeners
    if (options.onSwipeLeft || options.onSwipeRight) {
      this.hammer.on('swipeleft', (_e) => {
        if (options.onSwipeLeft) options.onSwipeLeft();
      });
      
      this.hammer.on('swiperight', (_e) => {
        if (options.onSwipeRight) options.onSwipeRight();
      });
    }
    
    if (options.onSwipeUp || options.onSwipeDown) {
      this.hammer.on('swipeup', (_e) => {
        if (options.onSwipeUp) options.onSwipeUp();
      });
      
      this.hammer.on('swipedown', (_e) => {
        if (options.onSwipeDown) options.onSwipeDown();
      });
    }
    
    if (options.onTap) {
      this.hammer.on('tap', () => {
        if (options.onTap) options.onTap();
      });
    }
    
    if (options.onDoubleTap) {
      this.hammer.on('doubletap', () => {
        if (options.onDoubleTap) options.onDoubleTap();
      });
    }
    
    if (options.onPinch) {
      this.hammer.on('pinch', (e) => {
        if (options.onPinch) options.onPinch(e.scale);
      });
    }
    
    if (options.onRotate) {
      this.hammer.on('rotate', (e) => {
        if (options.onRotate) options.onRotate(e.rotation);
      });
    }
    
    if (options.onPan) {
      this.hammer.on('pan', (e) => {
        if (options.onPan) options.onPan(e);
      });
    }
  }
  
  /**
   * Destroy the hammer instance and clean up event listeners
   */
  public destroy() {
    this.hammer.destroy();
  }
}

/**
 * React hook for using touch gestures
 * @param elementRef Reference to the HTML element to attach gestures to
 * @param options Touch gesture options and callbacks
 */
export const useTouchGestures = (
  elementRef: React.RefObject<HTMLElement>,
  options: Omit<TouchGestureOptions, 'element'>
): void => {
  useEffect(() => {
    if (!elementRef.current) return;
    
    const handler = new TouchGestureHandler({
      element: elementRef.current,
      ...options
    });
    
    return () => {
      handler.destroy();
    };
  }, [elementRef, options]);
};