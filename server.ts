import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import chatHandler from './api/agent/chat';

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mimic Vercel Request/Response for the handler
app.post('/api/agent/chat', async (req, res) => {
    try {
        // Log for debugging
        console.log(`[API] POST /api/agent/chat - Query: ${req.body.query?.substring(0, 50)}...`);

        // Call the Vercel-style handler
        await chatHandler(req as any, res as any);
    } catch (err) {
        console.error("Handler Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`\n✅ Local API Server running at http://localhost:${PORT}`);
    console.log(`   - Chat Endpoint: http://localhost:${PORT}/api/agent/chat`);
    console.log(`   - AI Model: Gemini 2.0 Flash (Validated)\n`);
});
