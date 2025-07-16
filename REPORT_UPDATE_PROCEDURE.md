# 📊 Report Update Procedure Documentation
*Complete Guide for Updating All Analytics Reports*

*Last Updated: July 16, 2025*

---

## 🎯 Overview

This document provides a complete guide for updating all analytics reports in the OTA Answers system. The update process is designed to be simple, automated, and consistent across all report types.

---

## 📋 Available Reports

### **Core Analytics Reports**
1. **Seasonal Pricing Intelligence Report** - Seasonal demand patterns and pricing optimization
2. **Vendor Analytics Report** - Platform performance and market analysis
3. **Customer Insights Report** - Customer behavior and pain points
4. **Competitive Analysis Report** - Competitive landscape and positioning
5. **Executive Summary** - High-level strategic overview

### **Specialized Reports**
6. **Tour Vendor Business Intelligence Report** - Comprehensive business insights
7. **Cancellation Reasons Report** - Cancellation analysis and prevention
8. **Digital Transformation Report** - Technology adoption insights

---

## 🔄 Update Methods

### **Method 1: Command Line (Recommended)**

#### **Individual Report Updates**
```bash
# Update specific reports
npm run analytics:seasonal-pricing    # Seasonal Pricing Intelligence
npm run analytics:vendor             # Vendor Analytics
npm run analytics:customer           # Customer Insights
npm run analytics:competitive        # Competitive Analysis
npm run analytics:all               # All reports + Executive Summary
npm run analytics:cancellation      # Cancellation Reasons Report
```

#### **Complete System Update**
```bash
# Update all reports at once
npm run analytics:all
```

### **Method 2: Admin Interface**

1. **Access Admin Panel**: Go to `https://yourdomain.com/admin`
2. **Navigate to Analytics**: Scroll to "📊 Analytics Reports" section
3. **Select Report**: Click on any report type to generate/update
4. **View Results**: Report appears in interface and saves to database

### **Method 3: API Endpoint**

```bash
# Update via API
curl -X POST https://yourdomain.com/api/admin/analytics \
  -H "Content-Type: application/json" \
  -d '{"reportType": "seasonal-pricing"}'
```

---

## 📊 Data Sources & Dependencies

### **Primary Data Sources**
- **`ImportedGYGActivity`** - Activity pricing and location data
- **`Article`** - Community content and platform data
- **`SubmittedQuestion`** - Customer questions and feedback
- **Real-time database queries** - Always fresh data

### **Data Collection Integration**
Reports automatically use:
- ✅ **New GYG imports** via `npm run import:gyg:incremental`
- ✅ **Community content** from crawlers
- ✅ **Customer questions** from admin submissions
- ✅ **Real-time database** queries (no caching)

---

## ⏰ Update Frequency Recommendations

### **Real-Time Updates (Daily)**
- **Content Count**: Update daily for accurate statistics
- **Platform Distribution**: Update daily for current market share
- **Recent Activity**: Update daily for fresh insights

### **Weekly Updates (Recommended)**
- **Seasonal Pricing Intelligence Report**
- **Vendor Analytics Report**
- **Customer Insights Report**
- **Competitive Analysis Report**

### **Monthly Updates**
- **Executive Summary**
- **Tour Vendor Business Intelligence Report**
- **Cancellation Reasons Report**
- **Digital Transformation Report**

### **On-Demand Updates**
- **Before important meetings**
- **After major data imports**
- **When launching new features**
- **For stakeholder presentations**

---

## 🚀 Step-by-Step Update Procedure

### **Step 1: Verify Data Collection**
```bash
# Check if new data has been collected
npm run check:content-stats

# Check GYG import status
npm run extract:gyg
```

### **Step 2: Update Reports**
```bash
# Option A: Update all reports
npm run analytics:all

# Option B: Update specific reports
npm run analytics:seasonal-pricing
npm run analytics:vendor
npm run analytics:customer
npm run analytics:competitive
```

### **Step 3: Verify Updates**
```bash
# Check report freshness
npm run analytics:check-freshness

# View updated reports
# Go to: https://yourdomain.com/reports/
```

### **Step 4: Monitor Results**
- Check admin interface for generation status
- Verify reports are accessible via web interface
- Confirm database storage of updated reports

---

## 📈 Report-Specific Update Details

### **Seasonal Pricing Intelligence Report**
```bash
# Update command
npm run analytics:seasonal-pricing

# Data requirements
- Minimum 100 activities with pricing data
- At least 5 different locations
- Pricing data from multiple months

# Update frequency: Weekly
# Expected processing time: 2-5 minutes
```

### **Vendor Analytics Report**
```bash
# Update command
npm run analytics:vendor

# Data requirements
- Minimum 500 articles across platforms
- At least 3 different platforms
- Recent activity within 30 days

# Update frequency: Weekly
# Expected processing time: 3-7 minutes
```

### **Customer Insights Report**
```bash
# Update command
npm run analytics:customer

# Data requirements
- Minimum 200 customer questions
- Questions from multiple platforms
- Recent submissions within 60 days

# Update frequency: Weekly
# Expected processing time: 2-4 minutes
```

### **Competitive Analysis Report**
```bash
# Update command
npm run analytics:competitive

# Data requirements
- Minimum 1000 articles total
- Data from at least 5 platforms
- Recent content within 90 days

# Update frequency: Weekly
# Expected processing time: 4-8 minutes
```

### **Executive Summary**
```bash
# Update command
npm run analytics:all  # Includes executive summary

# Data requirements
- All other reports must be up-to-date
- Minimum 7 days since last update

# Update frequency: Monthly
# Expected processing time: 10-15 minutes
```

---

## 🔧 Automation Options

### **Scheduled Updates (Cron Jobs)**
```bash
# Add to your cron job schedule
# Weekly updates (every Monday at 3 AM)
0 3 * * 1 cd /path/to/project && npm run analytics:all

# Daily content checks (every day at 6 AM)
0 6 * * * cd /path/to/project && npm run check:content-stats
```

### **Render Cron Job Configuration**
```yaml
# render.yaml configuration
services:
  - type: cron
    name: weekly-analytics
    env: node
    buildCommand: npm install && npx prisma generate
    startCommand: npm run analytics:all
    schedule: "0 3 * * 1"  # Every Monday at 3 AM
```

### **GitHub Actions (Alternative)**
```yaml
# .github/workflows/analytics.yml
name: Weekly Analytics Update
on:
  schedule:
    - cron: '0 3 * * 1'  # Every Monday at 3 AM

jobs:
  update-analytics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Update analytics reports
        run: npm run analytics:all
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 📊 Monitoring & Quality Assurance

### **Update Success Indicators**
- ✅ **Command completes** without errors
- ✅ **Reports generated** in project root
- ✅ **Database updated** with new report content
- ✅ **Web interface** shows updated reports
- ✅ **File timestamps** reflect recent updates

### **Quality Checks**
```bash
# Check report freshness
npm run analytics:check-freshness

# Verify data quality
npm run check:content-stats

# Monitor database health
npm run diagnose:db
```

### **Common Issues & Solutions**

#### **Issue: Report Generation Fails**
```bash
# Solution: Check database connection
npm run test:db

# Solution: Verify data availability
npm run check:content-stats
```

#### **Issue: Reports Not Updating**
```bash
# Solution: Clear cache and regenerate
npm run analytics:smart-update

# Solution: Force full regeneration
npm run analytics:all
```

#### **Issue: Missing Data in Reports**
```bash
# Solution: Import missing data
npm run import:gyg:incremental

# Solution: Run content discovery
npm run discovery
```

---

## 📋 Update Checklist

### **Before Update**
- [ ] Verify new data has been collected
- [ ] Check database connection
- [ ] Ensure sufficient disk space
- [ ] Review previous report quality

### **During Update**
- [ ] Monitor command execution
- [ ] Check for error messages
- [ ] Verify processing time is reasonable
- [ ] Confirm reports are generated

### **After Update**
- [ ] Verify report accessibility
- [ ] Check data accuracy
- [ ] Review report completeness
- [ ] Update stakeholders if needed

---

## 🎯 Best Practices

### **Update Timing**
- ✅ **Low-traffic hours** (2-6 AM UTC)
- ✅ **After data imports** are complete
- ✅ **Before important meetings**
- ✅ **Consistent schedule** (same day/time)

### **Data Quality**
- ✅ **Verify data completeness** before updates
- ✅ **Check for data anomalies**
- ✅ **Ensure minimum sample sizes**
- ✅ **Validate data freshness**

### **Performance Optimization**
- ✅ **Use incremental updates** when possible
- ✅ **Monitor processing times**
- ✅ **Optimize database queries**
- ✅ **Cache frequently accessed data**

### **Backup & Recovery**
- ✅ **Keep previous report versions**
- ✅ **Backup database before major updates**
- ✅ **Test updates in staging environment**
- ✅ **Have rollback procedures ready**

---

## 📞 Support & Troubleshooting

### **Getting Help**
- **Check logs**: Review console output for errors
- **Verify data**: Ensure sufficient data for analysis
- **Test connectivity**: Confirm database access
- **Review documentation**: Check this guide for solutions

### **Common Commands**
```bash
# Check system status
npm run check:content-stats
npm run diagnose:db
npm run test:db

# Force updates
npm run analytics:smart-update
npm run analytics:all

# Monitor quality
npm run analytics:check-freshness
```

### **Emergency Procedures**
```bash
# If reports fail to generate
npm run diagnose:db
npm run test:db
npm run analytics:all

# If database issues occur
npm run check:content-stats
npm run diagnose:db
```

---

## 📈 Future Enhancements

### **Planned Improvements**
- **Automated scheduling** via admin interface
- **Real-time monitoring** dashboard
- **Email notifications** for update completion
- **Report comparison** tools
- **Custom update schedules** per report type

### **Advanced Features**
- **Incremental updates** for large datasets
- **Parallel processing** for faster updates
- **Report versioning** and history
- **API endpoints** for external integrations
- **Webhook notifications** for update events

---

*This documentation ensures consistent, reliable, and efficient report updates across the entire OTA Answers analytics system.*

**Last Updated**: July 16, 2025  
**Version**: 1.0  
**Maintained by**: Hub Inbox Analytics Team 