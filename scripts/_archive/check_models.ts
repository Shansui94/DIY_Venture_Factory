
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

async function main() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("Fetching available models...");

    try {
        // Unfortunately the Node SDK doesn't expose listModels directly easily in all versions,
        // but let's try a direct fetch if the SDK method isn't obvious, 
        // or just try a standard 'gemini-1.0-pro' which is often the fallback.

        // Actually, let's just stick to the SDK's getGenerativeModel and assume the key is the main issue.
        // But since we got 404, the key works but model is wrong.

        // We will try a few standard ones in loop
        const candidates = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

        for (const mName of candidates) {
            console.log(`Trying model: ${mName}...`);
            const model = genAI.getGenerativeModel({ model: mName });
            try {
                const result = await model.generateContent("Test");
                console.log(`✅ SUCCESS with ${mName}`);
                console.log(result.response.text());
                return;
            } catch (e: any) {
                console.log(`❌ Failed ${mName}`);
                console.log("Error Details:", e);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

main();
