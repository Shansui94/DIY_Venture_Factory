
import dotenv from 'dotenv';
import fs from 'fs';

// 1. Manually read file to see what's physically there
const envContent = fs.readFileSync('.env', 'utf8');
console.log("--- Raw .env Content (Keys Only) ---");
envContent.split('\n').forEach(line => {
    const key = line.split('=')[0];
    if (key && key.trim()) {
        console.log(`Found Key: [${key.trim()}]`);
    }
});

// 2. Load with dotenv
const result = dotenv.config();
if (result.error) {
    console.error("Dotenv Error:", result.error);
}

const gKey = process.env.GOOGLE_API_KEY || '';
const gemKey = process.env.GEMINI_API_KEY || '';

function analyzeKey(name: string, key: string) {
    if (!key) {
        console.log(`${name}: MISSING`);
        return;
    }
    console.log(`${name} Length: ${key.length}`);
    console.log(`${name} First Char: [${key[0]}] (Code: ${key.charCodeAt(0)})`);
    console.log(`${name} Last Char:  [${key[key.length - 1]}] (Code: ${key.charCodeAt(key.length - 1)})`);

    if (key.includes('"') || key.includes("'")) {
        console.log(`⚠️ WARNING: ${name} contains quotes! This will break the key.`);
    }
    if (key.includes(" ")) {
        console.log(`⚠️ WARNING: ${name} contains spaces!`);
    }
}

analyzeKey("GOOGLE_API_KEY", gKey);
analyzeKey("GEMINI_API_KEY", gemKey);
