# Database Connection Troubleshooting Guide

## Issue Summary
The scraping cron job is failing with a database connection error:
```
Can't reach database server at `ep-round-block-a8dx1h7i-pooler.eastus2.azure.neon.tech:5432`
```

## Quick Diagnosis Steps

### 1. Test Database Connection Locally
```bash
npm run test:db
```

### 2. Run Full Database Diagnosis
```bash
npm run diagnose:db
```

### 3. Test Scraping with Retry Logic
```bash
npm run scrape:with-retry
```

## Common Causes and Solutions

### 1. Neon Database Paused
**Problem**: Neon databases are automatically paused after inactivity to save costs.

**Solution**: 
- Log into your Neon dashboard
- Check if the database is paused
- Resume the database if needed
- Consider upgrading to a plan that doesn't auto-pause

### 2. Incorrect DATABASE_URL
**Problem**: The connection string might be incorrect or outdated.

**Solution**:
- Get a fresh connection string from your Neon dashboard
- Update the `DATABASE_URL` environment variable in Render
- Ensure the connection string includes the correct credentials

### 3. Network Connectivity Issues
**Problem**: Render's servers might not be able to reach Neon's servers.

**Solution**:
- Check if Neon is experiencing any outages
- Verify that the database region is accessible from Render
- Consider using a different database region if needed

### 4. Database Credentials Expired
**Problem**: Database credentials might have expired or been rotated.

**Solution**:
- Generate new credentials in your Neon dashboard
- Update the `DATABASE_URL` with the new credentials
- Test the connection with the new credentials

### 5. Database Schema Issues
**Problem**: The database schema might not be properly migrated.

**Solution**:
```bash
# Run migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

## Environment Variable Configuration

### Render Environment Variables
Make sure these are set in your Render dashboard:

1. Go to your Render dashboard
2. Navigate to your service
3. Go to Environment tab
4. Verify `DATABASE_URL` is set correctly

### Local Development
Create a `.env` file in your project root:
```env
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

## Testing Commands

### Basic Connection Test
```bash
npm run test:db
```

### Full Diagnosis
```bash
npm run diagnose:db
```

### Scraping with Retry Logic
```bash
npm run scrape:with-retry
```

## Monitoring and Alerts

### Set up Database Monitoring
1. Enable Neon's built-in monitoring
2. Set up alerts for database downtime
3. Monitor connection pool usage

### Render Logs
Check Render logs for detailed error information:
1. Go to your Render dashboard
2. Navigate to your service
3. Check the Logs tab for recent errors

## Prevention Strategies

### 1. Use Connection Pooling
Consider using Neon's connection pooling to improve reliability:
```
postgresql://username:password@ep-round-block-a8dx1h7i-pooler.eastus2.azure.neon.tech:5432/database?sslmode=require
```

### 2. Implement Retry Logic
The new `scrape-with-retry.ts` script includes retry logic for database connections.

### 3. Health Checks
Implement database health checks in your application:
```typescript
// Example health check
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
```

### 4. Graceful Degradation
Implement graceful degradation when the database is unavailable:
- Cache responses
- Use fallback data sources
- Queue operations for later retry

## Emergency Procedures

### If Database is Completely Unavailable
1. Check Neon status page for outages
2. Contact Neon support if needed
3. Consider switching to a backup database
4. Pause the cron job temporarily

### If Credentials are Compromised
1. Immediately rotate database credentials
2. Update all environment variables
3. Check for unauthorized access
4. Review access logs

## Support Resources

- [Neon Documentation](https://neon.tech/docs)
- [Render Documentation](https://render.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Status Page](https://status.neon.tech)

## Next Steps

1. Run the diagnosis scripts to identify the specific issue
2. Check your Neon dashboard for database status
3. Update environment variables if needed
4. Test the connection locally
5. Deploy the fix to Render
6. Monitor the next cron job execution 