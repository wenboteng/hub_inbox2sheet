#!/bin/bash

# Content-Only Deployment Script
# This script handles content updates without full application redeployment

set -e

echo "🚀 Starting content-only deployment..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes from main branch..."
git pull origin main

# Install dependencies (if package.json changed)
if git diff --name-only HEAD~1 | grep -q "package.json\|package-lock.json"; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client (if schema changed)
if git diff --name-only HEAD~1 | grep -q "prisma/schema.prisma"; then
    echo "🔧 Generating Prisma client..."
    npx prisma generate
fi

# Build the application (if source code changed)
if git diff --name-only HEAD~1 | grep -E "\.(ts|tsx|js|jsx)$" | grep -v "node_modules" | head -1; then
    echo "🏗️  Building the application..."
    npm run build
fi

# Restart PM2 process
echo "🔄 Restarting application..."
pm2 restart ota-answer-hub

echo "✅ Content deployment completed successfully!"
echo "📊 PM2 status: pm2 status"
echo "📝 PM2 logs: pm2 logs ota-answer-hub" 