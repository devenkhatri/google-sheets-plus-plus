# API Reference

Complete reference for all API endpoints, request/response formats, and parameters.

## Base URL
```
https://api.airtable-clone.com/v1/
```

## Authentication
All requests require an API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Bases

### List Bases
Get all bases accessible to the authenticated user.

```http
GET /bases
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "baseXXXXXXXXXXXXXX",
      "name": "Project Management",
      "description": "Track projects and tasks",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z",
      "tables": [
        {
          "id": "tblXXXXXXXXXXXXXX",
          "name": "Tasks",
          "recordCount": 150
        }
      ]
    }
  ]
}
```

### Get Base
Retrieve details for a specific base.

```http
GET /bases/{baseId}
```

**Parameters:**
- `baseId` (string, required): The base identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "baseXXXXXXXXXXXXXX",
    "name": "Project Management",
    "description": "Track projects and tasks",
    "googleSheetsId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z",
    "tables": [
      {
        "id": "tblXXXXXXXXXXXXXX",
        "name": "Tasks",
        "fields": [
          {
            "id": "fldXXXXXXXXXXXXXX",
            "name": "Task Name",
            "type": "text",
            "options": {}
          }
        ]
      }
    ]
  }
}
```

### Create Base
Create a new base.

```http
POST /bases
```

**Request Body:**
```json
{
  "name": "New Project Base",
  "description": "Managing new projects"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "baseXXXXXXXXXXXXXX",
    "name": "New Project Base",
    "description": "Managing new projects",
    "googleSheetsId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "createdAt": "2024-01-25T10:30:00Z",
    "updatedAt": "2024-01-25T10:30:00Z",
    "tables": []
  }
}
```

## Tables

### List Tables
Get all tables in a base.

```http
GET /bases/{baseId}/tables
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tblXXXXXXXXXXXXXX",
      "name": "Tasks",
      "description": "Project tasks and assignments",
      "recordCount": 150,
      "fields": [
        {
          "id": "fldXXXXXXXXXXXXXX",
          "name": "Task Name",
          "type": "text",
          "options": {
            "required": true
          }
        }
      ],
      "views": [
        {
          "id": "viwXXXXXXXXXXXXXX",
          "name": "All Tasks",
          "type": "grid"
        }
      ]
    }
  ]
}
```

### Create Table
Create a new table in a base.

```http
POST /bases/{baseId}/tables
```

**Request Body:**
```json
{
  "name": "New Table",
  "description": "Table description",
  "fields": [
    {
      "name": "Name",
      "type": "text",
      "options": {
        "required": true
      }
    },
    {
      "name": "Status",
      "type": "singleSelect",
      "options": {
        "choices": [
          {"name": "To Do", "color": "blue"},
          {"name": "In Progress", "color": "yellow"},
          {"name": "Done", "color": "green"}
        ]
      }
    }
  ]
}
```

## Records

### List Records
Get records from a table with optional filtering and sorting.

```http
GET /tables/{tableId}/records
```

**Query Parameters:**
- `view` (string): View ID to use for filtering/sorting
- `fields` (array): Specific fields to return
- `filterByFormula` (string): Formula to filter records
- `sort` (array): Sort configuration
- `maxRecords` (number): Maximum records to return (1-100)
- `pageSize` (number): Records per page (1-100)
- `offset` (string): Pagination offset

**Example:**
```http
GET /tables/tblXXXXXXXXXXXXXX/records?fields[]=Name&fields[]=Status&maxRecords=50&sort[0][field]=Name&sort[0][direction]=asc
```

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "recXXXXXXXXXXXXXX",
        "fields": {
          "Name": "Complete project proposal",
          "Status": "In Progress",
          "Due Date": "2024-02-15T00:00:00Z",
          "Assigned To": ["usrXXXXXXXXXXXXXX"]
        },
        "createdTime": "2024-01-15T10:30:00Z"
      }
    ],
    "offset": "recXXXXXXXXXXXXXX"
  }
}
```

### Get Record
Retrieve a specific record.

```http
GET /tables/{tableId}/records/{recordId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recXXXXXXXXXXXXXX",
    "fields": {
      "Name": "Complete project proposal",
      "Status": "In Progress",
      "Due Date": "2024-02-15T00:00:00Z",
      "Priority": "High",
      "Notes": "Need to include budget breakdown"
    },
    "createdTime": "2024-01-15T10:30:00Z"
  }
}
```

### Create Records
Create one or more records.

```http
POST /tables/{tableId}/records
```

**Request Body:**
```json
{
  "records": [
    {
      "fields": {
        "Name": "New task",
        "Status": "To Do",
        "Priority": "Medium"
      }
    },
    {
      "fields": {
        "Name": "Another task",
        "Status": "In Progress",
        "Priority": "High"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "recXXXXXXXXXXXXXX",
        "fields": {
          "Name": "New task",
          "Status": "To Do",
          "Priority": "Medium"
        },
        "createdTime": "2024-01-25T10:30:00Z"
      }
    ]
  }
}
```

### Update Records
Update one or more records.

```http
PATCH /tables/{tableId}/records
```

**Request Body:**
```json
{
  "records": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "fields": {
        "Status": "Done",
        "Completed Date": "2024-01-25T10:30:00Z"
      }
    }
  ]
}
```

### Delete Records
Delete one or more records.

```http
DELETE /tables/{tableId}/records
```

**Request Body:**
```json
{
  "records": ["recXXXXXXXXXXXXXX", "recYYYYYYYYYYYYYY"]
}
```

## Fields

### Create Field
Add a new field to a table.

```http
POST /tables/{tableId}/fields
```

**Request Body:**
```json
{
  "name": "Priority",
  "type": "singleSelect",
  "options": {
    "choices": [
      {"name": "Low", "color": "gray"},
      {"name": "Medium", "color": "yellow"},
      {"name": "High", "color": "red"}
    ]
  }
}
```

### Update Field
Modify an existing field.

```http
PATCH /tables/{tableId}/fields/{fieldId}
```

**Request Body:**
```json
{
  "name": "Task Priority",
  "options": {
    "choices": [
      {"name": "Low", "color": "gray"},
      {"name": "Medium", "color": "yellow"},
      {"name": "High", "color": "red"},
      {"name": "Critical", "color": "purple"}
    ]
  }
}
```

## Field Types

### Text Field
```json
{
  "type": "text",
  "options": {
    "required": false,
    "unique": false,
    "maxLength": 255
  }
}
```

### Number Field
```json
{
  "type": "number",
  "options": {
    "precision": 2,
    "format": "currency",
    "symbol": "$"
  }
}
```

### Single Select Field
```json
{
  "type": "singleSelect",
  "options": {
    "choices": [
      {"name": "Option 1", "color": "blue"},
      {"name": "Option 2", "color": "green"}
    ]
  }
}
```

### Date Field
```json
{
  "type": "date",
  "options": {
    "dateFormat": "YYYY-MM-DD",
    "includeTime": false,
    "timeZone": "UTC"
  }
}
```

### Formula Field
```json
{
  "type": "formula",
  "options": {
    "formula": "CONCATENATE({First Name}, ' ', {Last Name})"
  }
}
```

### Link Field
```json
{
  "type": "link",
  "options": {
    "linkedTableId": "tblXXXXXXXXXXXXXX",
    "allowMultiple": true,
    "inverseLinkFieldId": "fldYYYYYYYYYYYYYY"
  }
}
```

## Views

### List Views
Get all views for a table.

```http
GET /tables/{tableId}/views
```

### Create View
Create a new view.

```http
POST /tables/{tableId}/views
```

**Request Body:**
```json
{
  "name": "High Priority Tasks",
  "type": "grid",
  "filters": [
    {
      "field": "Priority",
      "operator": "is",
      "value": "High"
    }
  ],
  "sorts": [
    {
      "field": "Due Date",
      "direction": "asc"
    }
  ]
}
```

## Attachments

### Upload Attachment
Upload a file attachment.

```http
POST /attachments
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: The file to upload
- `filename`: Original filename

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "attXXXXXXXXXXXXXX",
    "url": "https://cdn.airtable-clone.com/attachments/...",
    "filename": "document.pdf",
    "size": 1024000,
    "type": "application/pdf"
  }
}
```

## Webhooks

### Create Webhook
Set up a webhook to receive notifications.

```http
POST /bases/{baseId}/webhooks
```

**Request Body:**
```json
{
  "notificationUrl": "https://your-app.com/webhook",
  "specification": {
    "options": {
      "filters": {
        "dataTypes": ["tableData"],
        "recordChangeScope": "tblXXXXXXXXXXXXXX"
      }
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request format is invalid |
| `AUTHENTICATION_REQUIRED` | API key is missing or invalid |
| `PERMISSION_DENIED` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Request data validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SERVER_ERROR` | Internal server error |

## Rate Limits

All endpoints are subject to rate limiting:

- **Per API Key**: 5 requests per second
- **Burst Allowance**: 15 requests in 3 seconds
- **Daily Limit**: 100,000 requests per day

Rate limit headers:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 1
```

## Pagination

Large result sets are paginated:

```json
{
  "success": true,
  "data": {
    "records": [...],
    "offset": "recXXXXXXXXXXXXXX"
  },
  "meta": {
    "hasMore": true
  }
}
```

Use the `offset` parameter for subsequent requests:
```http
GET /tables/{tableId}/records?offset=recXXXXXXXXXXXXXX
```

## Filtering

Use the `filterByFormula` parameter to filter records:

```http
GET /tables/{tableId}/records?filterByFormula=AND({Status}='In Progress',{Priority}='High')
```

### Formula Functions
- `AND()`, `OR()`, `NOT()`
- `FIND()`, `SEARCH()`, `LEN()`
- `IS_EMPTY()`, `IS_NOT_EMPTY()`
- `TODAY()`, `NOW()`, `DATEADD()`

## Sorting

Sort records using the `sort` parameter:

```http
GET /tables/{tableId}/records?sort[0][field]=Priority&sort[0][direction]=desc&sort[1][field]=Name&sort[1][direction]=asc
```

## Best Practices

1. **Use Pagination**: Don't request all records at once
2. **Cache Responses**: Cache data when possible to reduce API calls
3. **Handle Rate Limits**: Implement exponential backoff
4. **Use Webhooks**: For real-time updates instead of polling
5. **Batch Operations**: Create/update multiple records in single requests
6. **Specific Fields**: Only request fields you need
7. **Error Handling**: Always handle API errors gracefully

For more examples and implementation details, see our [SDK documentation](./sdks.md) and [examples](./examples.md).