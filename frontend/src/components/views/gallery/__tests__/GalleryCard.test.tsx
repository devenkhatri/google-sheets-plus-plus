import React from 'react';
import { render, screen, fireEvent } from '../../../../test-utils';
import { GalleryCard } from '../index';

// Mock data
const mockFields = [
  { id: 'field1', name: 'Image', type: 'attachment', options: {}, required: false },
  { id: 'field2', name: 'Title', type: 'text', options: {}, required: true },
  { id: 'field3', name: 'Description', type: 'text', options: {}, required: false },
  { id: 'field4', name: 'Date', type: 'date', options: {}, required: false },
  { id: 'field5', name: 'Status', type: 'singleSelect', options: { choices: [{ value: 'active', label: 'Active' }] }, required: false },
  { id: 'field6', name: 'Tags', type: 'multiSelect', options: { choices: [{ value: 'tag1', label: 'Tag 1' }] }, required: false },
  { id: 'field7', name: 'Complete', type: 'checkbox', options: {}, required: false },
];

const mockRecord = {
  id: 'rec1',
  table_id: 'table1',
  row_index: 0,
  fields: {
    field1: [{ url: 'https://example.com/image.jpg', thumbnailUrl: 'https://example.com/thumb.jpg', filename: 'image.jpg' }],
    field2: 'Test Record',
    field3: 'This is a test description',
    field4: '2023-01-01',
    field5: 'active',
    field6: ['tag1', 'tag2'],
    field7: true,
  },
  deleted: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

describe('GalleryCard', () => {
  const mockOnClick = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders card with image and title', () => {
    render(
      <GalleryCard
        record={mockRecord}
        fields={mockFields}
        imageField="field1"
        titleField="field2"
        displayFields={['field2', 'field3']}
        onClick={mockOnClick}
      />
    );
    
    expect(screen.getByText('Test Record')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
    
    // Image should be present with correct alt text
    const image = screen.getByAltText('Test Record');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toBe('https://example.com/thumb.jpg');
  });
  
  it('calls onClick when card is clicked', () => {
    render(
      <GalleryCard
        record={mockRecord}
        fields={mockFields}
        imageField="field1"
        titleField="field2"
        displayFields={['field2', 'field3']}
        onClick={mockOnClick}
      />
    );
    
    fireEvent.click(screen.getByText('Test Record'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
  
  it('shows "No image" when image field is empty', () => {
    const recordWithoutImage = {
      ...mockRecord,
      fields: {
        ...mockRecord.fields,
        field1: [],
      },
    };
    
    render(
      <GalleryCard
        record={recordWithoutImage}
        fields={mockFields}
        imageField="field1"
        titleField="field2"
        displayFields={['field2', 'field3']}
        onClick={mockOnClick}
      />
    );
    
    expect(screen.getByText('No image')).toBeInTheDocument();
  });
  
  it('formats different field types correctly', () => {
    render(
      <GalleryCard
        record={mockRecord}
        fields={mockFields}
        imageField="field1"
        titleField="field2"
        displayFields={['field4', 'field5', 'field6', 'field7']}
        onClick={mockOnClick}
      />
    );
    
    // Date field
    expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument();
    
    // Single select field
    expect(screen.getByText('active')).toBeInTheDocument();
    
    // Multi select field
    expect(screen.getByText('tag1, tag2')).toBeInTheDocument();
    
    // Checkbox field
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });
  
  it('shows "Untitled" when title field is empty', () => {
    const recordWithoutTitle = {
      ...mockRecord,
      fields: {
        ...mockRecord.fields,
        field2: null,
      },
    };
    
    render(
      <GalleryCard
        record={recordWithoutTitle}
        fields={mockFields}
        imageField="field1"
        titleField="field2"
        displayFields={['field2', 'field3']}
        onClick={mockOnClick}
      />
    );
    
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});