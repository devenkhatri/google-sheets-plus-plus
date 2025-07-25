import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as searchService from '../../services/searchService';
import { SearchResult, SavedSearch, SearchOptions } from '../../services/searchService';

interface SearchState {
  results: SearchResult[];
  savedSearches: SavedSearch[];
  loading: boolean;
  error: string | null;
  total: number;
  limit: number;
  offset: number;
  currentQuery: string;
  recentSearches: string[];
}

const initialState: SearchState = {
  results: [],
  savedSearches: [],
  loading: false,
  error: null,
  total: 0,
  limit: 20,
  offset: 0,
  currentQuery: '',
  recentSearches: []
};

// Async thunks
export const performSearch = createAsyncThunk(
  'search/performSearch',
  async (options: SearchOptions, { rejectWithValue }) => {
    try {
      const response = await searchService.search(options);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to perform search');
    }
  }
);

export const fetchSavedSearches = createAsyncThunk(
  'search/fetchSavedSearches',
  async (_, { rejectWithValue }) => {
    try {
      const savedSearches = await searchService.getSavedSearches();
      return savedSearches;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch saved searches');
    }
  }
);

export const createSavedSearch = createAsyncThunk(
  'search/createSavedSearch',
  async (savedSearch: Omit<SavedSearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const response = await searchService.saveSearch(savedSearch);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save search');
    }
  }
);

export const removeSavedSearch = createAsyncThunk(
  'search/removeSavedSearch',
  async (id: string, { rejectWithValue }) => {
    try {
      await searchService.deleteSavedSearch(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete saved search');
    }
  }
);

export const modifySavedSearch = createAsyncThunk(
  'search/modifySavedSearch',
  async ({ id, updates }: { id: string, updates: Partial<Omit<SavedSearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> }, { rejectWithValue }) => {
    try {
      const response = await searchService.updateSavedSearch(id, updates);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update saved search');
    }
  }
);

// Slice
const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.results = [];
      state.total = 0;
    },
    addRecentSearch: (state, action) => {
      const query = action.payload;
      // Remove if already exists
      state.recentSearches = state.recentSearches.filter(q => q !== query);
      // Add to beginning
      state.recentSearches.unshift(query);
      // Keep only the last 10
      state.recentSearches = state.recentSearches.slice(0, 10);
    },
    clearRecentSearches: (state) => {
      state.recentSearches = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle performSearch
      .addCase(performSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(performSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload.results;
        state.total = action.payload.total;
        state.limit = action.payload.limit;
        state.offset = action.payload.offset;
        state.currentQuery = action.meta.arg.query;
        
        // Add to recent searches
        if (action.meta.arg.query) {
          const query = action.meta.arg.query;
          // Remove if already exists
          state.recentSearches = state.recentSearches.filter(q => q !== query);
          // Add to beginning
          state.recentSearches.unshift(query);
          // Keep only the last 10
          state.recentSearches = state.recentSearches.slice(0, 10);
        }
      })
      .addCase(performSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Handle fetchSavedSearches
      .addCase(fetchSavedSearches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedSearches.fulfilled, (state, action) => {
        state.loading = false;
        state.savedSearches = action.payload;
      })
      .addCase(fetchSavedSearches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Handle createSavedSearch
      .addCase(createSavedSearch.fulfilled, (state, action) => {
        state.savedSearches.push(action.payload);
      })
      
      // Handle removeSavedSearch
      .addCase(removeSavedSearch.fulfilled, (state, action) => {
        state.savedSearches = state.savedSearches.filter(search => search.id !== action.payload);
      })
      
      // Handle modifySavedSearch
      .addCase(modifySavedSearch.fulfilled, (state, action) => {
        const index = state.savedSearches.findIndex(search => search.id === action.payload.id);
        if (index !== -1) {
          state.savedSearches[index] = action.payload;
        }
      });
  }
});

export const { clearSearchResults, addRecentSearch, clearRecentSearches } = searchSlice.actions;
export default searchSlice.reducer;