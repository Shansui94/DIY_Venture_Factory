
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, anonKey);

// --- REPLICATED LOGIC FROM ProductionControl.tsx ---
type ProductLayer = 'Single' | 'Double';
type ProductMaterial = 'Clear' | 'Black' | 'Silver';
type ProductSize = '100cm' | '50cm' | '20cm' | '25cm' | '33cm'; // Added all sizes

const getBubbleWrapSku = (l: ProductLayer, m: ProductMaterial, s: ProductSize): string => {
    // Normalize
    const sz = s.toLowerCase().replace('cm', ''); // 100, 50, 33, 25, 20
    const isDouble = l === 'Double';
    const isBlack = m === 'Black';
    const isSilver = m === 'Silver';
    const isClear = m === 'Clear';

    // 100CM
    if (sz === '100') {
        if (isDouble && isBlack) return 'BW-DOUBLELAYER-BLACK';
        if (isDouble && isClear) return 'BW-DOUBLELAYER-CLEAR';
        if (isBlack) return 'BW-BLACK';
        if (isSilver) return 'BW-SV/GY';
        return 'BW-CLEAR';
    }

    // 50CM
    if (sz === '50') {
        if (isDouble && isBlack) return 'BW-DOUBLELAYERBLACK-50CM-2';
        if (isDouble && isClear) return 'BW-DOUBLELAYER-50CM-2';
        if (isBlack) return 'BW-BLACK-50CM-2';
        return 'BW-CLEAR-50CM-2';
    }

    // Small Sizes - Suffix Selection
    let suffix = '-1';
    if (sz === '33') suffix = '-3';
    if (sz === '25') suffix = '-4'; // Updated Logic
    if (sz === '20') suffix = '-5'; // Updated Logic

    // 33CM
    if (sz === '33') {
        if (isDouble && isBlack) return `BW33CM-DOUBLELAYER-BLACK${suffix}`;
        if (isDouble && isClear) return `BW33CM-DOUBLELAYER${suffix}`;
        if (isBlack) return `BW33CM-BLACK${suffix}`;
        return `BW33CM${suffix}`;
    }

    // 25CM
    if (sz === '25') {
        if (isDouble && isBlack) return `BW25CM-BLACK-DOUBLELAYER${suffix}`;
        if (isDouble && isClear) return `BW25CM-DOUBLELAYER${suffix}`;
        if (isBlack) return `BW25CM-BLACK${suffix}`;
        return `BW25CM${suffix}`;
    }

    // 20CM
    if (sz === '20') {
        if (isDouble && isBlack) return `BW20CM-DOUBLELAYER-BLACK${suffix}`;
        if (isDouble && isClear) return `BW20CM-DOUBLELAYER${suffix}`;
        if (isBlack) return `BW20CM-BLACK${suffix}`;
        return `BW20CM${suffix}`;
    }

    return `BW${sz}CM-1`;
};

// --- RUN CHECK ---
async function diagnose() {
    const layers: ProductLayer[] = ['Single', 'Double'];
    const materials: ProductMaterial[] = ['Clear', 'Black', 'Silver'];
    const sizes: ProductSize[] = ['100cm', '50cm', '33cm', '25cm', '20cm'];

    let failures = 0;

    for (const s of sizes) {
        for (const l of layers) {
            for (const m of materials) {
                // Skip invalid logic (e.g. Silver Double if not needed, but checking anyway)
                const sku = getBubbleWrapSku(l, m, s);

                // Query DB
                const { data, error } = await supabase
                    .from('master_items_v2')
                    .select('sku, net_weight_kg')
                    .eq('sku', sku)
                    .maybeSingle();

                if (!data) {
                    console.error(`❌ MISSING IN DB: ${sku} (Input: ${s} ${l} ${m})`);
                    failures++;
                } else if (data.net_weight_kg === null) {
                    console.error(`⚠️ NULL WEIGHT: ${sku} (Input: ${s} ${l} ${m})`);
                    failures++;
                } else {
                    console.log(`✅ OK: ${sku}`);
                }
            }
        }
    }

    console.log(`\nDiagnosis Complete. ${failures} Issues Found.`);
}

diagnose();
