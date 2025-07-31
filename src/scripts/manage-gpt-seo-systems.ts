import { PrismaClient } from '@prisma/client';
import { enrichReportWithGPT } from '../utils/openai';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

interface ReportInfo {
  id: string;
  title: string;
  type: string;
  slug: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
}

async function manageGPTSESystems() {
  console.log('🎯 GPT-4o & SEO SYSTEMS MANAGEMENT');
  console.log('==================================\n');

  try {
    // Get all reports
    const reports = await prisma.report.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`📊 Found ${reports.length} total reports\n`);

    // Display menu
    console.log('🔧 Available Operations:');
    console.log('1. 📝 Enrich specific report with GPT-4o');
    console.log('2. 🚀 Enrich all reports with GPT-4o');
    console.log('3. 🔍 Analyze SEO for specific report');
    console.log('4. 📊 Generate comprehensive SEO analysis');
    console.log('5. 📱 Generate social media content');
    console.log('6. 🧪 Test GPT-4o enrichment (demo)');
    console.log('7. 📋 List all reports with status');
    console.log('8. 🔄 Update report metadata');
    console.log('9. 🗑️  Clean up old optimization files');
    console.log('0. ❌ Exit\n');

    // For now, let's show the current reports and their status
    await displayReportsStatus(reports);

    console.log('\n🎯 What would you like to do?');
    console.log('(You can run specific functions directly or use this menu)');

  } catch (error) {
    console.error('❌ Error in management system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function displayReportsStatus(reports: ReportInfo[]) {
  console.log('📋 CURRENT REPORTS STATUS:');
  console.log('==========================');

  for (const report of reports) {
    const wordCount = report.wordCount || calculateWordCount(report.title);
    const hasGPTEnrichment = report.title.includes('🚀') || report.title.includes('✨');
    const isOptimized = report.slug.includes('-2025') || report.type.includes('2025');
    
    console.log(`\n📄 ${report.title}`);
    console.log(`   ID: ${report.id}`);
    console.log(`   Type: ${report.type}`);
    console.log(`   Slug: ${report.slug}`);
    console.log(`   Public: ${report.isPublic ? '✅' : '❌'}`);
    console.log(`   Word Count: ${wordCount}`);
    console.log(`   GPT Enriched: ${hasGPTEnrichment ? '✅' : '❌'}`);
    console.log(`   SEO Optimized: ${isOptimized ? '✅' : '❌'}`);
    console.log(`   Updated: ${report.updatedAt.toLocaleDateString()}`);
  }
}

function calculateWordCount(text: string): number {
  return text.split(/\s+/).length;
}

// GPT-4o Enrichment Functions
export async function enrichSpecificReport(reportId: string) {
  console.log(`🎯 ENRICHING SPECIFIC REPORT: ${reportId}\n`);

  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      console.log('❌ Report not found');
      return;
    }

    console.log(`📝 Enriching: ${report.title}`);
    console.log(`📊 Current word count: ${calculateWordCount(report.content)}`);

    const { enrichedContent, shareSuggestions } = await enrichReportWithGPT(
      report.content,
      report.title
    );

    // Update the report
    const updatedReport = await prisma.report.update({
      where: { id: report.id },
      data: {
        content: enrichedContent,
        updatedAt: new Date(),
      }
    });

    console.log('✅ Report enriched successfully!');
    console.log(`📊 New word count: ${calculateWordCount(enrichedContent)}`);
    console.log(`📱 Share suggestions generated: ${shareSuggestions.length}`);

    // Display sample share suggestions
    console.log('\n📱 Sample Share Suggestions:');
    shareSuggestions.slice(0, 3).forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });

    return { report: updatedReport, shareSuggestions };

  } catch (error) {
    console.error('❌ Error enriching report:', error);
    throw error;
  }
}

export async function enrichAllReports() {
  console.log('🚀 ENRICHING ALL REPORTS WITH GPT-4O\n');

  try {
    const reports = await prisma.report.findMany({
      where: { isPublic: true },
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`📊 Found ${reports.length} public reports to enrich\n`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const report of reports) {
      try {
        console.log(`🎯 Enriching: ${report.title}`);
        
        const result = await enrichSpecificReport(report.id);
        results.push(result);
        successCount++;
        
        console.log(`✅ Success: ${report.title}\n`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed: ${report.title} - ${error}`);
        errorCount++;
      }
    }

    console.log('🎉 BATCH ENRICHMENT COMPLETE!');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total processed: ${reports.length}`);

    return results;

  } catch (error) {
    console.error('❌ Error in batch enrichment:', error);
    throw error;
  }
}

// SEO Optimization Functions
export async function analyzeReportSEO(reportId: string) {
  console.log(`🔍 ANALYZING SEO FOR REPORT: ${reportId}\n`);

  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      console.log('❌ Report not found');
      return;
    }

    const wordCount = calculateWordCount(report.content);
    const keywords = extractKeywords(report.content);
    const seoScore = calculateSEOScore(wordCount, keywords.length, report.content);
    const metaDescription = generateMetaDescription(report.content, report.title);
    const structuredData = generateStructuredData(report);
    const socialContent = generateSocialMediaContent(report);

    console.log(`📄 Report: ${report.title}`);
    console.log(`📊 Word Count: ${wordCount}`);
    console.log(`🔑 Keywords Found: ${keywords.length}`);
    console.log(`⭐ SEO Score: ${seoScore}/100`);
    console.log(`📝 Meta Description: ${metaDescription.substring(0, 100)}...`);
    console.log(`📱 Social Content Ideas: ${socialContent.length}`);

    // Generate optimization file
    const optimizationReport = createSEOReport(report, {
      wordCount,
      keywords,
      seoScore,
      metaDescription,
      structuredData,
      socialContent
    });

    const reportPath = join(process.cwd(), `seo-${report.type}.md`);
    writeFileSync(reportPath, optimizationReport, 'utf-8');

    console.log(`📁 SEO Report saved: ${reportPath}`);

    return {
      report,
      seoAnalysis: {
        wordCount,
        keywords,
        seoScore,
        metaDescription,
        structuredData,
        socialContent
      }
    };

  } catch (error) {
    console.error('❌ Error analyzing SEO:', error);
    throw error;
  }
}

export async function generateComprehensiveSEOAnalysis() {
  console.log('📊 GENERATING COMPREHENSIVE SEO ANALYSIS\n');

  try {
    const reports = await prisma.report.findMany({
      where: { isPublic: true },
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`📊 Analyzing ${reports.length} public reports\n`);

    const analyses = [];
    let totalSEOScore = 0;

    for (const report of reports) {
      console.log(`🔍 Analyzing: ${report.title}`);
      
      const analysis = await analyzeReportSEO(report.id);
      analyses.push(analysis);
      totalSEOScore += analysis.seoAnalysis.seoScore;
    }

    const averageSEOScore = Math.round(totalSEOScore / reports.length);
    
    // Generate comprehensive report
    const comprehensiveReport = createComprehensiveSEOReport(analyses, averageSEOScore);
    const reportPath = join(process.cwd(), 'comprehensive-seo-analysis.md');
    writeFileSync(reportPath, comprehensiveReport, 'utf-8');

    console.log('\n🎉 COMPREHENSIVE SEO ANALYSIS COMPLETE!');
    console.log(`📊 Average SEO Score: ${averageSEOScore}/100`);
    console.log(`📁 Report saved: ${reportPath}`);

    return { analyses, averageSEOScore };

  } catch (error) {
    console.error('❌ Error in comprehensive SEO analysis:', error);
    throw error;
  }
}

// Helper Functions
function extractKeywords(content: string): string[] {
  const keywords = [
    'tour operator', 'travel industry', 'booking system', 'channel manager',
    'automation', 'revenue optimization', 'customer experience', 'analytics',
    'digital transformation', 'technology adoption', 'market intelligence',
    'pricing strategy', 'competitive analysis', 'market opportunities'
  ];
  
  return keywords.filter(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
}

function calculateSEOScore(wordCount: number, keywordCount: number, content: string): number {
  let score = 0;
  
  // Word count score (max 30 points)
  if (wordCount >= 1500) score += 30;
  else if (wordCount >= 1000) score += 20;
  else if (wordCount >= 500) score += 10;
  
  // Keyword density score (max 25 points)
  const keywordDensity = keywordCount / (wordCount / 100);
  if (keywordDensity >= 2) score += 25;
  else if (keywordDensity >= 1) score += 15;
  else if (keywordDensity >= 0.5) score += 10;
  
  // Content structure score (max 25 points)
  if (content.includes('##')) score += 10;
  if (content.includes('###')) score += 10;
  if (content.includes('**')) score += 5;
  
  // Meta information score (max 20 points)
  if (content.includes('Last updated')) score += 10;
  if (content.includes('Data source')) score += 10;
  
  return Math.min(score, 100);
}

function generateMetaDescription(content: string, title: string): string {
  const firstParagraph = content.split('\n\n')[1] || content.substring(0, 200);
  const cleanText = firstParagraph.replace(/[#*`]/g, '').trim();
  return `${cleanText.substring(0, 150)}...`;
}

function generateStructuredData(report: any): any {
  return {
    "@context": "https://schema.org",
    "@type": "Report",
    "name": report.title,
    "description": generateMetaDescription(report.content, report.title),
    "datePublished": report.createdAt,
    "dateModified": report.updatedAt,
    "url": `https://otaanswers.com/reports/${report.slug}`,
    "publisher": {
      "@type": "Organization",
      "name": "OTA Answers",
      "url": "https://otaanswers.com"
    }
  };
}

function generateSocialMediaContent(report: any): string[] {
  const content = [];
  const wordCount = calculateWordCount(report.content);
  
  content.push(`📊 ${report.title} - ${wordCount} words of insights for tour operators!`);
  content.push(`🚀 New report alert: ${report.title} - Essential reading for travel industry professionals`);
  content.push(`💡 Discover the latest trends in ${report.title} - Based on real data analysis`);
  
  return content;
}

function createSEOReport(report: any, analysis: any): string {
  return `# ${report.title} - SEO Analysis

## 📊 SEO Metrics
- **Word Count**: ${analysis.wordCount}
- **SEO Score**: ${analysis.seoScore}/100
- **Keywords Found**: ${analysis.keywords.length}

## 📝 Meta Description
${analysis.metaDescription}

## 🔧 Structured Data
\`\`\`json
${JSON.stringify(analysis.structuredData, null, 2)}
\`\`\`

## 📱 Social Media Content
${analysis.socialContent.map(content => `- ${content}`).join('\n')}

## 🎯 Recommendations
- ${analysis.seoScore < 50 ? 'Improve keyword density' : 'Good keyword optimization'}
- ${analysis.wordCount < 1000 ? 'Add more content' : 'Sufficient content length'}
- Consider adding more internal links
- Optimize for featured snippets

---
*Generated on ${new Date().toLocaleDateString()}*`;
}

function createComprehensiveSEOReport(analyses: any[], averageScore: number): string {
  return `# Comprehensive SEO Analysis Report

## 📊 Overview
- **Total Reports Analyzed**: ${analyses.length}
- **Average SEO Score**: ${averageScore}/100
- **Generated**: ${new Date().toLocaleDateString()}

## 📈 Individual Report Scores
${analyses.map(analysis => 
  `- ${analysis.report.title}: ${analysis.seoAnalysis.seoScore}/100`
).join('\n')}

## 🎯 Recommendations
- Focus on reports with scores below 70
- Implement structured data across all reports
- Create internal linking strategy
- Optimize meta descriptions for better CTR

---
*Generated by OTA Answers SEO Analysis System*`;
}

// Test function
export async function testGPTEnrichment() {
  console.log('🧪 TESTING GPT-4O ENRICHMENT (DEMO)\n');

  const sampleContent = `# Sample Report

This is a sample report for testing GPT-4o enrichment capabilities.

## Key Findings
- Important data point 1
- Important data point 2
- Important data point 3

## Conclusion
This report shows significant insights for tour operators.`;

  try {
    const { enrichedContent, shareSuggestions } = await enrichReportWithGPT(sampleContent);
    
    console.log('✅ Test completed successfully!');
    console.log('\n📝 Original Content:');
    console.log(sampleContent);
    console.log('\n📝 Enriched Content:');
    console.log(enrichedContent.substring(0, 300) + '...');
    console.log('\n📱 Share Suggestions:');
    shareSuggestions.slice(0, 2).forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export main function
export { manageGPTSESystems };

// Run if called directly
if (require.main === module) {
  manageGPTSESystems()
    .then(() => {
      console.log('\n🏁 Management system finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Management system failed:', error);
      process.exit(1);
    });
} 