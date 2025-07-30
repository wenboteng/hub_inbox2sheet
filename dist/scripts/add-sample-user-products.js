"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const sampleUserProducts = [
    {
        userId: 'demo-user',
        productName: 'London Walking Tour - Royal Palaces',
        providerName: 'London Tours Ltd',
        location: 'London',
        city: 'London',
        country: 'UK',
        region: 'UK',
        priceNumeric: 45.00,
        priceCurrency: '£',
        priceText: '£45',
        ratingNumeric: 4.6,
        ratingText: '4.6',
        reviewCountNumeric: 127,
        reviewCountText: '127 reviews',
        category: 'walking-tour',
        activityType: 'tour',
        duration: '3 hours',
        durationHours: 3,
        description: 'Explore the royal palaces of London including Buckingham Palace, Kensington Palace, and St James Palace.',
        platform: 'own-website',
        url: 'https://londontoursltd.com/royal-palaces-tour'
    },
    {
        userId: 'demo-user',
        productName: 'Harry Potter Studio Tour with Transport',
        providerName: 'London Tours Ltd',
        location: 'Warner Bros Studio, London',
        city: 'London',
        country: 'UK',
        region: 'UK',
        priceNumeric: 95.00,
        priceCurrency: '£',
        priceText: '£95',
        ratingNumeric: 4.8,
        ratingText: '4.8',
        reviewCountNumeric: 89,
        reviewCountText: '89 reviews',
        category: 'studio-tour',
        activityType: 'tour',
        duration: '8 hours',
        durationHours: 8,
        description: 'Visit the magical world of Harry Potter at Warner Bros Studio with round-trip transportation from London.',
        platform: 'gyg',
        url: 'https://www.getyourguide.com/london-l57/harry-potter-studio-tour'
    },
    {
        userId: 'demo-user',
        productName: 'Food Tour - East London Markets',
        providerName: 'London Tours Ltd',
        location: 'East London',
        city: 'London',
        country: 'UK',
        region: 'UK',
        priceNumeric: 65.00,
        priceCurrency: '£',
        priceText: '£65',
        ratingNumeric: 4.4,
        ratingText: '4.4',
        reviewCountNumeric: 43,
        reviewCountText: '43 reviews',
        category: 'food-tour',
        activityType: 'tour',
        duration: '4 hours',
        durationHours: 4,
        description: 'Discover the best street food and markets in East London including Brick Lane and Spitalfields.',
        platform: 'viator',
        url: 'https://www.viator.com/london-food-tour'
    },
    {
        userId: 'demo-user',
        productName: 'Night Photography Workshop',
        providerName: 'London Tours Ltd',
        location: 'London Bridge',
        city: 'London',
        country: 'UK',
        region: 'UK',
        priceNumeric: 75.00,
        priceCurrency: '£',
        priceText: '£75',
        ratingNumeric: 4.7,
        ratingText: '4.7',
        reviewCountNumeric: 31,
        reviewCountText: '31 reviews',
        category: 'photography-workshop',
        activityType: 'workshop',
        duration: '3 hours',
        durationHours: 3,
        description: 'Learn night photography techniques while capturing stunning views of London Bridge and the Thames.',
        platform: 'own-website',
        url: 'https://londontoursltd.com/night-photography'
    }
];
async function addSampleUserProducts() {
    try {
        console.log('🚀 Adding sample user products...');
        // Clear existing demo products
        await prisma.userProduct.deleteMany({
            where: { userId: 'demo-user' }
        });
        console.log('🗑️  Cleared existing demo products');
        // Add new sample products
        for (const product of sampleUserProducts) {
            await prisma.userProduct.create({
                data: product
            });
            console.log(`✅ Added: ${product.productName}`);
        }
        // Verify products were added
        const count = await prisma.userProduct.count({
            where: { userId: 'demo-user' }
        });
        console.log(`\n📊 Total user products: ${count}`);
        // Show sample data
        const products = await prisma.userProduct.findMany({
            where: { userId: 'demo-user' },
            select: {
                productName: true,
                priceNumeric: true,
                priceCurrency: true,
                ratingNumeric: true,
                reviewCountNumeric: true,
                platform: true
            }
        });
        console.log('\n📋 Sample User Products:');
        products.forEach((product, index) => {
            console.log(`${index + 1}. ${product.productName}`);
            console.log(`   Price: ${product.priceCurrency}${product.priceNumeric}`);
            console.log(`   Rating: ${product.ratingNumeric}/5 (${product.reviewCountNumeric} reviews)`);
            console.log(`   Platform: ${product.platform}`);
            console.log('');
        });
        console.log('🎉 Sample user products added successfully!');
        console.log('💡 Now the InsightDeck will show real comparisons between your products and market data.');
    }
    catch (error) {
        console.error('❌ Error adding sample products:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the script
addSampleUserProducts()
    .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
//# sourceMappingURL=add-sample-user-products.js.map