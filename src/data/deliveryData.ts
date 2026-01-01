import { Lorry, User } from '../types';

export const LORRIES: Lorry[] = [
    { id: 'L01', plateNumber: 'VAA 1234', driverName: 'Ali bin Abu', driverUserId: 'driver-01', preferredZone: 'North', status: 'Available' },
    { id: 'L02', plateNumber: 'WBB 8888', driverName: 'Chong Wei', driverUserId: 'driver-02', preferredZone: 'Central', status: 'On-Route' },
    { id: 'L03', plateNumber: 'JCC 9999', driverName: 'Muthu Sami', driverUserId: 'driver-03', preferredZone: 'South', status: 'Available' },
    { id: 'L04', plateNumber: 'KDD 4567', driverName: 'David Teoh', driverUserId: 'driver-04', preferredZone: 'North', status: 'Available' },
    { id: 'L05', plateNumber: 'PEE 1010', driverName: 'Sarah Lim', driverUserId: 'driver-05', preferredZone: 'Central', status: 'Available' },
    { id: 'L06', plateNumber: 'AFF 2020', driverName: 'Ahmad Zaki', driverUserId: 'driver-06', preferredZone: 'South', status: 'Available' },
    { id: 'L07', plateNumber: 'BGG 3030', driverName: 'Kenji Tan', driverUserId: 'driver-07', preferredZone: 'East', status: 'Available' },
    { id: 'L08', plateNumber: 'MHH 4040', driverName: 'Ravi Kumar', driverUserId: 'driver-08', preferredZone: 'Central', status: 'Maintenance' },
    { id: 'L09', plateNumber: 'NII 5050', driverName: 'Steve Rogers', driverUserId: 'driver-09', preferredZone: 'North', status: 'Available' },
    { id: 'L10', plateNumber: 'PJJ 6060', driverName: 'Tony Stark', driverUserId: 'driver-10', preferredZone: 'South', status: 'Available' }
];

// Mock Users extended for Drivers
export const MOCK_DRIVERS: User[] = [
    { uid: 'driver-01', email: 'driver1@diy.com', role: 'Driver', name: 'Ali Driver' },
    { uid: 'driver-02', email: 'driver2@diy.com', role: 'Driver', name: 'Chong Driver' },
];
