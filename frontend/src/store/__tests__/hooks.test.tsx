import React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useEntitySelectors, useLoadingState } from '../hooks';
import { createInitialEntityState } from '../utils/normalizedState';

// Mock reducer with normalized state
const initialState = {
  testEntities: createInitialEntityState<{ id: string; name: string }>(),
};

// Add some test data
initialState.testEntities.byId = {
  '1': { id: '1', name: 'Test 1' },
  '2': { id: '2', name: 'Test 2' },
};
initialState.testEntities.allIds = ['1', '2'];
initialState.testEntities.loading = false;
initialState.testEntities.error = null;

const mockReducer = (state = initialState) => state;

describe('Store Hooks', () => {
  const store = configureStore({
    reducer: mockReducer,
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  describe('useEntitySelectors', () => {
    it('should select all entities', () => {
      const { result } = renderHook(
        () => {
          const { useSelectAll } = useEntitySelectors<{ id: string; name: string }>(
            state => state.testEntities
          );
          return useSelectAll();
        },
        { wrapper }
      );

      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual({ id: '1', name: 'Test 1' });
      expect(result.current[1]).toEqual({ id: '2', name: 'Test 2' });
    });

    it('should select entity by id', () => {
      const { result } = renderHook(
        () => {
          const { useSelectById } = useEntitySelectors<{ id: string; name: string }>(
            state => state.testEntities
          );
          return useSelectById('1');
        },
        { wrapper }
      );

      expect(result.current).toEqual({ id: '1', name: 'Test 1' });
    });

    it('should select all ids', () => {
      const { result } = renderHook(
        () => {
          const { useSelectIds } = useEntitySelectors<{ id: string; name: string }>(
            state => state.testEntities
          );
          return useSelectIds();
        },
        { wrapper }
      );

      expect(result.current).toEqual(['1', '2']);
    });

    it('should select total count', () => {
      const { result } = renderHook(
        () => {
          const { useSelectTotal } = useEntitySelectors<{ id: string; name: string }>(
            state => state.testEntities
          );
          return useSelectTotal();
        },
        { wrapper }
      );

      expect(result.current).toBe(2);
    });
  });

  describe('useLoadingState', () => {
    it('should return loading state', () => {
      const { result } = renderHook(
        () => useLoadingState(state => state.testEntities),
        { wrapper }
      );

      expect(result.current).toEqual({
        loading: false,
        error: null,
        isError: false,
      });
    });
  });
});