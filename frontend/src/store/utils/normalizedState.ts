// Utility types and functions for normalized state management

export interface NormalizedState<T> {
  byId: Record<string, T>;
  allIds: string[];
}

export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface PaginatedState {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export interface EntityState<T> extends NormalizedState<T>, LoadingState {
  pagination?: PaginatedState;
}

// Helper functions for normalized state operations
export const createInitialEntityState = <T>(): EntityState<T> => ({
  byId: {},
  allIds: [],
  loading: false,
  error: null,
});

export const createInitialPaginatedState = (): PaginatedState => ({
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  pageSize: 50,
});

// Add entities to normalized state
export const addEntities = <T extends { id: string }>(
  state: NormalizedState<T>,
  entities: T[]
): void => {
  entities.forEach((entity) => {
    if (!state.byId[entity.id]) {
      state.allIds.push(entity.id);
    }
    state.byId[entity.id] = entity;
  });
};

// Update entity in normalized state
export const updateEntity = <T extends { id: string }>(
  state: NormalizedState<T>,
  entity: T
): void => {
  if (state.byId[entity.id]) {
    state.byId[entity.id] = entity;
  }
};

// Remove entity from normalized state
export const removeEntity = <T>(
  state: NormalizedState<T>,
  id: string
): void => {
  delete state.byId[id];
  state.allIds = state.allIds.filter((entityId) => entityId !== id);
};

// Clear all entities
export const clearEntities = <T>(state: NormalizedState<T>): void => {
  state.byId = {};
  state.allIds = [];
};

// Set loading state
export const setLoading = (state: LoadingState, loading: boolean): void => {
  state.loading = loading;
  if (loading) {
    state.error = null;
  }
};

// Set error state
export const setError = (state: LoadingState, error: string | null): void => {
  state.error = error;
  state.loading = false;
};

// Selectors for normalized state
export const createEntitySelectors = <T>() => ({
  selectAll: (state: NormalizedState<T>): T[] =>
    state.allIds.map((id) => state.byId[id]),
  
  selectById: (state: NormalizedState<T>, id: string): T | undefined =>
    state.byId[id],
  
  selectIds: (state: NormalizedState<T>): string[] => state.allIds,
  
  selectEntities: (state: NormalizedState<T>): Record<string, T> => state.byId,
  
  selectTotal: (state: NormalizedState<T>): number => state.allIds.length,
});