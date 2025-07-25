import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTouchGestures } from './touchGestures';
import { TouchGestureHandler } from './touchGestures';

// Mock the TouchGestureHandler class
jest.mock('./touchGestures', () => {
  const originalModule = jest.requireActual('./touchGestures');
  return {
    ...originalModule,
    TouchGestureHandler: jest.fn()
  };
});

// Test component that uses the hook
const TestComponent: React.FC<{
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}> = ({ onSwipeLeft, onSwipeRight }) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  
  useTouchGestures(divRef, {
    onSwipeLeft,
    onSwipeRight
  });
  
  return <div ref={divRef} data-testid="touch-element">Touch Element</div>;
};

describe('useTouchGestures hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (TouchGestureHandler as jest.Mock).mockImplementation(() => ({
      destroy: jest.fn()
    }));
  });
  
  test('should create TouchGestureHandler with element and options', () => {
    const onSwipeLeft = jest.fn();
    const onSwipeRight = jest.fn();
    
    render(<TestComponent onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight} />);
    
    const element = screen.getByTestId('touch-element');
    
    expect(TouchGestureHandler).toHaveBeenCalledWith({
      element,
      onSwipeLeft,
      onSwipeRight
    });
  });
  
  test('should destroy TouchGestureHandler on unmount', () => {
    const destroyMock = jest.fn();
    (TouchGestureHandler as jest.Mock).mockImplementation(() => ({
      destroy: destroyMock
    }));
    
    const { unmount } = render(<TestComponent />);
    
    unmount();
    
    expect(destroyMock).toHaveBeenCalled();
  });
  
  test('should not create TouchGestureHandler if ref is null', () => {
    // Create a component with a null ref
    const NullRefComponent: React.FC = () => {
      const nullRef = { current: null };
      useTouchGestures(nullRef as React.RefObject<HTMLElement>, {});
      return <div>No Ref</div>;
    };
    
    render(<NullRefComponent />);
    
    expect(TouchGestureHandler).not.toHaveBeenCalled();
  });
  
  test('should recreate TouchGestureHandler when options change', () => {
    const onSwipeLeft1 = jest.fn();
    const onSwipeLeft2 = jest.fn();
    
    const { rerender } = render(<TestComponent onSwipeLeft={onSwipeLeft1} />);
    
    expect(TouchGestureHandler).toHaveBeenCalledTimes(1);
    expect(TouchGestureHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        onSwipeLeft: onSwipeLeft1
      })
    );
    
    // Reset mock to check if it's called again
    (TouchGestureHandler as jest.Mock).mockClear();
    
    // Rerender with different props
    rerender(<TestComponent onSwipeLeft={onSwipeLeft2} />);
    
    expect(TouchGestureHandler).toHaveBeenCalledTimes(1);
    expect(TouchGestureHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        onSwipeLeft: onSwipeLeft2
      })
    );
  });
});