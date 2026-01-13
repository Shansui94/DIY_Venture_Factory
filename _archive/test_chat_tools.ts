
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAiOdSCfLfMtcCxctVB2wPZwfbUy6ByXfQ';
const genAI = new GoogleGenerativeAI(apiKey);

const maintenanceTool = {
    functionDeclarations: [
        {
            name: "log_maintenance_issue",
            description: "Log a maintenance issue or report a machine breakdown.",
            parameters: {
                type: "object",
                properties: {
                    machine_id: { type: "string", description: "The ID or name of the machine" },
                    issue_description: { type: "string", description: "Description of the problem" },
                    priority: { type: "string", enum: ["Normal", "High", "Critical"] }
                },
                required: ["machine_id", "issue_description"]
            }
        }
    ]
};

async function run() {
    console.log("----------------------------------------");
    console.log("Testing Chat Session + Tools: gemini-2.5-flash");
    console.log("----------------------------------------");

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            // @ts-ignore
            tools: [maintenanceTool]
        });

        console.log("⚠️ Starting Chat Session...");
        const chat = model.startChat();

        console.log("⚠️ Sending Text Message mimicking audio intent...");
        // trigger the tool
        const result = await chat.sendMessage("The machine Line 1 is broken, it's making a loud noise. Please log this.");
        const response = await result.response;
        const text = response.text();
        const calls = response.functionCalls();

        console.log("✅ Response Received!");
        console.log("Text:", text);

        if (calls && calls.length > 0) {
            console.log("✅ Function Calls Detected:", JSON.stringify(calls, null, 2));
        } else {
            console.log("⚠️ No function calls returned.");
        }

    } catch (error: any) {
        console.error("❌ FAILURE! Chat/Tool Error.");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.response) {
            console.error("API Error Details:", JSON.stringify(error.response, null, 2));
        }
    }
}

run();
