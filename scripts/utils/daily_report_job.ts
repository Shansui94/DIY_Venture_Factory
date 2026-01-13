
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load Environment Variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Use Service Role Key for Backend Access
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SPREADSHEET_ID = '1mUBb5RYFq-G2a8bYKnYTop1A-4KSIoawSXH6J3TBITQ';
const SHEET_NAME = 'MAX TAN';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Path to Service Account JSON (Assuming it's in the project root or passed as ARG)
// Changing logic to look for it in the Desktop/Packsecure OS folder similar to user instruction
const KEY_FILE_PATH = path.resolve('../google-service-account.json');

async function main() {
    console.log('--- Starting Daily Production Report Job ---');
    console.log(`Time: ${new Date().toLocaleString()}`);

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('ERROR: Missing Supabase URL or Service Role Key in .env');
        process.exit(1);
    }

    if (!fs.existsSync(KEY_FILE_PATH)) {
        console.error(`ERROR: Google Service Account Key not found at: ${KEY_FILE_PATH}`);
        process.exit(1);
    }

    // 1. Connect to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 2. Auth Google Sheets
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: SCOPES,
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 3. Get Data for TODAY
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Fetching logs for: ${startOfDay.toLocaleDateString()}`);

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Supabase Data Fetch Error:', error);
        process.exit(1);
    }

    // 4. Transform Data
    const rowData = calculateDailyStats(logs || [], now);
    console.log('Stats Calculated:', rowData);

    // 5. Update Google Sheet
    await syncToSheet(sheets, rowData);

    console.log('--- Job Completed Successfully ---');
}

function calculateDailyStats(logs: any[], date: Date) {
    if (!logs || logs.length === 0) {
        return [
            date.toLocaleDateString(),
            '-',
            '-',
            '0h 0m',
            0,
            'No Production'
        ];
    }

    const startTime = new Date(logs[0].created_at);
    const endTime = new Date(logs[logs.length - 1].created_at);

    // Duration
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const duration = `${hours}h ${mins}m`;

    // Quantity
    let totalQuantity = 0;
    const breakdown: Record<string, number> = {};

    logs.forEach(log => {
        const qty = Number(log.quantity_produced) || 0;
        totalQuantity += qty;
        const key = log.product_name || log.sku || 'Unknown';
        breakdown[key] = (breakdown[key] || 0) + qty;
    });

    const breakdownStr = Object.entries(breakdown)
        .map(([name, qty]) => `${name}: ${qty}`)
        .join(', ');

    return [
        date.toLocaleDateString(),
        startTime.toLocaleTimeString(),
        endTime.toLocaleTimeString(),
        duration,
        totalQuantity,
        breakdownStr
    ];
}

async function syncToSheet(sheets: any, rowData: any[]) {
    // Check if date exists
    const dateStr = rowData[0];

    // Read Column A to find date
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:A`,
    });

    const rows = res.data.values || [];
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === dateStr) {
            rowIndex = i;
            break;
        }
    }

    if (rowIndex >= 0) {
        // Update
        const range = `'${SHEET_NAME}'!A${rowIndex + 1}:F${rowIndex + 1}`;
        console.log(`Updating existing row ${rowIndex + 1}...`);
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowData] },
        });
    } else {
        // Append
        console.log('Appending new row...');
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${SHEET_NAME}'!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowData] },
        });
    }
}

main().catch(console.error);
