
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAiOdSCfLfMtcCxctVB2wPZwfbUy6ByXfQ';
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    console.log("----------------------------------------");
    console.log("Testing specific model: gemini-2.5-flash");
    console.log("----------------------------------------");

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        console.log("⚠️ Attempting to generate content...");

        const result = await model.generateContent("Hello, are you there?");
        const response = await result.response;
        console.log("✅ SUCCESS! Model verification passed.");
        console.log("Response:", response.text());
    } catch (error: any) {
        console.error("❌ FAILURE! Could not access model.");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.response) {
            console.error("API Error Details:", JSON.stringify(error.response, null, 2));
        }
    }
}

run();
