import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import baseReducer from './slices/baseSlice';
import tableReducer from './slices/tableSlice';
import viewReducer from './slices/viewSlice';
import uiReducer from './slices/uiSlice';
import googleSheetsReducer from './slices/googleSheetsSlice';
import recordReducer from './slices/recordSlice';
import searchReducer from './slices/searchSlice';
import importExportReducer from './slices/importExportSlice';
import undoRedoReducer from './slices/undoRedoSlice';

export const store = configureStore({
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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;