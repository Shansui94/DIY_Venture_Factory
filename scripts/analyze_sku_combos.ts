import { getBubbleWrapSku } from '../src/utils/skuMapper';
import { getRecommendedPackaging } from '../src/utils/packagingRules';

const layers = ['Single', 'Double'];
const materials = ['Clear', 'Black', 'Silver'];
const sizes = ['100cm', '50cm', '33cm', '25cm', '20cm'];
const rollsOptions = [1, 2, 3, 4, 5];

interface SkuInfo {
    layer: string;
    material: string;
    size: string;
    rolls: number;
    recommendedColor: string;
    sku: string;
}

const allSkus: SkuInfo[] = [];

for (const l of layers) {
    for (const m of materials) {
        for (const s of sizes) {
            // Standard Case: Default rolls for that size
            const defaultRolls = s === '100cm' ? 1 :
                s === '50cm' ? 2 :
                    s === '33cm' ? 3 :
                        s === '25cm' ? 4 : 5;

            const color = getRecommendedPackaging(l as any, m as any, s as any);
            const sku = getBubbleWrapSku(l as any, m as any, s as any, defaultRolls, color);

            allSkus.push({ layer: l, material: m, size: s, rolls: defaultRolls, recommendedColor: color, sku });

            // Edge Case: 1 Roll per Pack (as requested by user for 33cm x1 etc)
            if (defaultRolls > 1) {
                const skuX1 = getBubbleWrapSku(l as any, m as any, s as any, 1, color);
                allSkus.push({ layer: l, material: m, size: s, rolls: 1, recommendedColor: color, sku: skuX1 });
            }
        }
    }
}

console.log('TOTAL_POSSIBLE_SKUS:', allSkus.length);
console.log('--- SAMPLE BREAKDOWN ---');
allSkus.slice(0, 10).forEach(item => {
    console.log(`[${item.layer} ${item.material} ${item.size} x${item.rolls}] Color: ${item.recommendedColor} -> SKU: ${item.sku}`);
});

// Summary table data for the user
const summary: Record<string, number> = {};
allSkus.forEach(item => {
    const key = `${item.layer} ${item.material}`;
    summary[key] = (summary[key] || 0) + 1;
});
console.log('SUMMARY_BY_TYPE:', JSON.stringify(summary, null, 2));
