import { mainPrisma, gygPrisma } from '../src/lib/dual-prisma.js';

async function importGYGProviders() {
  console.log('🚀 IMPORTING PROVIDERS FROM GYG DATABASE TO MAIN DATABASE...\n');

  try {
    await gygPrisma.$connect();
    await mainPrisma.$connect();
    console.log('✅ Connected to both databases');

    // Fetch all providers from GYG
    const providers = await gygPrisma.$queryRaw`SELECT * FROM "Provider"`;
    console.log(`📊 Found ${(providers as any[]).length} providers in GYG database`);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const provider of providers as any[]) {
      try {
        // Clean and map fields
        const data = {
          originalId: provider.id.toString(),
          name: provider.name?.trim() || '',
          sourceUrl: provider.sourceUrl || null,
          website: provider.website || null,
          email: provider.email || null,
          phone: provider.phone || null,
          description: provider.description || null,
          location: provider.location || null,
          services: provider.services || null,
          socialMedia: provider.socialMedia ? (typeof provider.socialMedia === 'string' ? JSON.parse(provider.socialMedia) : provider.socialMedia) : null,
          contactStatus: provider.contactStatus || null,
          failedAttempts: provider.failed_attempts || 0,
          extractedAt: provider.extractedAt ? new Date(provider.extractedAt) : new Date(),
          enrichedAt: provider.enrichedAt ? new Date(provider.enrichedAt) : null,
          contactedAt: provider.contactedAt ? new Date(provider.contactedAt) : null,
          createdAt: provider.createdAt ? new Date(provider.createdAt) : new Date(),
          updatedAt: provider.updatedAt ? new Date(provider.updatedAt) : new Date(),
          importedAt: new Date(),
          // Cleaning fields (optional, can be filled later)
          cleanedAt: null,
          qualityScore: null,
          city: null,
          country: null,
          contactQuality: null,
          websiteStatus: null,
          socialMediaCount: provider.socialMedia ? Object.keys(typeof provider.socialMedia === 'string' ? JSON.parse(provider.socialMedia) : provider.socialMedia).length : 0,
        };

        // Check if already imported
        const existing = await mainPrisma.importedGYGProvider.findFirst({
          where: { originalId: data.originalId }
        });

        if (existing) {
          await mainPrisma.importedGYGProvider.update({
            where: { id: existing.id },
            data: { ...data, updatedAt: new Date() }
          });
          updated++;
        } else {
          await mainPrisma.importedGYGProvider.create({ data });
          imported++;
        }
      } catch (error) {
        console.error('❌ Error importing provider:', error);
        errors++;
      }
    }

    console.log(`\n🎉 PROVIDER IMPORT COMPLETED!`);
    console.log(`✅ Imported: ${imported}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${(providers as any[]).length}`);

  } catch (error) {
    console.error('❌ Error during provider import:', error);
  } finally {
    await gygPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

if (require.main === module) {
  importGYGProviders();
} 