import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { configureStore } from '@reduxjs/toolkit';

import { RootState, store } from './store';
import { theme } from './theme';
import authReducer from './store/slices/authSlice';
import baseReducer from './store/slices/baseSlice';
import tableReducer from './store/slices/tableSlice';
import viewReducer from './store/slices/viewSlice';
import uiReducer from './store/slices/uiSlice';
import googleSheetsReducer from './store/slices/googleSheetsSlice';
import recordReducer from './store/slices/recordSlice';
import searchReducer from './store/slices/searchSlice';
import importExportReducer from './store/slices/importExportSlice';
import undoRedoReducer from './store/slices/undoRedoSlice';

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, store.
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: typeof store;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = configureStore({
      reducer: {
        auth: authReducer,
        bases: baseReducer,
        tables: tableReducer,
        views: viewReducer,
        ui: uiReducer,
        googleSheets: googleSheetsReducer,
        records: recordReducer,
        search: searchReducer,
        importExport: importExportReducer,
        undoRedo: undoRedoReducer,
      },
      preloadedState,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
    }),
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              {children}
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );
  }

  // Return an object with the store and all of RTL's query functions
  return { store, queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Mock handlers for testing
export const createMockUser = () => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const createMockBase = () => ({
  id: '1',
  name: 'Test Base',
  description: 'Test Description',
  google_sheets_id: 'test-sheet-id',
  owner_id: '1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const createMockTable = () => ({
  id: '1',
  base_id: '1',
  name: 'Test Table',
  google_sheet_id: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const createMockRecord = () => ({
  id: '1',
  table_id: '1',
  row_index: 1,
  fields: { name: 'Test Record' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: '1',
  last_modified_by: '1',
});

// Re-export everything
export * from '@testing-library/react';