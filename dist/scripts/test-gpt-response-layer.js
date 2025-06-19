"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock test data
const testQuery = "How do I get paid from GetYourGuide?";
const testTopResult = {
    id: "test-1",
    url: "https://supply.getyourguide.support/test",
    question: "Payment Processing",
    platform: "GetYourGuide",
    category: "Payments",
    snippets: [
        "Funds are either sent from GetYourGuide or confirmed as received by you based on your payment setup."
    ],
    score: 0.85,
    isSemanticMatch: true,
    isTopMatch: true
};
async function testGptResponseLayer() {
    try {
        console.log('Testing GPT Response Layer API...\n');
        const response = await fetch('http://localhost:3000/api/gpt-response-layer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: testQuery,
                topResult: testTopResult
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('✅ API Response:');
        console.log('Query:', testQuery);
        console.log('Original Paragraph:', testTopResult.snippets[0]);
        console.log('AI Answer:', data.aiAnswer);
        console.log('\n✅ Test completed successfully!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
}
// Only run if this file is executed directly
if (require.main === module) {
    testGptResponseLayer();
}
