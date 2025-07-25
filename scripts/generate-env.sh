#!/bin/bash
set -e

# This script generates production .env files from templates
# It should be run in a secure environment with access to secrets

# Configuration
BACKEND_ENV_TEMPLATE="./backend/.env.example"
FRONTEND_ENV_TEMPLATE="./frontend/.env.example"
BACKEND_ENV_PROD="./backend/.env"
FRONTEND_ENV_PROD="./frontend/.env"

# Generate a secure random string for JWT secret
generate_jwt_secret() {
  openssl rand -base64 32
}

# Generate a secure random string for database password
generate_db_password() {
  openssl rand -base64 24
}

echo "Generating production environment files..."

# Create backend .env file
if [ -f "$BACKEND_ENV_TEMPLATE" ]; then
  echo "Creating backend .env file from template..."
  cp "$BACKEND_ENV_TEMPLATE" "$BACKEND_ENV_PROD"
  
  # Replace placeholders with actual values
  JWT_SECRET=$(generate_jwt_secret)
  DB_PASSWORD=$(generate_db_password)
  
  sed -i "s/your_very_strong_jwt_secret_key_here/$JWT_SECRET/g" "$BACKEND_ENV_PROD"
  sed -i "s/strong_password_here/$DB_PASSWORD/g" "$BACKEND_ENV_PROD"
  
  # Replace other placeholders with environment variables if available
  if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
    sed -i "s/your_google_client_id/$GOOGLE_CLIENT_ID/g" "$BACKEND_ENV_PROD"
  fi
  
  if [ ! -z "$GOOGLE_CLIENT_SECRET" ]; then
    sed -i "s/your_google_client_secret/$GOOGLE_CLIENT_SECRET/g" "$BACKEND_ENV_PROD"
  fi
  
  if [ ! -z "$GOOGLE_API_KEY" ]; then
    sed -i "s/your_google_api_key/$GOOGLE_API_KEY/g" "$BACKEND_ENV_PROD"
  fi
  
  echo "Backend .env file created successfully!"
else
  echo "Error: Backend .env template not found!"
  exit 1
fi

# Create frontend .env file
if [ -f "$FRONTEND_ENV_TEMPLATE" ]; then
  echo "Creating frontend .env file from template..."
  cp "$FRONTEND_ENV_TEMPLATE" "$FRONTEND_ENV_PROD"
  
  # Replace placeholders with environment variables if available
  if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
    sed -i "s/your_google_client_id/$GOOGLE_CLIENT_ID/g" "$FRONTEND_ENV_PROD"
  fi
  
  if [ ! -z "$SENTRY_DSN" ]; then
    sed -i "s/your_sentry_dsn/$SENTRY_DSN/g" "$FRONTEND_ENV_PROD"
  fi
  
  if [ ! -z "$ANALYTICS_ID" ]; then
    sed -i "s/your_analytics_id/$ANALYTICS_ID/g" "$FRONTEND_ENV_PROD"
  fi
  
  echo "Frontend .env file created successfully!"
else
  echo "Error: Frontend .env template not found!"
  exit 1
fi

echo "Environment files generation completed!"

# Output database password for initial setup
echo "Generated database password: $DB_PASSWORD"
echo "Please save this password securely for database initialization."