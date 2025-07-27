#!/bin/bash

# OTA Answer Hub Database Setup Script
# This script sets up PostgreSQL database with required extensions

set -e

echo "🗄️  Setting up PostgreSQL database for OTA Answer Hub..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Database configuration
DB_NAME="ota_hub_db"
DB_USER="ota_hub_user"
DB_PASSWORD="ota_hub_password_$(openssl rand -hex 8)"

# Switch to postgres user to create database and user
echo "👤 Creating database user and database..."
sudo -u postgres psql << EOF
-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to the database
\c $DB_NAME

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;

-- Grant all privileges on all tables (future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- Grant all privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;
EOF

# Update PostgreSQL configuration for better performance
echo "⚙️  Optimizing PostgreSQL configuration..."
sudo -u postgres tee -a /etc/postgresql/*/main/postgresql.conf > /dev/null << EOF

# OTA Answer Hub Database Optimizations
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
EOF

# Restart PostgreSQL to apply changes
echo "🔄 Restarting PostgreSQL..."
systemctl restart postgresql

# Create .env file with database URL
PROJECT_DIR="/root/projects/hub_inbox2sheet"
if [ -d "$PROJECT_DIR" ]; then
    echo "📝 Updating .env file with database configuration..."
    
    # Create or update .env file
    if [ -f "$PROJECT_DIR/.env" ]; then
        # Update existing DATABASE_URL
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME\"|" "$PROJECT_DIR/.env"
    else
        # Create new .env file
        cat > "$PROJECT_DIR/.env" << EOF
# Database Configuration
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# Application Configuration
NEXT_PUBLIC_BASE_URL="http://your-domain.com"
NODE_ENV="production"
PORT=3000

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"

# Puppeteer Configuration
PUPPETEER_CACHE_DIR="/root/.cache/puppeteer"
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="false"

# Optional OTA Platform Credentials
EXPEDIA_USERNAME=""
EXPEDIA_PASSWORD=""
EXPEDIA_SESSION_COOKIE=""
BOOKING_API_TOKEN=""
BOOKING_SESSION_COOKIE=""
BOOKING_XSRF_TOKEN=""
AIRBNB_USERNAME=""
AIRBNB_PASSWORD=""
REDDIT_CLIENT_ID=""
REDDIT_CLIENT_SECRET=""
EOF
    fi
fi

echo "✅ Database setup completed successfully!"
echo ""
echo "📋 Database Information:"
echo "• Database Name: $DB_NAME"
echo "• Database User: $DB_USER"
echo "• Database Password: $DB_PASSWORD"
echo "• Connection URL: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "🔧 Next steps:"
echo "1. Update the .env file with your actual configuration values"
echo "2. Run database migrations: cd $PROJECT_DIR && npx prisma migrate deploy"
echo "3. Generate Prisma client: npx prisma generate"
echo ""
echo "💾 Database credentials have been saved to: $PROJECT_DIR/.env" 