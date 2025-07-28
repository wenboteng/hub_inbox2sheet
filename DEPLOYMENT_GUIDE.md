# 🚀 Deployment Guide - Enhanced FAQ System

## 📋 Overview
This update includes major enhancements to the FAQ system with AI-powered summaries, Oxylabs integration for content collection, and automated crawling capabilities.

## 🔧 Required Environment Variables

### New Environment Variables Needed:
```bash
# Oxylabs API Configuration (REQUIRED for new content collection)
OXYLABS_USERNAME=your_oxylabs_username
OXYLABS_PASSWORD=your_oxylabs_password

# OpenAI API (for AI summaries)
OPENAI_API_KEY=your_openai_api_key

# Database (existing)
DATABASE_URL=your_database_url
```

## 🗄️ Database Migration Required

### 1. Run Database Migration
```bash
# Generate Prisma client with new schema
npx prisma generate

# Apply the migration (this will add AI summary fields)
npx prisma migrate deploy
```

### 2. New Database Fields Added:
- `aiSummary` (TEXT) - Pre-generated AI summaries
- `keyPoints` (TEXT[]) - Extracted key points
- `actionItems` (TEXT[]) - Action items
- `urgency` (TEXT) - Content urgency level
- `impact` (TEXT) - Content impact level
- `summaryGeneratedAt` (TIMESTAMP) - When summary was generated

## 🚀 Deployment Steps

### 1. Pull Latest Changes
```bash
git pull origin main
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Application
```bash
npm run build
```

### 4. Run Database Migration
```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. Set Up Cron Jobs (Optional - for automated crawling)
```bash
chmod +x setup-cron.sh
./setup-cron.sh
```

## 🔍 What's New

### ✅ Enhanced FAQ System
- **AI-Powered Summaries**: Each FAQ now has intelligent summaries
- **3-Layer Progressive Disclosure**: Better user experience
- **Cost Optimization**: Summaries are cached to reduce API calls
- **Smart Filtering**: Tourist vs vendor content separation

### ✅ New Content Collection
- **Oxylabs Integration**: High-quality content from multiple sources
- **Automated Crawling**: Background processes collect content 24/7
- **Multiple Platforms**: Airbnb, Reddit, TripAdvisor, GetYourGuide, Viator
- **Quality Filtering**: Only relevant tour vendor content

### ✅ Monitoring & Management
- **Status Monitoring**: `./check-crawler-status.sh` to check system health
- **Automated Logs**: All crawler activity logged to `/var/log/ota-hub-*.log`
- **Cron Jobs**: Automated content collection schedules

## 📊 Expected Results

### Content Growth:
- **Daily Average**: 50+ new articles per day
- **Quality**: High-quality tour vendor questions and answers
- **Coverage**: Multiple platforms and content types

### Performance:
- **AI Summaries**: Cached for cost optimization
- **Progressive Loading**: Better user experience
- **Background Processing**: No impact on main application

## 🔧 Troubleshooting

### If Oxylabs is not configured:
- The system will fall back to existing crawlers
- No breaking changes to current functionality
- AI summaries will still work with existing content

### If database migration fails:
```bash
# Check current schema
npx prisma db pull

# Regenerate client
npx prisma generate

# Try migration again
npx prisma migrate deploy
```

### If cron jobs fail:
```bash
# Check cron status
crontab -l

# Reinstall cron jobs
./setup-cron.sh

# Check logs
tail -f /var/log/ota-hub-*.log
```

## 📈 Monitoring

### Check System Status:
```bash
./check-crawler-status.sh
```

### View Logs:
```bash
# All crawler logs
tail -f /var/log/ota-hub-*.log

# Specific crawler
tail -f /var/log/ota-hub-crawler.log
```

### Database Stats:
```bash
npm run check:content-stats
```

## 🎯 Post-Deployment Verification

1. **Check FAQ Page**: Visit `/faq` to see new 3-layer system
2. **Test AI Summaries**: Verify summaries are being generated
3. **Monitor Content**: Check for new content being added
4. **Review Logs**: Ensure no errors in crawler logs

## 📞 Support

If issues arise:
1. Check the logs first: `/var/log/ota-hub-*.log`
2. Verify environment variables are set
3. Ensure database migration completed successfully
4. Check cron job status: `crontab -l`

## 🔄 Rollback Plan

If needed, you can rollback to the previous version:
```bash
git checkout HEAD~1
npm install
npm run build
npx prisma generate
```

**Note**: Rolling back will remove the new AI summary fields from the database schema, but existing data will remain intact. 