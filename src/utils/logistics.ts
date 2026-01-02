
import { DeliveryZone } from '../types';

// Haversine Formula for GPS Distance (km)
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

// Factory Coordinates
const FACTORIES = [
    { id: 'N1', name: 'Nilai (Main)', lat: 2.8167, lng: 101.7958 },
    { id: 'T1', name: 'Taiping', lat: 4.8500, lng: 100.7333 }
];

export const findNearestFactory = (targetLat: number, targetLng: number) => {
    let nearest = null;
    let minDist = Infinity;

    FACTORIES.forEach(f => {
        const d = calculateDistance(targetLat, targetLng, f.lat, f.lng);
        if (d < minDist) {
            minDist = d;
            nearest = f;
        }
    });

    return { factory: nearest, distance: minDist };
};

// Load Calculator
export const calculateLoad = (items: any[], vehicle: any) => {
    // 1. Calculate Total Volume required
    let totalVol = 0;
    let totalWeight = 0;

    items.forEach(item => {
        // Fallback or use DB value if available
        const qty = item.quantity || 0;

        // Approx Metrics if DB is empty (Standard Roll)
        // 50cm width x 200m length roll ~ 0.05 m3 approx
        const unitVol = item.volume_m3 || 0.05;
        const unitWeight = item.weight_kg || 15;

        totalVol += (unitVol * qty);
        totalWeight += (unitWeight * qty);
    });

    // 2. Compare against Vehicle
    // If no vehicle selected, just return raw totals
    if (!vehicle) return { totalVol, totalWeight, percentVol: 0, percentWeight: 0, status: 'N/A' };

    const maxVol = vehicle.max_volume_m3 || 20; // Default 20m3 (3-tonner)
    const maxWeight = vehicle.max_weight_kg || 5000;

    const percentVol = (totalVol / maxVol) * 100;
    const percentWeight = (totalWeight / maxWeight) * 100;

    return {
        totalVol: totalVol.toFixed(2),
        totalWeight: totalWeight.toFixed(2),
        percentVol: Math.min(percentVol, 100).toFixed(1),
        percentWeight: Math.min(percentWeight, 100).toFixed(1),
        isOverloaded: percentVol > 100 || percentWeight > 100,
        spaceRemaining: Math.max(0, maxVol - totalVol).toFixed(2)
    };
};

export const determineZone = (address: string): DeliveryZone => {
    const lowerAddr = address.toLowerCase();

    // Central_Left
    const leftKeywords = [
        'klang', 'dengkil', 'puchong', 'kapar', 'shah alam', 'puncak alam',
        'telok panglima', 'tanjung karang', 'sabak bernam', 'kuala selangor',
        'subang jaya', 'jenjarom', 'petaling jaya', 'pj', 'nilai', 'melaka', 'n. sembilan',
        'negeri sembilan'
    ];

    if (leftKeywords.some(k => lowerAddr.includes(k))) return 'Central_Left';

    // Central_Right
    const rightKeywords = [
        'rawang', 'kuala lumpur', 'kl', 'cheras', 'sungai buloh',
        'semenyih', 'seri kembangan', 'batu caves', 'balakong', 'kajang',
        'ampang', 'selayang', 'kepong', 'bandar baru bangi', 'serdang',
        'serendah', 'batang kali', 'tmn danau kota', 'sepang'
    ];

    if (rightKeywords.some(k => lowerAddr.includes(k))) return 'Central_Right';

    // Fallbacks (Simple heuristics for other zones)
    if (lowerAddr.includes('johor') || lowerAddr.includes('jb')) return 'South';
    if (lowerAddr.includes('penang') || lowerAddr.includes('kedah') || lowerAddr.includes('perak')) return 'North';
    if (lowerAddr.includes('pahang') || lowerAddr.includes('terengganu') || lowerAddr.includes('kelantan')) return 'East';

    // Default
    return 'Central_Left';
};
