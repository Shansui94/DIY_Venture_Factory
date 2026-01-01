/* eslint-env node */
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

dotenv.config();

// Interfaces
interface WavHeaderOptions {
    sampleRate: number;
    numChannels: number;
    bitDepth: number;
    dataLength: number;
}

interface MaintenanceToolParams {
    machine_id: string;
    issue_description: string;
    priority?: "Normal" | "High" | "Critical";
}

interface WebSocketMessage {
    type: string;
    sampleRate?: number;
    text?: string;
}

function writeWavHeader({ sampleRate, numChannels, bitDepth, dataLength }: WavHeaderOptions): Buffer {
    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28);
    buffer.writeUInt16LE(numChannels * (bitDepth / 8), 32);
    buffer.writeUInt16LE(bitDepth, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    return buffer;
}

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Google AI Setup (API Key) ---
const apiKey = process.env.GEMINI_API_KEY!.trim();
const genAI = new GoogleGenerativeAI(apiKey);

// Tool Definitions
const maintenanceTool = {
    functionDeclarations: [
        {
            name: "log_maintenance_issue",
            description: "Log a maintenance issue or report a machine breakdown.",
            parameters: {
                type: "object",
                properties: {
                    machine_id: { type: "string", description: "The ID or name of the machine (e.g., 'Line 1', 'Machine 3')" },
                    issue_description: { type: "string", description: "Description of the problem" },
                    priority: { type: "string", enum: ["Normal", "High", "Critical"] }
                },
                required: ["machine_id", "issue_description"]
            }
        }
    ]
};

// --- REST API (Vision) ---
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/analyze-image', upload.single('image'), async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image' });

        const type = req.body.type || 'receipt'; // 'receipt' | 'odometer'
        console.log(`Analyzing image type: ${type}`);

        // Convert buffer to base64
        const mimeType = req.file.mimetype;
        const imageBase64 = req.file.buffer.toString('base64');

        // Dynamic Prompt based on type
        let promptText = "";
        let responseSchema = "";

        if (type === 'odometer') {
            promptText = "Analyze this image of a vehicle odometer. Extract the numeric mileage reading. Return a JSON object with the key 'mileage' (number). If unclear, return null.";
            responseSchema = "JSON { mileage: number }";
        } else {
            promptText = "Analyze this receipt image. Extract the Merchant Name, Total Amount (numeric), Date (YYYY-MM-DD), and Category (Fuel, Meal, Transport, Material). Return JSON.";
            responseSchema = "JSON { merchant: string, amount: number, date: string, category: string }";
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            { inlineData: { data: imageBase64, mimeType } },
            promptText + " Output strictly valid " + responseSchema
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        console.log("AI Analysis Result:", data);
        res.json(data);

    } catch (e: any) {
        console.error("Analysis Error:", e);
        res.status(500).json({ error: e.message || "Failed to analyze image" });
    }
});

// --- HTTP Server setup for WebSocket ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to Voice Socket');

    // Initialize Model
    console.log("Initializing Gemini (API Key Mode): gemini-2.5-flash");
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        // @ts-ignore - Tool type inference might be tricky with raw objects, ignoring for now or define stricter type if needed
        tools: [maintenanceTool]
    });

    let chatSession: any = null;

    try {
        chatSession = model.startChat();
    } catch (e) {
        console.error("Failed to start Gemini session:", e);
        ws.send(JSON.stringify({ type: 'status', text: 'AI Error' }));
    }

    let audioBuffer: Buffer[] = [];

    ws.on('message', async (message: Buffer | string, isBinary: boolean) => {
        if (isBinary) {
            audioBuffer.push(message as Buffer);
        } else {
            const data: WebSocketMessage = JSON.parse(message.toString());
            if (data.type === 'commit') {
                const requestSampleRate = data.sampleRate || 16000;
                console.log(`Processing audio command... (Rate: ${requestSampleRate}Hz)`);
                ws.send(JSON.stringify({ type: 'status', text: 'Thinking...' }));

                const combinedBuffer = Buffer.concat(audioBuffer);
                audioBuffer = [];

                const wavHeader = writeWavHeader({
                    sampleRate: requestSampleRate,
                    numChannels: 1,
                    bitDepth: 16,
                    dataLength: combinedBuffer.length
                });

                const finalWavBuffer = Buffer.concat([wavHeader, combinedBuffer]);
                const audioBase64 = finalWavBuffer.toString('base64');

                try {
                    const result = await chatSession.sendMessage([
                        { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
                        { text: "Listen to this command and execute if needed." }
                    ]);

                    const response = await result.response;
                    const text = response.text();
                    console.log("Gemini Response:", text);

                    // Handle Function Calls
                    const calls = response.functionCalls();
                    if (calls && calls.length > 0) {
                        for (const call of calls) {
                            if (call.name === 'log_maintenance_issue') {
                                // @ts-ignore - args inference
                                const { machine_id, issue_description, priority } = call.args as MaintenanceToolParams;
                                console.log(`Executing Tool: Log ${issue_description} for ${machine_id}`);

                                const { error } = await supabase.from('maintenance_logs').insert({
                                    machine_id,
                                    issue_description,
                                    priority: priority || 'Normal'
                                });

                                if (error) throw error;

                                // Send Function Response
                                const fnResult = {
                                    functionResponse: {
                                        name: 'log_maintenance_issue',
                                        response: { name: 'maintenance_logs', content: { status: 'Logged', id: '123' } }
                                    }
                                };
                                // In valid implementation we should send this back
                                await chatSession.sendMessage([fnResult]);

                                ws.send(JSON.stringify({ type: 'status', text: 'Logged!' }));
                            }
                        }
                    } else {
                        // No function call, just send the text response so UI doesn't hang
                        const shortText = text.length > 20 ? text.substring(0, 20) + "..." : text;
                        ws.send(JSON.stringify({ type: 'status', text: shortText }));
                    }

                } catch (err: any) {
                    console.error("Gemini Error:", err);
                    ws.send(JSON.stringify({
                        type: 'status',
                        text: `Error: ${err.message || 'Unknown'}`
                    }));
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server (HTTP+WS) running at http://localhost:${port}`);
});
