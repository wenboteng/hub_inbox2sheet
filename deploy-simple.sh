#!/bin/bash

# Simple OTA Answer Hub Deployment Script
# This script deploys the application without reinstalling system packages

set -e

echo "🚀 Starting simple OTA Answer Hub deployment..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if .env file exists, if not create template
if [ ! -f ".env" ]; then
    echo "📝 Creating .env template..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/ota_hub_db"

# Application Configuration
NEXT_PUBLIC_BASE_URL="https://otaanswers.com"
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
    echo "⚠️  Please update the .env file with your actual configuration values"
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🏗️  Building the application..."
npm run build

# Set up Nginx configuration
echo "🌐 Setting up Nginx configuration..."
cat > /etc/nginx/sites-available/ota-answer-hub << EOF
server {
    listen 80;
    server_name otaanswers.com www.otaanswers.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/ota-answer-hub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Stop existing PM2 processes if any
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup

echo "✅ Simple deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env file with your actual configuration values"
echo "2. Set up your domain DNS to point to this server"
echo "3. Set up SSL certificate with Let's Encrypt"
echo "4. Configure cron jobs for automated scraping"
echo ""
echo "🔗 Application should be running at: http://otaanswers.com"
echo "📊 PM2 status: pm2 status"
echo "📝 PM2 logs: pm2 logs ota-answer-hub" 