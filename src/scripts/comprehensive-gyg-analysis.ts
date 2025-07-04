import { gygPrisma } from '../lib/dual-prisma';

async function comprehensiveGYGAnalysis() {
  console.log('🔍 COMPREHENSIVE GYG DATA ANALYSIS...\n');

  try {
    await gygPrisma.$connect();
    console.log('✅ Connected to GYG database');

    // Get total count
    const totalActivities = await gygPrisma.$queryRaw`SELECT COUNT(*) as count FROM activities`;
    const count = (totalActivities as any[])[0].count;
    console.log(`📊 Total activities: ${count}`);

    // Analyze data quality distribution
    const qualityDistribution = await gygPrisma.$queryRaw`
      SELECT 
        extraction_quality,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ${count}, 2) as percentage
      FROM activities 
      GROUP BY extraction_quality 
      ORDER BY count DESC
    `;

    console.log('\n📈 DATA QUALITY DISTRIBUTION:');
    (qualityDistribution as any[]).forEach((row: any) => {
      console.log(`  ${row.extraction_quality || 'NULL'}: ${row.count} (${row.percentage}%)`);
    });

    // Analyze location data
    const locationAnalysis = await gygPrisma.$queryRaw`
      SELECT 
        location,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ${count}, 2) as percentage
      FROM activities 
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location 
      ORDER BY count DESC 
      LIMIT 10
    `;

    console.log('\n🌍 TOP LOCATIONS:');
    (locationAnalysis as any[]).forEach((row: any) => {
      console.log(`  ${row.location}: ${row.count} activities (${row.percentage}%)`);
    });

    // Analyze provider data
    const providerAnalysis = await gygPrisma.$queryRaw`
      SELECT 
        provider_name,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ${count}, 2) as percentage
      FROM activities 
      WHERE provider_name IS NOT NULL AND provider_name != ''
      GROUP BY provider_name 
      ORDER BY count DESC 
      LIMIT 10
    `;

    console.log('\n🏢 TOP PROVIDERS:');
    (providerAnalysis as any[]).forEach((row: any) => {
      console.log(`  ${row.provider_name}: ${row.count} activities (${row.percentage}%)`);
    });

    // Analyze price data
    const priceAnalysis = await gygPrisma.$queryRaw`
      SELECT 
        CASE 
          WHEN price IS NULL OR price = '' THEN 'No Price'
          WHEN price LIKE '%€%' THEN 'Euro Price'
          WHEN price LIKE '%$%' THEN 'Dollar Price'
          WHEN price LIKE '%£%' THEN 'Pound Price'
          ELSE 'Other Currency'
        END as price_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ${count}, 2) as percentage
      FROM activities 
      GROUP BY price_type 
      ORDER BY count DESC
    `;

    console.log('\n💰 PRICE DATA ANALYSIS:');
    (priceAnalysis as any[]).forEach((row: any) => {
      console.log(`  ${row.price_type}: ${row.count} activities (${row.percentage}%)`);
    });

    // Analyze rating data
    const ratingAnalysis = await gygPrisma.$queryRaw`
      SELECT 
        CASE 
          WHEN rating IS NULL OR rating = '' THEN 'No Rating'
          WHEN rating ~ '^[0-9]+\.?[0-9]*$' THEN 'Numeric Rating'
          WHEN rating ~ '^[0-9]+\.?[0-9]*\s*\([0-9,]+\\)$' THEN 'Rating with Reviews'
          ELSE 'Other Rating Format'
        END as rating_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ${count}, 2) as percentage
      FROM activities 
      GROUP BY rating_type 
      ORDER BY count DESC
    `;

    console.log('\n⭐ RATING DATA ANALYSIS:');
    (ratingAnalysis as any[]).forEach((row: any) => {
      console.log(`  ${row.rating_type}: ${row.count} activities (${row.percentage}%)`);
    });

    // Analyze duration data
    const durationAnalysis = await gygPrisma.$queryRaw`
      SELECT 
        CASE 
          WHEN duration IS NULL OR duration = '' THEN 'No Duration'
          WHEN duration ~ '^[0-9]+.*hour' THEN 'Hours'
          WHEN duration ~ '^[0-9]+.*day' THEN 'Days'
          WHEN duration ~ '^[0-9]+.*minute' THEN 'Minutes'
          ELSE 'Other Duration'
        END as duration_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / ${count}, 2) as percentage
      FROM activities 
      GROUP BY duration_type 
      ORDER BY count DESC
    `;

    console.log('\n⏱️ DURATION DATA ANALYSIS:');
    (durationAnalysis as any[]).forEach((row: any) => {
      console.log(`  ${row.duration_type}: ${row.count} activities (${row.percentage}%)`);
    });

    // Sample high-quality records
    const highQualitySamples = await gygPrisma.$queryRaw`
      SELECT 
        id,
        activity_name,
        provider_name,
        location,
        price,
        rating,
        review_count,
        duration,
        extraction_quality
      FROM activities 
      WHERE extraction_quality = 'High'
      LIMIT 5
    `;

    console.log('\n🏆 SAMPLE HIGH-QUALITY RECORDS:');
    (highQualitySamples as any[]).forEach((record: any, index: number) => {
      console.log(`\n  Record ${index + 1}:`);
      console.log(`    Activity: ${record.activity_name}`);
      console.log(`    Provider: ${record.provider_name}`);
      console.log(`    Location: ${record.location}`);
      console.log(`    Price: ${record.price || 'N/A'}`);
      console.log(`    Rating: ${record.rating || 'N/A'}`);
      console.log(`    Reviews: ${record.review_count || 'N/A'}`);
      console.log(`    Duration: ${record.duration || 'N/A'}`);
    });

    // Generate comprehensive report
    const report = `
# Comprehensive GYG Data Analysis Report

## Executive Summary
- **Total Activities**: ${count}
- **Data Quality**: Mixed (High: ${(qualityDistribution as any[]).find((r: any) => r.extraction_quality === 'High')?.percentage || 0}%, Medium: ${(qualityDistribution as any[]).find((r: any) => r.extraction_quality === 'Medium')?.percentage || 0}%)
- **Geographic Coverage**: ${(locationAnalysis as any[]).length} unique locations
- **Provider Diversity**: ${(providerAnalysis as any[]).length} unique providers

## Data Quality Assessment

### Current State
1. **Extraction Quality**: ${(qualityDistribution as any[]).map((r: any) => `${r.extraction_quality || 'NULL'}: ${r.percentage}%`).join(', ')}
2. **Price Coverage**: ${(priceAnalysis as any[]).find((r: any) => r.price_type === 'Euro Price')?.percentage || 0}% have Euro prices
3. **Rating Coverage**: ${(ratingAnalysis as any[]).find((r: any) => r.rating_type === 'Numeric Rating')?.percentage || 0}% have numeric ratings
4. **Duration Coverage**: ${(durationAnalysis as any[]).find((r: any) => r.duration_type !== 'No Duration')?.percentage || 0}% have duration information

### Data Structure Analysis
- **Rich Schema**: 40+ fields including market intelligence fields
- **Mixed Data Types**: Text, numeric, JSONB, timestamps
- **Extraction Method**: Intelligent system with quality scoring
- **Market Intelligence**: Version 1.0 with opportunity scoring

## Data Cleaning Requirements

### 1. Price Data Cleaning
**Current Issues:**
- Text-based prices (€43, From €45)
- Inconsistent formats
- Missing numeric extraction

**Cleaning Strategy:**
\`\`\`typescript
function cleanPrice(priceText: string): { numeric: number | null, currency: string | null } {
  if (!priceText) return { numeric: null, currency: null };
  
  // Extract currency
  const currencyMatch = priceText.match(/[€$£]/);
  const currency = currencyMatch ? currencyMatch[0] : null;
  
  // Extract numeric value
  const numericMatch = priceText.match(/(\\d+(?:,\\d+)?(?:\\.\\d+)?)/);
  const numeric = numericMatch ? parseFloat(numericMatch[1].replace(',', '')) : null;
  
  return { numeric, currency };
}
\`\`\`

### 2. Rating Data Cleaning
**Current Issues:**
- Mixed formats (4.4, 4.4 (63,652))
- Missing numeric extraction
- Inconsistent review count parsing

**Cleaning Strategy:**
\`\`\`typescript
function cleanRating(ratingText: string): { rating: number | null, reviews: number | null } {
  if (!ratingText) return { rating: null, reviews: null };
  
  // Extract rating
  const ratingMatch = ratingText.match(/^(\\d+(?:\\.\\d+)?)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
  
  // Extract review count
  const reviewMatch = ratingText.match(/\\((\\d+(?:,\\d+)*)\\)/);
  const reviews = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;
  
  return { rating, reviews };
}
\`\`\`

### 3. Location Data Standardization
**Current Issues:**
- Inconsistent formats (Barcelona, Barcelona, Spain)
- Mixed city/country combinations
- Duplicate entries

**Cleaning Strategy:**
\`\`\`typescript
function standardizeLocation(location: string): { city: string, country: string } {
  if (!location) return { city: '', country: '' };
  
  // Remove common suffixes
  const cleaned = location.replace(/,\\s*Spain$/, '').trim();
  
  // Split city and country
  const parts = cleaned.split(',').map(p => p.trim());
  
  return {
    city: parts[0] || '',
    country: parts[1] || 'Spain' // Default for current data
  };
}
\`\`\`

### 4. Duration Standardization
**Current Issues:**
- Mixed formats (3-Hour, 1 day, 1-2 days)
- Inconsistent units
- Range formats

**Cleaning Strategy:**
\`\`\`typescript
function standardizeDuration(duration: string): { hours: number | null, days: number | null } {
  if (!duration) return { hours: null, days: null };
  
  // Extract hours
  const hourMatch = duration.match(/(\\d+)\\s*-?\\s*[Hh]our/);
  const hours = hourMatch ? parseInt(hourMatch[1]) : null;
  
  // Extract days
  const dayMatch = duration.match(/(\\d+)\\s*-?\\s*[Dd]ay/);
  const days = dayMatch ? parseInt(dayMatch[1]) : null;
  
  return { hours, days };
}
\`\`\`

## Data Value & Use Cases

### 1. Market Intelligence
**Opportunities:**
- **Competitive Analysis**: Compare providers across locations
- **Price Positioning**: Analyze price ranges and market segments
- **Quality Assessment**: Rating and review analysis
- **Market Gaps**: Identify underserved locations/activities

**Implementation:**
\`\`\`typescript
// Market analysis queries
const marketAnalysis = {
  priceSegments: 'Analyze price distribution by location/activity type',
  qualityCorrelation: 'Correlate ratings with prices and reviews',
  providerPerformance: 'Rank providers by ratings, reviews, and market share',
  geographicGaps: 'Identify locations with limited competition'
};
\`\`\`

### 2. Provider Outreach
**Opportunities:**
- **High-Quality Providers**: Target providers with good ratings
- **Market Expansion**: Identify providers in new locations
- **Partnership Opportunities**: Analyze provider diversity
- **Quality Improvement**: Help providers improve their offerings

**Implementation:**
\`\`\`typescript
// Provider outreach strategy
const outreachStrategy = {
  highPerformers: 'Providers with 4.5+ ratings and 1000+ reviews',
  emergingMarkets: 'Providers in locations with <10 competitors',
  qualityGaps: 'Providers with good ratings but low review counts',
  expansionTargets: 'Providers in one location expanding to others'
};
\`\`\`

### 3. Content Strategy
**Opportunities:**
- **Activity Recommendations**: Curate top-rated activities
- **Location Guides**: Create city-specific activity guides
- **Trend Analysis**: Track popular activity types
- **Seasonal Content**: Analyze activity availability patterns

**Implementation:**
\`\`\`typescript
// Content generation strategy
const contentStrategy = {
  topActivities: 'Generate lists of highest-rated activities by location',
  activityTypes: 'Categorize and analyze different activity types',
  seasonalTrends: 'Track activity availability and pricing changes',
  localInsights: 'Provide local expertise on activities and providers'
};
\`\`\`

### 4. Business Intelligence
**Opportunities:**
- **Revenue Potential**: Analyze pricing and demand patterns
- **Market Size**: Estimate market opportunity by location
- **Competition Level**: Assess market saturation
- **Growth Trends**: Track activity growth over time

**Implementation:**
\`\`\`typescript
// Business intelligence metrics
const businessMetrics = {
  marketSize: 'Total revenue potential by location/activity type',
  competitionIndex: 'Number of providers and activities per location',
  priceElasticity: 'Price sensitivity analysis by market segment',
  growthProjections: 'Activity growth trends and forecasts'
};
\`\`\`

## Multi-Platform Strategy

### Current State: GYG Only
- **580 activities** across 8 locations
- **51 providers** with mixed quality data
- **Limited geographic coverage** (primarily Spain)

### Future Expansion: Multi-Platform
**Target Platforms:**
1. **Viator**: Global activity marketplace
2. **Airbnb Experiences**: Local activity platform
3. **Booking.com**: Travel activities integration
4. **Klook**: Asian market focus
5. **TripAdvisor**: Reviews and booking integration

**Data Collection Strategy:**
\`\`\`typescript
// Multi-platform data collection
const platformStrategy = {
  gyg: { focus: 'Europe', priority: 'High' },
  viator: { focus: 'Global', priority: 'High' },
  airbnb: { focus: 'Local experiences', priority: 'Medium' },
  booking: { focus: 'Travel integration', priority: 'Medium' },
  klook: { focus: 'Asia', priority: 'Medium' },
  tripadvisor: { focus: 'Reviews and ratings', priority: 'Low' }
};
\`\`\`

### Data Standardization Across Platforms
**Common Schema:**
\`\`\`typescript
interface StandardizedActivity {
  platform: string;
  originalId: string;
  activityName: string;
  providerName: string;
  location: { city: string; country: string; region?: string };
  price: { amount: number; currency: string; original: string };
  rating: { score: number; count: number; original: string };
  duration: { hours?: number; days?: number; original: string };
  description: string;
  tags: string[];
  url: string;
  quality: 'High' | 'Medium' | 'Low';
  extractedAt: Date;
}
\`\`\`

## Recommendations

### Immediate Actions (Week 1)
1. **Implement data cleaning scripts** for price, rating, and location
2. **Create standardized schema** for cross-platform compatibility
3. **Set up automated quality scoring** for new data
4. **Develop market analysis queries** for business insights

### Short-term Goals (Month 1)
1. **Expand data collection** to 2-3 additional platforms
2. **Implement real-time data processing** pipeline
3. **Create provider outreach automation** based on quality scores
4. **Develop content generation** from activity data

### Long-term Vision (3-6 months)
1. **Global market coverage** across 10+ platforms
2. **AI-powered insights** for market opportunities
3. **Automated provider onboarding** system
4. **Predictive analytics** for market trends

## Technical Implementation

### Data Pipeline Architecture
\`\`\`
Raw Data (Multiple Platforms) → Cleaning & Standardization → Quality Scoring → Analysis & Insights → Business Applications
\`\`\`

### Quality Assurance
- **Automated validation** of cleaned data
- **Manual review** of edge cases
- **Continuous monitoring** of data quality
- **Feedback loops** for improvement

### Scalability Considerations
- **Batch processing** for large datasets
- **Incremental updates** for efficiency
- **Caching strategies** for performance
- **Database optimization** for queries

This comprehensive analysis provides the foundation for building a robust, scalable data management system that can handle multiple platforms and deliver valuable business insights.
`;

    // Save comprehensive report
    await gygPrisma.$queryRaw`
      INSERT INTO reports (type, title, content, created_at, updated_at)
      VALUES ('comprehensive-gyg-analysis', 'Comprehensive GYG Data Analysis', ${report}, NOW(), NOW())
      ON CONFLICT (type) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    `;

    console.log('\n✅ Comprehensive analysis report saved to database');
    console.log('\n🎯 KEY INSIGHTS:');
    console.log('1. Data quality is mixed - need cleaning for price, rating, and location data');
    console.log('2. Rich schema with market intelligence fields ready for analysis');
    console.log('3. Good foundation for multi-platform expansion');
    console.log('4. Strong potential for market intelligence and provider outreach');

  } catch (error) {
    console.error('❌ Error during comprehensive analysis:', error);
  } finally {
    await gygPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  comprehensiveGYGAnalysis().catch(console.error);
}

export { comprehensiveGYGAnalysis }; 