import axios from 'axios';
import { API_URL } from '../config';

export interface SearchResult {
  id: string;
  type: 'base' | 'table' | 'record';
  title: string;
  context: string;
  baseId: string;
  baseName: string;
  tableId?: string;
  tableName?: string;
  recordId?: string;
  fieldId?: string;
  fieldName?: string;
  matchedText?: string;
  score: number;
  lastModified: Date;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  baseId?: string;
  tableId?: string;
  fieldIds?: string[];
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchOptions {
  query: string;
  baseId?: string;
  tableId?: string;
  fieldIds?: string[];
  limit?: number;
  offset?: number;
  savedSearchId?: string;
}

/**
 * Perform a search across bases, tables, and records
 */
export const search = async (options: SearchOptions): Promise<SearchResponse> => {
  const { query, baseId, tableId, fieldIds, limit, offset, savedSearchId } = options;
  
  const params = new URLSearchParams();
  params.append('query', query);
  
  if (baseId) params.append('baseId', baseId);
  if (tableId) params.append('tableId', tableId);
  if (fieldIds && fieldIds.length > 0) params.append('fieldIds', fieldIds.join(','));
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  if (savedSearchId) params.append('savedSearchId', savedSearchId);
  
  const response = await axios.get(`${API_URL}/search?${params.toString()}`);
  return response.data;
};

/**
 * Save a search query
 */
export const saveSearch = async (savedSearch: Omit<SavedSearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SavedSearch> => {
  const response = await axios.post(`${API_URL}/search/saved`, savedSearch);
  return response.data;
};

/**
 * Get saved searches for the current user
 */
export const getSavedSearches = async (): Promise<SavedSearch[]> => {
  const response = await axios.get(`${API_URL}/search/saved`);
  return response.data;
};

/**
 * Delete a saved search
 */
export const deleteSavedSearch = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/search/saved/${id}`);
};

/**
 * Update a saved search
 */
export const updateSavedSearch = async (id: string, updates: Partial<Omit<SavedSearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<SavedSearch> => {
  const response = await axios.put(`${API_URL}/search/saved/${id}`, updates);
  return response.data;
};