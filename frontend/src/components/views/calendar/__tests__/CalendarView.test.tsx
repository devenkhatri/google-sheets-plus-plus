import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import CalendarView from '../CalendarView';
import { format } from 'date-fns';

// Mock redux store
const mockStore = configureStore([]);

describe('CalendarView', () => {
  const today = new Date();
  
  // Create mock store with necessary data
  const createStore = (customState = {}) => {
    const defaultState = {
      views: {
        views: [
          {
            id: 'view1',
            tableId: 'table1',
            name: 'Calendar View',
            type: 'calendar',
            filters: [],
            sorts: [],
            fieldVisibility: {},
            configuration: {
              dateField: 'date1',
              colorField: 'status'
            }
          }
        ],
        currentView: null,
        loading: false,
        error: null
      },
      tables: {
        tables: [
          {
            id: 'table1',
            name: 'Tasks',
            fields: [
              {
                id: 'title1',
                name: 'Task Name',
                type: 'text'
              },
              {
                id: 'date1',
                name: 'Due Date',
                type: 'date'
              },
              {
                id: 'status',
                name: 'Status',
                type: 'singleSelect',
                options: {
                  choices: [
                    { value: 'todo', label: 'To Do', color: '#ff0000' },
                    { value: 'inProgress', label: 'In Progress', color: '#ffff00' },
                    { value: 'done', label: 'Done', color: '#00ff00' }
                  ]
                }
              }
            ]
          }
        ]
      },
      records: {
        records: [
          {
            id: 'record1',
            tableId: 'table1',
            fields: {
              title1: 'Complete project',
              date1: today.toISOString(),
              status: 'inProgress'
            }
          },
          {
            id: 'record2',
            tableId: 'table1',
            fields: {
              title1: 'Team meeting',
              date1: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
              status: 'todo'
            }
          }
        ]
      }
    };
    
    return mockStore({
      ...defaultState,
      ...customState
    });
  };

  it('renders correctly with default view type (month)', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <CalendarView viewId="view1" tableId="table1" />
      </Provider>
    );
    
    // Check if the toolbar is rendered
    expect(screen.getByText('Today')).toBeInTheDocument();
    
    // Check if the current month is displayed
    expect(screen.getByText(format(today, 'MMMM yyyy'))).toBeInTheDocument();
    
    // Check if at least one event is rendered
    expect(screen.getByText('Complete project')).toBeInTheDocument();
  });

  it('changes view type when toolbar buttons are clicked', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <CalendarView viewId="view1" tableId="table1" />
      </Provider>
    );
    
    // Switch to week view
    fireEvent.click(screen.getByTitle('Week view'));
    
    // Check if week view is rendered (should show full day names)
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
    
    // Switch to day view
    fireEvent.click(screen.getByTitle('Day view'));
    
    // Check if day view is rendered (should show hours)
    expect(screen.getByText('12 AM')).toBeInTheDocument();
    expect(screen.getByText('12 PM')).toBeInTheDocument();
  });

  it('navigates between dates when navigation buttons are clicked', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <CalendarView viewId="view1" tableId="table1" />
      </Provider>
    );
    
    // Get the current month/year text
    const currentMonthYear = format(today, 'MMMM yyyy');
    
    // Click the next button
    const nextButton = screen.getAllByRole('button').find(
      button => button.getAttribute('aria-label') === 'next' || 
                button.textContent === 'next' ||
                button.querySelector('svg[data-testid="ChevronRightIcon"]')
    );
    
    if (nextButton) {
      fireEvent.click(nextButton);
      
      // Check if the month has changed
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      expect(screen.getByText(format(nextMonth, 'MMMM yyyy'))).toBeInTheDocument();
    }
  });

  it('displays events with correct colors based on field values', () => {
    const store = createStore();
    const { container } = render(
      <Provider store={store}>
        <CalendarView viewId="view1" tableId="table1" />
      </Provider>
    );
    
    // Find the event elements
    const eventElements = container.querySelectorAll('[role="button"]');
    
    // Check if at least one event has the expected background color
    // This is a simplified check, in a real test you might want to use
    // getComputedStyle or a more robust way to check styles
    const hasYellowEvent = Array.from(eventElements).some(
      el => window.getComputedStyle(el).backgroundColor.includes('255, 255, 0')
    );
    
    expect(hasYellowEvent).toBeTruthy();
  });

  it('updates view configuration when date field changes', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <CalendarView viewId="view1" tableId="table1" />
      </Provider>
    );
    
    // Click the date field button
    fireEvent.click(screen.getByText('Due Date'));
    
    // Check if the store was called with the correct action
    // This would require checking the actions in the store
    const actions = store.getActions();
    expect(actions.some(action => 
      action.type === 'views/updateView/pending' && 
      action.meta.arg.viewId === 'view1'
    )).toBeTruthy();
  });

  it('renders different layouts based on view type', () => {
    const store = createStore();
    const { rerender } = render(
      <Provider store={store}>
        <CalendarView viewId="view1" tableId="table1" />
      </Provider>
    );
    
    // Switch to week view
    fireEvent.click(screen.getByTitle('Week view'));
    
    // Check if week view has time slots
    expect(screen.getByText('12 AM')).toBeInTheDocument();
    expect(screen.getByText('12 PM')).toBeInTheDocument();
    
    // Switch to day view
    fireEvent.click(screen.getByTitle('Day view'));
    
    // Check if day view has time slots but only shows one day
    expect(screen.queryAllByText('Sunday').length).toBeLessThanOrEqual(1);
    
    // Switch back to month view
    fireEvent.click(screen.getByTitle('Month view'));
    
    // Check if month view shows abbreviated day names
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });
});