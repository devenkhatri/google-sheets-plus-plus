import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../../test-utils';
import { GalleryView } from '../index';
import { viewService } from '../../../../services/viewService';
import { recordService } from '../../../../services/recordService';

// Mock the services
jest.mock('../../../../services/viewService');
jest.mock('../../../../services/recordService');

// Mock data
const mockTableId = 'table123';
const mockViewId = 'view456';
const mockView = {
  id: mockViewId,
  tableId: mockTableId,
  name: 'Gallery View',
  type: 'gallery',
  configuration: {
    imageField: 'field1',
    titleField: 'field2',
    cardFields: ['field2', 'field3', 'field4'],
    cardSize: 'medium',
  },
  filters: [],
  sorts: [],
  fieldVisibility: {},
};

const mockFields = [
  { id: 'field1', name: 'Image', type: 'attachment', options: {}, required: false },
  { id: 'field2', name: 'Title', type: 'text', options: {}, required: true },
  { id: 'field3', name: 'Description', type: 'text', options: {}, required: false },
  { id: 'field4', name: 'Date', type: 'date', options: {}, required: false },
];

const mockRecords = [
  {
    id: 'rec1',
    table_id: mockTableId,
    row_index: 0,
    fields: {
      field1: [{ url: 'https://example.com/image1.jpg', thumbnailUrl: 'https://example.com/thumb1.jpg', filename: 'image1.jpg' }],
      field2: 'Record 1',
      field3: 'Description 1',
      field4: '2023-01-01',
    },
    deleted: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'rec2',
    table_id: mockTableId,
    row_index: 1,
    fields: {
      field1: [{ url: 'https://example.com/image2.jpg', thumbnailUrl: 'https://example.com/thumb2.jpg', filename: 'image2.jpg' }],
      field2: 'Record 2',
      field3: 'Description 2',
      field4: '2023-01-02',
    },
    deleted: false,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
];

// Mock the Redux state
const mockState = {
  records: {
    records: mockRecords,
    loading: false,
    error: null,
  },
  tables: {
    byId: {
      [mockTableId]: {
        fields: mockFields,
      },
    },
  },
  views: {
    byId: {
      [mockViewId]: mockView,
    },
  },
};

describe('GalleryView', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    (viewService.getView as jest.Mock).mockResolvedValue(mockView);
  });
  
  it('renders loading state initially', () => {
    render(<GalleryView tableId={mockTableId} viewId={mockViewId} />, { preloadedState: mockState });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('renders gallery cards when data is loaded', async () => {
    render(<GalleryView tableId={mockTableId} viewId={mockViewId} />, { preloadedState: mockState });
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check if cards are rendered
    expect(screen.getByText('Record 1')).toBeInTheDocument();
    expect(screen.getByText('Record 2')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
  });
  
  it('filters records when search is performed', async () => {
    render(<GalleryView tableId={mockTableId} viewId={mockViewId} />, { preloadedState: mockState });
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Enter search term
    const searchInput = screen.getByPlaceholderText('Search records...');
    fireEvent.change(searchInput, { target: { value: 'Record 1' } });
    
    // Check if only matching record is shown
    expect(screen.getByText('Record 1')).toBeInTheDocument();
    expect(screen.queryByText('Record 2')).not.toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // Check if all records are shown again
    expect(screen.getByText('Record 1')).toBeInTheDocument();
    expect(screen.getByText('Record 2')).toBeInTheDocument();
  });
  
  it('shows message when no attachment fields are available', async () => {
    const stateWithoutAttachments = {
      ...mockState,
      tables: {
        byId: {
          [mockTableId]: {
            fields: mockFields.filter(field => field.type !== 'attachment'),
          },
        },
      },
    };
    
    render(<GalleryView tableId={mockTableId} viewId={mockViewId} />, { preloadedState: stateWithoutAttachments });
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Check if message is shown
    expect(screen.getByText(/Gallery view works best with attachment fields/)).toBeInTheDocument();
  });
  
  it('shows message when no records match search', async () => {
    render(<GalleryView tableId={mockTableId} viewId={mockViewId} />, { preloadedState: mockState });
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    
    // Enter search term that won't match any records
    const searchInput = screen.getByPlaceholderText('Search records...');
    fireEvent.change(searchInput, { target: { value: 'No Match' } });
    
    // Check if no records message is shown
    expect(screen.getByText('No records match your search.')).toBeInTheDocument();
  });
});