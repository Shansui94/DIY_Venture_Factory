import { ProductLayer, ProductMaterial, ProductSize, PackagingColor } from '../types';

export const getBubbleWrapSku = (
    layer: ProductLayer,
    material: ProductMaterial,
    size: ProductSize | null,
    rolls: number = 1,
    color: PackagingColor | null = 'Transparent'
): string => {
    if (!size) return 'BW-UNKNOWN';

    // 1. Layer Mapping
    const layerCode = layer === 'Double' ? 'DL' : 'SL';

    // 2. Material Mapping
    const matCode = material.toUpperCase();

    // 3. Width Mapping (Numeric)
    const width = size.replace('cm', '').toUpperCase();

    // 4. Color Mapping (Pink -> RED as per user request)
    let colorName = (color || 'Transparent').toUpperCase();
    if (colorName === 'PINK') colorName = 'RED';

    // 5. Final Assembly
    // Format: BW-{Layer}-{Material}-100Mx{Width}CMx{Rolls}-{Color}
    return `BW-${layerCode}-${matCode}-100Mx${width}CMx${rolls}-${colorName}`;
};
