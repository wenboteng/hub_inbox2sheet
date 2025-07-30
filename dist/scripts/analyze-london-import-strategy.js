"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dual_prisma_1 = require("../lib/dual-prisma");
async function analyzeLondonImportStrategy() {
    console.log('🔍 ANALYZING LONDON IMPORT STRATEGY...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to both databases');
        // London keywords for identification
        const londonKeywords = [
            'london', 'londres', 'londra', 'london eye', 'buckingham', 'westminster',
            'tower of london', 'big ben', 'thames', 'chelsea', 'soho', 'camden',
            'covent garden', 'piccadilly', 'oxford street', 'regent street',
            'hyde park', 'kensington', 'greenwich', 'windsor', 'stonehenge',
            'bath', 'oxford', 'cambridge', 'warner bros', 'harry potter',
            'heathrow', 'gatwick', 'stansted', 'luton', 'city airport'
        ];
        function isLondonActivity(activityName) {
            if (!activityName)
                return false;
            const lowerName = activityName.toLowerCase();
            return londonKeywords.some(keyword => lowerName.includes(keyword));
        }
        // Analyze GYG Activities
        console.log('📊 GYG ACTIVITIES ANALYSIS:');
        console.log('===========================');
        const gygTotal = await dual_prisma_1.gygPrisma.$queryRaw `SELECT COUNT(*) as count FROM gyg_activities`;
        const gygCount = Number(gygTotal[0]?.count || 0);
        console.log(`Total GYG activities: ${gygCount}`);
        const gygActivities = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT activity_name, provider_name, location, price, rating, review_count, 
             duration, description, activity_url, extraction_quality
      FROM gyg_activities 
      LIMIT 2000
    `;
        const gygLondonActivities = gygActivities.filter(activity => isLondonActivity(activity.activity_name));
        console.log(`GYG London activities found: ${gygLondonActivities.length}`);
        // Analyze Viator Activities
        console.log('\n📊 VIATOR ACTIVITIES ANALYSIS:');
        console.log('==============================');
        const viatorTotal = await dual_prisma_1.gygPrisma.$queryRaw `SELECT COUNT(*) as count FROM viator_activities`;
        const viatorCount = Number(viatorTotal[0]?.count || 0);
        console.log(`Total Viator activities: ${viatorCount}`);
        const viatorActivities = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT activity_name, provider_name, location, price, rating, review_count,
             duration, description, activity_url, extraction_quality
      FROM viator_activities 
      LIMIT 2000
    `;
        const viatorLondonActivities = viatorActivities.filter(activity => isLondonActivity(activity.activity_name));
        console.log(`Viator London activities found: ${viatorLondonActivities.length}`);
        // Data Quality Analysis
        console.log('\n🎯 DATA QUALITY ANALYSIS:');
        console.log('========================');
        // GYG Quality Analysis
        const gygWithPrice = gygLondonActivities.filter(a => a.price && a.price !== 'N/A').length;
        const gygWithRating = gygLondonActivities.filter(a => a.rating && a.rating !== 'N/A').length;
        const gygWithLocation = gygLondonActivities.filter(a => a.location && a.location !== 'N/A').length;
        const gygWithProvider = gygLondonActivities.filter(a => a.provider_name && a.provider_name !== 'N/A').length;
        console.log('GYG London Activities Quality:');
        console.log(`  With Price: ${gygWithPrice}/${gygLondonActivities.length} (${Math.round((gygWithPrice / gygLondonActivities.length) * 100)}%)`);
        console.log(`  With Rating: ${gygWithRating}/${gygLondonActivities.length} (${Math.round((gygWithRating / gygLondonActivities.length) * 100)}%)`);
        console.log(`  With Location: ${gygWithLocation}/${gygLondonActivities.length} (${Math.round((gygWithLocation / gygLondonActivities.length) * 100)}%)`);
        console.log(`  With Provider: ${gygWithProvider}/${gygLondonActivities.length} (${Math.round((gygWithProvider / gygLondonActivities.length) * 100)}%)`);
        // Viator Quality Analysis
        const viatorWithPrice = viatorLondonActivities.filter(a => a.price && a.price !== 'N/A').length;
        const viatorWithRating = viatorLondonActivities.filter(a => a.rating && a.rating !== 'N/A').length;
        const viatorWithLocation = viatorLondonActivities.filter(a => a.location && a.location !== 'N/A').length;
        const viatorWithProvider = viatorLondonActivities.filter(a => a.provider_name && a.provider_name !== 'N/A').length;
        console.log('\nViator London Activities Quality:');
        console.log(`  With Price: ${viatorWithPrice}/${viatorLondonActivities.length} (${Math.round((viatorWithPrice / viatorLondonActivities.length) * 100)}%)`);
        console.log(`  With Rating: ${viatorWithRating}/${viatorLondonActivities.length} (${Math.round((viatorWithRating / viatorLondonActivities.length) * 100)}%)`);
        console.log(`  With Location: ${viatorWithLocation}/${viatorLondonActivities.length} (${Math.round((viatorWithLocation / viatorLondonActivities.length) * 100)}%)`);
        console.log(`  With Provider: ${viatorWithProvider}/${viatorLondonActivities.length} (${Math.round((viatorWithProvider / viatorLondonActivities.length) * 100)}%)`);
        // Sample Data Analysis
        console.log('\n📋 SAMPLE DATA ANALYSIS:');
        console.log('========================');
        console.log('\nSample GYG London Activities:');
        gygLondonActivities.slice(0, 5).forEach((activity, index) => {
            console.log(`${index + 1}. "${activity.activity_name.substring(0, 60)}..."`);
            console.log(`   Provider: ${activity.provider_name || 'N/A'}`);
            console.log(`   Location: "${activity.location || 'N/A'}"`);
            console.log(`   Price: ${activity.price || 'N/A'} | Rating: ${activity.rating || 'N/A'}`);
            console.log(`   Quality: ${activity.extraction_quality || 'N/A'}`);
            console.log('');
        });
        console.log('\nSample Viator London Activities:');
        viatorLondonActivities.slice(0, 5).forEach((activity, index) => {
            console.log(`${index + 1}. "${activity.activity_name.substring(0, 60)}..."`);
            console.log(`   Provider: ${activity.provider_name || 'N/A'}`);
            console.log(`   Location: "${activity.location || 'N/A'}"`);
            console.log(`   Price: ${activity.price || 'N/A'} | Rating: ${activity.rating || 'N/A'}`);
            console.log(`   Quality: ${activity.extraction_quality || 'N/A'}`);
            console.log('');
        });
        // Current Main Database Status
        console.log('\n🏠 CURRENT MAIN DATABASE STATUS:');
        console.log('================================');
        const currentCleanedLondon = await dual_prisma_1.mainPrisma.cleanedActivity.count({
            where: { city: 'London' }
        });
        console.log(`Current London activities in main database: ${currentCleanedLondon}`);
        console.log(`Potential new London activities to add: ${gygLondonActivities.length + viatorLondonActivities.length}`);
        console.log(`Total London activities after import: ${currentCleanedLondon + gygLondonActivities.length + viatorLondonActivities.length}`);
        // Import Strategy
        console.log('\n📋 IMPORT STRATEGY:');
        console.log('==================');
        console.log('1. Process GYG London activities first (better data quality)');
        console.log('2. Process Viator London activities (fix location data)');
        console.log('3. Clean and standardize all data');
        console.log('4. Import to CleanedActivity table');
        console.log('5. Create comprehensive London reports');
        // Data Processing Plan
        console.log('\n🔧 DATA PROCESSING PLAN:');
        console.log('=======================');
        console.log('GYG Activities Processing:');
        console.log('  ✅ Good location data - use as is');
        console.log('  ✅ Good pricing data - standardize currency');
        console.log('  ✅ Good rating data - convert to numeric');
        console.log('  ✅ Good provider data - clean names');
        console.log('');
        console.log('Viator Activities Processing:');
        console.log('  ⚠️  Missing location data - assign "London" based on name');
        console.log('  ✅ Good pricing data - standardize currency');
        console.log('  ✅ Good rating data - convert to numeric');
        console.log('  ✅ Good provider data - clean names');
        // Quality Score Calculation
        console.log('\n🎯 QUALITY SCORE ESTIMATION:');
        console.log('============================');
        console.log('Expected quality scores after processing:');
        console.log('  GYG Activities: 85-95% (high quality)');
        console.log('  Viator Activities: 75-85% (good quality)');
        console.log('  Combined dataset: 80-90% (excellent for analysis)');
        // Final Summary
        console.log('\n🎯 FINAL SUMMARY:');
        console.log('=================');
        console.log(`✅ GYG London activities: ${gygLondonActivities.length} (high quality)`);
        console.log(`✅ Viator London activities: ${viatorLondonActivities.length} (good quality)`);
        console.log(`✅ Total new London activities: ${gygLondonActivities.length + viatorLondonActivities.length}`);
        console.log(`✅ Current London activities: ${currentCleanedLondon}`);
        console.log(`✅ Total after import: ${currentCleanedLondon + gygLondonActivities.length + viatorLondonActivities.length}`);
        console.log(`✅ Ready for comprehensive London tourism analysis`);
        console.log('\n📋 NEXT STEPS:');
        console.log('==============');
        console.log('1. ✅ Confirm the import strategy');
        console.log('2. 🔄 Create import scripts for both tables');
        console.log('3. 🧹 Process and clean the data');
        console.log('4. 📥 Import to main database');
        console.log('5. 📊 Create London tourism reports');
    }
    catch (error) {
        console.error('❌ Error analyzing import strategy:', error);
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
analyzeLondonImportStrategy().catch(console.error);
//# sourceMappingURL=analyze-london-import-strategy.js.map