import { Factory, Machine } from '../types';

export const FACTORIES: Factory[] = [
    { id: 'T1', name: 'Taiping (Production)', location: 'Taiping', type: 'Production' },
    { id: 'T2', name: 'Taiping (Warehouse)', location: 'Taiping', type: 'Warehouse' },
    { id: 'N1', name: 'Nilai (Double Layer)', location: 'Nilai', type: 'Production' },
    { id: 'N2', name: 'Nilai (Single Layer)', location: 'Nilai', type: 'Production' },
];

export const MACHINES: Machine[] = [
    // Taiping T1 (Production)
    { id: 'T1.1-M03', name: 'Stretch Film (T1.1)', factoryId: 'T1', type: 'Extruder', status: 'Running' },
    { id: 'T1.2-M01', name: '2M Double Layer (T1.2)', factoryId: 'T1', type: 'Extruder', status: 'Running' },
    { id: 'T1.3-M02', name: '1M Single Layer (T1.3)', factoryId: 'T1', type: 'Extruder', status: 'Idle' },

    // Nilai N1
    { id: 'N1-M01', name: '1M Double Layer (N1)', factoryId: 'N1', type: 'Extruder', status: 'Running' },

    // Nilai N2
    { id: 'N2-M02', name: '1M Single Layer (N2)', factoryId: 'N2', type: 'Extruder', status: 'Idle' },
];
