#!/bin/bash

# OTA Answer Hub Cron Jobs Setup Script (Dual Database)
# This script sets up the automated scraping cron jobs on the droplet server

set -e

echo "⏰ Setting up cron jobs for OTA Answer Hub (Dual Database)..."

# Get the project directory
PROJECT_DIR="/root/projects/hub_inbox2sheet"

# Create a temporary file for the new crontab
TEMP_CRON=$(mktemp)

# Export current crontab
crontab -l > "$TEMP_CRON" 2>/dev/null || echo "" > "$TEMP_CRON"

# Add the cron jobs
cat >> "$TEMP_CRON" << EOF

# OTA Answer Hub Cron Jobs (Dual Database)
# Main scraping cron job (every hour) - Reddit and Airbnb
0 * * * * cd $PROJECT_DIR && npm run scrape:main >> /var/log/ota-hub-main-crawler.log 2>&1

# Secondary scraping cron job (every 2 hours) - TripAdvisor and StackOverflow
0 */2 * * * cd $PROJECT_DIR && npm run scrape:secondary >> /var/log/ota-hub-secondary-crawler.log 2>&1

# Tertiary scraping cron job (every 4 hours) - Viator, GetYourGuide, Expedia, Booking
0 */4 * * * cd $PROJECT_DIR && npm run scrape:tertiary >> /var/log/ota-hub-tertiary-crawler.log 2>&1

# Weekly comprehensive scraping (every Sunday at 2 AM)
0 2 * * 0 cd $PROJECT_DIR && npm run scrape:all >> /var/log/ota-hub-weekly-crawler.log 2>&1

# Weekly SEO optimization pipeline (every Sunday at 4 AM)
0 4 * * 0 cd $PROJECT_DIR && npm run seo:pipeline >> /var/log/ota-hub-seo-pipeline.log 2>&1

# Daily recheck of existing content (every 6 hours)
0 */6 * * * cd $PROJECT_DIR && npm run recheck >> /var/log/ota-hub-recheck.log 2>&1

# Daily discovery of new content (every day at 3 AM)
0 3 * * * cd $PROJECT_DIR && npm run discovery >> /var/log/ota-hub-discovery.log 2>&1

# Community discovery (every 12 hours)
0 */12 * * * cd $PROJECT_DIR && npm run community-discover >> /var/log/ota-hub-community.log 2>&1

# Analytics generation (every Monday at 6 AM)
0 6 * * 1 cd $PROJECT_DIR && npm run analytics:all >> /var/log/ota-hub-analytics.log 2>&1

# GYG Data Import (every day at 5 AM) - Dual Database
0 5 * * * cd $PROJECT_DIR && npm run import:gyg:incremental >> /var/log/ota-hub-gyg-import.log 2>&1

# GYG Data Cleaning (every day at 5:30 AM) - After import
30 5 * * * cd $PROJECT_DIR && npm run clean:gyg:incremental >> /var/log/ota-hub-gyg-cleaning.log 2>&1

# GYG Data Quality Monitoring (every Monday at 7 AM)
0 7 * * 1 cd $PROJECT_DIR && npm run monitor:gyg:quality >> /var/log/ota-hub-gyg-quality.log 2>&1

# Weekly GYG Data Extraction and Analysis (every Sunday at 6 AM)
0 6 * * 0 cd $PROJECT_DIR && npm run extract:gyg >> /var/log/ota-hub-gyg-extraction.log 2>&1

# Log rotation (every day at 1 AM)
0 1 * * * find /var/log/ota-hub-*.log -mtime +7 -delete
EOF

# Install the new crontab
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

# Create log files with proper permissions
touch /var/log/ota-hub-main-crawler.log
touch /var/log/ota-hub-secondary-crawler.log
touch /var/log/ota-hub-tertiary-crawler.log
touch /var/log/ota-hub-weekly-crawler.log
touch /var/log/ota-hub-seo-pipeline.log
touch /var/log/ota-hub-recheck.log
touch /var/log/ota-hub-discovery.log
touch /var/log/ota-hub-community.log
touch /var/log/ota-hub-analytics.log
touch /var/log/ota-hub-gyg-import.log
touch /var/log/ota-hub-gyg-cleaning.log
touch /var/log/ota-hub-gyg-quality.log
touch /var/log/ota-hub-gyg-extraction.log

# Set proper permissions
chmod 644 /var/log/ota-hub-*.log

echo "✅ Cron jobs have been set up successfully!"
echo ""
echo "📋 Cron jobs configured:"
echo "• Main crawler (Reddit + Airbnb): Every hour"
echo "• Secondary crawler (TripAdvisor + StackOverflow): Every 2 hours"
echo "• Tertiary crawler (Viator, GetYourGuide, Expedia, Booking): Every 4 hours"
echo "• Weekly comprehensive scraping: Every Sunday at 2 AM"
echo "• Weekly SEO optimization: Every Sunday at 4 AM"
echo "• Daily recheck: Every 6 hours"
echo "• Daily discovery: Every day at 3 AM"
echo "• Community discovery: Every 12 hours"
echo "• Analytics generation: Every Monday at 6 AM"
echo ""
echo "🔄 GYG Data Management (Dual Database):"
echo "• GYG data import: Every day at 5 AM"
echo "• GYG data cleaning: Every day at 5:30 AM"
echo "• GYG data quality monitoring: Every Monday at 7 AM"
echo "• Weekly GYG data extraction: Every Sunday at 6 AM"
echo ""
echo "🧹 Maintenance:"
echo "• Log rotation: Every day at 1 AM"
echo ""
echo "📝 Log files are located at:"
echo "• /var/log/ota-hub-*.log"
echo ""
echo "🔍 To view cron jobs: crontab -l"
echo "📊 To view logs: tail -f /var/log/ota-hub-*.log"
echo ""
echo "🔄 Dual Database Workflow:"
echo "1. GYG data is imported daily at 5 AM"
echo "2. Data is cleaned and processed at 5:30 AM"
echo "3. Quality is monitored weekly on Monday"
echo "4. Full extraction and analysis on Sunday"
echo "5. All data is stored in your main Neon database" 