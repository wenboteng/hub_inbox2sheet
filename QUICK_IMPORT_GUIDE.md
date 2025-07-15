# 🚀 Quick Import Guide - Second Database Data

*Last Updated: 2025-07-15*

## 📋 Overview

This guide provides quick commands and workflows for importing new activities data from the GYG (GetYourGuide) database to your main database. The system uses a dual database setup with automatic cleaning and quality monitoring.

## 🔧 Prerequisites

### Environment Variables
Ensure these are set in your `.env` file and Render dashboard:

```bash
# Main database (existing)
DATABASE_URL="postgresql://..."

# GYG database (second database)
GYG_DATABASE_URL="postgresql://..."
```

## 🚀 Quick Start Commands

### 1. Test Database Connections
```bash
npm run test:dual-db
```
**Purpose**: Verify both databases are connected and accessible
**Expected Output**: ✅ Both databases connected successfully

### 2. Import New Data (Daily Operation)
```bash
npm run import:gyg:incremental
```
**Purpose**: Import only new/updated activities from GYG database
**Frequency**: Daily (recommended)
**Time**: ~1-2 minutes

### 3. Clean New Data
```bash
npm run clean:gyg:incremental
```
**Purpose**: Clean and process newly imported data
**Frequency**: After each import
**Time**: ~30 seconds

### 4. Monitor Data Quality
```bash
npm run monitor:gyg:quality
```
**Purpose**: Check data quality metrics and coverage
**Frequency**: Weekly
**Time**: ~10 seconds

## 📊 Complete Workflow

### Daily Operations (Recommended)
```bash
# 1. Import new data
npm run import:gyg:incremental

# 2. Clean the data
npm run clean:gyg:incremental

# 3. Check quality (optional)
npm run monitor:gyg:quality
```

### Weekly Operations
```bash
# 1. Full data extraction and analysis
npm run extract:gyg

# 2. Generate analytics reports
npm run analytics:vendor
npm run analytics:customer
npm run analytics:competitive
```

### Monthly Operations
```bash
# 1. Full re-import (if needed)
npm run import:gyg

# 2. Comprehensive analysis
npm run analytics:all
```

## 📈 Expected Results

### After Daily Import
- **New Activities**: 0-50 typically
- **Processing Time**: 1-2 minutes
- **Success Rate**: >95%
- **Data Quality**: 70-100/100 score

### Data Coverage Targets
- **Price Data**: >80% (currently 61.2%)
- **Rating Data**: >80% (currently 52.2%)
- **Location Data**: >90% (currently 63.4%)
- **Provider Data**: >90% (currently 64.9%)

## 🔍 Monitoring & Troubleshooting

### Check Import Status
```bash
# View recent imports
npm run check:gyg:import

# Check data quality
npm run monitor:gyg:quality

# View import statistics
npm run check:combined:gyg:stats
```

### Common Issues & Solutions

#### 1. Connection Errors
```bash
# Test connections
npm run test:dual-db

# Check environment variables
echo $DATABASE_URL
echo $GYG_DATABASE_URL
```

#### 2. Import Failures
```bash
# Check GYG database status
npm run extract:gyg

# View error logs
npm run diagnose:db
```

#### 3. Data Quality Issues
```bash
# Run quality assessment
npm run monitor:gyg:quality

# Check data cleaning status
npm run clean:gyg:incremental
```

## 📊 Data Statistics

### Current Database Status
- **GYG Database**: 848 activities
- **Main Database**: 848 imported activities
- **Import Success Rate**: 100%
- **Average Quality Score**: 74.4/100

### Top Locations
1. **Madrid**: 418 activities (49.3%)
2. **Barcelona**: 16 activities (1.9%)
3. **Toledo**: 15 activities (1.8%)
4. **Segovia**: 9 activities (1.1%)

### Top Providers
1. **GetYourGuide**: 68 activities (8.0%)
2. **GetYourGuide Tours & Tickets GmbH**: 26 activities (3.1%)
3. **Naturanda Turismo Ambiental**: 17 activities (2.0%)

## 🎯 Best Practices

### Import Strategy
- ✅ **Use incremental imports** for daily operations
- ✅ **Run imports during low-traffic hours**
- ✅ **Monitor success rates** and quality scores
- ✅ **Keep original data unchanged**

### Data Quality
- ✅ **Review quality reports** weekly
- ✅ **Address coverage gaps** systematically
- ✅ **Validate data accuracy** regularly
- ✅ **Track quality improvements** over time

### Performance
- ✅ **Batch processing** for large datasets
- ✅ **Index optimization** for frequent queries
- ✅ **Connection pooling** for efficiency
- ✅ **Monitor processing times**

## 🔄 Automation

### Cron Job Setup (Recommended)
```bash
# Daily import at 2 AM
0 2 * * * cd /path/to/project && npm run import:gyg:incremental

# Weekly quality check at 3 AM on Sundays
0 3 * * 0 cd /path/to/project && npm run monitor:gyg:quality
```

### Render Cron Jobs
The system is already configured with Render cron jobs:
- **Main crawler**: Every hour
- **Secondary crawler**: Every 2 hours
- **Data import**: Can be added as needed

## 📁 Generated Reports

### Automatic Reports
- `activities-summary-report.md` - Comprehensive data analysis
- `activities-import-report.md` - Import statistics
- Quality monitoring reports
- Import and cleaning logs

### Report Locations
- **Database**: Stored in `Report` table
- **Files**: Saved in project root
- **Logs**: Console output and error logs

## 🛠️ Advanced Operations

### Full Data Re-import
```bash
# Clear and re-import all data
npm run import:gyg
```
**Use when**: Schema changes, major data cleaning, complete refresh

### Data Analysis
```bash
# Generate vendor analytics
npm run analytics:vendor

# Generate customer insights
npm run analytics:customer

# Generate competitive analysis
npm run analytics:competitive

# Generate all analytics
npm run analytics:all
```

### Data Cleaning Pipeline
```bash
# Full data cleaning
npm run clean:gyg:data

# Incremental cleaning
npm run clean:gyg:incremental

# Quality monitoring
npm run monitor:gyg:quality
```

## 🔒 Security & Safety

### Data Protection
- ✅ **Read-only access** to GYG database
- ✅ **No data modification** of source database
- ✅ **Environment variables** for sensitive data
- ✅ **Audit trails** for all operations

### Backup Strategy
- ✅ **Original GYG data** preserved
- ✅ **Imported data** versioned
- ✅ **Processing logs** maintained
- ✅ **Error recovery** automated

## 📞 Support & Troubleshooting

### Quick Diagnostics
```bash
# Test database connections
npm run test:dual-db

# Check data quality
npm run monitor:gyg:quality

# View recent activity
npm run check:content:stats
```

### Common Error Messages

#### "GYG_DATABASE_URL not set"
**Solution**: Add environment variable to `.env` and Render dashboard

#### "Can't reach database server"
**Solution**: Check if Neon database is active and not paused

#### "Table not found"
**Solution**: Verify GYG database schema matches expected structure

#### "Import failures > 5%"
**Solution**: Check data quality and processing pipeline

### Performance Issues
- **Slow imports**: Check database performance and network
- **Memory issues**: Reduce batch sizes in import scripts
- **Connection timeouts**: Increase timeout values
- **High CPU usage**: Optimize processing algorithms

## 📈 Success Metrics

### Key Performance Indicators
- **Import Success Rate**: >95% (target)
- **Processing Time**: <5 minutes (target)
- **Data Quality Score**: >90% (target)
- **Coverage Rates**: >80% for key fields (target)

### Current Performance
- **Import Success Rate**: 100% ✅
- **Processing Time**: 1-2 minutes ✅
- **Data Quality Score**: 74.4/100 ⚠️
- **Price Coverage**: 61.2% ⚠️
- **Rating Coverage**: 52.2% ⚠️

## 🎯 Next Steps

### Immediate Actions
1. **Set up daily cron job** for automatic imports
2. **Monitor quality metrics** weekly
3. **Address coverage gaps** systematically
4. **Optimize processing** for better performance

### Long-term Improvements
1. **Automated quality monitoring** with alerts
2. **Advanced analytics** and insights
3. **Multi-source integration** (Viator, Airbnb, etc.)
4. **Real-time data processing** capabilities

---

## 📝 Quick Reference Commands

| Operation | Command | Frequency | Time |
|-----------|---------|-----------|------|
| Test connections | `npm run test:dual-db` | As needed | 10s |
| Import new data | `npm run import:gyg:incremental` | Daily | 1-2m |
| Clean data | `npm run clean:gyg:incremental` | After import | 30s |
| Check quality | `npm run monitor:gyg:quality` | Weekly | 10s |
| Full analysis | `npm run extract:gyg` | Weekly | 5m |
| Generate reports | `npm run analytics:vendor` | As needed | 2m |

---

*This guide is automatically generated and updated based on the current system configuration. For detailed documentation, see `GYG_DATA_MANAGEMENT.md` and `DUAL_DATABASE_GUIDE.md`.* 