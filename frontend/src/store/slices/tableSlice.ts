import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { 
  tableService, 
  CreateTableRequest, 
  UpdateTableRequest, 
  // SyncTableRequest 
} from '../../services/tableService';
import { Table } from '../../services/baseService';

export interface Record {
  id: string;
  table_id: string;
  row_index: number;
  fields: { [fieldId: string]: any };
  deleted: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface TableState {
  tables: Table[];
  currentTable: Table | null;
  records: Record[];
  loading: boolean;
  error: string | null;
  syncStatus: {
    loading: boolean;
    message: string | null;
    error: string | null;
  };
}

// Initial state
const initialState: TableState = {
  tables: [],
  currentTable: null,
  records: [],
  loading: false,
  error: null,
  syncStatus: {
    loading: false,
    message: null,
    error: null,
  },
};

// Async thunks
export const fetchTables = createAsyncThunk(
  'tables/fetchTables',
  async (baseId: string, { rejectWithValue }) => {
    try {
      return await tableService.getTables(baseId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || `Failed to fetch tables for base: ${baseId}`);
    }
  }
);

export const fetchTableById = createAsyncThunk(
  'tables/fetchTableById',
  async (tableId: string, { rejectWithValue }) => {
    try {
      return await tableService.getTable(tableId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || `Failed to fetch table with ID: ${tableId}`);
    }
  }
);

export const createTable = createAsyncThunk(
  'tables/createTable',
  async ({ baseId, data }: { baseId: string; data: CreateTableRequest }, { rejectWithValue }) => {
    try {
      return await tableService.createTable(baseId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create table');
    }
  }
);

export const updateTable = createAsyncThunk(
  'tables/updateTable',
  async ({ tableId, data }: { tableId: string; data: UpdateTableRequest }, { rejectWithValue }) => {
    try {
      return await tableService.updateTable(tableId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update table');
    }
  }
);

export const deleteTable = createAsyncThunk(
  'tables/deleteTable',
  async (tableId: string, { rejectWithValue }) => {
    try {
      await tableService.deleteTable(tableId);
      return tableId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete table');
    }
  }
);

export const syncTable = createAsyncThunk(
  'tables/syncTable',
  async ({ tableId, direction }: { tableId: string; direction: 'from' | 'to' }, { rejectWithValue }) => {
    try {
      return await tableService.syncTable(tableId, { direction });
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync table');
    }
  }
);

// This will be implemented in Task 7
export const fetchRecords = createAsyncThunk(
  'tables/fetchRecords',
  async (tableId: string, { rejectWithValue }) => {
    try {
      // For now, just simulate a delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      return [
        {
          id: 'rec1',
          table_id: tableId,
          row_index: 1,
          fields: {
            field1: 'Implement authentication',
            field2: 'In Progress',
          },
          deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'rec2',
          table_id: tableId,
          row_index: 2,
          fields: {
            field1: 'Set up database',
            field2: 'Done',
          },
          deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'rec3',
          table_id: tableId,
          row_index: 3,
          fields: {
            field1: 'Create UI components',
            field2: 'To Do',
          },
          deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || `Failed to fetch records for table: ${tableId}`);
    }
  }
);

// Slice
const tableSlice = createSlice({
  name: 'tables',
  initialState,
  reducers: {
    setCurrentTable: (state, action: PayloadAction<Table | null>) => {
      state.currentTable = action.payload;
    },
    clearTableError: (state) => {
      state.error = null;
    },
    clearSyncStatus: (state) => {
      state.syncStatus = {
        loading: false,
        message: null,
        error: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tables
      .addCase(fetchTables.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.loading = false;
        state.tables = action.payload;
      })
      .addCase(fetchTables.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch table by ID
      .addCase(fetchTableById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTableById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTable = action.payload;
      })
      .addCase(fetchTableById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create table
      .addCase(createTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTable.fulfilled, (state, action) => {
        state.loading = false;
        state.tables.push(action.payload);
        state.currentTable = action.payload;
      })
      .addCase(createTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update table
      .addCase(updateTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTable.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTable = action.payload;
        
        // Update in tables array
        const index = state.tables.findIndex((table) => table.id === action.payload.id);
        if (index !== -1) {
          state.tables[index] = action.payload;
        }
      })
      .addCase(updateTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete table
      .addCase(deleteTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTable.fulfilled, (state, action) => {
        state.loading = false;
        state.tables = state.tables.filter((table) => table.id !== action.payload);
        if (state.currentTable?.id === action.payload) {
          state.currentTable = null;
        }
      })
      .addCase(deleteTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Sync table
      .addCase(syncTable.pending, (state) => {
        state.syncStatus.loading = true;
        state.syncStatus.error = null;
        state.syncStatus.message = null;
      })
      .addCase(syncTable.fulfilled, (state, action) => {
        state.syncStatus.loading = false;
        state.syncStatus.message = action.payload.message;
      })
      .addCase(syncTable.rejected, (state, action) => {
        state.syncStatus.loading = false;
        state.syncStatus.error = action.payload as string;
      })
      
      // Fetch records
      .addCase(fetchRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload;
      })
      .addCase(fetchRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentTable, clearTableError, clearSyncStatus } = tableSlice.actions;
export default tableSlice.reducer;