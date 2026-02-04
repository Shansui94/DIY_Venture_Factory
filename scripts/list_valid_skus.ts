import { getBubbleWrapSku } from '../src/utils/skuMapper';

const layers = ['Single', 'Double'];
const materials = ['Clear', 'Black', 'Silver'];
const sizes = ['100cm', '50cm', '33cm', '25cm', '20cm'];

console.log('--- VALID SKU LIST ---');
console.log('| Layer | Material | Size | Valid SKU |');
console.log('| :--- | :--- | :--- | :--- |');

for (const l of layers) {
    for (const m of materials) {
        for (const s of sizes) {
            const sku = getBubbleWrapSku(l as any, m as any, s as any);
            console.log(`| ${l} | ${m} | ${s} | \`${sku}\` |`);
        }
    }
}
