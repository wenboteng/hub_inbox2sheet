# Cron Jobs Explanation for OTA Answer Hub

## What are Cron Jobs?

Cron jobs are automated tasks that run on a schedule on Linux servers. They're like "scheduled tasks" in Windows or "automated workflows" in other systems.

## How Cron Jobs Work in Our Setup

### 1. **No DigitalOcean Cron Service Needed**
- We use the **system cron** (built into Linux)
- No additional DigitalOcean services required
- Runs directly on your droplet server

### 2. **Cron Job Structure**
```bash
# Format: minute hour day month weekday command
0 * * * * cd /root/projects/hub_inbox2sheet && npm run scrape:main
```

**Breaking it down:**
- `0` = At minute 0 (top of the hour)
- `*` = Every hour
- `*` = Every day of the month
- `*` = Every month
- `*` = Every day of the week
- `cd /root/projects/hub_inbox2sheet && npm run scrape:main` = The command to run

## Our Cron Jobs Explained

### 🕐 **Main Crawler (Every Hour)**
```bash
0 * * * * cd /root/projects/hub_inbox2sheet && npm run scrape:main
```
**What it does:**
- Scrapes Reddit and Airbnb content
- Runs every hour at the top of the hour (1:00, 2:00, 3:00, etc.)
- Logs to: `/var/log/ota-hub-main-crawler.log`

### 🕑 **Secondary Crawler (Every 2 Hours)**
```bash
0 */2 * * * cd /root/projects/hub_inbox2sheet && npm run scrape:secondary
```
**What it does:**
- Scrapes TripAdvisor and StackOverflow content
- Runs every 2 hours (2:00, 4:00, 6:00, etc.)
- Logs to: `/var/log/ota-hub-secondary-crawler.log`

### 🕓 **Tertiary Crawler (Every 4 Hours)**
```bash
0 */4 * * * cd /root/projects/hub_inbox2sheet && npm run scrape:tertiary
```
**What it does:**
- Scrapes Viator, GetYourGuide, Expedia, Booking.com
- Runs every 4 hours (4:00, 8:00, 12:00, etc.)
- Logs to: `/var/log/ota-hub-tertiary-crawler.log`

### 🌅 **Weekly Comprehensive Scraping (Sunday 2 AM)**
```bash
0 2 * * 0 cd /root/projects/hub_inbox2sheet && npm run scrape:all
```
**What it does:**
- Runs a complete scraping of all platforms
- Runs every Sunday at 2:00 AM
- Logs to: `/var/log/ota-hub-weekly-crawler.log`

### 🔍 **Weekly SEO Optimization (Sunday 4 AM)**
```bash
0 4 * * 0 cd /root/projects/hub_inbox2sheet && npm run seo:pipeline
```
**What it does:**
- Optimizes content for search engines
- Runs every Sunday at 4:00 AM
- Logs to: `/var/log/ota-hub-seo-pipeline.log`

### 🔄 **Daily Recheck (Every 6 Hours)**
```bash
0 */6 * * * cd /root/projects/hub_inbox2sheet && npm run recheck
```
**What it does:**
- Rechecks existing content for updates
- Runs every 6 hours (6:00, 12:00, 18:00, 24:00)
- Logs to: `/var/log/ota-hub-recheck.log`

### 🌅 **Daily Discovery (3 AM Daily)**
```bash
0 3 * * * cd /root/projects/hub_inbox2sheet && npm run discovery
```
**What it does:**
- Discovers new content sources
- Runs every day at 3:00 AM
- Logs to: `/var/log/ota-hub-discovery.log`

### 🔄 **Community Discovery (Every 12 Hours)**
```bash
0 */12 * * * cd /root/projects/hub_inbox2sheet && npm run community-discover
```
**What it does:**
- Discovers community/forum content
- Runs every 12 hours (12:00 AM, 12:00 PM)
- Logs to: `/var/log/ota-hub-community.log`

### 📊 **Analytics Generation (Monday 6 AM)**
```bash
0 6 * * 1 cd /root/projects/hub_inbox2sheet && npm run analytics:all
```
**What it does:**
- Generates comprehensive analytics reports
- Runs every Monday at 6:00 AM
- Logs to: `/var/log/ota-hub-analytics.log`

### 🧹 **Log Rotation (Daily 1 AM)**
```bash
0 1 * * * find /var/log/ota-hub-*.log -mtime +7 -delete
```
**What it does:**
- Deletes log files older than 7 days
- Runs every day at 1:00 AM
- Keeps disk space clean

## How to Manage Cron Jobs

### View All Cron Jobs
```bash
crontab -l
```

### Edit Cron Jobs
```bash
crontab -e
```

### Remove All Cron Jobs
```bash
crontab -r
```

### Check Cron Service Status
```bash
systemctl status cron
```

### View Cron Job Logs
```bash
# View all cron logs
tail -f /var/log/ota-hub-*.log

# View specific job logs
tail -f /var/log/ota-hub-main-crawler.log
tail -f /var/log/ota-hub-secondary-crawler.log
```

## Cron Job Timing Explained

### Time Format: `minute hour day month weekday`
- **minute**: 0-59
- **hour**: 0-23
- **day**: 1-31
- **month**: 1-12
- **weekday**: 0-7 (0 and 7 are Sunday)

### Common Patterns:
- `0 * * * *` = Every hour at minute 0
- `0 */2 * * *` = Every 2 hours at minute 0
- `0 2 * * 0` = Every Sunday at 2:00 AM
- `0 3 * * *` = Every day at 3:00 AM
- `0 6 * * 1` = Every Monday at 6:00 AM

## Monitoring Cron Jobs

### 1. **Check if Jobs are Running**
```bash
# Check cron service
systemctl status cron

# Check recent cron activity
grep CRON /var/log/syslog
```

### 2. **Check Job Output**
```bash
# View recent logs
tail -20 /var/log/ota-hub-main-crawler.log

# Follow logs in real-time
tail -f /var/log/ota-hub-main-crawler.log
```

### 3. **Test Jobs Manually**
```bash
# Test a specific job
cd /root/projects/hub_inbox2sheet
npm run scrape:main

# Test with logging
npm run scrape:main >> /var/log/ota-hub-main-crawler.log 2>&1
```

## Troubleshooting Cron Jobs

### Common Issues:

1. **Jobs not running:**
   ```bash
   # Check cron service
   systemctl status cron
   
   # Restart cron service
   systemctl restart cron
   ```

2. **Permission issues:**
   ```bash
   # Check file permissions
   ls -la /root/projects/hub_inbox2sheet
   
   # Fix permissions if needed
   chmod +x /root/projects/hub_inbox2sheet/package.json
   ```

3. **Environment variables not available:**
   ```bash
   # Cron jobs don't have access to .env by default
   # The setup-cron.sh script handles this by using full paths
   ```

4. **Disk space issues:**
   ```bash
   # Check disk space
   df -h
   
   # Clean up old logs
   find /var/log/ota-hub-*.log -mtime +7 -delete
   ```

## Advantages of System Cron vs DigitalOcean Cron

### System Cron (What We Use):
- ✅ **Free** - No additional cost
- ✅ **Full control** - Customize timing and commands
- ✅ **Better logging** - Detailed logs for debugging
- ✅ **Integration** - Runs in same environment as app
- ✅ **Reliability** - Built into Linux, very stable

### DigitalOcean Cron Service:
- ❌ **Additional cost** - $5-10/month per job
- ❌ **Limited control** - Fixed scheduling options
- ❌ **Separate environment** - May have different dependencies
- ❌ **Less logging** - Limited debugging information

## Summary

Our cron jobs are:
1. **Automated** - Run without manual intervention
2. **Scheduled** - Run at specific times
3. **Logged** - All output is saved to log files
4. **Reliable** - Use system cron (very stable)
5. **Free** - No additional DigitalOcean services needed

The `setup-cron.sh` script automatically configures all these jobs for you, so you don't need to manually set up anything! 