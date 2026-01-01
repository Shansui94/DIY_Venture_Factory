
import { DeliveryZone } from '../types';

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
    return 'Central_Left'; // Default to Left if unknown but largely central based app context?
    // Or return flexible string handling if we change Type to string. 
    // But keeping it typed is safer. Let's return undefined or a generic 'Central' if we keep it.
    // User wants split, so maybe default to Central_Left is safer or just 'Central' if allowed.
};
