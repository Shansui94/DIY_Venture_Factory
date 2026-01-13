
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

    // There isn't a direct listModels method on the confusing SDK surface for some versions
    // but typically it's under model management if available.
    // However, let's try to infer if we can get it via the simpler `getGenerativeModel`.

    console.log("SDK Version Check: Attempting to use a standard model...");

    // According to recent docs, the model string is just "gemini-1.5-flash"
    // If it fails, maybe I need to check if the library is outdated?

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    try {
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash");
    } catch (e: any) {
        console.log("Failed gemini-1.5-flash:", e.message.split('\n')[0]);
    }

    // Try without version
    const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
    try {
        const result = await model2.generateContent("Hello");
        console.log("Success with gemini-pro");
    } catch (e: any) {
        console.log("Failed gemini-pro:", e.message.split('\n')[0]);
    }
}

main();
