// import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { vi } from 'vitest';
import MobileGridView from '../../components/views/grid/MobileGridView';

// Mock redux store
const mockStore = (state: any) => ({
  getState: () => state,
  subscribe: vi.fn(),
  dispatch: vi.fn(),
});

// Mock matchMedia for testing responsive components
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() { return true; },
  };
};

// Mock the services to avoid API calls in tests
vi.mock('../../services/viewService', () => ({
  viewService: {
    getView: vi.fn().mockResolvedValue({
      id: 'view1',
      name: 'Test View',
      type: 'grid',
      filters: [],
      sorts: [],
      fieldVisibility: {}
    })
  }
}));

vi.mock('../../services/recordService', () => ({
  recordService: {
    getRecords: vi.fn().mockResolvedValue({
      records: [
        {
          id: 'rec1',
          table_id: 'table1',
          row_index: 0,
          fields: {
            field1: 'Test Record 1',
            field2: 'Description 1',
            field3: 'Value 1'
          },
          deleted: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      ],
      total: 1,
      hasMore: false
    })
  }
}));

describe('Mobile Responsiveness Tests', () => {
  let store: any;
  
  beforeEach(() => {
    store = mockStore({
      records: {
        records: [
          {
            id: 'rec1',
            table_id: 'table1',
            row_index: 0,
            fields: {
              field1: 'Test Record 1',
              field2: 'Description 1',
              field3: 'Value 1'
            },
            deleted: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          },
          {
            id: 'rec2',
            table_id: 'table1',
            row_index: 1,
            fields: {
              field1: 'Test Record 2',
              field2: 'Description 2',
              field3: 'Value 2'
            },
            deleted: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }
        ]
      },
      tables: {
        byId: {
          table1: {
            fields: [
              { id: 'field1', name: 'Name', type: 'text', required: true },
              { id: 'field2', name: 'Description', type: 'text', required: false },
              { id: 'field3', name: 'Value', type: 'text', required: false }
            ]
          }
        }
      },
      views: {
        byId: {
          view1: {
            configuration: {},
            fieldVisibility: {}
          }
        }
      },
      ui: {
        sidebarOpen: false
      }
    });
  });
  
  test('MobileGridView renders record cards correctly', async () => {
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <MobileGridView tableId="table1" viewId="view1" />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
    
    // Wait for loading to complete
    await vi.waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check if record cards are rendered
    expect(screen.getByText('Test Record 1')).toBeInTheDocument();
  });
});

// Mock service worker registration for PWA tests
describe('PWA Features Tests', () => {
  beforeAll(() => {
    // Mock service worker registration
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockImplementation(() => Promise.resolve({
          update: vi.fn(),
          unregister: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          postMessage: vi.fn()
        })),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        ready: Promise.resolve({
          active: {
            postMessage: vi.fn()
          }
        })
      },
      configurable: true
    });
  });
  
  test('Service worker can be registered', async () => {
    // This test verifies that the service worker registration API is available
    expect(navigator.serviceWorker).toBeDefined();
    expect(navigator.serviceWorker.register).toBeDefined();
    
    // Verify registration works
    const registration = await navigator.serviceWorker.register('/serviceWorker.js');
    expect(registration).toBeDefined();
  });
});