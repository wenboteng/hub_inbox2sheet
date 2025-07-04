# GYG Data Management System

## Overview

This document describes the complete GetYourGuide (GYG) data management system that connects to a second Neon database, extracts activity data, and provides both real-time analysis and full import capabilities.

## Architecture

### Database Setup
- **Main Database**: Primary Neon database (existing)
- **GYG Database**: Secondary Neon database for GetYourGuide data
- **Dual Connection**: Separate Prisma clients for each database

### Data Flow
```
GYG Database → Dual Prisma Client → Main Database → Analytics & Reports
```

## Environment Variables

Add these to your `.env` file:

```bash
# Main database (existing)
DATABASE_URL="postgresql://..."

# GYG database (new)
GYG_DATABASE_URL="postgresql://..."
```

## Database Schema

### Main Database - New Tables

#### `ImportedGYGActivity`
Stores imported GYG activity data with cleaning and processing.

```sql
model ImportedGYGActivity {
  id                String   @id @default(cuid())
  originalId        String   @unique // GYG database ID
  activityName      String
  providerName      String
  location          String
  priceText         String?  // Original price text
  priceNumeric      Float?   // Extracted numeric price
  ratingText        String?  // Original rating text
  ratingNumeric     Float?   // Extracted numeric rating (0-5)
  reviewCountText   String?  // Original review count text
  reviewCountNumeric Int?    // Extracted numeric review count
  duration          String?
  description       String?
  extractionQuality String?
  tags              String[] // Array of tags
  url               String?
  importedAt        DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([location])
  @@index([providerName])
  @@index([ratingNumeric])
  @@index([priceNumeric])
}
```

## Scripts Overview

### 1. Database Connection Testing
```bash
# Test dual database connections
npm run test:dual-db
```

**Purpose**: Verifies both databases are accessible and shows table counts.

### 2. Data Extraction & Analysis
```bash
# Extract and analyze GYG data (read-only)
npm run extract:gyg
```

**Purpose**: Reads from GYG database, analyzes data quality, generates reports.

### 3. Full Data Import
```bash
# Import all GYG data to main database
npm run import:gyg
```

**Purpose**: Imports all GYG activities to main database with cleaning and processing.

### 4. Incremental Data Import
```bash
# Import only new/updated GYG data
npm run import:gyg:incremental
```

**Purpose**: Efficiently imports only new or changed data from GYG database.

### 5. Data Management Strategy
```bash
# View comprehensive data management strategy
npm run strategy:gyg
```

**Purpose**: Generates detailed documentation of data management approach.

## Usage Workflows

### Initial Setup
1. **Add environment variables** for GYG database
2. **Test connections**: `npm run test:dual-db`
3. **Extract initial data**: `npm run extract:gyg`
4. **Import full dataset**: `npm run import:gyg`

### Daily Operations
```bash
# Check for new data (recommended daily)
npm run import:gyg:incremental

# Generate analytics (as needed)
npm run analytics:vendor
```

### Weekly Operations
```bash
# Full data validation
npm run extract:gyg

# Quality assessment
npm run strategy:gyg
```

## Data Management Strategy

### Key Principles

1. **🔄 Incremental Updates**: Only process new/updated data
2. **🛡️ Data Safety**: Original GYG database remains unchanged
3. **📊 Multiple Views**: Raw, cleaned, and analyzed data
4. **🔧 Flexible Processing**: Versioned data processing
5. **📈 Scalable**: Handles growing datasets efficiently

### Data Flow Architecture

```
GYG Database (Read-Only)
    ↓
Dual Prisma Client
    ↓
Main Database
    ├── ImportedGYGActivity (Raw imported data)
    ├── ProcessedGYGActivity (Cleaned data)
    ├── MarketAnalysis (Aggregated insights)
    └── Reports (Generated reports)
```

### Conflict Resolution

- **Incremental imports** prevent data conflicts
- **Original ID tracking** ensures no duplicates
- **Versioned processing** allows safe experimentation
- **Audit trails** track all data changes

## File Structure

```
src/
├── lib/
│   └── dual-prisma.ts          # Dual database connections
├── scripts/
│   ├── test-dual-database.ts   # Connection testing
│   ├── extract-gyg-data.ts     # Data extraction & analysis
│   ├── full-gyg-import.ts      # Full data import
│   ├── incremental-gyg-import.ts # Incremental import
│   └── data-management-strategy.ts # Strategy documentation
└── prisma/
    └── schema.prisma           # Updated schema with GYG tables
```

## Monitoring & Maintenance

### Key Metrics
- **Import Success Rate**: Target >95%
- **Processing Time**: Target <5 minutes
- **Data Quality Score**: Target >90%
- **Storage Usage**: Monitor growth

### Alert Conditions
- Import failures > 5%
- Processing time > 10 minutes
- Data quality < 80%
- Storage growth > 50% in a week

## Troubleshooting

### Common Issues

1. **Connection Errors**
   ```bash
   # Test individual connections
   npm run test:dual-db
   ```

2. **Import Failures**
   ```bash
   # Check data quality
   npm run extract:gyg
   ```

3. **Performance Issues**
   ```bash
   # Review strategy
   npm run strategy:gyg
   ```

### Debug Commands
```bash
# Check database status
npm run test:dual-db

# Validate data quality
npm run extract:gyg

# Test incremental import
npm run import:gyg:incremental
```

## Best Practices

### Data Import
- ✅ Use incremental imports for regular updates
- ✅ Validate data before processing
- ✅ Log all operations for debugging
- ✅ Monitor performance metrics

### Data Processing
- ✅ Keep original data unchanged
- ✅ Version all processing steps
- ✅ Test changes on small datasets
- ✅ Document all rules and changes

### Data Analysis
- ✅ Use processed data for analytics
- ✅ Create aggregated views for performance
- ✅ Regular backups of analysis results
- ✅ Monitor query performance

## Security Considerations

- **Read-only access** to GYG database
- **Environment variables** for sensitive data
- **No data modification** of source database
- **Audit trails** for all operations

## Performance Optimization

- **Indexed queries** on key fields
- **Batch processing** for large datasets
- **Incremental updates** to minimize processing
- **Connection pooling** for database efficiency

## Future Enhancements

1. **Automated Scheduling**: Cron jobs for regular imports
2. **Real-time Monitoring**: Dashboard for import status
3. **Advanced Analytics**: Machine learning insights
4. **Data Quality Scoring**: Automated quality assessment
5. **Multi-source Integration**: Additional data sources

## Support

For issues or questions:
1. Check this documentation
2. Run troubleshooting commands
3. Review generated reports
4. Check database logs

---

**Last Updated**: 2025-01-07
**Version**: 1.0.0
**Status**: Production Ready 