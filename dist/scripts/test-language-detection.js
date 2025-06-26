"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const languageDetection_1 = require("../utils/languageDetection");
// Test samples in different languages
const testSamples = [
    {
        text: "This is a sample text in English. It contains multiple sentences to test language detection accuracy.",
        expected: "en",
        description: "English text"
    },
    {
        text: "Este es un texto de ejemplo en español. Contiene múltiples oraciones para probar la precisión de la detección de idioma.",
        expected: "es",
        description: "Spanish text"
    },
    {
        text: "Questo è un testo di esempio in italiano. Contiene più frasi per testare l'accuratezza del rilevamento della lingua.",
        expected: "it",
        description: "Italian text"
    },
    {
        text: "Ceci est un exemple de texte en français. Il contient plusieurs phrases pour tester la précision de la détection de langue.",
        expected: "fr",
        description: "French text"
    },
    {
        text: "Dies ist ein Beispieltext auf Deutsch. Es enthält mehrere Sätze, um die Genauigkeit der Spracherkennung zu testen.",
        expected: "de",
        description: "German text"
    },
    {
        text: "Cómo dar los primeros pasos en Airbnb. Ayuda para anfitriones y huéspedes.",
        expected: "es",
        description: "Spanish Airbnb content"
    },
    {
        text: "AirCover para huéspedes. Protección y asistencia durante tu viaje.",
        expected: "es",
        description: "Spanish AirCover content"
    },
    {
        text: "Short text",
        expected: "en",
        description: "Very short text (should default to English)"
    }
];
async function testLanguageDetection() {
    console.log('🧪 Testing Language Detection\n');
    let correctDetections = 0;
    let totalTests = testSamples.length;
    for (const sample of testSamples) {
        const result = (0, languageDetection_1.detectLanguage)(sample.text);
        const isCorrect = result.language === sample.expected;
        if (isCorrect) {
            correctDetections++;
        }
        console.log(`📝 ${sample.description}:`);
        console.log(`   Text: "${sample.text.substring(0, 50)}..."`);
        console.log(`   Detected: ${result.language} (${(0, languageDetection_1.getLanguageName)(result.language)}) ${(0, languageDetection_1.getLanguageFlag)(result.language)}`);
        console.log(`   Expected: ${sample.expected} (${(0, languageDetection_1.getLanguageName)(sample.expected)}) ${(0, languageDetection_1.getLanguageFlag)(sample.expected)}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Reliable: ${result.isReliable ? '✅' : '❌'}`);
        console.log(`   Result: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
        console.log('');
    }
    const accuracy = (correctDetections / totalTests) * 100;
    console.log(`📊 Results Summary:`);
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Correct detections: ${correctDetections}`);
    console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
    if (accuracy >= 80) {
        console.log('✅ Language detection is working well!');
    }
    else if (accuracy >= 60) {
        console.log('⚠️  Language detection needs improvement');
    }
    else {
        console.log('❌ Language detection needs significant improvement');
    }
}
// Run the test
testLanguageDetection()
    .then(() => {
    console.log('\n✅ Language detection test completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Language detection test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-language-detection.js.map