import { ProductLayer, ProductMaterial, ProductSize, PackagingColor } from '../types';

export const getRecommendedPackaging = (
    layer: ProductLayer,
    material: ProductMaterial,
    size: ProductSize
): PackagingColor => {
    // 1. Single Layer Logic
    if (layer === 'Single') {
        if (material === 'Black') {
            // Hitam Single Layer
            // 1M -> Hijau
            if (size === '100cm') return 'Green';
            // 50cm -> Merah
            if (size === '50cm') return 'Pink';
            // 33, 25, 20 -> Hijau
            return 'Green';
        } else {
            // Clear / Standard
            // 1M -> Merah
            if (size === '100cm') return 'Pink';
            // 50cm -> Oren
            if (size === '50cm') return 'Orange';
            // 33, 25, 20 -> Hijau
            return 'Green';
        }
    }

    // 2. Double Layer Logic
    else {
        if (material === 'Black') {
            // Double Layer Hitam
            // 1M -> Merah
            if (size === '100cm') return 'Pink';
            // 50cm -> Hijau
            if (size === '50cm') return 'Green';
            // 33, 25, 20 -> Merah
            return 'Pink';
        } else {
            // Double Layer Clear / Standard
            // 1M -> Kuning
            if (size === '100cm') return 'Yellow';
            // 50, 33, 25, 20 -> Biru
            return 'Blue';
        }
    }
};

export const getRollsPerSet = (size: ProductSize): number => {
    switch (size) {
        case '100cm': return 1;
        case '50cm': return 2;
        case '33cm': return 3;
        case '25cm': return 4;
        case '20cm': return 5;
        default: return 1;
    }
};
