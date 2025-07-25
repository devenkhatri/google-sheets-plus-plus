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

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/airtable-clone.git
   cd airtable-clone
   ```

2. Set up environment variables:
   ```
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   
   Edit the `.env` files with your configuration.

3. Generate VAPID keys for push notifications:
   ```
   cd backend
   npm run generate-vapid
   ```
   
   Copy the generated keys to your `.env` file.

4. Start the development environment:
   ```
   docker-compose up
   ```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

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

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.