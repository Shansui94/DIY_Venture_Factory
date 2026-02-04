import { getRecommendedPackaging } from '../src/utils/packagingRules';
import { getBubbleWrapSku } from '../src/utils/skuMapper';

const layers = ['Single', 'Double'];
const materials = ['Clear', 'Black', 'Silver'];
const sizes = ['100cm', '50cm', '33cm', '25cm', '20cm'];

console.log('| Product Type | Size | Rolls | Packaging Color | Final SKU |');
console.log('| :--- | :--- | :--- | :--- | :--- |');

for (const l of layers) {
    for (const m of materials) {
        for (const s of sizes) {
            // Test 1: Standard Rolls (x2, x3, etc.)
            const stdRolls = s === '100cm' ? 1 :
                s === '50cm' ? 2 :
                    s === '33cm' ? 3 :
                        s === '25cm' ? 4 : 5;

            const colorStd = getRecommendedPackaging(l as any, m as any, s as any, stdRolls);
            const skuStd = getBubbleWrapSku(l as any, m as any, s as any, stdRolls, colorStd);
            console.log(`| ${l} ${m} | ${s} | x${stdRolls} | **${colorStd === 'Pink' ? 'RED' : colorStd}** | \`${skuStd}\` |`);

            // Test 2: Scattered Rolls (x1) - if applicable
            if (stdRolls > 1) {
                const colorX1 = getRecommendedPackaging(l as any, m as any, s as any, 1);
                const skuX1 = getBubbleWrapSku(l as any, m as any, s as any, 1, colorX1);
                console.log(`| ${l} ${m} | ${s} | x1 | **${colorX1 === 'Pink' ? 'RED' : colorX1}** | \`${skuX1}\` |`);
            }
        }
    }
}
