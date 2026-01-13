import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function toCSV(data: any[]) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => headers.map(fieldName => {
            const val = row[fieldName];
            // Escape quotes and wrap in quotes if string contains comma or quote
            const strVal = val === null || val === undefined ? '' : String(val);
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                return `"${strVal.replace(/"/g, '""')}"`;
            }
            return strVal;
        }).join(','))
    ];
    return csvRows.join('\n');
}

async function exportData() {
    console.log("Fetching Legacy Items...");
    const { data: legacyItems, error: legError } = await supabase
        .from('items')
        .select('*');

    if (legError) {
        console.error("Error fetching legacy items:", legError.message);
    } else {
        const csv = toCSV(legacyItems);
        fs.writeFileSync('legacy_items_export.csv', csv);
        console.log("✅ Saved legacy_items_export.csv");
    }

    console.log("Fetching V2 Master Items...");
    const { data: v2Items, error: v2Error } = await supabase
        .from('master_items_v2')
        .select('*');

    if (v2Error) {
        console.error("Error fetching V2 items:", v2Error.message);
    } else {
        const csv = toCSV(v2Items);
        fs.writeFileSync('v2_items_export.csv', csv);
        console.log("✅ Saved v2_items_export.csv");
    }
}

exportData();
