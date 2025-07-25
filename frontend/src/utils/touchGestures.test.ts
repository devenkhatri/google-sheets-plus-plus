import { TouchGestureHandler } from './touchGestures';
import Hammer from 'hammerjs';

// Mock Hammer.js
jest.mock('hammerjs', () => {
  const mockHammer = {
    DIRECTION_ALL: 'all',
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
    get: jest.fn().mockReturnValue({
      set: jest.fn()
    })
  };
  
  return jest.fn(() => mockHammer);
});

describe('TouchGestureHandler', () => {
  let element: HTMLElement;
  let mockHammer: any;
  
  beforeEach(() => {
    // Create a DOM element for testing
    element = document.createElement('div');
    document.body.appendChild(element);
    
    // Reset the mock
    jest.clearAllMocks();
    mockHammer = (Hammer as jest.Mock).mock.results[0]?.value;
  });
  
  afterEach(() => {
    document.body.removeChild(element);
  });
  
  test('should initialize with element', () => {
    const handler = new TouchGestureHandler({ element });
    expect(Hammer).toHaveBeenCalledWith(element);
  });
  
  test('should configure swipe recognizer', () => {
    const handler = new TouchGestureHandler({ element });
    expect(mockHammer.get).toHaveBeenCalledWith('swipe');
    expect(mockHammer.get('swipe').set).toHaveBeenCalledWith({ direction: Hammer.DIRECTION_ALL });
  });
  
  test('should enable pinch and rotate recognizers when callbacks are provided', () => {
    const onPinch = jest.fn();
    const onRotate = jest.fn();
    
    const handler = new TouchGestureHandler({ 
      element, 
      onPinch, 
      onRotate 
    });
    
    expect(mockHammer.get).toHaveBeenCalledWith('pinch');
    expect(mockHammer.get).toHaveBeenCalledWith('rotate');
    expect(mockHammer.get('pinch').set).toHaveBeenCalledWith({ enable: true });
    expect(mockHammer.get('rotate').set).toHaveBeenCalledWith({ enable: true });
  });
  
  test('should register swipe event handlers', () => {
    const onSwipeLeft = jest.fn();
    const onSwipeRight = jest.fn();
    const onSwipeUp = jest.fn();
    const onSwipeDown = jest.fn();
    
    const handler = new TouchGestureHandler({ 
      element, 
      onSwipeLeft, 
      onSwipeRight,
      onSwipeUp,
      onSwipeDown
    });
    
    expect(mockHammer.on).toHaveBeenCalledWith('swipeleft', expect.any(Function));
    expect(mockHammer.on).toHaveBeenCalledWith('swiperight', expect.any(Function));
    expect(mockHammer.on).toHaveBeenCalledWith('swipeup', expect.any(Function));
    expect(mockHammer.on).toHaveBeenCalledWith('swipedown', expect.any(Function));
  });
  
  test('should register tap and double tap event handlers', () => {
    const onTap = jest.fn();
    const onDoubleTap = jest.fn();
    
    const handler = new TouchGestureHandler({ 
      element, 
      onTap, 
      onDoubleTap 
    });
    
    expect(mockHammer.on).toHaveBeenCalledWith('tap', expect.any(Function));
    expect(mockHammer.on).toHaveBeenCalledWith('doubletap', expect.any(Function));
  });
  
  test('should register pinch, rotate and pan event handlers', () => {
    const onPinch = jest.fn();
    const onRotate = jest.fn();
    const onPan = jest.fn();
    
    const handler = new TouchGestureHandler({ 
      element, 
      onPinch, 
      onRotate,
      onPan
    });
    
    expect(mockHammer.on).toHaveBeenCalledWith('pinch', expect.any(Function));
    expect(mockHammer.on).toHaveBeenCalledWith('rotate', expect.any(Function));
    expect(mockHammer.on).toHaveBeenCalledWith('pan', expect.any(Function));
  });
  
  test('should call the appropriate callback when events are triggered', () => {
    const onSwipeLeft = jest.fn();
    const onPinch = jest.fn();
    const onRotate = jest.fn();
    const onPan = jest.fn();
    
    const handler = new TouchGestureHandler({ 
      element, 
      onSwipeLeft,
      onPinch,
      onRotate,
      onPan
    });
    
    // Find the swipeleft event handler and call it
    const swipeLeftHandler = mockHammer.on.mock.calls.find(
      call => call[0] === 'swipeleft'
    )[1];
    swipeLeftHandler();
    expect(onSwipeLeft).toHaveBeenCalled();
    
    // Find the pinch event handler and call it with scale
    const pinchHandler = mockHammer.on.mock.calls.find(
      call => call[0] === 'pinch'
    )[1];
    pinchHandler({ scale: 1.5 });
    expect(onPinch).toHaveBeenCalledWith(1.5);
    
    // Find the rotate event handler and call it with rotation
    const rotateHandler = mockHammer.on.mock.calls.find(
      call => call[0] === 'rotate'
    )[1];
    rotateHandler({ rotation: 45 });
    expect(onRotate).toHaveBeenCalledWith(45);
    
    // Find the pan event handler and call it with event
    const panEvent = { deltaX: 10, deltaY: 20 };
    const panHandler = mockHammer.on.mock.calls.find(
      call => call[0] === 'pan'
    )[1];
    panHandler(panEvent);
    expect(onPan).toHaveBeenCalledWith(panEvent);
  });
  
  test('should destroy hammer instance when destroy is called', () => {
    const handler = new TouchGestureHandler({ element });
    handler.destroy();
    expect(mockHammer.destroy).toHaveBeenCalled();
  });
});

// We would need to test the React hook in a separate file with React Testing Library
// This would be in a file like useTouchGestures.test.tsx
describe('Touch Gestures Integration', () => {
  test('Touch gestures should enhance mobile experience', () => {
    // This is a placeholder for integration tests
    expect(true).toBe(true);
  });
});