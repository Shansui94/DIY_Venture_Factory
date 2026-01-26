
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim();

console.log(`Testing API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);

if (!apiKey) {
    console.error("No API Key found in .env");
    process.exit(1);
}

async function testKey() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    console.log("Sending test request to Google...");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello, are you working?" }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("\n❌ API Key Verification FAILED!");
            console.error(`Status: ${response.status} ${response.statusText}`);
            console.error("Error Details:", JSON.stringify(data, null, 2));
        } else {
            console.log("\n✅ API Key Verification SUCCESS!");
            console.log("Response:", data.candidates[0].content.parts[0].text);
        }

    } catch (e) {
        console.error("Network Error:", e);
    }
}

testKey();
