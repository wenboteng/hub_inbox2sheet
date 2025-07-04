# Dual Database Setup Guide

## Overview

This guide explains how to connect to and work with two Neon databases simultaneously:
1. **Main Database** (`DATABASE_URL`) - Your existing database for articles and content
2. **GYG Database** (`GYG_DATABASE_URL`) - Your GetYourGuide activity data database

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Main database (existing)
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# GYG database (new)
GYG_DATABASE_URL="postgresql://username:password@host:port/gyg_database?sslmode=require"
```

### 2. Render Environment Variables

If deploying to Render, add both environment variables to your Render dashboard:

1. Go to your Render dashboard
2. Navigate to your service
3. Go to Environment tab
4. Add both `DATABASE_URL` and `GYG_DATABASE_URL`

## Testing the Setup

### Test Both Database Connections

```bash
npm run test:dual-db
```

This will:
- Check if both environment variables are set
- Test connections to both databases
- Display connection status and basic statistics
- Show available tables in the GYG database

### Expected Output

```
🔍 TESTING DUAL DATABASE CONNECTIONS...

1. Checking environment variables...
✅ DATABASE_URL is set: postgresql://****@host:port/database
✅ GYG_DATABASE_URL is set: postgresql://****@host:port/gyg_database

2. Testing database connections...
📊 CONNECTION RESULTS:
✅ Main database: CONNECTED
✅ GYG database: CONNECTED

3. Testing main database data access...
✅ Main database: Found 1234 articles

4. Testing GYG database data access...
✅ GYG database: Found 5 tables
   Tables: activities, bookings, reviews, users, vendors

📋 SUMMARY:
🎉 Both databases are connected and ready for use!
```

## Working with GYG Data

### 1. Extract Basic GYG Data

```bash
npm run extract:gyg
```

This script will:
- Connect to the GYG database
- Extract basic statistics (categories, locations, providers)
- Calculate price and rating statistics
- Generate a comprehensive report
- Save the report to your main database

### 2. Process and Analyze GYG Data

```bash
npm run process:gyg
```

This script will:
- Process GYG activities for deeper analysis
- Calculate value scores and popularity metrics
- Generate insights about pricing and ratings
- Create detailed reports with recommendations

## Database Schema Requirements

### GYG Database Expected Schema

The GYG database should have an `activities` table with the following columns:

```sql
CREATE TABLE activities (
  id VARCHAR PRIMARY KEY,
  title VARCHAR,
  description TEXT,
  location VARCHAR,
  price VARCHAR,
  rating DECIMAL(3,2),
  review_count INTEGER,
  category VARCHAR,
  duration VARCHAR,
  provider VARCHAR,
  url VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Main Database

Your main database already has the `Report` model for storing analysis results:

```prisma
model Report {
  id         String   @id @default(uuid())
  type       String   @unique
  title      String
  content    String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## Available Scripts

### Testing Scripts

- `npm run test:dual-db` - Test both database connections
- `npm run test:db` - Test main database only

### GYG Data Scripts

- `npm run extract:gyg` - Extract and analyze basic GYG data
- `npm run process:gyg` - Process GYG data for deeper insights

### Existing Scripts (Unaffected)

- `npm run scrape` - Your existing scraping functionality
- `npm run diagnose:db` - Database diagnosis
- All other existing scripts continue to work normally

## Code Usage Examples

### Using Dual Database in Your Code

```typescript
import { mainPrisma, gygPrisma, getPrismaClient } from '../lib/dual-prisma';

// Use main database (existing functionality)
const articles = await mainPrisma.article.findMany();

// Use GYG database (new functionality)
const activities = await gygPrisma.$queryRaw`
  SELECT * FROM activities WHERE rating >= 4.5
`;

// Or use the utility function
const db = getPrismaClient('gyg'); // or 'main'
const data = await db.$queryRaw`SELECT COUNT(*) FROM activities`;
```

### Testing Database Connections

```typescript
import { testBothDatabases } from '../lib/dual-prisma';

const results = await testBothDatabases();
console.log('Main DB connected:', results.main.connected);
console.log('GYG DB connected:', results.gyg.connected);
```

## Troubleshooting

### Common Issues

1. **GYG_DATABASE_URL not set**
   ```
   ❌ GYG_DATABASE_URL environment variable is not set!
   ```
   **Solution**: Add the environment variable to your `.env` file and Render dashboard.

2. **GYG database connection failed**
   ```
   ❌ GYG database: FAILED
   Error: Can't reach database server
   ```
   **Solution**: 
   - Check if the GYG database is active in Neon dashboard
   - Verify the connection string is correct
   - Ensure the database is not paused

3. **Table not found**
   ```
   Error: relation "activities" does not exist
   ```
   **Solution**: Ensure your GYG database has the expected schema with an `activities` table.

### Database Schema Issues

If your GYG database has a different schema, you can modify the scripts:

1. Update the table name in the queries
2. Adjust column names to match your schema
3. Modify the data processing logic as needed

## Security Considerations

- Both database URLs are masked in logs for security
- Connection strings should be kept secure
- Consider using connection pooling for production
- Monitor database usage and costs

## Performance Tips

- The scripts process data in batches to avoid memory issues
- Use LIMIT clauses for large datasets
- Consider indexing frequently queried columns
- Monitor query performance and optimize as needed

## Next Steps

1. **Set up environment variables** with your GYG database URL
2. **Test the connections** using `npm run test:dual-db`
3. **Extract initial data** using `npm run extract:gyg`
4. **Process and analyze** using `npm run process:gyg`
5. **Customize the scripts** based on your specific GYG data schema
6. **Integrate insights** into your existing analytics workflows

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the diagnosis scripts to identify specific problems
3. Verify your database schemas match the expected structure
4. Check Neon dashboard for database status and logs

The dual database setup is designed to be non-intrusive and won't affect your existing functionality while providing powerful new capabilities for GYG data analysis. 