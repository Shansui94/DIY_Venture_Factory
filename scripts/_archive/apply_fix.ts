import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Force reload .env.local by clearing cache if needed, though 'dotenv' config is usually enough.
// Note: dotenv won't overwrite existing process.env vars unless override: true is passed.
const envConfig = dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('Error: DATABASE_URL not found in .env.local');
    // Log all keys to debug
    console.log("Env keys:", Object.keys(process.env).filter(k => k.includes('DB') || k.includes('URL')));
    process.exit(1);
}

dbUrl = dbUrl.trim();

function getDbConfig(url: string) {
    try {
        const protocolSplit = url.split('://');
        const rest = protocolSplit[1];
        const lastAt = rest.lastIndexOf('@');

        const credentials = rest.substring(0, lastAt);
        const serverInfo = rest.substring(lastAt + 1);

        const firstColon = credentials.indexOf(':');
        const user = credentials.substring(0, firstColon);
        const password = credentials.substring(firstColon + 1);

        const [hostPort, dbName] = serverInfo.split('/');
        const [host, portStr] = hostPort.split(':');

        return {
            user,
            password,
            host,
            port: parseInt(portStr) || 5432,
            database: dbName || 'postgres',
            ssl: { rejectUnauthorized: false }
        };
    } catch (e) {
        return null;
    }
}

async function run() {
    console.log("--- Debugging Connection ---");
    const config = getDbConfig(dbUrl!);

    if (config) {
        console.log(`Host: '${config.host}'`);
        console.log(`Port: ${config.port}`);
        console.log(`User: '${config.user}'`);
        console.log(`Database: '${config.database}'`);
    } else {
        console.error("Config parse failed");
        return;
    }

    const client = new Client(config!);

    try {
        await client.connect();
        console.log("✅ Connected successfully!");

        const sqlFilePath = path.join(process.cwd(), 'scripts', 'logistics_v2_schema.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        console.log(`Executing SQL...`);

        await client.query(sqlContent);
        console.log("✅ SQL Policies Applied Successfully!");

    } catch (e: any) {
        console.error("❌ Database Error:", e.message);
    } finally {
        await client.end();
    }
}

run();
