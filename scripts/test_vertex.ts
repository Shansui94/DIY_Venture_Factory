
import { VertexAI } from '@google-cloud/vertexai';

const project = 'diy-factory-app';
const location = 'us-central1';

console.log(`Connecting to Vertex AI... Project: ${project}, Location: ${location}`);

const vertexAI = new VertexAI({ project: project, location: location });

// Trying the stable model alias
const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function run() {
    try {
        console.log("Sending test prompt: 'Hello AI'...");
        const result = await model.generateContent("Hello AI");
        const response = await result.response;
        console.log("Response:", response.text());
        console.log("\n---------------------------------------------------");
        console.log("✅ SUCCESS! Your local computer/account CAN access Vertex AI.");
        console.log("This means the Google Cloud Project is fine.");
        console.log("The problem is definitely on the Cloud Run Server permissions.");
        console.log("---------------------------------------------------");
    } catch (err: any) {
        console.error("\n---------------------------------------------------");
        console.error("❌ FAILURE! Your local computer CANNOT access Vertex AI.");
        console.error("Error Message:", err.message);
        console.error("---------------------------------------------------");
        console.error("Possible Causes:");
        console.error("1. Billing is not enabled on Google Cloud (Most likely for 404/403).");
        console.error("2. 'Vertex AI User' API is disabled.");
        console.error("3. You are logged into the wrong Google account in gcloud.");
    }
}

run();
