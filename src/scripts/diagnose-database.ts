import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function diagnoseDatabase() {
  console.log('🔍 DATABASE DIAGNOSIS STARTING...\n');

  // Check environment variables
  console.log('1. Checking environment variables...');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    return;
  }
  
  // Mask the password for security
  const maskedUrl = databaseUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`✅ DATABASE_URL is set: ${maskedUrl}`);

  // Check if it's a Neon database
  if (databaseUrl.includes('neon.tech')) {
    console.log('✅ Detected Neon database');
  } else {
    console.log('⚠️  Not a Neon database - this might be the issue');
  }

  // Test basic connectivity
  console.log('\n2. Testing basic connectivity...');
  try {
    const { stdout } = await execAsync(`ping -c 3 ${new URL(databaseUrl).hostname}`);
    console.log('✅ Network connectivity test passed');
  } catch (error) {
    console.error('❌ Network connectivity test failed:', error);
  }

  // Test Prisma connection
  console.log('\n3. Testing Prisma connection...');
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Test connection with a simple query
    await prisma.$connect();
    console.log('✅ Prisma connection successful');
    
    // Test a simple query
    const articleCount = await prisma.article.count();
    console.log(`✅ Database query successful - Found ${articleCount} articles`);
    
  } catch (error) {
    console.error('❌ Prisma connection failed:', error);
    
    // Provide specific troubleshooting steps
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Check if the Neon database is active in your Neon dashboard');
    console.log('2. Verify the DATABASE_URL is correct and includes the right credentials');
    console.log('3. Check if the database has been paused due to inactivity');
    console.log('4. Verify network access from Render to Neon');
    console.log('5. Check if the database schema is properly migrated');
    
  } finally {
    await prisma.$disconnect();
  }

  // Check database schema
  console.log('\n4. Checking database schema...');
  try {
    const { stdout } = await execAsync('npx prisma db pull --print');
    console.log('✅ Database schema check successful');
  } catch (error) {
    console.error('❌ Database schema check failed:', error);
  }

  // Check migrations
  console.log('\n5. Checking migrations...');
  try {
    const { stdout } = await execAsync('npx prisma migrate status');
    console.log('✅ Migration status check successful');
    console.log(stdout);
  } catch (error) {
    console.error('❌ Migration status check failed:', error);
  }

  console.log('\n🏁 DATABASE DIAGNOSIS COMPLETE');
}

// Run the diagnosis
diagnoseDatabase().catch(console.error); 