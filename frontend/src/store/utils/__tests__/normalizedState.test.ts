import {
  createInitialEntityState,
  createInitialPaginatedState,
  addEntities,
  updateEntity,
  removeEntity,
  clearEntities,
  setLoading,
  setError,
  createEntitySelectors,
  NormalizedState,
  // EntityState,
} from '../normalizedState';

interface TestEntity {
  id: string;
  name: string;
  value: number;
}

describe('normalizedState utilities', () => {
  describe('createInitialEntityState', () => {
    it('creates initial state with correct structure', () => {
      const state = createInitialEntityState<TestEntity>();
      
      expect(state).toEqual({
        byId: {},
        allIds: [],
        loading: false,
        error: null,
      });
    });
  });

  describe('createInitialPaginatedState', () => {
    it('creates initial paginated state', () => {
      const state = createInitialPaginatedState();
      
      expect(state).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize: 50,
      });
    });
  });

  describe('addEntities', () => {
    it('adds new entities to empty state', () => {
      const state: NormalizedState<TestEntity> = {
        byId: {},
        allIds: [],
      };
      
      const entities: TestEntity[] = [
        { id: '1', name: 'Entity 1', value: 10 },
        { id: '2', name: 'Entity 2', value: 20 },
      ];
      
      addEntities(state, entities);
      
      expect(state.byId).toEqual({
        '1': { id: '1', name: 'Entity 1', value: 10 },
        '2': { id: '2', name: 'Entity 2', value: 20 },
      });
      expect(state.allIds).toEqual(['1', '2']);
    });

    it('updates existing entities and adds new ones', () => {
      const state: NormalizedState<TestEntity> = {
        byId: {
          '1': { id: '1', name: 'Old Entity 1', value: 5 },
        },
        allIds: ['1'],
      };
      
      const entities: TestEntity[] = [
        { id: '1', name: 'Updated Entity 1', value: 15 },
        { id: '2', name: 'Entity 2', value: 20 },
      ];
      
      addEntities(state, entities);
      
      expect(state.byId).toEqual({
        '1': { id: '1', name: 'Updated Entity 1', value: 15 },
        '2': { id: '2', name: 'Entity 2', value: 20 },
      });
      expect(state.allIds).toEqual(['1', '2']);
    });
  });

  describe('updateEntity', () => {
    it('updates existing entity', () => {
      const state: NormalizedState<TestEntity> = {
        byId: {
          '1': { id: '1', name: 'Entity 1', value: 10 },
        },
        allIds: ['1'],
      };
      
      const updatedEntity: TestEntity = { id: '1', name: 'Updated Entity 1', value: 15 };
      
      updateEntity(state, updatedEntity);
      
      expect(state.byId['1']).toEqual(updatedEntity);
    });

    it('does nothing if entity does not exist', () => {
      const state: NormalizedState<TestEntity> = {
        byId: {},
        allIds: [],
      };
      
      const entity: TestEntity = { id: '1', name: 'Entity 1', value: 10 };
      
      updateEntity(state, entity);
      
      expect(state.byId).toEqual({});
      expect(state.allIds).toEqual([]);
    });
  });

  describe('removeEntity', () => {
    it('removes entity from state', () => {
      const state: NormalizedState<TestEntity> = {
        byId: {
          '1': { id: '1', name: 'Entity 1', value: 10 },
          '2': { id: '2', name: 'Entity 2', value: 20 },
        },
        allIds: ['1', '2'],
      };
      
      removeEntity(state, '1');
      
      expect(state.byId).toEqual({
        '2': { id: '2', name: 'Entity 2', value: 20 },
      });
      expect(state.allIds).toEqual(['2']);
    });

    it('does nothing if entity does not exist', () => {
      const state: NormalizedState<TestEntity> = {
        byId: {
          '1': { id: '1', name: 'Entity 1', value: 10 },
        },
        allIds: ['1'],
      };
      
      removeEntity(state, '2');
      
      expect(state.byId).toEqual({
        '1': { id: '1', name: 'Entity 1', value: 10 },
      });
      expect(state.allIds).toEqual(['1']);
    });
  });

  describe('clearEntities', () => {
    it('clears all entities', () => {
      const state: NormalizedState<TestEntity> = {
        byId: {
          '1': { id: '1', name: 'Entity 1', value: 10 },
          '2': { id: '2', name: 'Entity 2', value: 20 },
        },
        allIds: ['1', '2'],
      };
      
      clearEntities(state);
      
      expect(state.byId).toEqual({});
      expect(state.allIds).toEqual([]);
    });
  });

  describe('setLoading', () => {
    it('sets loading to true and clears error', () => {
      const state = {
        loading: false,
        error: 'Some error',
      };
      
      setLoading(state, true);
      
      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('sets loading to false without clearing error', () => {
      const state = {
        loading: true,
        error: 'Some error',
      };
      
      setLoading(state, false);
      
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Some error');
    });
  });

  describe('setError', () => {
    it('sets error and stops loading', () => {
      const state = {
        loading: true,
        error: null,
      };
      
      setError(state, 'New error');
      
      expect(state.loading).toBe(false);
      expect(state.error).toBe('New error');
    });
  });

  describe('createEntitySelectors', () => {
    const selectors = createEntitySelectors<TestEntity>();
    
    const mockState: NormalizedState<TestEntity> = {
      byId: {
        '1': { id: '1', name: 'Entity 1', value: 10 },
        '2': { id: '2', name: 'Entity 2', value: 20 },
      },
      allIds: ['1', '2'],
    };

    it('selectAll returns all entities in order', () => {
      const result = selectors.selectAll(mockState);
      
      expect(result).toEqual([
        { id: '1', name: 'Entity 1', value: 10 },
        { id: '2', name: 'Entity 2', value: 20 },
      ]);
    });

    it('selectById returns specific entity', () => {
      const result = selectors.selectById(mockState, '1');
      
      expect(result).toEqual({ id: '1', name: 'Entity 1', value: 10 });
    });

    it('selectById returns undefined for non-existent entity', () => {
      const result = selectors.selectById(mockState, '3');
      
      expect(result).toBeUndefined();
    });

    it('selectIds returns all IDs', () => {
      const result = selectors.selectIds(mockState);
      
      expect(result).toEqual(['1', '2']);
    });

    it('selectEntities returns entities object', () => {
      const result = selectors.selectEntities(mockState);
      
      expect(result).toEqual({
        '1': { id: '1', name: 'Entity 1', value: 10 },
        '2': { id: '2', name: 'Entity 2', value: 20 },
      });
    });

    it('selectTotal returns total count', () => {
      const result = selectors.selectTotal(mockState);
      
      expect(result).toBe(2);
    });
  });
});