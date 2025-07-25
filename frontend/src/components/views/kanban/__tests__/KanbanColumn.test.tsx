import React from 'react';
import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import KanbanColumn from '../KanbanColumn';

// Mock data
const mockRecords = [
  {
    id: 'rec123',
    table_id: 'tbl123',
    fields: {
      'fld1': 'Test Title 1',
      'fld2': 'Test Description 1',
      'fld5': 'option1',
    },
    row_index: 0,
  },
  {
    id: 'rec456',
    table_id: 'tbl123',
    fields: {
      'fld1': 'Test Title 2',
      'fld2': 'Test Description 2',
      'fld5': 'option1',
    },
    row_index: 1,
  },
];

const mockFields = [
  { id: 'fld1', name: 'Title', type: 'text' },
  { id: 'fld2', name: 'Description', type: 'text' },
  { id: 'fld5', name: 'Status', type: 'singleSelect', options: {
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

describe('KanbanColumn', () => {
  it('renders the column with title and record count', () => {
    const handleCardClick = vi.fn();
    const handleCardMove = vi.fn();
    
    render(
      <DndWrapper>
        <KanbanColumn
          title="To Do"
          color="#ff0000"
          records={mockRecords}
          fields={mockFields}
          displayFields={['fld1', 'fld2']}
          groupByField="fld5"
          onCardClick={handleCardClick}
          onCardMove={handleCardMove}
          columnValue="option1"
        />
      </DndWrapper>
    );
    
    // Check if column title is rendered
    expect(screen.getByText('To Do')).toBeInTheDocument();
    
    // Check if record count badge is rendered (2)
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Check if cards are rendered
    expect(screen.getByText('Test Title 1')).toBeInTheDocument();
    expect(screen.getByText('Test Title 2')).toBeInTheDocument();
  });
  
  it('renders empty state when no records', () => {
    const handleCardClick = vi.fn();
    const handleCardMove = vi.fn();
    
    render(
      <DndWrapper>
        <KanbanColumn
          title="To Do"
          records={[]}
          fields={mockFields}
          displayFields={['fld1', 'fld2']}
          groupByField="fld5"
          onCardClick={handleCardClick}
          onCardMove={handleCardMove}
          columnValue="option1"
        />
      </DndWrapper>
    );
    
    // Check if empty state message is rendered
    expect(screen.getByText('Drop cards here')).toBeInTheDocument();
  });
});