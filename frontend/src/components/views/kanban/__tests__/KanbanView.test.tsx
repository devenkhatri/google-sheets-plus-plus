import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { viewService } from '../../../../services/viewService';
import KanbanView from '../KanbanView';

// Mock dependencies
vi.mock('../../../../services/viewService');
vi.mock('../../../../services/recordService');

// Mock store
const mockStore = configureStore([thunk]);

// Mock data
const mockFields = [
  { id: 'fld1', name: 'Title', type: 'text' },
  { id: 'fld2', name: 'Description', type: 'text' },
  { id: 'fld5', name: 'Status', type: 'singleSelect', options: {
    choices: [
      { value: 'option1', label: 'To Do', color: '#ff0000' },
      { value: 'option2', label: 'In Progress', color: '#00ff00' },
      { value: 'option3', label: 'Done', color: '#0000ff' },
    ]
  }},
];

const mockRecords = [
  {
    id: 'rec123',
    table_id: 'tbl123',
    fields: {
      'fld1': 'Task 1',
      'fld2': 'Description 1',
      'fld5': 'option1',
    },
    row_index: 0,
    deleted: false,
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
  },
  {
    id: 'rec456',
    table_id: 'tbl123',
    fields: {
      'fld1': 'Task 2',
      'fld2': 'Description 2',
      'fld5': 'option2',
    },
    row_index: 1,
    deleted: false,
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
  },
  {
    id: 'rec789',
    table_id: 'tbl123',
    fields: {
      'fld1': 'Task 3',
      'fld2': 'Description 3',
      'fld5': 'option3',
    },
    row_index: 2,
    deleted: false,
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
  },
];

const mockView = {
  id: 'view123',
  tableId: 'tbl123',
  name: 'Kanban View',
  type: 'kanban',
  filters: [],
  sorts: [],
  fieldVisibility: {},
  configuration: {
    groupByField: 'fld5',
    cardFields: ['fld1', 'fld2'],
  },
};

describe('KanbanView', () => {
  beforeEach(() => {
    // Mock viewService.getView
    (viewService.getView as jest.Mock).mockResolvedValue(mockView);
  });
  
  it('renders loading state initially', () => {
    const store = mockStore({
      records: { records: [] },
      tables: { byId: { 'tbl123': { fields: mockFields } } },
      views: { byId: {} },
    });
    
    render(
      <Provider store={store}>
        <KanbanView tableId="tbl123" viewId="view123" />
      </Provider>
    );
    
    // Check if loading spinner is rendered
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('renders kanban columns when data is loaded', async () => {
    const store = mockStore({
      records: { records: mockRecords },
      tables: { byId: { 'tbl123': { fields: mockFields } } },
      views: { byId: { 'view123': mockView } },
    });
    
    render(
      <Provider store={store}>
        <KanbanView tableId="tbl123" viewId="view123" />
      </Provider>
    );
    
    // Wait for data to load
    await waitFor(() => {
      // Check if column titles are rendered
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
      
      // Check if cards are rendered
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });
  });
  
  it('shows error message when no single select field is available', async () => {
    const store = mockStore({
      records: { records: mockRecords },
      tables: { byId: { 'tbl123': { fields: [
        { id: 'fld1', name: 'Title', type: 'text' },
        { id: 'fld2', name: 'Description', type: 'text' },
      ] } } },
      views: { byId: { 'view123': {
        ...mockView,
        configuration: {
          ...mockView.configuration,
          groupByField: '',
        },
      } } },
    });
    
    render(
      <Provider store={store}>
        <KanbanView tableId="tbl123" viewId="view123" />
      </Provider>
    );
    
    // Wait for data to load
    await waitFor(() => {
      // Check if error message is rendered
      expect(screen.getByText(/requires a single select field/i)).toBeInTheDocument();
    });
  });
});