import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn', 'info'],
  });

  try {
    console.log('📡 Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    console.log('📊 Testing basic query...');
    const articleCount = await prisma.article.count();
    console.log(`✅ Query successful - Found ${articleCount} articles in database`);
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set!');
      console.log('💡 Please set the DATABASE_URL environment variable with your database connection string.');
    } else {
      console.log('💡 DATABASE_URL is set. The issue might be:');
      console.log('   - Database server is down or unreachable');
      console.log('   - Incorrect credentials in the connection string');
      console.log('   - Network connectivity issues');
      console.log('   - Database has been paused (if using Neon)');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

testDatabaseConnection(); 