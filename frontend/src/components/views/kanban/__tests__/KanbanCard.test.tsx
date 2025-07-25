import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import KanbanCard from '../KanbanCard';

// Mock data
const mockRecord = {
  id: 'rec123',
  table_id: 'tbl123',
  fields: {
    'fld1': 'Test Title',
    'fld2': 'Test Description',
    'fld3': true,
    'fld4': '2023-01-01',
    'fld5': 'option1',
    'fld6': ['option1', 'option2'],
  },
  row_index: 0,
};

const mockFields = [
  { id: 'fld1', name: 'Title', type: 'text' },
  { id: 'fld2', name: 'Description', type: 'text' },
  { id: 'fld3', name: 'Completed', type: 'checkbox' },
  { id: 'fld4', name: 'Due Date', type: 'date' },
  { id: 'fld5', name: 'Status', type: 'singleSelect', options: {
    choices: [
      { value: 'option1', label: 'Option 1', color: '#ff0000' },
      { value: 'option2', label: 'Option 2', color: '#00ff00' },
    ]
  }},
  { id: 'fld6', name: 'Tags', type: 'multiSelect', options: {
    choices: [
      { value: 'option1', label: 'Option 1', color: '#ff0000' },
      { value: 'option2', label: 'Option 2', color: '#00ff00' },
    ]
  }},
];

// Wrapper component for DnD testing
const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
);

describe('KanbanCard', () => {
  it('renders the card with title and fields', () => {
    const handleClick = vi.fn();
    
    render(
      <DndWrapper>
        <KanbanCard
          record={mockRecord}
          fields={mockFields}
          displayFields={['fld1', 'fld2', 'fld3']}
          groupByField="fld5"
          onClick={handleClick}
        />
      </DndWrapper>
    );
    
    // Check if title is rendered
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    
    // Check if description is rendered
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    
    // Check if checkbox field is rendered
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    
    render(
      <DndWrapper>
        <KanbanCard
          record={mockRecord}
          fields={mockFields}
          displayFields={['fld1', 'fld2']}
          groupByField="fld5"
          onClick={handleClick}
        />
      </DndWrapper>
    );
    
    // Click the card
    fireEvent.click(screen.getByText('Test Title'));
    
    // Check if onClick was called with the record ID
    expect(handleClick).toHaveBeenCalledWith('rec123');
  });
  
  it('renders single select field as a chip', () => {
    render(
      <DndWrapper>
        <KanbanCard
          record={mockRecord}
          fields={mockFields}
          displayFields={['fld1', 'fld5']}
          groupByField="fld5"
        />
      </DndWrapper>
    );
    
    // Check if status field is rendered
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });
  
  it('renders multi select field as multiple chips', () => {
    render(
      <DndWrapper>
        <KanbanCard
          record={mockRecord}
          fields={mockFields}
          displayFields={['fld1', 'fld6']}
          groupByField="fld5"
        />
      </DndWrapper>
    );
    
    // Check if tags field is rendered
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });
});