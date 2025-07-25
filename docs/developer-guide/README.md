# Developer Documentation

Welcome to the developer documentation for our Airtable clone API. This guide provides comprehensive information for integrating with our platform programmatically.

## Table of Contents

1. [Getting Started](./getting-started.md)
2. [Authentication](./authentication.md)
3. [API Reference](./api-reference.md)
4. [SDKs and Libraries](./sdks.md)
5. [Webhooks](./webhooks.md)
6. [Rate Limits](./rate-limits.md)
7. [Error Handling](./error-handling.md)
8. [Best Practices](./best-practices.md)
9. [Examples](./examples.md)
10. [Changelog](./changelog.md)

## Quick Start

```javascript
// Install the SDK
npm install airtable-clone-sdk

// Initialize the client
const AirtableClone = require('airtable-clone-sdk');
const client = new AirtableClone('your-api-key');

// Get records from a table
const records = await client.table('tblXXXXXXXXXXXXXX').select().all();
console.log(records);
```

## API Overview

Our REST API provides programmatic access to all platform features:

- **Bases**: Create and manage workspaces
- **Tables**: Define data structure and schema
- **Records**: Create, read, update, and delete data
- **Fields**: Manage column definitions and types
- **Views**: Access filtered and sorted data presentations
- **Attachments**: Upload and manage files
- **Webhooks**: Receive real-time notifications

## Base URL

All API requests should be made to:
```
https://api.airtable-clone.com/v1/
```

## Authentication

All requests require authentication using an API key:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.airtable-clone.com/v1/bases
```

## Response Format

All responses are returned in JSON format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 25
  }
}
```

## Error Responses

Errors include detailed information for debugging:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid field type",
    "details": {
      "field": "status",
      "provided": "invalid_type",
      "expected": ["text", "number", "select"]
    }
  }
}
```

## Rate Limits

- **Standard**: 5 requests per second per API key
- **Burst**: Up to 15 requests in a 3-second window
- **Daily**: 100,000 requests per day

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640995200
```

## SDKs Available

- **JavaScript/Node.js**: Full-featured SDK with TypeScript support
- **Python**: Pythonic interface with async support
- **Ruby**: Idiomatic Ruby gem
- **PHP**: Composer package (coming soon)
- **Go**: Native Go client (coming soon)

## Support

- **Documentation**: This comprehensive guide
- **API Reference**: Interactive API explorer
- **Community**: Developer forum and discussions
- **Support**: Email support for technical issues

## Getting Help

- Check the [examples](./examples.md) for common use cases
- Review [best practices](./best-practices.md) for optimal performance
- Use the interactive API explorer to test endpoints
- Join our developer community for discussions and help

Ready to get started? Head to the [Getting Started](./getting-started.md) guide!