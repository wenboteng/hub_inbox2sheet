import { gygPrisma } from '../lib/dual-prisma';

async function analyzeSecondDBLondon() {
  console.log('🔍 ANALYZING LONDON ACTIVITIES IN SECOND DATABASE...\n');

  try {
    await gygPrisma.$connect();
    console.log('✅ Connected to second database');

    // Check GYG activities table
    console.log('📊 GYG ACTIVITIES TABLE:');
    console.log('========================');
    
    let gygTotal = 0;
    try {
      const gygCount = await gygPrisma.$queryRaw`SELECT COUNT(*) as count FROM gyg_activities`;
      gygTotal = Number((gygCount as any[])[0]?.count || 0);
      console.log(`Total GYG activities: ${gygTotal}`);
    } catch (error) {
      console.log('❌ gyg_activities table not found');
    }

    // Check Viator activities table
    console.log('\n📊 VIATOR ACTIVITIES TABLE:');
    console.log('===========================');
    
    let viatorTotal = 0;
    try {
      const viatorCount = await gygPrisma.$queryRaw`SELECT COUNT(*) as count FROM viator_activities`;
      viatorTotal = Number((viatorCount as any[])[0]?.count || 0);
      console.log(`Total Viator activities: ${viatorTotal}`);
    } catch (error) {
      console.log('❌ viator_activities table not found');
    }

    // Check activities table (generic)
    console.log('\n📊 ACTIVITIES TABLE (GENERIC):');
    console.log('==============================');
    
    let activitiesTotal = 0;
    try {
      const activitiesCount = await gygPrisma.$queryRaw`SELECT COUNT(*) as count FROM activities`;
      activitiesTotal = Number((activitiesCount as any[])[0]?.count || 0);
      console.log(`Total activities: ${activitiesTotal}`);
    } catch (error) {
      console.log('❌ activities table not found');
    }

    // Analyze London activities by name patterns
    console.log('\n🇬🇧 LONDON ACTIVITY ANALYSIS:');
    console.log('=============================');

    // London keywords to look for in activity names
    const londonKeywords = [
      'london', 'londres', 'londra', 'london eye', 'buckingham', 'westminster',
      'tower of london', 'big ben', 'thames', 'chelsea', 'soho', 'camden',
      'covent garden', 'piccadilly', 'oxford street', 'regent street',
      'hyde park', 'kensington', 'greenwich', 'windsor', 'stonehenge',
      'bath', 'oxford', 'cambridge', 'warner bros', 'harry potter',
      'heathrow', 'gatwick', 'stansted', 'luton', 'city airport'
    ];

    // Function to check if activity name contains London keywords
    function isLondonActivity(activityName: string): boolean {
      if (!activityName) return false;
      const lowerName = activityName.toLowerCase();
      return londonKeywords.some(keyword => lowerName.includes(keyword));
    }

    // Analyze GYG activities for London
    if (gygTotal > 0) {
      console.log('\n🔍 ANALYZING GYG ACTIVITIES FOR LONDON:');
      console.log('========================================');
      
      try {
        const gygActivities = await gygPrisma.$queryRaw`
          SELECT activity_name, provider_name, location, price, rating, review_count
          FROM gyg_activities 
          LIMIT 1000
        `;
        
        const gygLondonActivities = (gygActivities as any[]).filter(activity => 
          isLondonActivity(activity.activity_name)
        );
        
        console.log(`GYG London activities found: ${gygLondonActivities.length}`);
        
        if (gygLondonActivities.length > 0) {
          console.log('\nSample GYG London activities:');
          gygLondonActivities.slice(0, 10).forEach((activity, index) => {
            console.log(`${index + 1}. "${activity.activity_name.substring(0, 60)}..."`);
            console.log(`   Provider: ${activity.provider_name || 'N/A'}`);
            console.log(`   Location: "${activity.location || 'N/A'}"`);
            console.log(`   Price: ${activity.price || 'N/A'} | Rating: ${activity.rating || 'N/A'}`);
            console.log('');
          });
        }
      } catch (error) {
        console.log('❌ Error analyzing GYG activities:', (error as Error).message);
      }
    }

    // Analyze Viator activities for London
    if (viatorTotal > 0) {
      console.log('\n🔍 ANALYZING VIATOR ACTIVITIES FOR LONDON:');
      console.log('==========================================');
      
      try {
        const viatorActivities = await gygPrisma.$queryRaw`
          SELECT activity_name, provider_name, location, price, rating, review_count
          FROM viator_activities 
          LIMIT 1000
        `;
        
        const viatorLondonActivities = (viatorActivities as any[]).filter(activity => 
          isLondonActivity(activity.activity_name)
        );
        
        console.log(`Viator London activities found: ${viatorLondonActivities.length}`);
        
        if (viatorLondonActivities.length > 0) {
          console.log('\nSample Viator London activities:');
          viatorLondonActivities.slice(0, 10).forEach((activity, index) => {
            console.log(`${index + 1}. "${activity.activity_name.substring(0, 60)}..."`);
            console.log(`   Provider: ${activity.provider_name || 'N/A'}`);
            console.log(`   Location: "${activity.location || 'N/A'}"`);
            console.log(`   Price: ${activity.price || 'N/A'} | Rating: ${activity.rating || 'N/A'}`);
            console.log('');
          });
        }
      } catch (error) {
        console.log('❌ Error analyzing Viator activities:', (error as Error).message);
      }
    }

    // Analyze generic activities table for London
    if (activitiesTotal > 0) {
      console.log('\n🔍 ANALYZING GENERIC ACTIVITIES FOR LONDON:');
      console.log('===========================================');
      
      try {
        const activities = await gygPrisma.$queryRaw`
          SELECT activity_name, provider_name, location, price, rating, review_count
          FROM activities 
          LIMIT 1000
        `;
        
        const genericLondonActivities = (activities as any[]).filter(activity => 
          isLondonActivity(activity.activity_name)
        );
        
        console.log(`Generic London activities found: ${genericLondonActivities.length}`);
        
        if (genericLondonActivities.length > 0) {
          console.log('\nSample generic London activities:');
          genericLondonActivities.slice(0, 10).forEach((activity, index) => {
            console.log(`${index + 1}. "${activity.activity_name.substring(0, 60)}..."`);
            console.log(`   Provider: ${activity.provider_name || 'N/A'}`);
            console.log(`   Location: "${activity.location || 'N/A'}"`);
            console.log(`   Price: ${activity.price || 'N/A'} | Rating: ${activity.rating || 'N/A'}`);
            console.log('');
          });
        }
      } catch (error) {
        console.log('❌ Error analyzing generic activities:', (error as Error).message);
      }
    }

    // Check table structure to understand available fields
    console.log('\n🔍 TABLE STRUCTURE ANALYSIS:');
    console.log('============================');
    
    // Try to get table structure for each table
    const tables = ['gyg_activities', 'viator_activities', 'activities'];
    
    for (const table of tables) {
      try {
        const structure = await gygPrisma.$queryRaw`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = ${table}
          ORDER BY ordinal_position
        `;
        
        console.log(`\n${table.toUpperCase()} table structure:`);
        (structure as any[]).forEach(column => {
          console.log(`  ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      } catch (error) {
        console.log(`❌ Could not get structure for ${table} table`);
      }
    }

    console.log('\n🎯 SUMMARY:');
    console.log('============');
    console.log(`✅ GYG activities table: ${gygTotal} activities`);
    console.log(`✅ Viator activities table: ${viatorTotal} activities`);
    console.log(`✅ Generic activities table: ${activitiesTotal} activities`);
    console.log(`✅ London keyword patterns identified`);
    console.log(`✅ Ready for London activity analysis`);

    console.log('\n📋 NEXT STEPS:');
    console.log('==============');
    console.log('1. Review the London activities found in each table');
    console.log('2. Decide which table contains the most relevant London data');
    console.log('3. Plan data processing strategy for London activities');
    console.log('4. Consider importing London activities to main database');

  } catch (error) {
    console.error('❌ Error analyzing second database:', error);
  } finally {
    await gygPrisma.$disconnect();
  }
}

analyzeSecondDBLondon().catch(console.error); 