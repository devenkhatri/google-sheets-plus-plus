import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { 
  baseService, 
  Base, 
  CreateBaseRequest, 
  UpdateBaseRequest, 
  ShareBaseRequest, 
  UpdateCollaboratorRequest,
  Collaborator
} from '../../services/baseService';
import {
  EntityState,
  createInitialEntityState,
  addEntities,
  updateEntity,
  removeEntity,
  setLoading,
  setError,
} from '../utils/normalizedState';

interface BaseState extends EntityState<Base> {
  currentBaseId: string | null;
  collaborators: {
    byId: Record<string, Collaborator>;
    allIds: string[];
  };
}

// Initial state
const initialState: BaseState = {
  ...createInitialEntityState<Base>(),
  currentBaseId: null,
  collaborators: {
    byId: {},
    allIds: [],
  },
};

// Async thunks
export const fetchBases = createAsyncThunk(
  'bases/fetchBases',
  async (_, { rejectWithValue }) => {
    try {
      return await baseService.getBases();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bases');
    }
  }
);

export const fetchBaseById = createAsyncThunk(
  'bases/fetchBaseById',
  async (baseId: string, { rejectWithValue }) => {
    try {
      return await baseService.getBase(baseId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || `Failed to fetch base with ID: ${baseId}`);
    }
  }
);

export const createBase = createAsyncThunk(
  'bases/createBase',
  async (data: CreateBaseRequest, { rejectWithValue }) => {
    try {
      return await baseService.createBase(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create base');
    }
  }
);

export const updateBase = createAsyncThunk(
  'bases/updateBase',
  async ({ baseId, data }: { baseId: string; data: UpdateBaseRequest }, { rejectWithValue }) => {
    try {
      return await baseService.updateBase(baseId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update base');
    }
  }
);

export const deleteBase = createAsyncThunk(
  'bases/deleteBase',
  async (baseId: string, { rejectWithValue }) => {
    try {
      await baseService.deleteBase(baseId);
      return baseId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete base');
    }
  }
);

export const shareBase = createAsyncThunk(
  'bases/shareBase',
  async ({ baseId, data }: { baseId: string; data: ShareBaseRequest }, { rejectWithValue }) => {
    try {
      return await baseService.shareBase(baseId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to share base');
    }
  }
);

export const fetchCollaborators = createAsyncThunk(
  'bases/fetchCollaborators',
  async (baseId: string, { rejectWithValue }) => {
    try {
      return await baseService.getCollaborators(baseId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch collaborators');
    }
  }
);

export const updateCollaborator = createAsyncThunk(
  'bases/updateCollaborator',
  async (
    { baseId, collaboratorId, data }: { baseId: string; collaboratorId: string; data: UpdateCollaboratorRequest },
    { rejectWithValue }
  ) => {
    try {
      return await baseService.updateCollaboratorPermission(baseId, collaboratorId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update collaborator');
    }
  }
);

export const removeCollaborator = createAsyncThunk(
  'bases/removeCollaborator',
  async ({ baseId, collaboratorId }: { baseId: string; collaboratorId: string }, { rejectWithValue }) => {
    try {
      await baseService.removeCollaborator(baseId, collaboratorId);
      return collaboratorId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove collaborator');
    }
  }
);

// Slice
const baseSlice = createSlice({
  name: 'bases',
  initialState,
  reducers: {
    setCurrentBase: (state, action: PayloadAction<string | null>) => {
      state.currentBaseId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch bases
      .addCase(fetchBases.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(fetchBases.fulfilled, (state, action) => {
        setLoading(state, false);
        addEntities(state, action.payload);
      })
      .addCase(fetchBases.rejected, (state, action) => {
        setError(state, action.payload as string);
      })
      
      // Fetch base by ID
      .addCase(fetchBaseById.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(fetchBaseById.fulfilled, (state, action) => {
        setLoading(state, false);
        addEntities(state, [action.payload]);
        state.currentBaseId = action.payload.id;
      })
      .addCase(fetchBaseById.rejected, (state, action) => {
        setError(state, action.payload as string);
      })
      
      // Create base
      .addCase(createBase.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(createBase.fulfilled, (state, action) => {
        setLoading(state, false);
        addEntities(state, [action.payload]);
        state.currentBaseId = action.payload.id;
      })
      .addCase(createBase.rejected, (state, action) => {
        setError(state, action.payload as string);
      })
      
      // Update base
      .addCase(updateBase.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(updateBase.fulfilled, (state, action) => {
        setLoading(state, false);
        updateEntity(state, action.payload);
      })
      .addCase(updateBase.rejected, (state, action) => {
        setError(state, action.payload as string);
      })
      
      // Delete base
      .addCase(deleteBase.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(deleteBase.fulfilled, (state, action) => {
        setLoading(state, false);
        removeEntity(state, action.payload);
        if (state.currentBaseId === action.payload) {
          state.currentBaseId = null;
        }
      })
      .addCase(deleteBase.rejected, (state, action) => {
        setError(state, action.payload as string);
      })
      
      // Share base
      .addCase(shareBase.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(shareBase.fulfilled, (state, action) => {
        setLoading(state, false);
        
        // Add to collaborators
        if (!state.collaborators.byId[action.payload.id]) {
          state.collaborators.allIds.push(action.payload.id);
        }
        state.collaborators.byId[action.payload.id] = action.payload;
      })
      .addCase(shareBase.rejected, (state, action) => {
        setError(state, action.payload as string);
      })
      
      // Fetch collaborators
      .addCase(fetchCollaborators.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(fetchCollaborators.fulfilled, (state, action) => {
        setLoading(state, false);
        state.collaborators.byId = {};
        state.collaborators.allIds = [];
        action.payload.forEach((collaborator) => {
          state.collaborators.byId[collaborator.id] = collaborator;
          state.collaborators.allIds.push(collaborator.id);
        });
      })
      .addCase(fetchCollaborators.rejected, (state, action) => {
        setError(state, action.payload as string);
      })
      
      // Update collaborator
      .addCase(updateCollaborator.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(updateCollaborator.fulfilled, (state, action) => {
        setLoading(state, false);
        state.collaborators.byId[action.payload.id] = action.payload;
      })
      .addCase(updateCollaborator.rejected, (state, action) => {
        setError(state, action.payload as string);
      })
      
      // Remove collaborator
      .addCase(removeCollaborator.pending, (state) => {
        setLoading(state, true);
      })
      .addCase(removeCollaborator.fulfilled, (state, action) => {
        setLoading(state, false);
        delete state.collaborators.byId[action.payload];
        state.collaborators.allIds = state.collaborators.allIds.filter((id) => id !== action.payload);
      })
      .addCase(removeCollaborator.rejected, (state, action) => {
        setError(state, action.payload as string);
      });
  },
});

export const { setCurrentBase, clearError } = baseSlice.actions;
export default baseSlice.reducer;

// Selectors
export const selectAllBases = (state: { bases: BaseState }) => 
  state.bases.allIds.map(id => state.bases.byId[id]);

export const selectBaseById = (state: { bases: BaseState }, id: string) => 
  state.bases.byId[id];

export const selectCurrentBase = (state: { bases: BaseState }) => 
  state.bases.currentBaseId ? state.bases.byId[state.bases.currentBaseId] : null;

export const selectBasesLoading = (state: { bases: BaseState }) => 
  state.bases.loading;

export const selectBasesError = (state: { bases: BaseState }) => 
  state.bases.error;

export const selectAllCollaborators = (state: { bases: BaseState }) =>
  state.bases.collaborators.allIds.map(id => state.bases.collaborators.byId[id]);

export const selectCollaboratorById = (state: { bases: BaseState }, id: string) =>
  state.bases.collaborators.byId[id];