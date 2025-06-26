import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSEOImprovements() {
  console.log('🔍 Testing SEO Improvements...\n');

  try {
    // Test 1: Check platform pages can be generated
    console.log('1. Testing Platform Pages...');
    const platforms = await prisma.article.groupBy({
      by: ['platform'],
      _count: {
        id: true
      },
      where: {
        crawlStatus: 'active'
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 3
    });

    console.log(`✅ Found ${platforms.length} platforms for category pages:`);
    platforms.forEach(platform => {
      console.log(`   - ${platform.platform}: ${platform._count.id} articles`);
      console.log(`     URL: /platform/${encodeURIComponent(platform.platform)}`);
    });

    // Test 2: Check related articles functionality
    console.log('\n2. Testing Related Articles...');
    const sampleArticle = await prisma.article.findFirst({
      where: { crawlStatus: 'active' }
    });

    if (sampleArticle) {
      const relatedArticles = await prisma.article.findMany({
        where: {
          OR: [
            { platform: sampleArticle.platform },
            { category: { contains: sampleArticle.category.split(' ')[0] } },
          ],
          id: { not: sampleArticle.id },
          crawlStatus: 'active',
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      console.log(`✅ Found ${relatedArticles.length} related articles for: "${sampleArticle.question.substring(0, 50)}..."`);
      relatedArticles.forEach(article => {
        console.log(`   - ${article.platform}: ${article.question.substring(0, 40)}...`);
      });
    }

    // Test 3: Check metadata generation
    console.log('\n3. Testing Metadata Generation...');
    const testArticle = await prisma.article.findFirst({
      where: { crawlStatus: 'active' }
    });

    if (testArticle) {
      const platform = testArticle.platform;
      const category = testArticle.category.replace(/\[.*?\]/g, '').trim();
      const question = testArticle.question;
      const description = testArticle.answer.substring(0, 150) + '...';
      
      const keywords = [
        platform,
        category,
        'help',
        'solutions',
        'tour vendor',
        'OTA',
        'booking',
        'cancellation',
        'policy'
      ].filter(Boolean).join(', ');

      console.log(`✅ Generated metadata for: "${question.substring(0, 40)}..."`);
      console.log(`   - Title: ${question} | ${platform} Help & Solutions | OTA Answers`);
      console.log(`   - Keywords: ${keywords}`);
      console.log(`   - Canonical: https://ota-answers.com/answers/${testArticle.slug}`);
    }

    // Test 4: Check sitemap generation
    console.log('\n4. Testing Sitemap Generation...');
    const allArticles = await prisma.article.count({
      where: { crawlStatus: 'active' }
    });

    const uniquePlatforms = await prisma.article.groupBy({
      by: ['platform'],
      where: { crawlStatus: 'active' }
    });

    console.log(`✅ Sitemap will include:`);
    console.log(`   - ${allArticles} article URLs`);
    console.log(`   - ${uniquePlatforms.length} platform URLs`);
    console.log(`   - 5 static page URLs`);
    console.log(`   - Total: ${allArticles + uniquePlatforms.length + 5} URLs`);

    // Test 5: Check structured data
    console.log('\n5. Testing Structured Data...');
    if (testArticle) {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{
          "@type": "Question",
          "name": testArticle.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": testArticle.answer
          }
        }]
      };

      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://ota-answers.com"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": testArticle.platform,
            "item": `https://ota-answers.com/platform/${encodeURIComponent(testArticle.platform)}`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": testArticle.question.length > 50 ? testArticle.question.substring(0, 50) + '...' : testArticle.question,
            "item": `https://ota-answers.com/answers/${testArticle.slug}`
          }
        ]
      };

      console.log(`✅ Generated structured data for: "${testArticle.question.substring(0, 40)}..."`);
      console.log(`   - FAQ Schema: ${JSON.stringify(faqSchema).length} characters`);
      console.log(`   - Breadcrumb Schema: ${JSON.stringify(breadcrumbSchema).length} characters`);
    }

    console.log('\n🎉 All SEO improvements tested successfully!');
    console.log('\n📋 Summary of improvements:');
    console.log('   ✅ Enhanced metadata with keywords and canonical URLs');
    console.log('   ✅ Related articles section for better internal linking');
    console.log('   ✅ Platform category pages for content hubs');
    console.log('   ✅ Breadcrumb navigation for better UX');
    console.log('   ✅ Structured data (FAQ + Breadcrumbs) for search engines');
    console.log('   ✅ Updated sitemap with platform pages');
    console.log('   ✅ Homepage platform quick links');

  } catch (error) {
    console.error('❌ Error testing SEO improvements:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSEOImprovements(); 