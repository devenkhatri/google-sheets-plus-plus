import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import GlobalSearch from '../GlobalSearch';
import * as searchService from '../../services/searchService';

// Mock the search service
jest.mock('../../services/searchService');

const mockStore = configureStore([thunk]);

describe('GlobalSearch Component', () => {
  const initialState = {
    search: {
      results: [],
      savedSearches: [
        {
          id: '1',
          userId: 'user1',
          name: 'Test Search',
          query: 'test',
          notificationsEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      loading: false,
      error: null,
      total: 0,
      limit: 20,
      offset: 0,
      currentQuery: '',
      recentSearches: ['previous search']
    },
    bases: {
      bases: [
        {
          id: 'base1',
          name: 'Test Base',
          tables: [
            {
              id: 'table1',
              name: 'Test Table',
              fields: [
                { id: 'field1', name: 'Test Field', type: 'text' }
              ]
            }
          ]
        }
      ]
    }
  };
  
  let store: any;
  
  beforeEach(() => {
    store = mockStore(initialState);
    
    // Mock search service implementation
    (searchService.search as jest.Mock).mockResolvedValue({
      results: [
        {
          id: 'result1',
          type: 'record',
          title: 'Test Result',
          context: 'This is a test result context',
          baseId: 'base1',
          baseName: 'Test Base',
          tableId: 'table1',
          tableName: 'Test Table',
          recordId: 'record1',
          score: 10,
          lastModified: new Date()
        }
      ],
      total: 1,
      limit: 20,
      offset: 0
    });
  });
  
  it('renders the search input', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </Provider>
    );
    
    expect(screen.getByPlaceholderText('Search across all bases...')).toBeInTheDocument();
  });
  
  it('shows recent searches when focused', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </Provider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search across all bases...');
    fireEvent.focus(searchInput);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      expect(screen.getByText('previous search')).toBeInTheDocument();
    });
  });
  
  it('shows saved searches when focused', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </Provider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search across all bases...');
    fireEvent.focus(searchInput);
    
    await waitFor(() => {
      expect(screen.getByText('Saved Searches')).toBeInTheDocument();
      expect(screen.getByText('Test Search')).toBeInTheDocument();
    });
  });
  
  it('performs search when typing', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </Provider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search across all bases...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    await waitFor(() => {
      // Check that the search action was dispatched
      const actions = store.getActions();
      expect(actions.some(action => action.type === 'search/performSearch/pending')).toBeTruthy();
    });
  });
  
  it('shows search results when search is successful', async () => {
    // Update store with search results
    store = mockStore({
      ...initialState,
      search: {
        ...initialState.search,
        results: [
          {
            id: 'result1',
            type: 'record',
            title: 'Test Result',
            context: 'This is a test result context',
            baseId: 'base1',
            baseName: 'Test Base',
            tableId: 'table1',
            tableName: 'Test Table',
            recordId: 'record1',
            score: 10,
            lastModified: new Date()
          }
        ],
        total: 1,
        currentQuery: 'test'
      }
    });
    
    render(
      <Provider store={store}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </Provider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search across all bases...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('Test Result')).toBeInTheDocument();
      expect(screen.getByText('1 results')).toBeInTheDocument();
    });
  });
  
  it('opens advanced search dialog when clicking the tune icon', async () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      </Provider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search across all bases...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Wait for the tune icon to appear
    await waitFor(() => {
      const tuneIcon = screen.getByLabelText('Advanced search');
      fireEvent.click(tuneIcon);
    });
    
    // Check that the advanced search dialog is open
    expect(screen.getByText('Advanced Search')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Fields')).toBeInTheDocument();
  });
});