import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarEvent from '../CalendarEvent';

describe('CalendarEvent', () => {
  const mockOnClick = jest.fn();
  
  const defaultProps = {
    id: 'event1',
    title: 'Team Meeting',
    start: new Date(2023, 0, 15, 10, 0), // January 15, 2023, 10:00 AM
    end: new Date(2023, 0, 15, 11, 0), // January 15, 2023, 11:00 AM
    onClick: mockOnClick
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<CalendarEvent {...defaultProps} />);
    
    // Check if the title is rendered with time
    expect(screen.getByText(/10:00 AM - 11:00 AM Team Meeting/)).toBeInTheDocument();
  });

  it('renders correctly for multi-day events', () => {
    render(<CalendarEvent {...defaultProps} isMultiDay={true} />);
    
    // For multi-day events, only the title should be shown without time
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.queryByText(/10:00 AM - 11:00 AM/)).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(<CalendarEvent {...defaultProps} />);
    
    // Find and click the event
    fireEvent.click(screen.getByText(/10:00 AM - 11:00 AM Team Meeting/));
    
    // Check if onClick was called with the event id
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockOnClick).toHaveBeenCalledWith('event1');
  });

  it('renders with custom color', () => {
    const { container } = render(<CalendarEvent {...defaultProps} color="#ff0000" />);
    
    // Check if the background color is applied
    // Note: This is a simplified check, in a real test you might want to use
    // getComputedStyle or a more robust way to check styles
    expect(container.firstChild).toHaveStyle('background-color: rgba(255, 0, 0, 0.8)');
  });

  it('renders with recurring indicator for recurring events', () => {
    const { container } = render(<CalendarEvent {...defaultProps} isRecurring={true} />);
    
    // Check if the recurring indicator is present
    // This is a simplified check, in a real test you might want to check for the specific CSS
    const eventElement = container.firstChild as HTMLElement;
    expect(eventElement).toHaveStyle('position: relative');
    
    // The recurring indicator is a pseudo-element, which is hard to test directly
    // In a real test, you might want to check for a specific class or data attribute
  });

  it('renders with correct border radius for partial multi-day events', () => {
    // Test start of multi-day event
    const { rerender } = render(
      <CalendarEvent {...defaultProps} isMultiDay={true} isStart={true} isEnd={false} />
    );
    
    // Check if only the left corners have border radius
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-top-left-radius: 4px');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-bottom-left-radius: 4px');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-top-right-radius: 0');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-bottom-right-radius: 0');
    
    // Test middle of multi-day event
    rerender(
      <CalendarEvent {...defaultProps} isMultiDay={true} isStart={false} isEnd={false} />
    );
    
    // Check if no corners have border radius
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-top-left-radius: 0');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-bottom-left-radius: 0');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-top-right-radius: 0');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-bottom-right-radius: 0');
    
    // Test end of multi-day event
    rerender(
      <CalendarEvent {...defaultProps} isMultiDay={true} isStart={false} isEnd={true} />
    );
    
    // Check if only the right corners have border radius
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-top-left-radius: 0');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-bottom-left-radius: 0');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-top-right-radius: 4px');
    expect(screen.getByText('Team Meeting').parentElement).toHaveStyle('border-bottom-right-radius: 4px');
  });
});