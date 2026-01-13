
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyAiOdSCfLfMtcCxctVB2wPZwfbUy6ByXfQ'; // User provided key

async function run() {
    console.log("Testing API Key - Listing Models...");
    try {
        // Fetch list of models from Google API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data: any = await response.json();

        if (data.models) {
            console.log("\n✅ Available Models for this Key:");
            console.log("---------------------------------");
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    // Extract just the name part after "models/"
                    const shortName = m.name.replace('models/', '');
                    console.log(`Name: ${shortName}`);
                    console.log(`Full: ${m.name}`);
                    console.log(`Desc: ${m.displayName}`);
                    console.log("---");
                }
            });
            console.log("---------------------------------");
        } else {
            console.error("❌ No models found. API Response:", JSON.stringify(data, null, 2));
        }

    } catch (error: any) {
        console.error("❌ List Models Failed:", error.message);
    }
}

run();
