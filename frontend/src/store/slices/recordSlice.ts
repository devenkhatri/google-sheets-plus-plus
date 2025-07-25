import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { recordService } from '../../services/recordService';

// Types
interface Record {
  id: string;
  table_id: string;
  row_index: number;
  fields: any;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface RecordState {
  records: Record[];
  currentRecord: Record | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  syncStatus: {
    inProgress: boolean;
    lastSynced: string | null;
    error: string | null;
    stats: {
      added: number;
      updated: number;
      deleted: number;
    } | null;
  };
}

// Initial state
const initialState: RecordState = {
  records: [],
  currentRecord: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    limit: 100,
    offset: 0,
    hasMore: false,
  },
  syncStatus: {
    inProgress: false,
    lastSynced: null,
    error: null,
    stats: null,
  },
};

// Async thunks
export const fetchRecords = createAsyncThunk(
  'records/fetchRecords',
  async (
    {
      tableId,
      options = {},
    }: {
      tableId: string;
      options?: {
        limit?: number;
        offset?: number;
        filters?: any[];
        sorts?: any[];
        includeDeleted?: boolean;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await recordService.getRecordsByTableId(tableId, options);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch records');
    }
  }
);

export const fetchRecordById = createAsyncThunk(
  'records/fetchRecordById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await recordService.getRecordById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch record');
    }
  }
);

export const createRecord = createAsyncThunk(
  'records/createRecord',
  async (
    {
      tableId,
      fields,
      syncToSheets = true,
    }: {
      tableId: string;
      fields: any;
      syncToSheets?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await recordService.createRecord(tableId, fields, syncToSheets);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create record');
    }
  }
);

export const updateRecord = createAsyncThunk(
  'records/updateRecord',
  async (
    {
      id,
      updates,
      syncToSheets = true,
    }: {
      id: string;
      updates: { fields?: any; deleted?: boolean };
      syncToSheets?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await recordService.updateRecord(id, updates, syncToSheets);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update record');
    }
  }
);

export const deleteRecord = createAsyncThunk(
  'records/deleteRecord',
  async (
    { id, syncToSheets = true }: { id: string; syncToSheets?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await recordService.softDeleteRecord(id, syncToSheets);
      return { id, ...response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete record');
    }
  }
);

export const restoreRecord = createAsyncThunk(
  'records/restoreRecord',
  async (
    { id, syncToSheets = true }: { id: string; syncToSheets?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await recordService.restoreRecord(id, syncToSheets);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to restore record');
    }
  }
);

export const bulkCreateRecords = createAsyncThunk(
  'records/bulkCreateRecords',
  async (
    {
      tableId,
      records,
      syncToSheets = true,
    }: {
      tableId: string;
      records: { fields: any; rowIndex?: number }[];
      syncToSheets?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await recordService.bulkCreateRecords(tableId, records, syncToSheets);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk create records');
    }
  }
);

export const bulkUpdateRecords = createAsyncThunk(
  'records/bulkUpdateRecords',
  async (
    {
      updates,
      syncToSheets = true,
    }: {
      updates: { id: string; fields?: any; deleted?: boolean }[];
      syncToSheets?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await recordService.bulkUpdateRecords(updates, syncToSheets);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to bulk update records');
    }
  }
);

export const syncFromGoogleSheets = createAsyncThunk(
  'records/syncFromGoogleSheets',
  async (tableId: string, { rejectWithValue }) => {
    try {
      const response = await recordService.syncFromGoogleSheets(tableId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync from Google Sheets');
    }
  }
);

export const syncToGoogleSheets = createAsyncThunk(
  'records/syncToGoogleSheets',
  async (tableId: string, { rejectWithValue }) => {
    try {
      const response = await recordService.syncToGoogleSheets(tableId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync to Google Sheets');
    }
  }
);

// Slice
const recordSlice = createSlice({
  name: 'records',
  initialState,
  reducers: {
    clearRecords: (state) => {
      state.records = [];
      state.pagination = initialState.pagination;
    },
    clearCurrentRecord: (state) => {
      state.currentRecord = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetSyncStatus: (state) => {
      state.syncStatus = initialState.syncStatus;
    },
    setRecordUpdatedLocally: (state, action: PayloadAction<Record>) => {
      const index = state.records.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.records[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // fetchRecords
    builder.addCase(fetchRecords.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecords.fulfilled, (state, action) => {
      state.loading = false;
      state.records = action.payload.data.records;
      state.pagination = action.payload.data.pagination;
    });
    builder.addCase(fetchRecords.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchRecordById
    builder.addCase(fetchRecordById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecordById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentRecord = action.payload.data.record;
    });
    builder.addCase(fetchRecordById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // createRecord
    builder.addCase(createRecord.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createRecord.fulfilled, (state, action) => {
      state.loading = false;
      state.records.push(action.payload.data.record);
      state.pagination.total += 1;
    });
    builder.addCase(createRecord.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // updateRecord
    builder.addCase(updateRecord.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateRecord.fulfilled, (state, action) => {
      state.loading = false;
      const updatedRecord = action.payload.data.record;
      const index = state.records.findIndex((r) => r.id === updatedRecord.id);
      if (index !== -1) {
        state.records[index] = updatedRecord;
      }
      if (state.currentRecord?.id === updatedRecord.id) {
        state.currentRecord = updatedRecord;
      }
    });
    builder.addCase(updateRecord.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // deleteRecord
    builder.addCase(deleteRecord.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteRecord.fulfilled, (state, action) => {
      state.loading = false;
      const deletedId = action.payload.id;
      state.records = state.records.filter((r) => r.id !== deletedId);
      if (state.currentRecord?.id === deletedId) {
        state.currentRecord = null;
      }
      state.pagination.total -= 1;
    });
    builder.addCase(deleteRecord.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // restoreRecord
    builder.addCase(restoreRecord.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(restoreRecord.fulfilled, (state, action) => {
      state.loading = false;
      const restoredRecord = action.payload.data.record;
      state.records.push(restoredRecord);
      state.pagination.total += 1;
    });
    builder.addCase(restoreRecord.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // bulkCreateRecords
    builder.addCase(bulkCreateRecords.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(bulkCreateRecords.fulfilled, (state, action) => {
      state.loading = false;
      state.records = [...state.records, ...action.payload.data.records];
      state.pagination.total += action.payload.data.count;
    });
    builder.addCase(bulkCreateRecords.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // bulkUpdateRecords
    builder.addCase(bulkUpdateRecords.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(bulkUpdateRecords.fulfilled, (state, action) => {
      state.loading = false;
      const updatedRecords = action.payload.data.records;
      
      // Update records in state
      updatedRecords.forEach((updatedRecord: Record) => {
        const index = state.records.findIndex((r) => r.id === updatedRecord.id);
        if (index !== -1) {
          state.records[index] = updatedRecord;
        }
        
        // Update current record if it was updated
        if (state.currentRecord?.id === updatedRecord.id) {
          state.currentRecord = updatedRecord;
        }
      });
    });
    builder.addCase(bulkUpdateRecords.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // syncFromGoogleSheets
    builder.addCase(syncFromGoogleSheets.pending, (state) => {
      state.syncStatus.inProgress = true;
      state.syncStatus.error = null;
    });
    builder.addCase(syncFromGoogleSheets.fulfilled, (state, action) => {
      state.syncStatus.inProgress = false;
      state.syncStatus.lastSynced = new Date().toISOString();
      state.syncStatus.stats = action.payload.data;
    });
    builder.addCase(syncFromGoogleSheets.rejected, (state, action) => {
      state.syncStatus.inProgress = false;
      state.syncStatus.error = action.payload as string;
    });

    // syncToGoogleSheets
    builder.addCase(syncToGoogleSheets.pending, (state) => {
      state.syncStatus.inProgress = true;
      state.syncStatus.error = null;
    });
    builder.addCase(syncToGoogleSheets.fulfilled, (state) => {
      state.syncStatus.inProgress = false;
      state.syncStatus.lastSynced = new Date().toISOString();
    });
    builder.addCase(syncToGoogleSheets.rejected, (state, action) => {
      state.syncStatus.inProgress = false;
      state.syncStatus.error = action.payload as string;
    });
  },
});

// Actions
export const {
  clearRecords,
  clearCurrentRecord,
  clearError,
  resetSyncStatus,
  setRecordUpdatedLocally,
} = recordSlice.actions;

// Reducer
export default recordSlice.reducer;