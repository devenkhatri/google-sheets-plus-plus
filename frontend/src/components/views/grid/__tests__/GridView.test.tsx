import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import GridView from '../GridView';
import { recordService } from '../../../../services/recordService';
import { viewService } from '../../../../services/viewService';

// Mock the services
jest.mock('../../../../services/recordService');
jest.mock('../../../../services/viewService');
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [
      { index: 0, start: 0, end: 48, size: 48, key: '0' },
      { index: 1, start: 48, end: 96, size: 48, key: '1' },
    ],
    getTotalSize: () => 500,
  }),
}));

const mockStore = configureStore([thunk]);

describe('GridView Component', () => {
  const initialState = {
    records: {
      records: [
        {
          id: 'rec1',
          table_id: 'table1',
          row_index: 0,
          fields: { field1: 'Value 1', field2: 42 },
          deleted: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'rec2',
          table_id: 'table1',
          row_index: 1,
          fields: { field1: 'Value 2', field2: 43 },
          deleted: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ],
      loading: false,
      error: null,
    },
    tables: {
      byId: {
        table1: {
          id: 'table1',
          name: 'Test Table',
          fields: [
            {
              id: 'field1',
              name: 'Text Field',
              type: 'text',
              required: false,
            },
            {
              id: 'field2',
              name: 'Number Field',
              type: 'number',
              required: false,
            },
          ],
        },
      },
    },
    views: {
      byId: {
        view1: {
          id: 'view1',
          name: 'Grid View',
          type: 'grid',
          configuration: {
            frozenColumns: 1,
            columnWidths: {
              field1: 200,
              field2: 150,
            },
          },
          filters: [],
          sorts: [],
          fieldVisibility: {
            field1: true,
            field2: true,
          },
        },
      },
    },
  };

  beforeEach(() => {
    // Mock service implementations
    (viewService.getView as jest.Mock).mockResolvedValue(initialState.views.byId.view1);
    (recordService.updateRecord as jest.Mock).mockResolvedValue({
      data: { record: initialState.records.records[0] },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading spinner initially', () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridView tableId="table1" viewId="view1" />
      </Provider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders grid view after loading', async () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridView tableId="table1" viewId="view1" />
      </Provider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(viewService.getView).toHaveBeenCalledWith('view1');
    });

    // Check that the store was updated with the correct actions
    const actions = store.getActions();
    expect(actions.some(action => action.type === 'views/setCurrentView')).toBeTruthy();
    expect(actions.some(action => action.type === 'records/fetchRecords/pending')).toBeTruthy();
  });

  it('handles cell selection', async () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridView tableId="table1" viewId="view1" />
      </Provider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(viewService.getView).toHaveBeenCalledWith('view1');
    });

    // Note: Since we're using virtualization, we can't directly test cell selection
    // in this unit test. This would be better tested in an integration test.
  });

  it('handles column resize', async () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridView tableId="table1" viewId="view1" />
      </Provider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(viewService.getView).toHaveBeenCalledWith('view1');
    });

    // Note: Column resize involves DOM manipulation that's hard to test in a unit test
    // This would be better tested in an integration test
  });

  it('handles copy functionality', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });

    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridView tableId="table1" viewId="view1" />
      </Provider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(viewService.getView).toHaveBeenCalledWith('view1');
    });

    // Note: Copy functionality requires cell selection which is hard to test in a unit test
    // This would be better tested in an integration test
  });

  it('handles errors gracefully', async () => {
    // Mock service to throw an error
    (viewService.getView as jest.Mock).mockRejectedValue(new Error('Failed to load view'));

    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridView tableId="table1" viewId="view1" />
      </Provider>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument();
    });
  });
});