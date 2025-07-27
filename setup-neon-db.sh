#!/bin/bash

# OTA Answer Hub Dual Neon DB Setup Script
# This script configures the application to use both main and GYG Neon databases

set -e

echo "☁️  Setting up Dual Neon DB configuration for OTA Answer Hub..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

PROJECT_DIR="/root/projects/hub_inbox2sheet"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found. Please run deploy.sh first."
    exit 1
fi

cd "$PROJECT_DIR"

echo "📝 Please provide your Neon DB connection details:"
echo ""

# Get main Neon DB connection details
echo "🔗 Main Database (DATABASE_URL):"
read -p "Enter your main Neon DB connection string (postgresql://...): " MAIN_DATABASE_URL

if [ -z "$MAIN_DATABASE_URL" ]; then
    echo "❌ Main Neon DB connection string is required"
    exit 1
fi

# Get GYG Neon DB connection details
echo ""
echo "🔗 GYG Database (GYG_DATABASE_URL):"
read -p "Enter your GYG Neon DB connection string (postgresql://...): " GYG_DATABASE_URL

if [ -z "$GYG_DATABASE_URL" ]; then
    echo "❌ GYG Neon DB connection string is required"
    exit 1
fi

# Create or update .env file
echo "📝 Updating .env file with dual Neon DB configuration..."

if [ -f ".env" ]; then
    # Update existing DATABASE_URL
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$MAIN_DATABASE_URL\"|" .env
    
    # Update or add GYG_DATABASE_URL
    if grep -q "GYG_DATABASE_URL" .env; then
        sed -i "s|GYG_DATABASE_URL=.*|GYG_DATABASE_URL=\"$GYG_DATABASE_URL\"|" .env
    else
        # Add GYG_DATABASE_URL after DATABASE_URL
        sed -i "/DATABASE_URL=/a GYG_DATABASE_URL=\"$GYG_DATABASE_URL\"" .env
    fi
else
    # Create new .env file
    cat > .env << EOF
# Database Configuration (Dual Neon DB)
DATABASE_URL="$MAIN_DATABASE_URL"
GYG_DATABASE_URL="$GYG_DATABASE_URL"

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

# Test both database connections
echo "🔍 Testing dual Neon DB connections..."
if npm run test:dual-db; then
    echo "✅ Dual Neon DB connections successful!"
else
    echo "❌ Dual Neon DB connections failed. Please check your connection strings."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Verify both connection strings are correct"
    echo "2. Ensure both databases are active in Neon dashboard"
    echo "3. Check if databases are not paused"
    echo "4. Verify network connectivity"
    exit 1
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations on main database
echo "🗄️  Running database migrations on main database..."
npx prisma migrate deploy

echo "✅ Dual Neon DB setup completed successfully!"
echo ""
echo "📋 Dual Database Information:"
echo "• Main Database: Neon DB (articles, content, reports)"
echo "• GYG Database: Neon DB (GetYourGuide activities)"
echo "• Main Connection: Configured in DATABASE_URL"
echo "• GYG Connection: Configured in GYG_DATABASE_URL"
echo "• Migrations: Applied to main database"
echo ""
echo "🔧 Next steps:"
echo "1. Update other environment variables in .env file"
echo "2. Restart the application: pm2 restart ota-answer-hub"
echo "3. Test dual database functionality: npm run test:dual-db"
echo "4. Import GYG data: npm run import:gyg:incremental"
echo ""
echo "💾 Database credentials have been saved to: $PROJECT_DIR/.env" 