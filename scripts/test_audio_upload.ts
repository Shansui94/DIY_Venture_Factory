
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAiOdSCfLfMtcCxctVB2wPZwfbUy6ByXfQ';
const genAI = new GoogleGenerativeAI(apiKey);

// Copied from server.ts
interface WavHeaderOptions {
    sampleRate: number;
    numChannels: number;
    bitDepth: number;
    dataLength: number;
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

async function run() {
    console.log("----------------------------------------");
    console.log("Testing Audio Input: gemini-2.5-flash");
    console.log("----------------------------------------");

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log("⚠️ Generating dummy audio (valid WAV structure, silence)...");
        // Generate 1 second of silence at 16kHz
        const sampleRate = 16000;
        const numChannels = 1;
        const bitDepth = 16;
        const dataLength = 0; // Empty audio
        const silenceData = Buffer.alloc(0);

        const wavHeader = writeWavHeader({ sampleRate, numChannels, bitDepth, dataLength });
        const finalWavBuffer = Buffer.concat([wavHeader, silenceData]);
        const audioBase64 = finalWavBuffer.toString('base64');

        console.log(`⚠️ Audio size: ${finalWavBuffer.length} bytes. Sending to model...`);

        const result = await model.generateContent([
            { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
            { text: "What do you hear in this audio? Answer 'Silence' if it is quiet." }
        ]);

        const response = await result.response;
        console.log("✅ SUCCESS! Audio processed.");
        console.log("Response:", response.text());

    } catch (error: any) {
        console.error("❌ FAILURE! Audio Error.");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.response) {
            console.error("API Error Details:", JSON.stringify(error.response, null, 2));
        }
    }
}

run();
