"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importGYGToMain = importGYGToMain;
const dual_prisma_1 = require("../lib/dual-prisma");
async function importGYGToMain() {
    console.log('📥 IMPORTING GYG DATA TO MAIN DATABASE...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to both databases');
        // Get total count from GYG
        const totalCount = await dual_prisma_1.gygPrisma.$queryRaw `SELECT COUNT(*) as count FROM activities`;
        const totalRecords = Number(totalCount[0]?.count || 0);
        console.log(`📊 Found ${totalRecords} activities in GYG database`);
        // Check if we already have imported data (table might not exist yet)
        let existingRecords = 0;
        try {
            const existingCount = await dual_prisma_1.mainPrisma.$queryRaw `
        SELECT COUNT(*) as count FROM "ImportedGYGActivity"
      `;
            existingRecords = Number(existingCount[0]?.count || 0);
        }
        catch (error) {
            console.log('ℹ️  ImportedGYGActivity table does not exist yet (this is normal)');
        }
        if (existingRecords > 0) {
            console.log(`⚠️  Found ${existingRecords} existing imported records`);
            console.log('💡 Use --force to reimport all data');
            return;
        }
        console.log('📋 IMPORT STRATEGY:');
        console.log('1. Read data from GYG database (read-only)');
        console.log('2. Process and clean the data');
        console.log('3. Import to main database for analysis');
        console.log('4. Keep GYG database unchanged');
        // Generate import report
        const report = `
# GYG Data Import Strategy

## Current Status
- **GYG Database**: ${totalRecords} activities (read-only access)
- **Main Database**: Ready for import
- **Import Status**: Not yet imported

## Import Options

### Option A: Analysis-Only (Current)
- ✅ **Pros**: Lightweight, no storage duplication
- ✅ **Cons**: Limited to real-time analysis
- ✅ **Use case**: Regular reporting and insights

### Option B: Full Import for Processing
- ✅ **Pros**: Full data control, complex processing
- ✅ **Cons**: Storage duplication, sync complexity
- ✅ **Use case**: Deep data cleaning and transformation

## Import Process
1. **Read from GYG**: SELECT * FROM activities (read-only)
2. **Process Data**: Parse text fields into structured data
3. **Import to Main**: INSERT INTO ImportedGYGActivity
4. **Keep GYG Unchanged**: No modifications to source database

## Data Processing
- **Price Parsing**: "€43" → 43.0
- **Rating Parsing**: "4.4" → 4.4
- **Review Parsing**: "63,652" → 63652
- **Tag Processing**: JSONB → Array
- **Quality Scoring**: Based on extraction_quality

## Benefits of Import
1. **Full Data Control**: All GYG data available locally
2. **Complex Processing**: Advanced analytics and transformations
3. **Data Cleaning**: Structure and validate data
4. **Integration**: Combine with existing articles
5. **Performance**: Faster queries on local data

## Next Steps
1. **Create Import Table**: Add ImportedGYGActivity to main database
2. **Run Import Script**: Process and import all GYG data
3. **Data Cleaning**: Parse and structure text fields
4. **Analysis**: Perform market and competitive analysis
5. **Automation**: Set up regular sync and processing

## Usage Examples
\`\`\`typescript
// Query imported GYG data
const activities = await mainPrisma.importedGYGActivity.findMany({
  where: { ratingNumeric: { gte: 4.5 } }
});

// Combine with existing articles
const combinedData = await mainPrisma.$queryRaw\`
  SELECT 'article' as type, title, platform FROM article
  UNION ALL
  SELECT 'gyg' as type, activity_name, provider_name FROM "ImportedGYGActivity"
\`;
\`\`\`
`;
        // Save import report
        await dual_prisma_1.mainPrisma.report.upsert({
            where: { type: 'gyg-import-strategy' },
            create: {
                type: 'gyg-import-strategy',
                title: 'GYG Data Import Strategy',
                content: report,
                isPublic: false,
            },
            update: {
                title: 'GYG Data Import Strategy',
                content: report,
                isPublic: false,
            },
        });
        console.log('✅ Import strategy saved to main database');
        console.log('\n📋 RECOMMENDATION:');
        console.log('For data cleaning and further work, consider importing GYG data to main database.');
        console.log('This allows you to:');
        console.log('- Parse text fields into structured data');
        console.log('- Perform complex analytics and transformations');
        console.log('- Integrate with your existing content');
        console.log('- Maintain full control over processed data');
    }
    catch (error) {
        console.error('❌ Error analyzing import strategy:', error);
        throw error;
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
// Run the script
if (require.main === module) {
    importGYGToMain().catch(console.error);
}
//# sourceMappingURL=import-gyg-to-main.js.map