// import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { MobileKanbanView } from '../../components/views/kanban';
import { MobileCalendarView } from '../../components/views/calendar';
import { MobileGalleryView } from '../../components/views/gallery';
import recordReducer from '../../store/slices/recordSlice';
import tableReducer from '../../store/slices/tableSlice';
import viewReducer from '../../store/slices/viewSlice';

// Mock the services
jest.mock('../../services/viewService', () => ({
  getView: jest.fn().mockResolvedValue({
    id: 'view-1',
    name: 'Test View',
    configuration: {
      groupByField: 'status',
      dateField: 'date',
      imageField: 'attachment'
    },
    filters: [],
    sorts: []
  })
}));

jest.mock('../../services/recordService', () => ({
  getRecords: jest.fn().mockResolvedValue({
    records: [],
    total: 0
  }),
  updateRecord: jest.fn().mockResolvedValue({})
}));

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      records: recordReducer,
      tables: tableReducer,
      views: viewReducer
    },
    preloadedState: {
      records: {
        records: [],
        loading: false,
        error: null
      },
      tables: {
        byId: {
          'table-1': {
            id: 'table-1',
            name: 'Test Table',
            fields: [
              { id: 'name', name: 'Name', type: 'text' },
              { id: 'status', name: 'Status', type: 'singleSelect', options: { choices: [
                { value: 'todo', label: 'To Do', color: '#ff0000' },
                { value: 'inProgress', label: 'In Progress', color: '#00ff00' },
                { value: 'done', label: 'Done', color: '#0000ff' }
              ]}},
              { id: 'date', name: 'Date', type: 'date' },
              { id: 'attachment', name: 'Attachment', type: 'attachment' }
            ]
          }
        }
      },
      views: {
        byId: {
          'view-1': {
            id: 'view-1',
            name: 'Test View',
            configuration: {
              groupByField: 'status',
              dateField: 'date',
              imageField: 'attachment'
            },
            filters: [],
            sorts: []
          }
        }
      }
    }
  });
};

// Mock window.matchMedia for responsive testing
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

describe('Mobile Views', () => {
  let store: any;

  beforeEach(() => {
    store = createMockStore();
    
    // Mock navigator.vibrate for haptic feedback testing
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      configurable: true,
      writable: true
    });
  });

  describe('MobileKanbanView', () => {
    test('renders loading state and then content', async () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MobileKanbanView tableId="table-1" viewId="view-1" />
          </ThemeProvider>
        </Provider>
      );

      // Initially shows loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Wait for loading to complete
      await screen.findByText('To Do');
      
      // Check that tabs are rendered
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('No value')).toBeInTheDocument();
      
      // Check for swipe hint with improved navigation indicators
      expect(screen.getByText(/Swipe to navigate columns/i)).toBeInTheDocument();
      
      // Check for navigation buttons
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
    
    test('handles touch gestures correctly', async () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MobileKanbanView tableId="table-1" viewId="view-1" />
          </ThemeProvider>
        </Provider>
      );
      
      // Wait for loading to complete
      await screen.findByText('To Do');
      
      // Simulate a swipe gesture by clicking the Next button
      fireEvent.click(screen.getByText('Next'));
      
      // Check that haptic feedback was triggered
      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });
  });

  describe('MobileCalendarView', () => {
    test('renders loading state and then calendar', async () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MobileCalendarView tableId="table-1" viewId="view-1" />
          </ThemeProvider>
        </Provider>
      );

      // Initially shows loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Wait for loading to complete
      await screen.findByText('Sun');
      
      // Check that weekday headers are rendered
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      
      // Check for swipe hint with improved navigation indicators
      expect(screen.getByText(/Swipe to change months/i)).toBeInTheDocument();
      
      // Check for month navigation buttons
      const navigationButtons = screen.getAllByRole('button');
      expect(navigationButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('MobileGalleryView', () => {
    test('renders loading state and then gallery', async () => {
      render(
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <MobileGalleryView tableId="table-1" viewId="view-1" />
          </ThemeProvider>
        </Provider>
      );

      // Initially shows loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Wait for loading to complete
      await screen.findByPlaceholderText('Search records...');
      
      // Check that search bar is rendered
      expect(screen.getByPlaceholderText('Search records...')).toBeInTheDocument();
      
      // Check for empty state message
      expect(screen.getByText('No records found.')).toBeInTheDocument();
      
      // Check for add record button
      expect(screen.getByText('Add Record')).toBeInTheDocument();
    });
    
    test('handles image loading correctly', async () => {
      // Mock the store with records that have attachments
      const storeWithImages = createMockStore();
      storeWithImages.getState = () => ({
        ...store.getState(),
        records: {
          records: [
            {
              id: 'rec1',
              tableId: 'table-1',
              fields: {
                name: 'Test Record',
                attachment: [
                  { url: 'https://example.com/image.jpg', thumbnailUrl: 'https://example.com/thumbnail.jpg' }
                ]
              }
            }
          ]
        }
      });
      
      render(
        <Provider store={storeWithImages}>
          <ThemeProvider theme={theme}>
            <MobileGalleryView tableId="table-1" viewId="view-1" />
          </ThemeProvider>
        </Provider>
      );
      
      // Wait for loading to complete
      await screen.findByPlaceholderText('Search records...');
      
      // Check that image loading is handled
      const images = document.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
      
      // Check that lazy loading is applied
      const lazyLoadedImage = images[0];
      expect(lazyLoadedImage.getAttribute('loading')).toBe('lazy');
    });
  });
});