import { getRecommendedPackaging } from '../src/utils/packagingRules';

const layers = ['Single', 'Double'];
const materials = ['Clear', 'Black', 'Silver'];
const sizes = ['100cm', '50cm', '33cm', '25cm', '20cm'];

console.log('--- PACKAGING LOGIC AUDIT ---');

const results: any[] = [];

layers.forEach(l => {
    materials.forEach(m => {
        sizes.forEach(s => {
            results.push({
                layer: l,
                material: m,
                size: s,
                color: getRecommendedPackaging(l as any, m as any, s as any)
            });
        });
    });
});

// Identify Gaps:
console.log('\n### 🚩 潜在的逻辑缺口 (Potential Gaps):');

// Gap 1: Silver 材质是否和 Clear 逻辑完全一样？
materials.filter(m => m !== 'Clear').forEach(m => {
    const isSameAsClear = sizes.every(s => {
        const clearColor = getRecommendedPackaging('Single', 'Clear', s as any);
        const matColor = getRecommendedPackaging('Single', m as any, s as any);
        return clearColor === matColor;
    });
    if (isSameAsClear) {
        console.log(`- [!] **\${m}** 材质目前完全套用了 Clear 的逻辑，没有独立规则。`);
    }
});

// Gap 2: 尺寸是否全部回退到绿色？
const genericGreen = results.filter(r => r.color === 'Green');
console.log(`- [i] 目前有 \${genericGreen.length} 个组合默认使用了 **Green (绿色)**，大多是小尺寸规格。`);

console.log('\n--- 详细映射表 ---');
console.table(results);
