# Airtable Clone with Google Sheets Backend

A full-featured Airtable clone that uses Google Sheets as the data storage backend. This application provides all core Airtable functionality including database-like operations, multiple view types, collaboration features, and advanced data manipulation capabilities.

## Features

- Multiple view types (Grid, Kanban, Calendar, Gallery)
- Real-time collaboration
- Advanced field types (Formula, Lookup, Rollup)
- Filtering and sorting
- Import/Export capabilities
- RESTful API
- Google Sheets integration
- Mobile responsive design
- Push notifications
- Progressive Web App (PWA) support

## Architecture

The application is built using a modern tech stack:

- **Frontend**: React, TypeScript, Redux Toolkit, React Query
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (metadata), Google Sheets (data)
- **Caching**: Redis
- **Real-time**: Socket.io

## Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Google Cloud Platform account with Google Sheets API enabled
- PostgreSQL 15+ (if running without Docker)
- Redis 7+ (if running without Docker)

### Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/airtable-clone.git
cd airtable-clone
```

#### 2. Environment Configuration

Copy the example environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

#### 3. Backend Environment Variables (`backend/.env`)

Configure the following variables in `backend/.env`:

##### Application Settings
```bash
NODE_ENV=development                    # Environment (development/production)
PORT=4000                              # Backend server port
FRONTEND_URL=http://localhost:3000     # Frontend URL for CORS
```

##### Database Configuration
```bash
DB_HOST=postgres                       # Database host (use 'localhost' if not using Docker)
DB_PORT=5432                          # Database port
DB_USER=postgres                      # Database username
DB_PASSWORD=postgres                  # Database password
DB_NAME=airtable_clone               # Database name
```

##### Redis Configuration
```bash
REDIS_URL=redis://redis:6379          # Redis connection URL (use 'redis://localhost:6379' if not using Docker)
```

##### Authentication & Security
```bash
JWT_SECRET=your_very_strong_jwt_secret_key_here_change_this    # Strong JWT secret (generate with: openssl rand -base64 64)
JWT_EXPIRATION=24h                                            # JWT token expiration
REFRESH_TOKEN_EXPIRATION=7d                                   # Refresh token expiration
```

##### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google Sheets API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: `http://localhost:3000/auth/google/callback`

```bash
GOOGLE_CLIENT_ID=your_google_client_id_from_console           # From Google Cloud Console
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_console   # From Google Cloud Console
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback # OAuth redirect URI
```

##### Google Sheets API
1. In Google Cloud Console, create an API key
2. Restrict the key to Google Sheets API

```bash
GOOGLE_API_KEY=your_google_api_key_from_console              # API key for Google Sheets
```

##### File Storage
```bash
UPLOAD_DIR=/app/uploads                # Directory for file uploads
MAX_FILE_SIZE=10485760                # Max file size in bytes (10MB)
```

##### Rate Limiting
```bash
RATE_LIMIT_WINDOW=15m                 # Rate limit window
RATE_LIMIT_MAX=100                    # Max requests per window
```

##### Logging & Monitoring
```bash
LOG_LEVEL=debug                       # Log level (debug/info/warn/error)
ENABLE_METRICS=true                   # Enable metrics collection
```

##### Security Settings
```bash
CORS_ORIGINS=http://localhost:3000    # Allowed CORS origins
SECURE_COOKIES=false                  # Use secure cookies (true for HTTPS)
COOKIE_DOMAIN=localhost               # Cookie domain
```

##### Push Notifications (VAPID Keys)
Generate VAPID keys for push notifications:

```bash
cd backend
npm run generate-vapid
```

Copy the generated keys to your `.env`:

```bash
VAPID_PUBLIC_KEY=generated_public_key_here     # Generated VAPID public key
VAPID_PRIVATE_KEY=generated_private_key_here   # Generated VAPID private key
VAPID_EMAIL=mailto:your-email@example.com      # Contact email for push service
```

#### 4. Frontend Environment Variables (`frontend/.env`)

Configure the following variables in `frontend/.env`:

##### API Configuration
```bash
VITE_API_URL=http://localhost:4000            # Backend API URL
```

##### Authentication
```bash
VITE_AUTH_DOMAIN=localhost                    # Authentication domain
VITE_GOOGLE_CLIENT_ID=your_google_client_id   # Same as backend Google Client ID
```

##### Feature Flags
```bash
VITE_ENABLE_GOOGLE_SHEETS_SYNC=true          # Enable Google Sheets synchronization
VITE_ENABLE_REAL_TIME_COLLABORATION=true     # Enable real-time collaboration features
VITE_ENABLE_PERFORMANCE_MONITORING=true      # Enable performance monitoring
```

##### Optional Services
```bash
# Sentry Error Tracking (optional)
VITE_SENTRY_DSN=your_sentry_dsn_here         # Sentry DSN for error tracking

# Analytics (optional)
VITE_ANALYTICS_ID=your_analytics_id_here     # Google Analytics or similar
```

#### 5. Install Dependencies

Choose one of the following methods:

##### Option A: Using Docker (Recommended)
```bash
docker-compose up
```

##### Option B: Local Installation
```bash
# Install all dependencies
npm run install:all

# Or install individually
npm run install:backend
npm run install:frontend
```

#### 6. Database Setup

If using Docker, the database will be automatically set up. For local development:

```bash
# Run database migrations
cd backend
npm run migrate

# Seed initial data (optional)
npm run seed
```

#### 7. Start Development Servers

##### Using Docker:
```bash
docker-compose up
```

##### Using Local Node.js:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

#### 8. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Documentation**: http://localhost:4000/api/docs
- **PostgreSQL**: localhost:5432 (if using Docker)
- **Redis**: localhost:6379 (if using Docker)

#### 9. Verify Setup

Test the setup by:

1. Opening http://localhost:3000 in your browser
2. Attempting to sign in with Google OAuth
3. Creating a new base/table
4. Checking that data syncs with Google Sheets

### Troubleshooting

#### Common Issues

1. **Port conflicts**: Change ports in `docker-compose.yml` or `.env` files
2. **Google OAuth errors**: Verify redirect URIs in Google Cloud Console
3. **Database connection issues**: Ensure PostgreSQL is running and credentials are correct
4. **VAPID key errors**: Run `npm run generate-vapid` in the backend directory

#### Logs

View application logs:

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Local development
# Backend logs appear in terminal
# Frontend logs appear in browser console
```

## Production Deployment

### Prerequisites

- Docker and Docker Compose
- Domain name with SSL certificates
- Server with at least 4GB RAM and 2 CPU cores

### Deployment Steps

1. Clone the repository on your production server:
   ```
   git clone https://github.com/yourusername/airtable-clone.git
   cd airtable-clone
   ```

2. Generate production environment files:
   ```
   chmod +x scripts/generate-env.sh
   ./scripts/generate-env.sh
   ```

3. Start the production environment:
   ```
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Blue-Green Deployment

For zero-downtime updates, use the blue-green deployment strategy:

1. Determine the current environment (blue or green):
   ```
   cat .env.current
   ```

2. Deploy to the inactive environment:
   ```
   # If current is blue, deploy to green
   docker-compose -f docker-compose.prod.green.yml up -d
   
   # If current is green, deploy to blue
   docker-compose -f docker-compose.prod.blue.yml up -d
   ```

3. Test the new deployment:
   ```
   # For blue
   curl http://localhost:8001/health
   
   # For green
   curl http://localhost:8002/health
   ```

4. Switch traffic to the new environment by updating the Nginx configuration.

5. Update the current environment marker:
   ```
   # If switching to green
   echo "green" > .env.current
   
   # If switching to blue
   echo "blue" > .env.current
   ```

6. After a grace period, stop the old environment:
   ```
   # If old is blue
   docker-compose -f docker-compose.prod.blue.yml down
   
   # If old is green
   docker-compose -f docker-compose.prod.green.yml down
   ```

## Monitoring and Logging

The production setup includes:

- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Loki**: Log aggregation
- **Promtail**: Log collection

Access the monitoring dashboards:
- Grafana: http://your-domain:3000
- Prometheus: http://your-domain:9090

## Backup and Recovery

Automated backups are configured to run daily. To manually trigger a backup:

```
docker-compose -f docker-compose.prod.yml run --rm backup
```

To restore from a backup:

```
docker-compose -f docker-compose.prod.yml run --rm backup sh -c "gunzip -c /backup/backup_YYYY-MM-DD_HH-MM-SS.sql.gz | psql"
```

## Security

The application implements several security measures:

- JWT-based authentication
- Input validation and sanitization
- Rate limiting
- HTTPS enforcement
- Content Security Policy
- Database encryption
- Audit logging

## Environment Variables Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Application environment |
| `PORT` | Yes | `4000` | Server port |
| `FRONTEND_URL` | Yes | - | Frontend URL for CORS configuration |
| `DB_HOST` | Yes | `postgres` | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_USER` | Yes | - | PostgreSQL username |
| `DB_PASSWORD` | Yes | - | PostgreSQL password |
| `DB_NAME` | Yes | - | PostgreSQL database name |
| `REDIS_URL` | Yes | - | Redis connection URL |
| `JWT_SECRET` | Yes | - | Secret key for JWT tokens (min 64 chars) |
| `JWT_EXPIRATION` | No | `24h` | JWT token expiration time |
| `REFRESH_TOKEN_EXPIRATION` | No | `7d` | Refresh token expiration time |
| `GOOGLE_CLIENT_ID` | Yes | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | - | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | - | Google OAuth redirect URI |
| `GOOGLE_API_KEY` | Yes | - | Google Sheets API key |
| `UPLOAD_DIR` | No | `/app/uploads` | File upload directory |
| `MAX_FILE_SIZE` | No | `10485760` | Max file size in bytes (10MB) |
| `RATE_LIMIT_WINDOW` | No | `15m` | Rate limiting window |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `LOG_LEVEL` | No | `info` | Logging level (debug/info/warn/error) |
| `CORS_ORIGINS` | Yes | - | Allowed CORS origins (comma-separated) |
| `SECURE_COOKIES` | No | `false` | Use secure cookies (HTTPS only) |
| `COOKIE_DOMAIN` | No | - | Cookie domain |
| `VAPID_PUBLIC_KEY` | Yes | - | VAPID public key for push notifications |
| `VAPID_PRIVATE_KEY` | Yes | - | VAPID private key for push notifications |
| `VAPID_EMAIL` | Yes | - | Contact email for push service |
| `ENABLE_METRICS` | No | `false` | Enable metrics collection |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API base URL |
| `VITE_AUTH_DOMAIN` | Yes | - | Authentication domain |
| `VITE_GOOGLE_CLIENT_ID` | Yes | - | Google OAuth client ID (same as backend) |
| `VITE_ENABLE_GOOGLE_SHEETS_SYNC` | No | `true` | Enable Google Sheets synchronization |
| `VITE_ENABLE_REAL_TIME_COLLABORATION` | No | `true` | Enable real-time collaboration |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | No | `false` | Enable performance monitoring |
| `VITE_SENTRY_DSN` | No | - | Sentry DSN for error tracking |
| `VITE_ANALYTICS_ID` | No | - | Analytics tracking ID |

### Environment-Specific Configurations

#### Development Environment
```bash
# Backend
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DB_HOST=postgres  # or localhost if not using Docker
SECURE_COOKIES=false
CORS_ORIGINS=http://localhost:3000

# Frontend
VITE_API_URL=http://localhost:4000
VITE_AUTH_DOMAIN=localhost
```

#### Production Environment
```bash
# Backend
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
DB_HOST=your-db-host
SECURE_COOKIES=true
CORS_ORIGINS=https://yourdomain.com

# Frontend
VITE_API_URL=https://api.yourdomain.com
VITE_AUTH_DOMAIN=yourdomain.com
```

### Security Best Practices

1. **JWT Secret**: Generate a strong secret using `openssl rand -base64 64`
2. **Database Passwords**: Use strong, unique passwords
3. **Google OAuth**: Restrict OAuth credentials to specific domains
4. **API Keys**: Restrict Google API keys to specific APIs and referrers
5. **Environment Files**: Never commit `.env` files to version control
6. **Production**: Use environment variable injection in production, not `.env` files

### Getting API Keys and Credentials

#### Google Cloud Platform Setup

1. **Create Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable APIs**:
   - Enable Google Sheets API
   - Enable Google+ API (for OAuth)

3. **Create OAuth Credentials**:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback` (development)

4. **Create API Key**:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict key to Google Sheets API
   - Add HTTP referrers if needed

#### Optional Services

1. **Sentry** (Error Tracking):
   - Sign up at [sentry.io](https://sentry.io)
   - Create a new project
   - Copy the DSN from project settings

2. **Analytics**:
   - Google Analytics: Create property and get tracking ID
   - Other analytics services: Follow their setup instructions

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.