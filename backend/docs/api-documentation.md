# Airtable Clone API Documentation

## Overview

This document provides an overview of the RESTful API for the Airtable Clone application. The API allows you to programmatically access and manipulate your data, create and manage bases, tables, fields, and records, and integrate with external systems through webhooks.

## API Base URL

```
https://your-domain.com/api/v1
```

## Authentication

The API supports two authentication methods:

### JWT Token Authentication

For user-based authentication, include a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

You can obtain a JWT token by logging in through the `/api/v1/auth/login` endpoint.

### API Key Authentication

For programmatic access, include an API key in the X-API-Key header:

```
X-API-Key: <your_api_key>
```

You can generate API keys in the user profile section of the application or through the `/api/v1/auth/api-keys` endpoint.

## API Versioning

The API uses URL-based versioning. The current version is `v1`. You can also specify the API version using the `X-API-Version` header.

## Rate Limiting

The API implements rate limiting to prevent abuse. By default, clients are limited to 100 requests per 15-minute window. When rate limits are exceeded, the API will return a 429 Too Many Requests response with the following headers:

- `Retry-After`: Seconds to wait before retrying
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets

## Response Format

All API responses are returned in JSON format with a consistent structure:

### Success Response

```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error message",
  "details": {
    // Optional error details
  }
}
```

## Pagination

List endpoints support pagination using the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 20, max: 100)

Paginated responses include pagination metadata:

```json
{
  "status": "success",
  "data": {
    "items": [
      // Array of items
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 100,
      "totalPages": 5
    }
  }
}
```

## API Resources

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/profile` - Get current user profile
- `POST /auth/api-keys` - Generate a new API key
- `GET /auth/api-keys` - List API keys
- `DELETE /auth/api-keys/:id` - Delete an API key

### Bases

- `POST /bases` - Create a new base
- `GET /bases` - List all bases
- `GET /bases/:id` - Get a base by ID
- `PATCH /bases/:id` - Update a base
- `DELETE /bases/:id` - Delete a base
- `POST /bases/:id/share` - Share a base with users

### Tables

- `POST /tables` - Create a new table
- `GET /bases/:baseId/tables` - List tables in a base
- `GET /tables/:id` - Get a table by ID
- `PATCH /tables/:id` - Update a table
- `DELETE /tables/:id` - Delete a table

### Fields

- `POST /tables/:tableId/fields` - Create a new field
- `GET /tables/:tableId/fields` - List fields in a table
- `GET /tables/:tableId/fields/:id` - Get a field by ID
- `PATCH /tables/:tableId/fields/:id` - Update a field
- `DELETE /tables/:tableId/fields/:id` - Delete a field

### Records

- `POST /tables/:tableId/records` - Create a new record
- `GET /tables/:tableId/records` - List records in a table
- `GET /tables/:tableId/records/:id` - Get a record by ID
- `PATCH /tables/:tableId/records/:id` - Update a record
- `DELETE /tables/:tableId/records/:id` - Delete a record
- `POST /tables/:tableId/records/bulk` - Bulk create records
- `PATCH /tables/:tableId/records/bulk` - Bulk update records
- `DELETE /tables/:tableId/records/bulk` - Bulk delete records

### Views

- `POST /tables/:tableId/views` - Create a new view
- `GET /tables/:tableId/views` - List views in a table
- `GET /tables/:tableId/views/:id` - Get a view by ID
- `PATCH /tables/:tableId/views/:id` - Update a view
- `DELETE /tables/:tableId/views/:id` - Delete a view

### Webhooks

- `POST /webhooks` - Create a new webhook
- `GET /webhooks/:id` - Get a webhook by ID
- `GET /webhooks/base/:baseId` - List webhooks for a base
- `PATCH /webhooks/:id` - Update a webhook
- `DELETE /webhooks/:id` - Delete a webhook
- `PATCH /webhooks/:id/active` - Toggle webhook active status
- `GET /webhooks/:id/deliveries` - Get webhook delivery history

### Search

- `GET /search` - Global search across all bases
- `GET /search/base/:baseId` - Search within a base
- `GET /search/table/:tableId` - Search within a table

### Import/Export

- `POST /import/csv/:tableId` - Import data from CSV
- `GET /export/csv/:tableId` - Export data to CSV
- `POST /import/excel/:tableId` - Import data from Excel
- `GET /export/excel/:tableId` - Export data to Excel
- `GET /export/json/:tableId` - Export data to JSON

## Webhooks

Webhooks allow you to receive real-time notifications when data changes in your bases. When an event occurs, the system will send an HTTP POST request to the URL you specified with a JSON payload containing event details.

### Webhook Events

- `record.created` - Triggered when a record is created
- `record.updated` - Triggered when a record is updated
- `record.deleted` - Triggered when a record is deleted
- `base.updated` - Triggered when base metadata is updated
- `table.updated` - Triggered when table schema is updated

### Webhook Payload

```json
{
  "event": "record.created",
  "base_id": "base_id",
  "table_id": "table_id",
  "record_id": "record_id",
  "user_id": "user_id",
  "timestamp": "2025-07-21T12:00:00Z",
  "data": {
    // Event-specific data
  }
}
```

### Webhook Security

Each webhook includes a signature header (`X-Webhook-Signature`) that you can use to verify the authenticity of the request. The signature is an HMAC-SHA256 hash of the request body using your webhook secret as the key.

Example verification in Node.js:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## SDK Libraries

We provide official SDK libraries for popular programming languages to simplify API integration:

### JavaScript SDK

```javascript
// Install via npm
// npm install airtable-clone-sdk

// Import the SDK
const AirtableCloneSDK = require('airtable-clone-sdk');

// Initialize with API key
const sdk = new AirtableCloneSDK({
  apiKey: 'your_api_key',
  baseUrl: 'https://your-domain.com/api/v1'
});

// Or initialize with JWT token
const sdk = new AirtableCloneSDK({
  token: 'your_jwt_token',
  baseUrl: 'https://your-domain.com/api/v1'
});

// Example: Get all bases
sdk.bases.list()
  .then(response => console.log(response.data.bases))
  .catch(error => console.error(error));

// Example: Create a record
sdk.records.create('table_id', { name: 'New Record', status: 'Active' })
  .then(response => console.log(response.data.record))
  .catch(error => console.error(error));
```

### Python SDK

```python
# Install via pip
# pip install airtable-clone-sdk

# Import the SDK
from airtable_clone_sdk import AirtableCloneSDK

# Initialize with API key
sdk = AirtableCloneSDK(
    api_key='your_api_key',
    base_url='https://your-domain.com/api/v1'
)

# Or initialize with JWT token
sdk = AirtableCloneSDK(
    token='your_jwt_token',
    base_url='https://your-domain.com/api/v1'
)

# Example: Get all bases
response = sdk.bases.list()
bases = response['data']['bases']

# Example: Create a record
response = sdk.records.create('table_id', {'name': 'New Record', 'status': 'Active'})
record = response['data']['record']
```

### Ruby SDK

```ruby
# Install via gem
# gem install airtable-clone-sdk

# Import the SDK
require 'airtable_clone_sdk'

# Initialize with API key
sdk = AirtableCloneSDK.new(
  api_key: 'your_api_key',
  base_url: 'https://your-domain.com/api/v1'
)

# Or initialize with JWT token
sdk = AirtableCloneSDK.new(
  token: 'your_jwt_token',
  base_url: 'https://your-domain.com/api/v1'
)

# Example: Get all bases
response = sdk.bases.list
bases = response['data']['bases']

# Example: Create a record
response = sdk.records.create('table_id', { name: 'New Record', status: 'Active' })
record = response['data']['record']
```

## API Explorer

You can explore and test the API using our interactive API documentation at:

```
https://your-domain.com/api/docs
```

## Support

If you have any questions or need assistance with the API, please contact our support team at api-support@example.com.