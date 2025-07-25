import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { baseService, Base, CreateBaseRequest, UpdateBaseRequest } from '../services/baseService';
import { tableService, Table, CreateTableRequest, UpdateTableRequest } from '../services/tableService';
import { recordService, Record, CreateRecordRequest, UpdateRecordRequest } from '../services/recordService';
import { viewService, View, CreateViewRequest, UpdateViewRequest } from '../services/viewService';

// Query Keys
export const queryKeys = {
  bases: ['bases'] as const,
  base: (id: string) => ['bases', id] as const,
  baseCollaborators: (id: string) => ['bases', id, 'collaborators'] as const,
  tables: (baseId: string) => ['bases', baseId, 'tables'] as const,
  table: (id: string) => ['tables', id] as const,
  records: (tableId: string, params?: any) => ['tables', tableId, 'records', params] as const,
  record: (id: string) => ['records', id] as const,
  views: (tableId: string) => ['tables', tableId, 'views'] as const,
  view: (id: string) => ['views', id] as const,
};

// Base Hooks
export const useBases = (options?: UseQueryOptions<Base[]>) => {
  return useQuery({
    queryKey: queryKeys.bases,
    queryFn: () => baseService.getBases(),
    ...options,
  });
};

export const useBase = (id: string, options?: UseQueryOptions<Base>) => {
  return useQuery({
    queryKey: queryKeys.base(id),
    queryFn: () => baseService.getBase(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateBase = (options?: UseMutationOptions<Base, Error, CreateBaseRequest>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateBaseRequest) => baseService.createBase(data),
    onSuccess: (newBase) => {
      queryClient.setQueryData(queryKeys.bases, (old: Base[] = []) => [...old, newBase]);
      queryClient.setQueryData(queryKeys.base(newBase.id), newBase);
    },
    ...options,
  });
};

export const useUpdateBase = (options?: UseMutationOptions<Base, Error, { id: string; data: UpdateBaseRequest }>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBaseRequest }) => 
      baseService.updateBase(id, data),
    onSuccess: (updatedBase) => {
      queryClient.setQueryData(queryKeys.base(updatedBase.id), updatedBase);
      queryClient.setQueryData(queryKeys.bases, (old: Base[] = []) =>
        old.map(base => base.id === updatedBase.id ? updatedBase : base)
      );
    },
    ...options,
  });
};

export const useDeleteBase = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => baseService.deleteBase(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.base(deletedId) });
      queryClient.setQueryData(queryKeys.bases, (old: Base[] = []) =>
        old.filter(base => base.id !== deletedId)
      );
    },
    ...options,
  });
};

// Table Hooks
export const useTables = (baseId: string, options?: UseQueryOptions<Table[]>) => {
  return useQuery({
    queryKey: queryKeys.tables(baseId),
    queryFn: () => tableService.getTables(baseId),
    enabled: !!baseId,
    ...options,
  });
};

export const useTable = (id: string, options?: UseQueryOptions<Table>) => {
  return useQuery({
    queryKey: queryKeys.table(id),
    queryFn: () => tableService.getTable(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateTable = (options?: UseMutationOptions<Table, Error, CreateTableRequest>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTableRequest) => tableService.createTable(data),
    onSuccess: (newTable) => {
      queryClient.setQueryData(queryKeys.tables(newTable.baseId), (old: Table[] = []) => 
        [...old, newTable]
      );
      queryClient.setQueryData(queryKeys.table(newTable.id), newTable);
    },
    ...options,
  });
};

// Record Hooks
export const useRecords = (
  tableId: string, 
  params?: any, 
  options?: UseQueryOptions<{ records: Record[]; totalCount: number }>
) => {
  return useQuery({
    queryKey: queryKeys.records(tableId, params),
    queryFn: () => recordService.getRecords(tableId, params),
    enabled: !!tableId,
    ...options,
  });
};

export const useRecord = (id: string, options?: UseQueryOptions<Record>) => {
  return useQuery({
    queryKey: queryKeys.record(id),
    queryFn: () => recordService.getRecord(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateRecord = (options?: UseMutationOptions<Record, Error, CreateRecordRequest>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateRecordRequest) => recordService.createRecord(data),
    onSuccess: (newRecord) => {
      // Invalidate records queries for the table
      queryClient.invalidateQueries({ queryKey: queryKeys.records(newRecord.tableId) });
      queryClient.setQueryData(queryKeys.record(newRecord.id), newRecord);
    },
    ...options,
  });
};

export const useUpdateRecord = (options?: UseMutationOptions<Record, Error, { id: string; data: UpdateRecordRequest }>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecordRequest }) => 
      recordService.updateRecord(id, data),
    onSuccess: (updatedRecord) => {
      queryClient.setQueryData(queryKeys.record(updatedRecord.id), updatedRecord);
      // Invalidate records queries for the table
      queryClient.invalidateQueries({ queryKey: queryKeys.records(updatedRecord.tableId) });
    },
    ...options,
  });
};

export const useDeleteRecord = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => recordService.deleteRecord(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.record(deletedId) });
      // Invalidate all records queries since we don't know which table it belonged to
      queryClient.invalidateQueries({ queryKey: ['tables'], predicate: (query) => 
        query.queryKey.includes('records')
      });
    },
    ...options,
  });
};

// View Hooks
export const useViews = (tableId: string, options?: UseQueryOptions<View[]>) => {
  return useQuery({
    queryKey: queryKeys.views(tableId),
    queryFn: () => viewService.getViews(tableId),
    enabled: !!tableId,
    ...options,
  });
};

export const useView = (id: string, options?: UseQueryOptions<View>) => {
  return useQuery({
    queryKey: queryKeys.view(id),
    queryFn: () => viewService.getView(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateView = (options?: UseMutationOptions<View, Error, CreateViewRequest>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateViewRequest) => viewService.createView(data),
    onSuccess: (newView) => {
      queryClient.setQueryData(queryKeys.views(newView.tableId), (old: View[] = []) => 
        [...old, newView]
      );
      queryClient.setQueryData(queryKeys.view(newView.id), newView);
    },
    ...options,
  });
};

// Optimistic Updates Helper
export const useOptimisticUpdate = () => {
  const queryClient = useQueryClient();
  
  return {
    updateRecord: (recordId: string, updates: Partial<Record>) => {
      queryClient.setQueryData(queryKeys.record(recordId), (old: Record | undefined) => 
        old ? { ...old, ...updates } : undefined
      );
    },
    
    revertRecord: (recordId: string, originalData: Record) => {
      queryClient.setQueryData(queryKeys.record(recordId), originalData);
    },
  };
};