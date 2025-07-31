import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

async function runAllTests() {
  console.log('🧪 RUNNING COMPREHENSIVE LOCAL TESTS');
  console.log('=====================================\n');

  const tests = [
    {
      name: 'TypeScript Compilation',
      command: 'npx tsc --noEmit',
      critical: true
    },
    {
      name: 'Project Build',
      command: 'npm run build',
      critical: true
    },
    {
      name: 'Prisma Generation',
      command: 'npx prisma generate',
      critical: true
    },
    {
      name: 'Environment Variables',
      command: 'node -e "require(\'dotenv\').config(); console.log(\'OPENAI_API_KEY:\', process.env.OPENAI_API_KEY ? \'Found\' : \'Missing\')"',
      critical: true
    },
    {
      name: 'GPT-4o Test',
      command: 'npx tsx scripts/test-gpt-enrichment-dynamic.ts',
      critical: false
    }
  ];

  let passedTests = 0;
  let failedTests = 0;
  let criticalFailures = 0;

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      execSync(test.command, { stdio: 'pipe' });
      console.log(`✅ ${test.name} - PASSED\n`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${test.name} - FAILED`);
      console.log(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
      failedTests++;
      if (test.critical) {
        criticalFailures++;
      }
    }
  }

  console.log('📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`🚨 Critical Failures: ${criticalFailures}`);

  if (criticalFailures > 0) {
    console.log('\n🚨 CRITICAL FAILURES DETECTED!');
    console.log('Please fix these issues before deploying.');
    process.exit(1);
  } else if (failedTests > 0) {
    console.log('\n⚠️  NON-CRITICAL FAILURES DETECTED');
    console.log('Review these issues but deployment can proceed.');
  } else {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('Ready for deployment.');
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n🏁 Testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}

export { runAllTests }; 