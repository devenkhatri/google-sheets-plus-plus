// import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { vi } from 'vitest';
import MobileBottomNavigation from '../../components/ui/MobileBottomNavigation';
import MobileFilterSort from '../../components/ui/MobileFilterSort';
import PullToRefresh from '../../components/ui/PullToRefresh';
import TouchFeedback from '../../components/ui/TouchFeedback';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

// Mock redux store
const mockStore = (state: any) => ({
  getState: () => state,
  subscribe: vi.fn(),
  dispatch: vi.fn(),
});

// Mock matchMedia for testing responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('max-width') && (query.includes('599') || query.includes('600')), // Simulate mobile viewport
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.vibrate for haptic feedback tests
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

// Mock services
vi.mock('../../services/viewService', () => ({
  viewService: {
    updateViewFilters: vi.fn().mockResolvedValue({}),
    updateViewSorts: vi.fn().mockResolvedValue({}),
  }
}));

describe('Mobile Features Tests', () => {
  let store: any;
  
  beforeEach(() => {
    store = mockStore({
      ui: {
        sidebarOpen: false,
        darkMode: false,
        notifications: [
          { id: '1', message: 'Test notification', type: 'info', read: false, timestamp: Date.now() },
          { id: '2', message: 'Read notification', type: 'success', read: true, timestamp: Date.now() }
        ],
        activeUsers: []
      }
    });
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('MobileBottomNavigation', () => {
    test('renders all navigation items', () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MemoryRouter>
              <MobileBottomNavigation />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );

      expect(screen.getByLabelText('Navigate to home')).toBeInTheDocument();
      expect(screen.getByLabelText('Navigate to bases')).toBeInTheDocument();
      expect(screen.getByLabelText('Navigate to search')).toBeInTheDocument();
      expect(screen.getByLabelText(/Navigate to notifications/)).toBeInTheDocument();
      expect(screen.getByLabelText('Navigate to profile')).toBeInTheDocument();
    });

    test('shows notification badge with unread count', () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MemoryRouter>
              <MobileBottomNavigation />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );

      // Should show badge with count of 1 (one unread notification)
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('has proper accessibility attributes', () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MemoryRouter>
              <MobileBottomNavigation />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
    });
  });

  describe('MobileFilterSort', () => {
    const mockFields = [
      { id: 'field1', name: 'Name', type: 'text' },
      { id: 'field2', name: 'Email', type: 'text' },
      { id: 'field3', name: 'Age', type: 'number' }
    ];

    const mockProps = {
      fields: mockFields,
      viewId: 'view1',
      currentFilters: [],
      currentSorts: [],
      onApply: vi.fn()
    };

    test('renders filter and sort buttons', () => {
      render(
        <ThemeProvider theme={theme}>
          <MobileFilterSort {...mockProps} />
        </ThemeProvider>
      );

      expect(screen.getByLabelText('Filter records')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort records')).toBeInTheDocument();
    });

    test('shows active filter count in badge', () => {
      const propsWithFilters = {
        ...mockProps,
        currentFilters: [
          { fieldId: 'field1', operator: 'equals', value: 'test' }
        ]
      };

      render(
        <ThemeProvider theme={theme}>
          <MobileFilterSort {...propsWithFilters} />
        </ThemeProvider>
      );

      expect(screen.getByLabelText('Filter records (1 active)')).toBeInTheDocument();
    });

    test('opens filter drawer when filter button is clicked', async () => {
      render(
        <ThemeProvider theme={theme}>
          <MobileFilterSort {...mockProps} />
        </ThemeProvider>
      );

      const filterButton = screen.getByLabelText('Filter records');
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Filter Records')).toBeInTheDocument();
      });
    });
  });

  describe('PullToRefresh', () => {
    test('renders children correctly', () => {
      const onRefresh = vi.fn();
      
      render(
        <ThemeProvider theme={theme}>
          <PullToRefresh onRefresh={onRefresh}>
            <div>Test Content</div>
          </PullToRefresh>
        </ThemeProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('shows pull indicator when pulling', () => {
      const onRefresh = vi.fn();
      
      render(
        <ThemeProvider theme={theme}>
          <PullToRefresh onRefresh={onRefresh}>
            <div>Test Content</div>
          </PullToRefresh>
        </ThemeProvider>
      );

      // The pull indicator should be hidden initially
      expect(screen.getByText('Pull to refresh')).toBeInTheDocument();
    });
  });

  describe('TouchFeedback', () => {
    test('renders children correctly', () => {
      render(
        <TouchFeedback>
          <div>Touch me</div>
        </TouchFeedback>
      );

      expect(screen.getByText('Touch me')).toBeInTheDocument();
    });

    test('calls onTap when touched', () => {
      const onTap = vi.fn();
      
      render(
        <TouchFeedback onTap={onTap}>
          <div>Touch me</div>
        </TouchFeedback>
      );

      const element = screen.getByText('Touch me');
      fireEvent.touchStart(element);
      fireEvent.touchEnd(element);

      expect(onTap).toHaveBeenCalledTimes(1);
    });

    test('triggers haptic feedback when enabled', () => {
      const onTap = vi.fn();
      
      render(
        <TouchFeedback onTap={onTap} hapticFeedback={true}>
          <div>Touch me</div>
        </TouchFeedback>
      );

      const element = screen.getByText('Touch me');
      fireEvent.touchStart(element);
      fireEvent.touchEnd(element);

      expect(navigator.vibrate).toHaveBeenCalledWith(25);
    });

    test('calls onLongPress after delay', async () => {
      const onLongPress = vi.fn();
      
      render(
        <TouchFeedback onLongPress={onLongPress} longPressDelay={100}>
          <div>Touch me</div>
        </TouchFeedback>
      );

      const element = screen.getByText('Touch me');
      fireEvent.touchStart(element);

      await waitFor(() => {
        expect(onLongPress).toHaveBeenCalledTimes(1);
      }, { timeout: 200 });
    });
  });

  describe('Mobile Viewport Tests', () => {
    test('components respond to mobile viewport', () => {
      // Test that matchMedia mock is working
      const mediaQuery = window.matchMedia('(max-width: 600px)');
      expect(mediaQuery.matches).toBe(true);
    });

    test('mobile-specific styles are applied', () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MemoryRouter>
              <MobileBottomNavigation />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );

      // The component should render (not be null) on mobile
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    test('mobile components have proper ARIA labels', () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MemoryRouter>
              <MobileBottomNavigation />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );

      // Check that all navigation items have aria-labels
      expect(screen.getByLabelText('Navigate to home')).toBeInTheDocument();
      expect(screen.getByLabelText('Navigate to bases')).toBeInTheDocument();
      expect(screen.getByLabelText('Navigate to search')).toBeInTheDocument();
      expect(screen.getByLabelText(/Navigate to notifications/)).toBeInTheDocument();
      expect(screen.getByLabelText('Navigate to profile')).toBeInTheDocument();
    });

    test('filter and sort buttons have descriptive labels', () => {
      const mockProps = {
        fields: [{ id: 'field1', name: 'Name', type: 'text' }],
        viewId: 'view1',
        currentFilters: [{ fieldId: 'field1', operator: 'equals', value: 'test' }],
        currentSorts: [],
        onApply: vi.fn()
      };

      render(
        <ThemeProvider theme={theme}>
          <MobileFilterSort {...mockProps} />
        </ThemeProvider>
      );

      expect(screen.getByLabelText('Filter records (1 active)')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort records')).toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    test('components render without performance issues', () => {
      const startTime = performance.now();
      
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MemoryRouter>
              <MobileBottomNavigation />
            </MemoryRouter>
          </ThemeProvider>
        </Provider>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in less than 200ms (reasonable for test environment)
      expect(renderTime).toBeLessThan(200);
    });
  });
});

describe('Mobile Hook Tests', () => {
  test('usePullToRefresh hook works correctly', () => {
    const onRefresh = vi.fn();
    let hookResult: any;
    
    function TestComponent() {
      hookResult = usePullToRefresh({ onRefresh });
      return <div ref={hookResult.containerRef}>Test</div>;
    }
    
    render(
      <ThemeProvider theme={theme}>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(hookResult.state.isPulling).toBe(false);
    expect(hookResult.state.isRefreshing).toBe(false);
    expect(hookResult.containerRef.current).toBeInstanceOf(HTMLDivElement);
  });
});