import { View } from '../store/slices/viewSlice';

// Types for API requests
interface CreateViewRequest {
  name: string;
  type: 'grid' | 'kanban' | 'calendar' | 'gallery';
  configuration?: any;
  filters?: any[];
  sorts?: any[];
  field_visibility?: Record<string, boolean>;
}

interface UpdateViewRequest {
  name?: string;
  type?: 'grid' | 'kanban' | 'calendar' | 'gallery';
  configuration?: any;
  filters?: any[];
  sorts?: any[];
  field_visibility?: Record<string, boolean>;
}

// Helper function to transform backend view to frontend view
const transformViewFromBackend = (backendView: any): View => ({
  id: backendView.id,
  tableId: backendView.table_id,
  name: backendView.name,
  type: backendView.type,
  filters: backendView.filters || [],
  sorts: backendView.sorts || [],
  fieldVisibility: backendView.field_visibility || {},
  configuration: backendView.configuration || {},
});

// Helper function to transform frontend view to backend format
// const transformViewToBackend = (frontendView: Partial<Omit<View, 'id' | 'tableId'>>): any => {
//   const backendView: any = {};
//   
//   if (frontendView.name !== undefined) backendView.name = frontendView.name;
//   if (frontendView.type !== undefined) backendView.type = frontendView.type;
//   if (frontendView.configuration !== undefined) backendView.configuration = frontendView.configuration;
//   if (frontendView.filters !== undefined) backendView.filters = frontendView.filters;
//   if (frontendView.sorts !== undefined) backendView.sorts = frontendView.sorts;
//   if (frontendView.fieldVisibility !== undefined) backendView.field_visibility = frontendView.fieldVisibility;
//   
//   return backendView;
// };

export const viewService = {
  /**
   * Get views for a table
   */
  async getViews(tableId: string): Promise<View[]> {
    const response = await fetch(`/api/v1/tables/${tableId}/views`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch views for table: ${tableId}`);
    }

    const data = await response.json();
    return data.data.map(transformViewFromBackend);
  },

  /**
   * Get a view by ID
   */
  async getView(viewId: string): Promise<View> {
    const response = await fetch(`/api/v1/views/${viewId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch view: ${viewId}`);
    }

    const data = await response.json();
    return transformViewFromBackend(data.data);
  },

  /**
   * Create a new view
   */
  async createView(tableId: string, viewData: CreateViewRequest): Promise<View> {
    const response = await fetch(`/api/v1/tables/${tableId}/views`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(viewData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create view');
    }

    const data = await response.json();
    return transformViewFromBackend(data.data);
  },

  /**
   * Update a view
   */
  async updateView(viewId: string, viewData: UpdateViewRequest): Promise<View> {
    const response = await fetch(`/api/v1/views/${viewId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(viewData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update view');
    }

    const data = await response.json();
    return transformViewFromBackend(data.data);
  },

  /**
   * Delete a view
   */
  async deleteView(viewId: string): Promise<void> {
    const response = await fetch(`/api/v1/views/${viewId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete view');
    }
  },

  /**
   * Duplicate a view
   */
  async duplicateView(viewId: string, name?: string): Promise<View> {
    const response = await fetch(`/api/v1/views/${viewId}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to duplicate view');
    }

    const data = await response.json();
    return transformViewFromBackend(data.data);
  },

  /**
   * Update view filters
   */
  async updateViewFilters(viewId: string, filters: any[]): Promise<View> {
    const response = await fetch(`/api/v1/views/${viewId}/filters`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ filters }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update view filters');
    }

    const data = await response.json();
    return transformViewFromBackend(data.data);
  },

  /**
   * Update view sorts
   */
  async updateViewSorts(viewId: string, sorts: any[]): Promise<View> {
    const response = await fetch(`/api/v1/views/${viewId}/sorts`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ sorts }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update view sorts');
    }

    const data = await response.json();
    return transformViewFromBackend(data.data);
  },

  /**
   * Update view field visibility
   */
  async updateViewFieldVisibility(viewId: string, fieldVisibility: Record<string, boolean>): Promise<View> {
    const response = await fetch(`/api/v1/views/${viewId}/field-visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ field_visibility: fieldVisibility }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update view field visibility');
    }

    const data = await response.json();
    return transformViewFromBackend(data.data);
  },

  /**
   * Generate a deep link to a view
   */
  async generateViewDeepLink(viewId: string): Promise<string> {
    const response = await fetch(`/api/v1/views/${viewId}/deep-link`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate view deep link');
    }

    const data = await response.json();
    return data.data.deepLink;
  },

  /**
   * Share a view with a user
   */
  async shareView(viewId: string, email: string, permissionLevel: string): Promise<any> {
    const response = await fetch(`/api/v1/views/${viewId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, permissionLevel }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to share view');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Create a view template
   */
  async createViewTemplate(viewId: string, name: string): Promise<any> {
    const response = await fetch(`/api/v1/views/${viewId}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create view template');
    }

    const data = await response.json();
    return data.data;
  },
};