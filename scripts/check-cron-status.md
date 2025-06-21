# Manual Cron Job Rebuild Guide

## Issue
The cron jobs are still running old code with hardcoded Chrome version `137.0.7151.119` instead of the new dynamic detection.

## Solution: Manual Rebuild from Render Dashboard

### Step 1: Access Render Dashboard
1. Go to https://dashboard.render.com
2. Find your service: `ota-answer-hub`

### Step 2: Find Cron Jobs
1. Look for two cron jobs:
   - `ota-answer-hub-crawler` (2am UTC)
   - `ota-answer-hub-airbnb-community-crawler` (4am UTC)

### Step 3: Manual Rebuild
1. Click on each cron job
2. Look for "Manual Deploy" or "Redeploy" button
3. Click to trigger a manual rebuild
4. Wait for build to complete

### Step 4: Verify Build
Check the build logs for:
- `Build timestamp: 2025-06-21-12:30:00` in build command
- Puppeteer setup test running
- Chrome installation logs

### Alternative: Use Trigger Script
```bash
./scripts/trigger-rebuild.sh
```

## Expected New Logs
After rebuild, you should see:
```
🚀 Starting AIRBNB COMMUNITY CRAWLER (Cron Job #2)
[PUPPETEER] Found Chrome versions: linux-{version}
[PUPPETEER] Using Chrome version: linux-{version}
✅ Puppeteer test successful
```

Instead of the old error:
```
Could not find Chrome (ver. 137.0.7151.119)
``` 