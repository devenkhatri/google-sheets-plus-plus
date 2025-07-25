import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarToolbar from '../CalendarToolbar';

describe('CalendarToolbar', () => {
  const mockDateChange = jest.fn();
  const mockViewTypeChange = jest.fn();
  const mockFilterClick = jest.fn();
  const mockSortClick = jest.fn();
  const mockDateFieldChange = jest.fn();
  
  const defaultProps = {
    currentDate: new Date(2023, 0, 15), // January 15, 2023
    viewType: 'month' as const,
    onDateChange: mockDateChange,
    onViewTypeChange: mockViewTypeChange,
    onFilterClick: mockFilterClick,
    onSortClick: mockSortClick,
    dateField: 'date1',
    availableDateFields: [
      { id: 'date1', name: 'Start Date' },
      { id: 'date2', name: 'Due Date' }
    ],
    onDateFieldChange: mockDateFieldChange
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all props', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Check if the date field button is rendered
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    
    // Check if the Today button is rendered
    expect(screen.getByText('Today')).toBeInTheDocument();
    
    // Check if the date range is rendered
    expect(screen.getByText('January 2023')).toBeInTheDocument();
    
    // Check if view type buttons are rendered
    expect(screen.getByTitle('Day view')).toBeInTheDocument();
    expect(screen.getByTitle('Week view')).toBeInTheDocument();
    expect(screen.getByTitle('Month view')).toBeInTheDocument();
    
    // Check if filter and sort buttons are rendered
    expect(screen.getByTitle('Filter')).toBeInTheDocument();
    expect(screen.getByTitle('Sort')).toBeInTheDocument();
  });

  it('calls onDateChange when previous button is clicked', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Find and click the previous button
    const prevButton = screen.getAllByRole('button')[1]; // First button after the date field button
    fireEvent.click(prevButton);
    
    // Check if onDateChange was called with the previous month
    expect(mockDateChange).toHaveBeenCalledTimes(1);
    const newDate = mockDateChange.mock.calls[0][0];
    expect(newDate.getMonth()).toBe(11); // December (0-based)
    expect(newDate.getFullYear()).toBe(2022);
  });

  it('calls onDateChange when next button is clicked', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Find and click the next button
    const nextButton = screen.getAllByRole('button')[3]; // Button after the date display
    fireEvent.click(nextButton);
    
    // Check if onDateChange was called with the next month
    expect(mockDateChange).toHaveBeenCalledTimes(1);
    const newDate = mockDateChange.mock.calls[0][0];
    expect(newDate.getMonth()).toBe(1); // February (0-based)
    expect(newDate.getFullYear()).toBe(2023);
  });

  it('calls onDateChange with today when Today button is clicked', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Find and click the Today button
    fireEvent.click(screen.getByText('Today'));
    
    // Check if onDateChange was called with today's date
    expect(mockDateChange).toHaveBeenCalledTimes(1);
    const today = new Date();
    const newDate = mockDateChange.mock.calls[0][0];
    expect(newDate.getDate()).toBe(today.getDate());
    expect(newDate.getMonth()).toBe(today.getMonth());
    expect(newDate.getFullYear()).toBe(today.getFullYear());
  });

  it('calls onViewTypeChange when view type is changed', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Find and click the day view button
    fireEvent.click(screen.getByTitle('Day view'));
    
    // Check if onViewTypeChange was called with 'day'
    expect(mockViewTypeChange).toHaveBeenCalledTimes(1);
    expect(mockViewTypeChange).toHaveBeenCalledWith('day');
  });

  it('calls onFilterClick when filter button is clicked', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Find and click the filter button
    fireEvent.click(screen.getByTitle('Filter'));
    
    // Check if onFilterClick was called
    expect(mockFilterClick).toHaveBeenCalledTimes(1);
  });

  it('calls onSortClick when sort button is clicked', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Find and click the sort button
    fireEvent.click(screen.getByTitle('Sort'));
    
    // Check if onSortClick was called
    expect(mockSortClick).toHaveBeenCalledTimes(1);
  });

  it('shows date field menu when date field button is clicked', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Find and click the date field button
    fireEvent.click(screen.getByText('Start Date'));
    
    // Check if the menu items are rendered
    expect(screen.getByText('Due Date')).toBeInTheDocument();
  });

  it('calls onDateFieldChange when a date field is selected', () => {
    render(<CalendarToolbar {...defaultProps} />);
    
    // Find and click the date field button
    fireEvent.click(screen.getByText('Start Date'));
    
    // Find and click the second date field option
    fireEvent.click(screen.getByText('Due Date'));
    
    // Check if onDateFieldChange was called with the correct field id
    expect(mockDateFieldChange).toHaveBeenCalledTimes(1);
    expect(mockDateFieldChange).toHaveBeenCalledWith('date2');
  });

  it('displays different date formats based on view type', () => {
    // Test month view
    render(<CalendarToolbar {...defaultProps} viewType="month" />);
    expect(screen.getByText('January 2023')).toBeInTheDocument();
    
    // Test week view
    render(<CalendarToolbar {...defaultProps} viewType="week" />);
    // The exact text will depend on the week, but we can check for a date range format
    expect(screen.getByText(/January \d+ - \d+, 2023/)).toBeInTheDocument();
    
    // Test day view
    render(<CalendarToolbar {...defaultProps} viewType="day" />);
    expect(screen.getByText('January 15, 2023')).toBeInTheDocument();
  });
});