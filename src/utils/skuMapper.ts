
// Utility to map User Selection to V3/V2 Database SKU
// Handles inconsistent historical naming conventions
import { ProductLayer, ProductMaterial, ProductSize } from '../types';

export const getBubbleWrapSku = (l: ProductLayer, m: ProductMaterial, s: ProductSize | null): string => {
    if (!s) return 'BW-UNKNOWN';

    // Normalize
    const sz = s.toLowerCase().replace('cm', ''); // 100, 50, 33, 25, 20
    const isDouble = l === 'Double';
    const isBlack = m === 'Black';
    const isSilver = m === 'Silver';
    const isClear = m === 'Clear';

    // 100CM (1 Meter)
    if (sz === '100') {
        if (isDouble && isBlack) return 'BW-DOUBLELAYER-BLACK';
        if (isDouble && isClear) return 'BW-DOUBLELAYER-CLEAR';
        if (isBlack) return 'BW-BLACK';
        if (isSilver) return 'BW-SV/GY';
        return 'BW-CLEAR';
    }

    // 50CM - 2 Rolls per Pack
    if (sz === '50') {
        if (isDouble && isBlack) return 'BW-DOUBLELAYERBLACK-50CM-2';
        if (isDouble && isClear) return 'BW-DOUBLELAYER-50CM-2';
        if (isBlack) return 'BW-BLACK-50CM-2';
        return 'BW-CLEAR-50CM-2';
    }

    // Small Sizes - Suffix Logic (Bundles)
    let suffix = '-1';
    if (sz === '33') suffix = '-3';
    if (sz === '25') suffix = '-4';
    if (sz === '20') suffix = '-5';

    // 33CM
    if (sz === '33') {
        if (isDouble && isBlack) return `BW33CM-DOUBLELAYER-BLACK${suffix}`;
        if (isDouble && isClear) return `BW33CM-DOUBLELAYER${suffix}`;
        if (isBlack) return `BW33CM-BLACK${suffix}`;
        return `BW33CM${suffix}`;
    }

    // 25CM
    if (sz === '25') {
        if (isDouble && isBlack) return `BW25CM-BLACK-DOUBLELAYER${suffix}`; // Note: BLACK-DOUBLELAYER order
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

    return `BW${sz}CM-1`; // Fallback
};
