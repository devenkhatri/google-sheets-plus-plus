import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Airtable Clone API',
      version,
      description: 'API documentation for the Airtable Clone with Google Sheets backend',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for authentication',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            details: {
              type: 'object',
              example: {},
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 20,
            },
            totalItems: {
              type: 'integer',
              example: 100,
            },
            totalPages: {
              type: 'integer',
              example: 5,
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number',
          schema: {
            type: 'integer',
            default: 1,
            minimum: 1,
          },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            default: 20,
            minimum: 1,
            maximum: 100,
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Authentication credentials are missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Unauthorized',
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - You do not have permission to access this resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Forbidden',
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found - The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Resource not found',
              },
            },
          },
        },
        BadRequest: {
          description: 'Bad Request - The request was invalid or cannot be served',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Invalid request',
                details: {
                  field: 'Field is required',
                },
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Too many requests, please try again later.',
              },
            },
          },
          headers: {
            'Retry-After': {
              schema: {
                type: 'integer',
                example: 60,
              },
              description: 'Seconds to wait before retrying',
            },
            'X-RateLimit-Limit': {
              schema: {
                type: 'integer',
                example: 100,
              },
              description: 'Request limit per window',
            },
            'X-RateLimit-Remaining': {
              schema: {
                type: 'integer',
                example: 0,
              },
              description: 'Remaining requests in current window',
            },
            'X-RateLimit-Reset': {
              schema: {
                type: 'integer',
                example: 1625097600,
              },
              description: 'Unix timestamp when the rate limit window resets',
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error - Something went wrong on the server',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Internal server error',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and user management endpoints',
      },
      {
        name: 'Bases',
        description: 'Base management endpoints',
      },
      {
        name: 'Tables',
        description: 'Table management endpoints',
      },
      {
        name: 'Fields',
        description: 'Field management endpoints',
      },
      {
        name: 'Records',
        description: 'Record management endpoints',
      },
      {
        name: 'Views',
        description: 'View management endpoints',
      },
      {
        name: 'Webhooks',
        description: 'Webhook management endpoints',
      },
      {
        name: 'Import/Export',
        description: 'Import and export endpoints',
      },
      {
        name: 'Search',
        description: 'Search endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

export const specs = swaggerJsdoc(options);