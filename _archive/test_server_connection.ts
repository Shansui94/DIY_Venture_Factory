
import WebSocket from 'ws';
import fs from 'fs';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    console.log('✅ Connected to Server WebSocket');

    // Simulate sending audio chunks (silence for simplicity)
    const silence = Buffer.alloc(16000 * 2); // 1 sec of audio
    ws.send(silence);
    console.log('➡️ Sent audio chunk (32KB)');

    // Commit
    setTimeout(() => {
        console.log('➡️ Sending COMMIT...');
        ws.send(JSON.stringify({ type: 'commit', sampleRate: 16000 }));
    }, 1000);
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('📩 Received from Server:', msg);
});

ws.on('error', (err) => {
    console.error('❌ WebSocket Error:', err);
});

ws.on('close', () => {
    console.log('🔌 Disconnected');
});
