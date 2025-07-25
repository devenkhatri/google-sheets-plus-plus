// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// File size limits
export const MAX_IMPORT_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Other configuration
export const DEFAULT_PAGE_SIZE = 50;