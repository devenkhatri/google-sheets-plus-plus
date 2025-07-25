import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';
import type { RootState, AppDispatch } from './index';
import { createEntitySelectors, NormalizedState } from './utils/normalizedState';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hook for working with normalized entities
export function useEntitySelectors<T>(selectState: (state: RootState) => NormalizedState<T>) {
  const selectors = useMemo(() => createEntitySelectors<T>(), []);
  
  return {
    useSelectAll: () => useAppSelector(state => selectors.selectAll(selectState(state))),
    useSelectById: (id: string) => useAppSelector(state => selectors.selectById(selectState(state), id)),
    useSelectIds: () => useAppSelector(state => selectors.selectIds(selectState(state))),
    useSelectEntities: () => useAppSelector(state => selectors.selectEntities(selectState(state))),
    useSelectTotal: () => useAppSelector(state => selectors.selectTotal(selectState(state))),
  };
}

// Custom hook for loading states
export function useLoadingState(selector: (state: RootState) => { loading: boolean; error: string | null }) {
  const { loading, error } = useAppSelector(selector);
  return { loading, error, isError: !!error };
}