import { getBubbleWrapSku } from '../src/utils/skuMapper';
import { getRecommendedPackaging } from '../src/utils/packagingRules';

function testYield(size: string, rolls: number) {
    const numericSize = parseInt(size.replace(/[^0-9]/g, '')) || 100;
    const machineBaseWidth = 100;
    const yieldCount = Math.floor((machineBaseWidth / numericSize) / rolls) || 1;
    return yieldCount;
}

const testCases = [
    { layer: 'Single', material: 'Clear', size: '100cm', rolls: 1, color: 'Pink' },
    { layer: 'Single', material: 'Clear', size: '50cm', rolls: 2, color: 'Orange' },
    { layer: 'Single', material: 'Clear', size: '50cm', rolls: 1, color: 'Orange' },
    { layer: 'Single', material: 'Clear', size: '33cm', rolls: 3, color: 'Green' },
    { layer: 'Single', material: 'Clear', size: '33cm', rolls: 1, color: 'Green' },
];

console.log('| Selection | Generated SKU | Calculated Yield |');
console.log('| :--- | :--- | :--- |');

testCases.forEach(c => {
    const recommendedColor = getRecommendedPackaging(c.layer as any, c.material as any, c.size as any, c.rolls);
    const sku = getBubbleWrapSku(c.layer as any, c.material as any, c.size as any, c.rolls, recommendedColor);
    const y = testYield(c.size, c.rolls);
    console.log(`| ${c.size} x${c.rolls} | SKU: \`${sku}\` | Yield: **${y}** |`);
});
