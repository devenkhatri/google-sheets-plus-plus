# Getting Started with the API

This guide will help you get up and running with our API in just a few minutes.

## Prerequisites

- A valid account with API access enabled
- Basic understanding of REST APIs
- Your preferred programming language and HTTP client

## Step 1: Get Your API Key

1. **Sign in** to your account
2. Go to **Account Settings** > **API Keys**
3. Click **"Generate New API Key"**
4. Copy and securely store your API key

⚠️ **Important**: Keep your API key secure and never share it publicly. Treat it like a password.

## Step 2: Make Your First Request

Let's start by listing your bases:

### Using cURL
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.airtable-clone.com/v1/bases
```

### Using JavaScript (Node.js)
```javascript
const fetch = require('node-fetch');

const response = await fetch('https://api.airtable-clone.com/v1/bases', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

### Using Python
```python
import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}

response = requests.get('https://api.airtable-clone.com/v1/bases', headers=headers)
data = response.json()
print(data)
```

## Step 3: Understanding the Response

A successful response will look like this:

```json
{
  "success": true,
  "data": [
    {
      "id": "baseXXXXXXXXXXXXXX",
      "name": "My First Base",
      "description": "A sample base for testing",
      "createdAt": "2024-01-15T10:30:00Z",
      "tables": [
        {
          "id": "tblXXXXXXXXXXXXXX",
          "name": "Tasks",
          "recordCount": 25
        }
      ]
    }
  ]
}
```

## Step 4: Working with Records

Now let's get records from a table:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://api.airtable-clone.com/v1/tables/tblXXXXXXXXXXXXXX/records?maxRecords=10"
```

### Creating a Record

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "fields": {
          "Name": "My First Task",
          "Status": "To Do",
          "Priority": "High"
        }
      }
    ]
  }' \
  https://api.airtable-clone.com/v1/tables/tblXXXXXXXXXXXXXX/records
```

## Step 5: Using the Official SDKs

For easier integration, use our official SDKs:

### JavaScript/Node.js SDK

```bash
npm install airtable-clone-sdk
```

```javascript
const AirtableClone = require('airtable-clone-sdk');
const client = new AirtableClone('YOUR_API_KEY');

// Get all bases
const bases = await client.bases().list();

// Get records from a table
const records = await client.table('tblXXXXXXXXXXXXXX').select().all();

// Create a record
const newRecord = await client.table('tblXXXXXXXXXXXXXX').create({
  'Name': 'New Task',
  'Status': 'To Do'
});
```

### Python SDK

```bash
pip install airtable-clone-python
```

```python
from airtable_clone import AirtableClone

client = AirtableClone('YOUR_API_KEY')

# Get all bases
bases = client.bases.list()

# Get records from a table
records = client.table('tblXXXXXXXXXXXXXX').all()

# Create a record
new_record = client.table('tblXXXXXXXXXXXXXX').create({
    'Name': 'New Task',
    'Status': 'To Do'
})
```

## Step 6: Error Handling

Always handle errors gracefully:

```javascript
try {
  const records = await client.table('tblXXXXXXXXXXXXXX').select().all();
  console.log(records);
} catch (error) {
  if (error.status === 401) {
    console.error('Invalid API key');
  } else if (error.status === 404) {
    console.error('Table not found');
  } else if (error.status === 429) {
    console.error('Rate limit exceeded');
    // Implement retry logic with exponential backoff
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Step 7: Rate Limiting

Our API has rate limits to ensure fair usage:

- **5 requests per second** per API key
- **Burst allowance** of 15 requests in 3 seconds
- **Daily limit** of 100,000 requests

### Handling Rate Limits

```javascript
async function makeRequestWithRetry(requestFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const retryAfter = error.headers['retry-after'] || Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
}

// Usage
const records = await makeRequestWithRetry(() => 
  client.table('tblXXXXXXXXXXXXXX').select().all()
);
```

## Common Patterns

### Pagination

```javascript
// Get all records with pagination
async function getAllRecords(tableId) {
  let allRecords = [];
  let offset = null;
  
  do {
    const response = await client.table(tableId).select({
      pageSize: 100,
      offset: offset
    }).firstPage();
    
    allRecords = allRecords.concat(response.records);
    offset = response.offset;
  } while (offset);
  
  return allRecords;
}
```

### Filtering

```javascript
// Get records with filters
const filteredRecords = await client.table('tblXXXXXXXXXXXXXX').select({
  filterByFormula: "AND({Status} = 'In Progress', {Priority} = 'High')",
  sort: [
    {field: 'Due Date', direction: 'asc'}
  ]
}).all();
```

### Batch Operations

```javascript
// Create multiple records
const records = await client.table('tblXXXXXXXXXXXXXX').create([
  {
    'Name': 'Task 1',
    'Status': 'To Do'
  },
  {
    'Name': 'Task 2',
    'Status': 'In Progress'
  }
]);

// Update multiple records
const updates = await client.table('tblXXXXXXXXXXXXXX').update([
  {
    id: 'recXXXXXXXXXXXXXX',
    fields: {
      'Status': 'Done'
    }
  },
  {
    id: 'recYYYYYYYYYYYYYY',
    fields: {
      'Status': 'Done'
    }
  }
]);
```

## Best Practices

### 1. Use Specific Field Selection
Only request the fields you need:

```javascript
const records = await client.table('tblXXXXXXXXXXXXXX').select({
  fields: ['Name', 'Status', 'Due Date']
}).all();
```

### 2. Implement Caching
Cache frequently accessed data:

```javascript
const cache = new Map();

async function getCachedRecord(recordId) {
  if (cache.has(recordId)) {
    return cache.get(recordId);
  }
  
  const record = await client.table('tblXXXXXXXXXXXXXX').find(recordId);
  cache.set(recordId, record);
  return record;
}
```

### 3. Use Webhooks for Real-time Updates
Instead of polling for changes, set up webhooks:

```javascript
// Set up a webhook
const webhook = await client.base('baseXXXXXXXXXXXXXX').webhooks().create({
  notificationUrl: 'https://your-app.com/webhook',
  specification: {
    options: {
      filters: {
        dataTypes: ['tableData'],
        recordChangeScope: 'tblXXXXXXXXXXXXXX'
      }
    }
  }
});
```

## Next Steps

Now that you're up and running:

1. **Explore the [API Reference](./api-reference.md)** for complete endpoint documentation
2. **Check out [Examples](./examples.md)** for common use cases
3. **Read [Best Practices](./best-practices.md)** for optimal performance
4. **Set up [Webhooks](./webhooks.md)** for real-time updates
5. **Review [Error Handling](./error-handling.md)** strategies

## Getting Help

- **Documentation**: Complete guides and references
- **Examples**: Sample code for common scenarios  
- **Community**: Developer forum for discussions
- **Support**: Email support for technical issues

Ready to build something amazing? Let's go! 🚀