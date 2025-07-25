"""
Airtable Clone SDK for Python
A client library for interacting with the Airtable Clone API
"""

import json
import requests
from typing import Dict, List, Optional, Union, Any


class AirtableCloneSDK:
    """
    Client SDK for interacting with the Airtable Clone API
    """

    def __init__(self, api_key: Optional[str] = None, token: Optional[str] = None, base_url: str = "http://localhost:3000/api/v1"):
        """
        Initialize the SDK with authentication credentials
        
        Args:
            api_key: API key for authentication
            token: JWT token for authentication
            base_url: Base URL for the API
        """
        self.api_key = api_key
        self.token = token
        self.base_url = base_url
        
        # Initialize API resources
        self.auth = Auth(self)
        self.bases = Bases(self)
        self.tables = Tables(self)
        self.records = Records(self)
        self.fields = Fields(self)
        self.views = Views(self)
        self.webhooks = Webhooks(self)
        self.search = Search(self)
        self.import_export = ImportExport(self)
    
    def _request(self, method: str, path: str, data: Optional[Dict] = None, files: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict:
        """
        Make an API request
        
        Args:
            method: HTTP method
            path: API path
            data: Request data
            files: Files to upload
            params: Query parameters
            
        Returns:
            API response
        """
        url = f"{self.base_url}{path}"
        headers = {}
        
        # Add authentication
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        elif self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        # Add content type for JSON requests
        if data and not files:
            headers["Content-Type"] = "application/json"
        
        # Make the request
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data if data and not files else None,
            files=files,
            params=params
        )
        
        # Handle errors
        if not response.ok:
            try:
                error_data = response.json()
                error_message = error_data.get("message", "API request failed")
            except:
                error_message = "API request failed"
            
            raise APIError(error_message, response.status_code, response)
        
        # Return JSON response
        return response.json()


class Auth:
    """Authentication methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def login(self, email: str, password: str) -> Dict:
        """
        Login with email and password
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Authentication response with token
        """
        response = self.client._request("POST", "/auth/login", {"email": email, "password": password})
        self.client.token = response["data"]["token"]
        return response
    
    def register(self, user_data: Dict) -> Dict:
        """
        Register a new user
        
        Args:
            user_data: User registration data
            
        Returns:
            Registration response
        """
        return self.client._request("POST", "/auth/register", user_data)
    
    def get_profile(self) -> Dict:
        """
        Get current user profile
        
        Returns:
            User profile
        """
        return self.client._request("GET", "/auth/profile")
    
    def create_api_key(self, api_key_data: Dict) -> Dict:
        """
        Create a new API key
        
        Args:
            api_key_data: API key data
            
        Returns:
            Created API key
        """
        return self.client._request("POST", "/auth/api-keys", api_key_data)
    
    def list_api_keys(self) -> Dict:
        """
        List API keys
        
        Returns:
            List of API keys
        """
        return self.client._request("GET", "/auth/api-keys")
    
    def delete_api_key(self, api_key_id: str) -> Dict:
        """
        Delete an API key
        
        Args:
            api_key_id: API key ID
            
        Returns:
            Deletion response
        """
        return self.client._request("DELETE", f"/auth/api-keys/{api_key_id}")


class Bases:
    """Base methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def create(self, base_data: Dict) -> Dict:
        """
        Create a new base
        
        Args:
            base_data: Base data
            
        Returns:
            Created base
        """
        return self.client._request("POST", "/bases", base_data)
    
    def list(self) -> Dict:
        """
        Get all bases
        
        Returns:
            List of bases
        """
        return self.client._request("GET", "/bases")
    
    def get(self, base_id: str) -> Dict:
        """
        Get a base by ID
        
        Args:
            base_id: Base ID
            
        Returns:
            Base details
        """
        return self.client._request("GET", f"/bases/{base_id}")
    
    def update(self, base_id: str, base_data: Dict) -> Dict:
        """
        Update a base
        
        Args:
            base_id: Base ID
            base_data: Base data to update
            
        Returns:
            Updated base
        """
        return self.client._request("PATCH", f"/bases/{base_id}", base_data)
    
    def delete(self, base_id: str) -> Dict:
        """
        Delete a base
        
        Args:
            base_id: Base ID
            
        Returns:
            Deletion response
        """
        return self.client._request("DELETE", f"/bases/{base_id}")
    
    def share(self, base_id: str, share_data: Dict) -> Dict:
        """
        Share a base with users
        
        Args:
            base_id: Base ID
            share_data: Share configuration
            
        Returns:
            Share response
        """
        return self.client._request("POST", f"/bases/{base_id}/share", share_data)


class Tables:
    """Table methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def create(self, table_data: Dict) -> Dict:
        """
        Create a new table
        
        Args:
            table_data: Table data
            
        Returns:
            Created table
        """
        return self.client._request("POST", "/tables", table_data)
    
    def list(self, base_id: str) -> Dict:
        """
        Get tables in a base
        
        Args:
            base_id: Base ID
            
        Returns:
            List of tables
        """
        return self.client._request("GET", f"/bases/{base_id}/tables")
    
    def get(self, table_id: str) -> Dict:
        """
        Get a table by ID
        
        Args:
            table_id: Table ID
            
        Returns:
            Table details
        """
        return self.client._request("GET", f"/tables/{table_id}")
    
    def update(self, table_id: str, table_data: Dict) -> Dict:
        """
        Update a table
        
        Args:
            table_id: Table ID
            table_data: Table data to update
            
        Returns:
            Updated table
        """
        return self.client._request("PATCH", f"/tables/{table_id}", table_data)
    
    def delete(self, table_id: str) -> Dict:
        """
        Delete a table
        
        Args:
            table_id: Table ID
            
        Returns:
            Deletion response
        """
        return self.client._request("DELETE", f"/tables/{table_id}")


class Records:
    """Record methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def create(self, table_id: str, record_data: Dict) -> Dict:
        """
        Create a new record
        
        Args:
            table_id: Table ID
            record_data: Record data
            
        Returns:
            Created record
        """
        return self.client._request("POST", f"/tables/{table_id}/records", record_data)
    
    def list(self, table_id: str, query_params: Optional[Dict] = None) -> Dict:
        """
        Get records from a table
        
        Args:
            table_id: Table ID
            query_params: Query parameters
            
        Returns:
            List of records
        """
        return self.client._request("GET", f"/tables/{table_id}/records", params=query_params)
    
    def get(self, table_id: str, record_id: str) -> Dict:
        """
        Get a record by ID
        
        Args:
            table_id: Table ID
            record_id: Record ID
            
        Returns:
            Record details
        """
        return self.client._request("GET", f"/tables/{table_id}/records/{record_id}")
    
    def update(self, table_id: str, record_id: str, record_data: Dict) -> Dict:
        """
        Update a record
        
        Args:
            table_id: Table ID
            record_id: Record ID
            record_data: Record data to update
            
        Returns:
            Updated record
        """
        return self.client._request("PATCH", f"/tables/{table_id}/records/{record_id}", record_data)
    
    def delete(self, table_id: str, record_id: str) -> Dict:
        """
        Delete a record
        
        Args:
            table_id: Table ID
            record_id: Record ID
            
        Returns:
            Deletion response
        """
        return self.client._request("DELETE", f"/tables/{table_id}/records/{record_id}")
    
    def bulk_create(self, table_id: str, records: List[Dict]) -> Dict:
        """
        Bulk create records
        
        Args:
            table_id: Table ID
            records: Array of record data
            
        Returns:
            Bulk creation response
        """
        return self.client._request("POST", f"/tables/{table_id}/records/bulk", {"records": records})
    
    def bulk_update(self, table_id: str, records: List[Dict]) -> Dict:
        """
        Bulk update records
        
        Args:
            table_id: Table ID
            records: Array of record updates
            
        Returns:
            Bulk update response
        """
        return self.client._request("PATCH", f"/tables/{table_id}/records/bulk", {"records": records})
    
    def bulk_delete(self, table_id: str, record_ids: List[str]) -> Dict:
        """
        Bulk delete records
        
        Args:
            table_id: Table ID
            record_ids: Array of record IDs
            
        Returns:
            Bulk deletion response
        """
        return self.client._request("DELETE", f"/tables/{table_id}/records/bulk", {"recordIds": record_ids})


class Fields:
    """Field methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def create(self, table_id: str, field_data: Dict) -> Dict:
        """
        Create a new field
        
        Args:
            table_id: Table ID
            field_data: Field data
            
        Returns:
            Created field
        """
        return self.client._request("POST", f"/tables/{table_id}/fields", field_data)
    
    def list(self, table_id: str) -> Dict:
        """
        Get fields in a table
        
        Args:
            table_id: Table ID
            
        Returns:
            List of fields
        """
        return self.client._request("GET", f"/tables/{table_id}/fields")
    
    def get(self, table_id: str, field_id: str) -> Dict:
        """
        Get a field by ID
        
        Args:
            table_id: Table ID
            field_id: Field ID
            
        Returns:
            Field details
        """
        return self.client._request("GET", f"/tables/{table_id}/fields/{field_id}")
    
    def update(self, table_id: str, field_id: str, field_data: Dict) -> Dict:
        """
        Update a field
        
        Args:
            table_id: Table ID
            field_id: Field ID
            field_data: Field data to update
            
        Returns:
            Updated field
        """
        return self.client._request("PATCH", f"/tables/{table_id}/fields/{field_id}", field_data)
    
    def delete(self, table_id: str, field_id: str) -> Dict:
        """
        Delete a field
        
        Args:
            table_id: Table ID
            field_id: Field ID
            
        Returns:
            Deletion response
        """
        return self.client._request("DELETE", f"/tables/{table_id}/fields/{field_id}")


class Views:
    """View methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def create(self, table_id: str, view_data: Dict) -> Dict:
        """
        Create a new view
        
        Args:
            table_id: Table ID
            view_data: View data
            
        Returns:
            Created view
        """
        return self.client._request("POST", f"/tables/{table_id}/views", view_data)
    
    def list(self, table_id: str) -> Dict:
        """
        Get views in a table
        
        Args:
            table_id: Table ID
            
        Returns:
            List of views
        """
        return self.client._request("GET", f"/tables/{table_id}/views")
    
    def get(self, table_id: str, view_id: str) -> Dict:
        """
        Get a view by ID
        
        Args:
            table_id: Table ID
            view_id: View ID
            
        Returns:
            View details
        """
        return self.client._request("GET", f"/tables/{table_id}/views/{view_id}")
    
    def update(self, table_id: str, view_id: str, view_data: Dict) -> Dict:
        """
        Update a view
        
        Args:
            table_id: Table ID
            view_id: View ID
            view_data: View data to update
            
        Returns:
            Updated view
        """
        return self.client._request("PATCH", f"/tables/{table_id}/views/{view_id}", view_data)
    
    def delete(self, table_id: str, view_id: str) -> Dict:
        """
        Delete a view
        
        Args:
            table_id: Table ID
            view_id: View ID
            
        Returns:
            Deletion response
        """
        return self.client._request("DELETE", f"/tables/{table_id}/views/{view_id}")


class Webhooks:
    """Webhook methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def create(self, webhook_data: Dict) -> Dict:
        """
        Create a new webhook
        
        Args:
            webhook_data: Webhook data
            
        Returns:
            Created webhook
        """
        return self.client._request("POST", "/webhooks", webhook_data)
    
    def list(self, base_id: str) -> Dict:
        """
        Get webhooks for a base
        
        Args:
            base_id: Base ID
            
        Returns:
            List of webhooks
        """
        return self.client._request("GET", f"/webhooks/base/{base_id}")
    
    def get(self, webhook_id: str) -> Dict:
        """
        Get a webhook by ID
        
        Args:
            webhook_id: Webhook ID
            
        Returns:
            Webhook details
        """
        return self.client._request("GET", f"/webhooks/{webhook_id}")
    
    def update(self, webhook_id: str, webhook_data: Dict) -> Dict:
        """
        Update a webhook
        
        Args:
            webhook_id: Webhook ID
            webhook_data: Webhook data to update
            
        Returns:
            Updated webhook
        """
        return self.client._request("PATCH", f"/webhooks/{webhook_id}", webhook_data)
    
    def delete(self, webhook_id: str) -> Dict:
        """
        Delete a webhook
        
        Args:
            webhook_id: Webhook ID
            
        Returns:
            Deletion response
        """
        return self.client._request("DELETE", f"/webhooks/{webhook_id}")
    
    def toggle_active(self, webhook_id: str, active: bool) -> Dict:
        """
        Toggle webhook active status
        
        Args:
            webhook_id: Webhook ID
            active: Active status
            
        Returns:
            Updated webhook
        """
        return self.client._request("PATCH", f"/webhooks/{webhook_id}/active", {"active": active})
    
    def get_deliveries(self, webhook_id: str, limit: int = 50) -> Dict:
        """
        Get webhook deliveries
        
        Args:
            webhook_id: Webhook ID
            limit: Maximum number of deliveries to return
            
        Returns:
            List of webhook deliveries
        """
        return self.client._request("GET", f"/webhooks/{webhook_id}/deliveries", params={"limit": limit})


class Search:
    """Search methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def global_search(self, query: str, options: Optional[Dict] = None) -> Dict:
        """
        Global search across all bases
        
        Args:
            query: Search query
            options: Search options
            
        Returns:
            Search results
        """
        params = {"query": query}
        if options:
            params.update(options)
        return self.client._request("GET", "/search", params=params)
    
    def base_search(self, base_id: str, query: str, options: Optional[Dict] = None) -> Dict:
        """
        Search within a base
        
        Args:
            base_id: Base ID
            query: Search query
            options: Search options
            
        Returns:
            Search results
        """
        params = {"query": query}
        if options:
            params.update(options)
        return self.client._request("GET", f"/search/base/{base_id}", params=params)
    
    def table_search(self, table_id: str, query: str, options: Optional[Dict] = None) -> Dict:
        """
        Search within a table
        
        Args:
            table_id: Table ID
            query: Search query
            options: Search options
            
        Returns:
            Search results
        """
        params = {"query": query}
        if options:
            params.update(options)
        return self.client._request("GET", f"/search/table/{table_id}", params=params)


class ImportExport:
    """Import/Export methods"""
    
    def __init__(self, client: AirtableCloneSDK):
        self.client = client
    
    def import_csv(self, table_id: str, csv_file_path: str, options: Optional[Dict] = None) -> Dict:
        """
        Import data from CSV
        
        Args:
            table_id: Table ID
            csv_file_path: Path to CSV file
            options: Import options
            
        Returns:
            Import results
        """
        files = {"file": open(csv_file_path, "rb")}
        return self.client._request("POST", f"/import/csv/{table_id}", data=options, files=files)
    
    def export_csv(self, table_id: str, options: Optional[Dict] = None) -> bytes:
        """
        Export data to CSV
        
        Args:
            table_id: Table ID
            options: Export options
            
        Returns:
            CSV file content
        """
        url = f"{self.client.base_url}/export/csv/{table_id}"
        headers = {}
        
        # Add authentication
        if self.client.api_key:
            headers["X-API-Key"] = self.client.api_key
        elif self.client.token:
            headers["Authorization"] = f"Bearer {self.client.token}"
        
        response = requests.get(url, headers=headers, params=options)
        
        if not response.ok:
            try:
                error_data = response.json()
                error_message = error_data.get("message", "API request failed")
            except:
                error_message = "API request failed"
            
            raise APIError(error_message, response.status_code, response)
        
        return response.content


class APIError(Exception):
    """API Error Exception"""
    
    def __init__(self, message: str, status_code: int, response: requests.Response):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)