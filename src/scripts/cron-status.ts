#!/usr/bin/env tsx

import { ContentCronScheduler } from './cron-scheduler';

async function main() {
  const scheduler = new ContentCronScheduler();
  
  try {
    console.log('📊 Cron Job Status Check');
    console.log('========================');
    
    // Initialize jobs (but don't start them)
    scheduler.initializeJobs();
    
    // Get status
    const status = scheduler.getJobStatus();
    
    console.log('\nCurrent Job Status:');
    status.forEach(job => {
      const statusIcon = job.running ? '🟢' : '🔴';
      const nextRun = job.nextRun ? job.nextRun.toISOString() : 'Not scheduled';
      console.log(`${statusIcon} ${job.name}: ${job.running ? 'Running' : 'Stopped'} (Next: ${nextRun})`);
    });
    
    console.log('\nTo start the cron scheduler, run: npm run cron:start');
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
  }
}

if (require.main === module) {
  main();
} 