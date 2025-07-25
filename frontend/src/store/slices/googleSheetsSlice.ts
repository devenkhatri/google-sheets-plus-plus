import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { googleSheetsService } from '../../services/googleSheetsService';

// Types
interface GoogleSheetsState {
  spreadsheets: Record<string, any>;
  values: Record<string, any>;
  syncStatus: Record<string, any>;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: GoogleSheetsState = {
  spreadsheets: {},
  values: {},
  syncStatus: {},
  loading: false,
  error: null,
};

// Async thunks
export const createSpreadsheet = createAsyncThunk(
  'googleSheets/createSpreadsheet',
  async (title: string, { rejectWithValue }) => {
    try {
      const spreadsheetId = await googleSheetsService.createSpreadsheet(title);
      return { spreadsheetId, title };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create spreadsheet');
    }
  }
);

export const getSpreadsheet = createAsyncThunk(
  'googleSheets/getSpreadsheet',
  async (spreadsheetId: string, { rejectWithValue }) => {
    try {
      const spreadsheet = await googleSheetsService.getSpreadsheet(spreadsheetId);
      return { spreadsheetId, spreadsheet };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get spreadsheet');
    }
  }
);

export const createSheet = createAsyncThunk(
  'googleSheets/createSheet',
  async ({ spreadsheetId, title }: { spreadsheetId: string; title: string }, { rejectWithValue, dispatch }) => {
    try {
      const sheetId = await googleSheetsService.createSheet(spreadsheetId, title);
      
      // Refresh spreadsheet metadata
      dispatch(getSpreadsheet(spreadsheetId));
      
      return { spreadsheetId, sheetId, title };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create sheet');
    }
  }
);

export const getValues = createAsyncThunk(
  'googleSheets/getValues',
  async ({ spreadsheetId, range }: { spreadsheetId: string; range: string }, { rejectWithValue }) => {
    try {
      const values = await googleSheetsService.getValues(spreadsheetId, range);
      return { spreadsheetId, range, values };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get values');
    }
  }
);

export const updateValues = createAsyncThunk(
  'googleSheets/updateValues',
  async (
    { spreadsheetId, range, values }: { spreadsheetId: string; range: string; values: any[][] },
    { rejectWithValue, dispatch }
  ) => {
    try {
      await googleSheetsService.updateValues(spreadsheetId, range, values);
      
      // Refresh values
      dispatch(getValues({ spreadsheetId, range }));
      
      return { spreadsheetId, range };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update values');
    }
  }
);

export const syncFromGoogleSheets = createAsyncThunk(
  'googleSheets/syncFromGoogleSheets',
  async (
    { spreadsheetId, sheetName, tableId }: { spreadsheetId: string; sheetName: string; tableId: string },
    { rejectWithValue }
  ) => {
    try {
      const records = await googleSheetsService.syncFromGoogleSheets(spreadsheetId, sheetName, tableId);
      return { tableId, records };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync from Google Sheets');
    }
  }
);

export const syncToGoogleSheets = createAsyncThunk(
  'googleSheets/syncToGoogleSheets',
  async (
    {
      spreadsheetId,
      sheetName,
      tableId,
      records,
      fields,
    }: {
      spreadsheetId: string;
      sheetName: string;
      tableId: string;
      records: any[];
      fields: any[];
    },
    { rejectWithValue }
  ) => {
    try {
      await googleSheetsService.syncToGoogleSheets(spreadsheetId, sheetName, tableId, records, fields);
      return { tableId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync to Google Sheets');
    }
  }
);

export const getSyncStatus = createAsyncThunk(
  'googleSheets/getSyncStatus',
  async (tableId: string, { rejectWithValue }) => {
    try {
      const status = await googleSheetsService.getSyncStatus(tableId);
      return { tableId, status };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get sync status');
    }
  }
);

// Slice
const googleSheetsSlice = createSlice({
  name: 'googleSheets',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateSyncStatus: (state, action: PayloadAction<{ tableId: string; status: any }>) => {
      const { tableId, status } = action.payload;
      state.syncStatus[tableId] = status;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create spreadsheet
      .addCase(createSpreadsheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSpreadsheet.fulfilled, (state, action) => {
        state.loading = false;
        const { spreadsheetId, title } = action.payload;
        state.spreadsheets[spreadsheetId] = { id: spreadsheetId, title };
      })
      .addCase(createSpreadsheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get spreadsheet
      .addCase(getSpreadsheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSpreadsheet.fulfilled, (state, action) => {
        state.loading = false;
        const { spreadsheetId, spreadsheet } = action.payload;
        state.spreadsheets[spreadsheetId] = spreadsheet;
      })
      .addCase(getSpreadsheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create sheet
      .addCase(createSheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSheet.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createSheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get values
      .addCase(getValues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getValues.fulfilled, (state, action) => {
        state.loading = false;
        const { spreadsheetId, range, values } = action.payload;
        if (!state.values[spreadsheetId]) {
          state.values[spreadsheetId] = {};
        }
        state.values[spreadsheetId][range] = values;
      })
      .addCase(getValues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update values
      .addCase(updateValues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateValues.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateValues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Sync from Google Sheets
      .addCase(syncFromGoogleSheets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncFromGoogleSheets.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(syncFromGoogleSheets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Sync to Google Sheets
      .addCase(syncToGoogleSheets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncToGoogleSheets.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(syncToGoogleSheets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get sync status
      .addCase(getSyncStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSyncStatus.fulfilled, (state, action) => {
        state.loading = false;
        const { tableId, status } = action.payload;
        state.syncStatus[tableId] = status;
      })
      .addCase(getSyncStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateSyncStatus } = googleSheetsSlice.actions;
export default googleSheetsSlice.reducer;