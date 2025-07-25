import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import GridToolbar from '../GridToolbar';
import { recordService } from '../../../../services/recordService';
import { viewService } from '../../../../services/viewService';

// Mock services
jest.mock('../../../../services/recordService');
jest.mock('../../../../services/viewService');

const mockStore = configureStore([thunk]);

describe('GridToolbar Component', () => {
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
          tableId: 'table1',
          name: 'Grid View',
          type: 'grid',
          configuration: {},
          filters: [],
          sorts: [],
          fieldVisibility: {},
        },
      },
    },
  };

  const defaultProps = {
    tableId: 'table1',
    viewId: 'view1',
    onRefresh: jest.fn(),
    selectedCells: null,
    onCopy: jest.fn(),
  };

  beforeEach(() => {
    (recordService.createRecord as jest.Mock).mockResolvedValue({
      data: {
        record: {
          id: 'rec3',
          table_id: 'table1',
          row_index: 2,
          fields: {},
          deleted: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      },
    });
    
    (viewService.updateViewFilters as jest.Mock).mockResolvedValue({});
    (viewService.updateViewSorts as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders toolbar with buttons', () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridToolbar {...defaultProps} />
      </Provider>
    );
    
    expect(screen.getByText('Add record')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('handles add record button click', async () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridToolbar {...defaultProps} />
      </Provider>
    );
    
    fireEvent.click(screen.getByText('Add record'));
    
    await waitFor(() => {
      expect(recordService.createRecord).toHaveBeenCalledWith('table1', {});
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  it('handles search input', () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridToolbar {...defaultProps} />
      </Provider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    expect(searchInput).toHaveValue('test search');
  });

  it('shows copy button when cells are selected', () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridToolbar 
          {...defaultProps} 
          selectedCells={{ startRow: 0, startCol: 0, endRow: 1, endCol: 1 }}
        />
      </Provider>
    );
    
    // Find the copy button by its icon
    const copyButton = screen.getByLabelText('Copy');
    expect(copyButton).toBeInTheDocument();
    
    // Click the copy button
    fireEvent.click(copyButton);
    expect(defaultProps.onCopy).toHaveBeenCalled();
  });

  it('opens filter dialog when filter button is clicked', () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridToolbar {...defaultProps} />
      </Provider>
    );
    
    // Click the filter button
    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);
    
    // Filter dialog should be open
    expect(screen.getByText('Filter Records')).toBeInTheDocument();
    expect(screen.getByText('Add filter')).toBeInTheDocument();
  });

  it('opens sort dialog when sort button is clicked', () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridToolbar {...defaultProps} />
      </Provider>
    );
    
    // Click the sort button
    const sortButton = screen.getByLabelText('Sort');
    fireEvent.click(sortButton);
    
    // Sort dialog should be open
    expect(screen.getByText('Sort Records')).toBeInTheDocument();
    expect(screen.getByText('Add sort')).toBeInTheDocument();
  });

  it('applies filters when filter dialog is submitted', async () => {
    const store = mockStore(initialState);
    render(
      <Provider store={store}>
        <GridToolbar {...defaultProps} />
      </Provider>
    );
    
    // Open filter dialog
    const filterButton = screen.getByLabelText('Filter');
    fireEvent.click(filterButton);
    
    // Add a filter
    fireEvent.click(screen.getByText('Add filter'));
    
    // Apply filters
    fireEvent.click(screen.getByText('Apply Filters'));
    
    await waitFor(() => {
      expect(viewService.updateViewFilters).toHaveBeenCalled();
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });
});