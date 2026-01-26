
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error("❌ NO API KEY FOUND IN .env");
    process.exit(1);
}

console.log(`Using Key: ${apiKey.substring(0, 10)}...`);

async function listModels() {
    console.log(`\nListing Available Models...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error Listing Models: ${response.status} ${await response.text()}`);
            return;
        }
        const data = await response.json();
        if (data.models) {
            console.log("--- Available Models ---");
            data.models.forEach((m: any) => console.log(` - ${m.name}`));
        } else {
            console.log("No models found or error:", data);
        }
    } catch (e: any) {
        console.error("List Error:", e.message);
    }
}

listModels();
