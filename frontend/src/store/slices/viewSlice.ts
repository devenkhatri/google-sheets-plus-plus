import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Types
export interface Filter {
  id: string;
  fieldId: string;
  operator: string;
  value: any;
}

export interface Sort {
  id: string;
  fieldId: string;
  direction: 'asc' | 'desc';
}

export interface View {
  id: string;
  tableId: string;
  name: string;
  type: 'grid' | 'kanban' | 'calendar' | 'gallery';
  filters: Filter[];
  sorts: Sort[];
  fieldVisibility: { [fieldId: string]: boolean };
  configuration: any;
}

interface ViewState {
  views: View[];
  currentView: View | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: ViewState = {
  views: [],
  currentView: null,
  loading: false,
  error: null,
};

// Async thunks
export const createView = createAsyncThunk(
  'views/createView',
  async ({ tableId, viewData }: { tableId: string; viewData: Omit<View, 'id' | 'tableId'> }, { rejectWithValue }) => {
    try {
      // Transform frontend format to backend format
      const backendViewData = {
        name: viewData.name,
        type: viewData.type,
        configuration: viewData.configuration,
        filters: viewData.filters,
        sorts: viewData.sorts,
        field_visibility: viewData.fieldVisibility,
      };

      const response = await fetch(`/api/v1/tables/${tableId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(backendViewData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to create view');
      }

      const data = await response.json();
      
      // Transform backend format to frontend format
      return {
        id: data.data.id,
        tableId: data.data.table_id,
        name: data.data.name,
        type: data.data.type,
        filters: data.data.filters || [],
        sorts: data.data.sorts || [],
        fieldVisibility: data.data.field_visibility || {},
        configuration: data.data.configuration || {},
      };
    } catch (error) {
      return rejectWithValue('Failed to create view');
    }
  }
);

export const updateView = createAsyncThunk(
  'views/updateView',
  async ({ viewId, viewData }: { viewId: string; viewData: Partial<Omit<View, 'id' | 'tableId'>> }, { rejectWithValue }) => {
    try {
      // Transform frontend format to backend format
      const backendViewData: any = {};
      
      if (viewData.name !== undefined) backendViewData.name = viewData.name;
      if (viewData.type !== undefined) backendViewData.type = viewData.type;
      if (viewData.configuration !== undefined) backendViewData.configuration = viewData.configuration;
      if (viewData.filters !== undefined) backendViewData.filters = viewData.filters;
      if (viewData.sorts !== undefined) backendViewData.sorts = viewData.sorts;
      if (viewData.fieldVisibility !== undefined) backendViewData.field_visibility = viewData.fieldVisibility;

      const response = await fetch(`/api/v1/views/${viewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(backendViewData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to update view');
      }

      const data = await response.json();
      
      // Transform backend format to frontend format
      return {
        id: data.data.id,
        tableId: data.data.table_id,
        name: data.data.name,
        type: data.data.type,
        filters: data.data.filters || [],
        sorts: data.data.sorts || [],
        fieldVisibility: data.data.field_visibility || {},
        configuration: data.data.configuration || {},
      };
    } catch (error) {
      return rejectWithValue('Failed to update view');
    }
  }
);

export const deleteView = createAsyncThunk(
  'views/deleteView',
  async (viewId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/views/${viewId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete view');
      }

      return viewId;
    } catch (error) {
      return rejectWithValue('Failed to delete view');
    }
  }
);

export const duplicateView = createAsyncThunk(
  'views/duplicateView',
  async ({ viewId, name }: { viewId: string; name?: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/views/${viewId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to duplicate view');
      }

      const data = await response.json();
      
      // Transform backend format to frontend format
      return {
        id: data.data.id,
        tableId: data.data.table_id,
        name: data.data.name,
        type: data.data.type,
        filters: data.data.filters || [],
        sorts: data.data.sorts || [],
        fieldVisibility: data.data.field_visibility || {},
        configuration: data.data.configuration || {},
      };
    } catch (error) {
      return rejectWithValue('Failed to duplicate view');
    }
  }
);

export const fetchViews = createAsyncThunk(
  'views/fetchViews',
  async (tableId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/tables/${tableId}/views`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || `Failed to fetch views for table: ${tableId}`);
      }

      const data = await response.json();
      
      // Transform backend format to frontend format
      return data.data.map((view: any) => ({
        id: view.id,
        tableId: view.table_id,
        name: view.name,
        type: view.type,
        filters: view.filters || [],
        sorts: view.sorts || [],
        fieldVisibility: view.field_visibility || {},
        configuration: view.configuration || {},
      }));
    } catch (error) {
      return rejectWithValue(`Failed to fetch views for table: ${tableId}`);
    }
  }
);

// Slice
const viewSlice = createSlice({
  name: 'views',
  initialState,
  reducers: {
    setCurrentView: (state, action: PayloadAction<View | null>) => {
      state.currentView = action.payload;
    },
    addFilter: (state, action: PayloadAction<Filter>) => {
      if (state.currentView) {
        state.currentView.filters.push(action.payload);
      }
    },
    removeFilter: (state, action: PayloadAction<string>) => {
      if (state.currentView) {
        state.currentView.filters = state.currentView.filters.filter(
          (filter) => filter.id !== action.payload
        );
      }
    },
    addSort: (state, action: PayloadAction<Sort>) => {
      if (state.currentView) {
        state.currentView.sorts.push(action.payload);
      }
    },
    removeSort: (state, action: PayloadAction<string>) => {
      if (state.currentView) {
        state.currentView.sorts = state.currentView.sorts.filter(
          (sort) => sort.id !== action.payload
        );
      }
    },
    updateFieldVisibility: (
      state,
      action: PayloadAction<{ fieldId: string; visible: boolean }>
    ) => {
      if (state.currentView) {
        state.currentView.fieldVisibility[action.payload.fieldId] = action.payload.visible;
      }
    },
    clearViewError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch views
      .addCase(fetchViews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchViews.fulfilled, (state, action) => {
        state.loading = false;
        state.views = action.payload;
        if (action.payload.length > 0) {
          state.currentView = action.payload[0];
        }
      })
      .addCase(fetchViews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create view
      .addCase(createView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createView.fulfilled, (state, action) => {
        state.loading = false;
        state.views.push(action.payload);
        state.currentView = action.payload;
      })
      .addCase(createView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update view
      .addCase(updateView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateView.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.views.findIndex(view => view.id === action.payload.id);
        if (index !== -1) {
          state.views[index] = action.payload;
        }
        if (state.currentView && state.currentView.id === action.payload.id) {
          state.currentView = action.payload;
        }
      })
      .addCase(updateView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete view
      .addCase(deleteView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteView.fulfilled, (state, action) => {
        state.loading = false;
        state.views = state.views.filter(view => view.id !== action.payload);
        if (state.currentView && state.currentView.id === action.payload) {
          state.currentView = state.views.length > 0 ? state.views[0] : null;
        }
      })
      .addCase(deleteView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Duplicate view
      .addCase(duplicateView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(duplicateView.fulfilled, (state, action) => {
        state.loading = false;
        state.views.push(action.payload);
        state.currentView = action.payload;
      })
      .addCase(duplicateView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentView,
  addFilter,
  removeFilter,
  addSort,
  removeSort,
  updateFieldVisibility,
  clearViewError,
} = viewSlice.actions;
export default viewSlice.reducer;