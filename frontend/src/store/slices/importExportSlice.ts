import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { importExportService } from '../../services/importExportService';
import { RootState } from '../index';

// Define types
export interface ImportProgress {
  totalRows: number;
  processedRows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  column: string;
  message: string;
}

export interface ImportWarning {
  row: number;
  column: string;
  message: string;
}

export interface ImportExportState {
  currentImportJobId: string | null;
  importProgress: ImportProgress | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: ImportExportState = {
  currentImportJobId: null,
  importProgress: null,
  loading: false,
  error: null
};

// Async thunks
export const importData = createAsyncThunk(
  'importExport/importData',
  async (params: {
    file: File;
    options: {
      detectFieldTypes: boolean;
      headerRow: boolean;
      sheetIndex?: number;
      createTable: boolean;
      tableId?: string;
      baseId?: string;
      tableName?: string;
    };
  }, { rejectWithValue }) => {
    try {
      const jobId = await importExportService.importData(params.file, params.options);
      return jobId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to import data');
    }
  }
);

export const getImportProgress = createAsyncThunk(
  'importExport/getImportProgress',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const progress = await importExportService.getImportProgress(jobId);
      return progress;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get import progress');
    }
  }
);

// Create slice
const importExportSlice = createSlice({
  name: 'importExport',
  initialState,
  reducers: {
    clearImportJob: (state) => {
      state.currentImportJobId = null;
      state.importProgress = null;
    },
    setImportProgress: (state, action: PayloadAction<ImportProgress>) => {
      state.importProgress = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Import data
      .addCase(importData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importData.fulfilled, (state, action) => {
        state.loading = false;
        state.currentImportJobId = action.payload;
      })
      .addCase(importData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get import progress
      .addCase(getImportProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getImportProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.importProgress = action.payload;
      })
      .addCase(getImportProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { clearImportJob, setImportProgress } = importExportSlice.actions;

// Export selectors
export const selectImportExport = (state: RootState) => state.importExport;
export const selectCurrentImportJobId = (state: RootState) => state.importExport.currentImportJobId;
export const selectImportProgress = (state: RootState) => state.importExport.importProgress;
export const selectImportExportLoading = (state: RootState) => state.importExport.loading;
export const selectImportExportError = (state: RootState) => state.importExport.error;

// Export reducer
export default importExportSlice.reducer;