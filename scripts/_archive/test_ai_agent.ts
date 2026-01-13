
import dotenv from 'dotenv';
import { aiService } from '../src/services/ai_service';

// Load Environment Variables (API Key)
dotenv.config();

async function main() {
    console.log("Testing AI Supervisor Agent...");

    // 1. Mock Context Data
    const mockContext = {
        machine_status: {
            "T1.2-M01": "Active",
            "T1.2-M02": "Idle"
        },
        recent_logs: [
            { time: "10:00", machine: "T1.2-M01", sku: "BW-CLEAR", qty: 2 },
            { time: "10:05", machine: "T1.2-M01", sku: "BW-CLEAR", qty: 2 },
            // Gap here > 10 mins
            { time: "10:25", machine: "T1.2-M01", sku: "BW-CLEAR", qty: 2 }
        ]
    };

    const query = "Analyze the production logs. Are there any issues?";

    console.log(`Query: "${query}"`);
    console.log("Waiting for Gemini Response...");

    try {
        const response = await aiService.askSupervisor(query, mockContext);
        console.log("\n--- AI Response ---\n");
        console.log(response);
        console.log("\n-------------------\n");
    } catch (err) {
        console.error("Test Failed:", err);
    }
}

main();
