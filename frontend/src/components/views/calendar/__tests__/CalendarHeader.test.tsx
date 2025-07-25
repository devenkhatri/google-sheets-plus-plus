import React from 'react';
import { render, screen } from '@testing-library/react';
import CalendarHeader from '../CalendarHeader';
import { format } from 'date-fns';

describe('CalendarHeader', () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  it('renders day view correctly', () => {
    const dates = [today];
    render(<CalendarHeader dates={dates} viewType="day" />);
    
    // Check if the day name is rendered
    expect(screen.getByText(format(today, 'EEEE'))).toBeInTheDocument();
    
    // Check if the day number is rendered
    expect(screen.getByText(format(today, 'd'))).toBeInTheDocument();
    
    // Check if the month and year are rendered
    expect(screen.getByText(format(today, 'MMM yyyy'))).toBeInTheDocument();
  });

  it('renders week view correctly', () => {
    const dates = [yesterday, today, tomorrow];
    render(<CalendarHeader dates={dates} viewType="week" />);
    
    // Check if all day names are rendered
    expect(screen.getByText(format(yesterday, 'EEEE'))).toBeInTheDocument();
    expect(screen.getByText(format(today, 'EEEE'))).toBeInTheDocument();
    expect(screen.getByText(format(tomorrow, 'EEEE'))).toBeInTheDocument();
    
    // Check if all day numbers are rendered
    expect(screen.getByText(format(yesterday, 'd'))).toBeInTheDocument();
    expect(screen.getByText(format(today, 'd'))).toBeInTheDocument();
    expect(screen.getByText(format(tomorrow, 'd'))).toBeInTheDocument();
    
    // Check if all month and year labels are rendered
    expect(screen.getByText(format(yesterday, 'MMM yyyy'))).toBeInTheDocument();
    expect(screen.getByText(format(today, 'MMM yyyy'))).toBeInTheDocument();
    expect(screen.getByText(format(tomorrow, 'MMM yyyy'))).toBeInTheDocument();
  });

  it('renders month view correctly', () => {
    const dates = [yesterday, today, tomorrow];
    render(<CalendarHeader dates={dates} viewType="month" />);
    
    // Check if all abbreviated day names are rendered
    expect(screen.getByText(format(yesterday, 'EEE'))).toBeInTheDocument();
    expect(screen.getByText(format(today, 'EEE'))).toBeInTheDocument();
    expect(screen.getByText(format(tomorrow, 'EEE'))).toBeInTheDocument();
    
    // Check if all day numbers are rendered
    expect(screen.getByText(format(yesterday, 'd'))).toBeInTheDocument();
    expect(screen.getByText(format(today, 'd'))).toBeInTheDocument();
    expect(screen.getByText(format(tomorrow, 'd'))).toBeInTheDocument();
    
    // Check that month and year are NOT rendered in month view
    expect(screen.queryByText(format(today, 'MMM yyyy'))).not.toBeInTheDocument();
  });

  it('highlights today with primary color', () => {
    const dates = [yesterday, today, tomorrow];
    const { container } = render(<CalendarHeader dates={dates} viewType="week" />);
    
    // Find all day number elements
    const dayElements = container.querySelectorAll('h6');
    
    // Find the element for today
    const todayElement = Array.from(dayElements).find(
      el => el.textContent === format(today, 'd')
    );
    
    // Check if today's element has the primary color
    expect(todayElement).toHaveStyle('color: primary.main');
    
    // Check if today's element has bold font weight
    expect(todayElement).toHaveStyle('font-weight: bold');
  });
});