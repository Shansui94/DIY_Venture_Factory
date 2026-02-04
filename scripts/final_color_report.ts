import { getRecommendedPackaging } from '../src/utils/packagingRules';

const tests = [
    { l: 'Single', m: 'Clear', s: '100cm', r: 1, desc: 'Single Clear 100cm' },
    { l: 'Single', m: 'Black', s: '100cm', r: 1, desc: 'Single Black 100cm' },
    { l: 'Double', m: 'Clear', s: '100cm', r: 1, desc: 'Double Clear 100cm' },
    { l: 'Double', m: 'Black', s: '100cm', r: 1, desc: 'Double Black 100cm' },
    { l: 'Single', m: 'Clear', s: '33cm', r: 3, desc: 'Single Clear 33cm (Standard)' },
    { l: 'Single', m: 'Clear', s: '33cm', r: 1, desc: 'Single Clear 33cm (Scattered)' },
];

console.log('| Product Case | Final Packaging Color | Notes |');
console.log('| :--- | :--- | :--- |');

tests.forEach(t => {
    const color = getRecommendedPackaging(t.l as any, t.m as any, t.s as any, t.r);
    let note = 'Original Logic';
    if (t.s !== '100cm' && t.r === 1) note = 'Scattered Override (Transparent)';
    console.log(`| ${t.desc} | **${color === 'Pink' ? 'RED' : color}** | ${note} |`);
});
