/* eslint-env node */
import express from 'express';
import type { Request, Response } from 'express';
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Google AI Setup (API Key) ---
const apiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)!.trim();
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

// --- Factory OS API ---
// --- Factory OS API ---

// 1. Set Active Product (Called by Operator App)
app.post('/api/set-product', async (req: Request, res: Response): Promise<any> => {
    try {
        const { machine_id, product_sku } = req.body;
        if (!machine_id || !product_sku) return res.status(400).json({ error: 'Missing params' });

        const { error } = await supabase.from('machine_active_products').upsert({
            machine_id,
            product_sku,
            updated_at: new Date()
        });

        if (error) throw error;
        res.json({ status: 'ok', active_sku: product_sku });

    } catch (e: any) {
        console.error("Set Product Error", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Get Active Products (Called by Dashboard)
app.get('/api/active-products', async (req: Request, res: Response): Promise<any> => {
    try {
        const { data, error } = await supabase.from('machine_active_products').select('*');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Alarm Trigger (Called by ESP32)
app.post('/api/alarm', async (req: Request, res: Response): Promise<any> => {
    try {
        const { machine_id, alarm_count } = req.body;

        if (!machine_id) {
            return res.status(400).json({ error: 'machine_id is required' });
        }

        console.log(`Received alarm from ${machine_id}, count: ${alarm_count || 1}`);

        // Resolve Active Product
        let productSku = 'UNKNOWN'; // Default
        const { data: activeProduct } = await supabase
            .from('machine_active_products')
            .select('product_sku')
            .eq('machine_id', machine_id)
            .single();

        if (activeProduct) {
            productSku = activeProduct.product_sku;
        }

        console.log(`[ALARM] Machine: ${machine_id}, ActiveSKU: ${productSku}, Count: ${alarm_count}`);

        // Always use the count sent by the hardware (Dual Lane = 2)
        const { error } = await supabase.from('production_logs').insert({
            machine_id,
            alarm_count: alarm_count || 1,
            product_sku: productSku
        });

        if (error) throw error;

        res.json({ status: 'ok', message: 'Logged successfully', product: productSku });

    } catch (e: any) {
        console.error("Alarm Log Error:", e);
        res.status(500).json({ error: e.message || "Failed to log alarm" });
    }
});

// --- AI Supervisor API ---
import { aiService } from './src/services/ai_service.ts';

app.post('/api/agent/chat', async (req: Request, res: Response): Promise<any> => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });

        console.log(`[AI Agent] Received query: "${query}"`);

        // 1. Gather Context (Production logs from last 24 hours + Active Status)
        const { data: activeMachines } = await supabase.from('machine_active_products').select('*');

        // Get logs from today (Adjusted for timezone UTC+8 - Malaysia/China Standard Time)
        // This ensures AI sees the same "Start of Day" as the Dashboard/User
        const sgTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" });
        const sgDate = new Date(sgTime);
        sgDate.setHours(0, 0, 0, 0);
        const queryDate = sgDate.toISOString(); // This will be local midnight converted to UTC

        const { data: rawLogs } = await supabase
            .from('production_logs')
            .select('*')
            .gte('created_at', queryDate)
            .order('created_at', { ascending: false })
            .limit(50);

        // Sanitize Data for AI (Rename 'alarm_count' to 'Produced_Units')
        const cleanLogs = rawLogs?.map(log => ({
            Timestamp: log.created_at,
            Machine: log.machine_id,
            Product: log.product_sku,
            Lane: log.lane_id,
            Produced_Units: log.alarm_count // Rename key
        })) || [];


        // 3a. Get Daily Statistics (Today)
        const { count: totalTodayCount } = await supabase
            .from('production_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', queryDate);

        // 3b. Get Yesterday's Statistics (For context near midnight)
        const yesterday = new Date(sgDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayQueryString = yesterday.toISOString();
        // Range: Yesterday Midnight to Today Midnight
        const { count: totalYesterdayCount } = await supabase
            .from('production_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', yesterdayQueryString)
            .lt('created_at', queryDate);

        // Fetch ALL logs for today (queryDate) to calculating Gaps and Efficiency
        const { data: allDailyLogs } = await supabase
            .from('production_logs')
            .select('created_at, alarm_count')
            .gte('created_at', queryDate)
            .order('created_at', { ascending: true }); // Ascending for time calculation

        // Calculate Gaps & Runtime
        let gaps: string[] = [];
        let actualRuntimeMinutes = 0;

        if (allDailyLogs && allDailyLogs.length > 1) {
            const firstLog = new Date(allDailyLogs[0].created_at);
            const lastLog = new Date(allDailyLogs[allDailyLogs.length - 1].created_at);

            // Total span in minutes
            actualRuntimeMinutes = (lastLog.getTime() - firstLog.getTime()) / (1000 * 60);

            // Find Gaps > 15 mins
            for (let i = 1; i < allDailyLogs.length; i++) {
                const prev = new Date(allDailyLogs[i - 1].created_at);
                const curr = new Date(allDailyLogs[i].created_at);
                const diffMins = (curr.getTime() - prev.getTime()) / (1000 * 60);

                if (diffMins > 15) {
                    gaps.push(`${prev.toLocaleTimeString()} to ${curr.toLocaleTimeString()} (${Math.round(diffMins)}m)`);
                }
            }
        }

        // 4. Machine Standards Dictionary (Knowledge Base)
        const standards = {
            "T1.2-M01": {
                description: "Dual Lane Packaging Machine",
                standard_cycle_time_seconds: 299, // for 2 units
                units_per_cycle: 2,
                expected_daily_output_24h: 578,
                expected_shift_output_12h: 289
            }
        };

        const context = {
            activeMachines: activeMachines || [],
            recentLogs: cleanLogs, // Still sending specific recent logs for immediate context
            dailyStats: {
                totalProductionCount: totalTodayCount || 0,
                date: sgDate.toLocaleDateString(),
                gapsFound: gaps,
                firstLogTime: allDailyLogs?.[0]?.created_at,
                lastLogTime: allDailyLogs?.[allDailyLogs.length - 1]?.created_at
            },
            yesterdayStats: {
                totalProductionCount: totalYesterdayCount || 0,
                date: yesterday.toLocaleDateString()
            },
            machineStandards: standards, // Pass standards to AI
            timestamp: new Date().toISOString()
        };

        // 2. Ask AI
        const answer = await aiService.askSupervisor(query, context);

        res.json({ response: answer });

    } catch (e: any) {
        console.error("AI Agent Error:", e);
        res.status(500).json({ error: e.message || "Internal AI Error" });
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

// --- AI Vision API (Smart Import) ---
app.post('/api/agent/vision', async (req: Request, res: Response): Promise<any> => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'Image data required' });

        if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
            return res.status(500).json({ error: 'Server AI Key not configured' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Extract customer data from this image (e.g. invoice, delivery order, contact card).
        Return a STRICT JSON ARRAY of objects. 
        Each object must have these keys if found: "name", "phone", "address".
        If there are multiple people/companies, return multiple objects.
        Infer the Zone (North/South/Central/East Malaysia) based on address if possible, key "zone".
        Do not include markdown formatting (like \`\`\`json). Return raw JSON only.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
        ]);

        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("No data returned from AI");

        // Cleanup Text
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);

        res.json(parsedData);

    } catch (e: any) {
        console.error("Vision API Error:", e);
        res.status(500).json({ error: e.message || "Vision analysis failed" });
    }
});

// Catch-all for API 404 to avoid HTML response
// Catch-all for any unhandled routes
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

server.listen(port, () => {
    console.log(`Server (HTTP+WS) running at http://localhost:${port}`);
});
