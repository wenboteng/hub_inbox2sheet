#!/bin/bash

# OTA Answer Hub Deployment Script for Current Directory
# This script handles the deployment process in the current directory

set -e

echo "🚀 Starting OTA Answer Hub deployment in current directory..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x if not already installed
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

# Install PostgreSQL if not already installed
if ! command -v psql &> /dev/null; then
    echo "📥 Installing PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
fi

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📥 Installing Nginx..."
    apt install -y nginx
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Install required system dependencies for Puppeteer
echo "📥 Installing Puppeteer dependencies..."
apt install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libxss1 \
    libxtst6

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

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup

echo "✅ Deployment completed successfully!"
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