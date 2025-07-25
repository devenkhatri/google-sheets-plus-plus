/**
 * Airtable Clone SDK for JavaScript
 * A client library for interacting with the Airtable Clone API
 */
class AirtableCloneSDK {
  /**
   * Create a new SDK instance
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - API key for authentication
   * @param {string} options.baseUrl - Base URL for the API (default: 'http://localhost:3000/api/v1')
   */
  constructor(options) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'http://localhost:3000/api/v1';
    this.token = options.token;
  }

  /**
   * Make an API request
   * @private
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {Object} [data] - Request data
   * @returns {Promise<Object>} - API response
   */
  async _request(method, path, data = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      const error = new Error(responseData.message || 'API request failed');
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  }

  /**
   * Authentication methods
   */
  auth = {
    /**
     * Login with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} - Authentication response with token
     */
    login: async (email, password) => {
      const response = await this._request('POST', '/auth/login', { email, password });
      this.token = response.data.token;
      return response;
    },

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} - Registration response
     */
    register: async (userData) => {
      return await this._request('POST', '/auth/register', userData);
    },

    /**
     * Get current user profile
     * @returns {Promise<Object>} - User profile
     */
    getProfile: async () => {
      return await this._request('GET', '/auth/profile');
    },

    /**
     * Create a new API key
     * @param {Object} apiKeyData - API key data
     * @returns {Promise<Object>} - Created API key
     */
    createApiKey: async (apiKeyData) => {
      return await this._request('POST', '/auth/api-keys', apiKeyData);
    },

    /**
     * List API keys
     * @returns {Promise<Object>} - List of API keys
     */
    listApiKeys: async () => {
      return await this._request('GET', '/auth/api-keys');
    },

    /**
     * Delete an API key
     * @param {string} apiKeyId - API key ID
     * @returns {Promise<Object>} - Deletion response
     */
    deleteApiKey: async (apiKeyId) => {
      return await this._request('DELETE', `/auth/api-keys/${apiKeyId}`);
    },
  };

  /**
   * Base methods
   */
  bases = {
    /**
     * Create a new base
     * @param {Object} baseData - Base data
     * @returns {Promise<Object>} - Created base
     */
    create: async (baseData) => {
      return await this._request('POST', '/bases', baseData);
    },

    /**
     * Get all bases
     * @returns {Promise<Object>} - List of bases
     */
    list: async () => {
      return await this._request('GET', '/bases');
    },

    /**
     * Get a base by ID
     * @param {string} baseId - Base ID
     * @returns {Promise<Object>} - Base details
     */
    get: async (baseId) => {
      return await this._request('GET', `/bases/${baseId}`);
    },

    /**
     * Update a base
     * @param {string} baseId - Base ID
     * @param {Object} baseData - Base data to update
     * @returns {Promise<Object>} - Updated base
     */
    update: async (baseId, baseData) => {
      return await this._request('PATCH', `/bases/${baseId}`, baseData);
    },

    /**
     * Delete a base
     * @param {string} baseId - Base ID
     * @returns {Promise<Object>} - Deletion response
     */
    delete: async (baseId) => {
      return await this._request('DELETE', `/bases/${baseId}`);
    },

    /**
     * Share a base with users
     * @param {string} baseId - Base ID
     * @param {Object} shareData - Share configuration
     * @returns {Promise<Object>} - Share response
     */
    share: async (baseId, shareData) => {
      return await this._request('POST', `/bases/${baseId}/share`, shareData);
    },
  };

  /**
   * Table methods
   */
  tables = {
    /**
     * Create a new table
     * @param {Object} tableData - Table data
     * @returns {Promise<Object>} - Created table
     */
    create: async (tableData) => {
      return await this._request('POST', '/tables', tableData);
    },

    /**
     * Get tables in a base
     * @param {string} baseId - Base ID
     * @returns {Promise<Object>} - List of tables
     */
    list: async (baseId) => {
      return await this._request('GET', `/bases/${baseId}/tables`);
    },

    /**
     * Get a table by ID
     * @param {string} tableId - Table ID
     * @returns {Promise<Object>} - Table details
     */
    get: async (tableId) => {
      return await this._request('GET', `/tables/${tableId}`);
    },

    /**
     * Update a table
     * @param {string} tableId - Table ID
     * @param {Object} tableData - Table data to update
     * @returns {Promise<Object>} - Updated table
     */
    update: async (tableId, tableData) => {
      return await this._request('PATCH', `/tables/${tableId}`, tableData);
    },

    /**
     * Delete a table
     * @param {string} tableId - Table ID
     * @returns {Promise<Object>} - Deletion response
     */
    delete: async (tableId) => {
      return await this._request('DELETE', `/tables/${tableId}`);
    },
  };

  /**
   * Record methods
   */
  records = {
    /**
     * Create a new record
     * @param {string} tableId - Table ID
     * @param {Object} recordData - Record data
     * @returns {Promise<Object>} - Created record
     */
    create: async (tableId, recordData) => {
      return await this._request('POST', `/tables/${tableId}/records`, recordData);
    },

    /**
     * Get records from a table
     * @param {string} tableId - Table ID
     * @param {Object} [queryParams] - Query parameters
     * @returns {Promise<Object>} - List of records
     */
    list: async (tableId, queryParams = {}) => {
      const queryString = new URLSearchParams(queryParams).toString();
      return await this._request('GET', `/tables/${tableId}/records${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get a record by ID
     * @param {string} tableId - Table ID
     * @param {string} recordId - Record ID
     * @returns {Promise<Object>} - Record details
     */
    get: async (tableId, recordId) => {
      return await this._request('GET', `/tables/${tableId}/records/${recordId}`);
    },

    /**
     * Update a record
     * @param {string} tableId - Table ID
     * @param {string} recordId - Record ID
     * @param {Object} recordData - Record data to update
     * @returns {Promise<Object>} - Updated record
     */
    update: async (tableId, recordId, recordData) => {
      return await this._request('PATCH', `/tables/${tableId}/records/${recordId}`, recordData);
    },

    /**
     * Delete a record
     * @param {string} tableId - Table ID
     * @param {string} recordId - Record ID
     * @returns {Promise<Object>} - Deletion response
     */
    delete: async (tableId, recordId) => {
      return await this._request('DELETE', `/tables/${tableId}/records/${recordId}`);
    },

    /**
     * Bulk create records
     * @param {string} tableId - Table ID
     * @param {Array} records - Array of record data
     * @returns {Promise<Object>} - Bulk creation response
     */
    bulkCreate: async (tableId, records) => {
      return await this._request('POST', `/tables/${tableId}/records/bulk`, { records });
    },

    /**
     * Bulk update records
     * @param {string} tableId - Table ID
     * @param {Array} records - Array of record updates
     * @returns {Promise<Object>} - Bulk update response
     */
    bulkUpdate: async (tableId, records) => {
      return await this._request('PATCH', `/tables/${tableId}/records/bulk`, { records });
    },

    /**
     * Bulk delete records
     * @param {string} tableId - Table ID
     * @param {Array} recordIds - Array of record IDs
     * @returns {Promise<Object>} - Bulk deletion response
     */
    bulkDelete: async (tableId, recordIds) => {
      return await this._request('DELETE', `/tables/${tableId}/records/bulk`, { recordIds });
    },
  };

  /**
   * Field methods
   */
  fields = {
    /**
     * Create a new field
     * @param {string} tableId - Table ID
     * @param {Object} fieldData - Field data
     * @returns {Promise<Object>} - Created field
     */
    create: async (tableId, fieldData) => {
      return await this._request('POST', `/tables/${tableId}/fields`, fieldData);
    },

    /**
     * Get fields in a table
     * @param {string} tableId - Table ID
     * @returns {Promise<Object>} - List of fields
     */
    list: async (tableId) => {
      return await this._request('GET', `/tables/${tableId}/fields`);
    },

    /**
     * Get a field by ID
     * @param {string} tableId - Table ID
     * @param {string} fieldId - Field ID
     * @returns {Promise<Object>} - Field details
     */
    get: async (tableId, fieldId) => {
      return await this._request('GET', `/tables/${tableId}/fields/${fieldId}`);
    },

    /**
     * Update a field
     * @param {string} tableId - Table ID
     * @param {string} fieldId - Field ID
     * @param {Object} fieldData - Field data to update
     * @returns {Promise<Object>} - Updated field
     */
    update: async (tableId, fieldId, fieldData) => {
      return await this._request('PATCH', `/tables/${tableId}/fields/${fieldId}`, fieldData);
    },

    /**
     * Delete a field
     * @param {string} tableId - Table ID
     * @param {string} fieldId - Field ID
     * @returns {Promise<Object>} - Deletion response
     */
    delete: async (tableId, fieldId) => {
      return await this._request('DELETE', `/tables/${tableId}/fields/${fieldId}`);
    },
  };

  /**
   * View methods
   */
  views = {
    /**
     * Create a new view
     * @param {string} tableId - Table ID
     * @param {Object} viewData - View data
     * @returns {Promise<Object>} - Created view
     */
    create: async (tableId, viewData) => {
      return await this._request('POST', `/tables/${tableId}/views`, viewData);
    },

    /**
     * Get views in a table
     * @param {string} tableId - Table ID
     * @returns {Promise<Object>} - List of views
     */
    list: async (tableId) => {
      return await this._request('GET', `/tables/${tableId}/views`);
    },

    /**
     * Get a view by ID
     * @param {string} tableId - Table ID
     * @param {string} viewId - View ID
     * @returns {Promise<Object>} - View details
     */
    get: async (tableId, viewId) => {
      return await this._request('GET', `/tables/${tableId}/views/${viewId}`);
    },

    /**
     * Update a view
     * @param {string} tableId - Table ID
     * @param {string} viewId - View ID
     * @param {Object} viewData - View data to update
     * @returns {Promise<Object>} - Updated view
     */
    update: async (tableId, viewId, viewData) => {
      return await this._request('PATCH', `/tables/${tableId}/views/${viewId}`, viewData);
    },

    /**
     * Delete a view
     * @param {string} tableId - Table ID
     * @param {string} viewId - View ID
     * @returns {Promise<Object>} - Deletion response
     */
    delete: async (tableId, viewId) => {
      return await this._request('DELETE', `/tables/${tableId}/views/${viewId}`);
    },
  };

  /**
   * Webhook methods
   */
  webhooks = {
    /**
     * Create a new webhook
     * @param {Object} webhookData - Webhook data
     * @returns {Promise<Object>} - Created webhook
     */
    create: async (webhookData) => {
      return await this._request('POST', '/webhooks', webhookData);
    },

    /**
     * Get webhooks for a base
     * @param {string} baseId - Base ID
     * @returns {Promise<Object>} - List of webhooks
     */
    list: async (baseId) => {
      return await this._request('GET', `/webhooks/base/${baseId}`);
    },

    /**
     * Get a webhook by ID
     * @param {string} webhookId - Webhook ID
     * @returns {Promise<Object>} - Webhook details
     */
    get: async (webhookId) => {
      return await this._request('GET', `/webhooks/${webhookId}`);
    },

    /**
     * Update a webhook
     * @param {string} webhookId - Webhook ID
     * @param {Object} webhookData - Webhook data to update
     * @returns {Promise<Object>} - Updated webhook
     */
    update: async (webhookId, webhookData) => {
      return await this._request('PATCH', `/webhooks/${webhookId}`, webhookData);
    },

    /**
     * Delete a webhook
     * @param {string} webhookId - Webhook ID
     * @returns {Promise<Object>} - Deletion response
     */
    delete: async (webhookId) => {
      return await this._request('DELETE', `/webhooks/${webhookId}`);
    },

    /**
     * Toggle webhook active status
     * @param {string} webhookId - Webhook ID
     * @param {boolean} active - Active status
     * @returns {Promise<Object>} - Updated webhook
     */
    toggleActive: async (webhookId, active) => {
      return await this._request('PATCH', `/webhooks/${webhookId}/active`, { active });
    },

    /**
     * Get webhook deliveries
     * @param {string} webhookId - Webhook ID
     * @param {number} [limit=50] - Maximum number of deliveries to return
     * @returns {Promise<Object>} - List of webhook deliveries
     */
    getDeliveries: async (webhookId, limit = 50) => {
      return await this._request('GET', `/webhooks/${webhookId}/deliveries?limit=${limit}`);
    },
  };

  /**
   * Search methods
   */
  search = {
    /**
     * Global search across all bases
     * @param {string} query - Search query
     * @param {Object} [options] - Search options
     * @returns {Promise<Object>} - Search results
     */
    global: async (query, options = {}) => {
      const params = new URLSearchParams({ query, ...options }).toString();
      return await this._request('GET', `/search?${params}`);
    },

    /**
     * Search within a base
     * @param {string} baseId - Base ID
     * @param {string} query - Search query
     * @param {Object} [options] - Search options
     * @returns {Promise<Object>} - Search results
     */
    base: async (baseId, query, options = {}) => {
      const params = new URLSearchParams({ query, ...options }).toString();
      return await this._request('GET', `/search/base/${baseId}?${params}`);
    },

    /**
     * Search within a table
     * @param {string} tableId - Table ID
     * @param {string} query - Search query
     * @param {Object} [options] - Search options
     * @returns {Promise<Object>} - Search results
     */
    table: async (tableId, query, options = {}) => {
      const params = new URLSearchParams({ query, ...options }).toString();
      return await this._request('GET', `/search/table/${tableId}?${params}`);
    },
  };

  /**
   * Import/Export methods
   */
  importExport = {
    /**
     * Import data from CSV
     * @param {string} tableId - Table ID
     * @param {File|Blob} csvFile - CSV file
     * @param {Object} [options] - Import options
     * @returns {Promise<Object>} - Import results
     */
    importCsv: async (tableId, csvFile, options = {}) => {
      const formData = new FormData();
      formData.append('file', csvFile);
      
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const url = `${this.baseUrl}/import/csv/${tableId}`;
      const headers = {};

      // Add authentication
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      } else if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        const error = new Error(responseData.message || 'API request failed');
        error.status = response.status;
        error.data = responseData;
        throw error;
      }

      return responseData;
    },

    /**
     * Export data to CSV
     * @param {string} tableId - Table ID
     * @param {Object} [options] - Export options
     * @returns {Promise<Blob>} - CSV file blob
     */
    exportCsv: async (tableId, options = {}) => {
      const params = new URLSearchParams(options).toString();
      const url = `${this.baseUrl}/export/csv/${tableId}${params ? `?${params}` : ''}`;
      const headers = {};

      // Add authentication
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      } else if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const responseData = await response.json();
        const error = new Error(responseData.message || 'API request failed');
        error.status = response.status;
        error.data = responseData;
        throw error;
      }

      return await response.blob();
    },
  };
}

// Export for browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AirtableCloneSDK;
} else {
  window.AirtableCloneSDK = AirtableCloneSDK;
}