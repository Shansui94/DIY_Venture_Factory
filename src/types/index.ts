// Core Type Definitions for Factory App

// 1. User Role (Strict Unions)
export type UserRole = 'Admin' | 'Manager' | 'Operator' | 'Driver' | 'HR' | 'Sales';

// 2. User Profile
export interface User {
    uid: string;
    id?: string; // Frontend alias for doc.id
    email: string | null;
    role: UserRole;
    createdAt?: string;
    name?: string;
    photoURL?: string;
    gps?: string; // Optional GPS coordinate string
    loginTime?: string;
    phone?: string;
    salary?: number; // Monthly salary (Admin only)
    // Onboarding Fields
    status?: 'Pending' | 'Active' | 'Rejected'; // Default Pending
    employeeId?: string; // Numeric ID e.g., "001"
    joinedDate?: string;
    // Personal Details (Optional)
    icNo?: string;
    dob?: string;
    gender?: 'Male' | 'Female';
    maritalStatus?: 'Single' | 'Married' | 'Divorced';
    address?: string;

    // Emergency Contact (Optional)
    emergencyName?: string;
    emergencyPhone?: string;
    emergencyRelation?: string;

    // Statutory & Bank (Optional)
    epfNo?: string;
    socsoNo?: string;
    taxNo?: string;
    bankName?: string;
    bankAccountNo?: string;
}

// 3. Job Order (Production Task)
export type DeliveryZone = 'North' | 'Central' | 'Central_Left' | 'Central_Right' | 'South' | 'East';
export type DeliveryStatus = 'Pending' | 'In-Transit' | 'Delivered';

export interface JobOrder {
    Job_ID: string; // Document ID and display ID
    id?: string; // Additional ID field often used in loops
    salesOrderId?: string; // NEW: Link to Sales Order
    customer: string;
    product: string;
    Product_SKU?: string; // Alias or specific field
    target: number; // Target Quantity
    Target_Qty?: number; // Alias often found in older code
    produced: number;
    status: 'Pending' | 'Backlog' | 'Scheduled' | 'Production' | 'Completed' | 'Paused';
    Status?: string; // Support capitalized legacy field
    machine: string;
    Machine_ID?: string; // Alias
    Priority: 'High' | 'Normal' | 'Low';
    Start_Date?: string;
    notes?: string;
    factoryId?: string; // NEW: Multi-factory support
    recipeId?: string; // NEW: Link to specific Recipe (BOM)

    // Logistics Fields
    deliveryAddress?: string;
    deliveryZone?: 'North' | 'Central' | 'Central_Left' | 'Central_Right' | 'South' | 'East';
    deliveryStatus?: DeliveryStatus;
    driverId?: string; // ID of the assigned Lorry/Driver
    orderIndex?: number; // For Kanban ordering
}

// 13. Sales Order (NEW)
export interface SalesOrder {
    id: string;
    orderNumber: string; // User friendly ID e.g., SO-2025-001
    customer: string;
    items: {
        product: string; // e.g. "BW-S50-CLR-ORG"
        layer: ProductLayer;
        material: ProductMaterial;
        packaging: PackagingColor;
        size: ProductSize;
        quantity: number; // Rolls
    }[];
    status: 'New' | 'Planned' | 'In-Production' | 'Ready-to-Ship' | 'Shipped';
    orderDate: string;
    deadline: string;
    notes?: string;
    totalAmount?: number; // Optional for now
}

// ... existing InventoryItem ...

// 10. Logistics Structures (NEW)
export interface Lorry {
    id: string;
    plateNumber: string;
    driverName: string;
    driverUserId: string; // Map to User.uid
    preferredZone: 'North' | 'Central' | 'Central_Left' | 'Central_Right' | 'South' | 'East';
    status: 'Available' | 'On-Route' | 'Maintenance';
}

// 4. Inventory Item (Raw Material)
export interface InventoryItem {
    Raw_Material_ID: string;
    Material_Name: string;
    Stock_Kg: number;
    Unit_Price?: number;
    Supplier?: string;
    Last_Updated?: string;
    factoryId?: string; // NEW: Multi-factory support

    // Legacy / Alternative Fields for backwards compatibility
    Product_Name?: string;
    name?: string;
    qty?: number;
    id?: string;
    SKU_ID?: string;
}

// 5. Production Log (Audit Trail)
export interface ProductionLog {
    Log_ID: string;
    Timestamp: string;
    Job_ID: string;
    Operator_Email: string | null;
    Output_Qty: number;
    GPS_Coordinates?: string;
    AI_Verification?: {
        Verified: boolean;
        Detected_Rolls: number;
        Confidence: string;
    };
    Stock_Deduction_Status?: 'Completed' | 'Pending' | 'Failed';
    Over_Production?: number;
    Material_Deducted?: number;
    Material_ID?: string;
    Note?: string;
}

// 6. Shift (Attendance)
export interface Shift {
    id: string;
    User_Email: string | null;
    Start_Time: string;
    End_Time?: string;
    Status: 'Active' | 'Completed';
    GPS_Start?: string;
    GPS_End?: string;
    Machine_ID?: string; // NEW: Track which machine the operator checked in at
}

// 7. API/Scan Result
export interface ScanResult {
    text: string;
    count: number;
    conf: string;
}

// 8. Factory Structure (NEW)
export interface Factory {
    id: string;
    name: string;
    location: string;
    type: 'Production' | 'Warehouse' | 'Mixed';
}

// 9. Machine Structure (NEW)
export interface Machine {
    id: string;
    name: string;
    factoryId: string;
    type: 'Extruder' | 'Slitter' | 'Other';
    status: 'Running' | 'Idle' | 'Maintenance' | 'Offline';
}

// 5. Payroll Entry (NEW)
export interface PayrollEntry {
    id: string; // Document ID (usually YYYY-MM)
    month: string; // "December 2025"
    baseSalary: number;
    claimsTotal: number;
    otTotal?: number;
    deductions?: number;
    total: number;
    status: 'Paid' | 'Pending' | 'Processing';
    issuedAt?: string;
}

// 11. Claim Structure (NEW)
export interface Claim {
    id: string; // Document ID
    userId: string;
    userName: string;
    type: 'Overtime' | 'Medical' | 'Transport' | 'Meal' | 'Other';
    amount: number;
    description: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    timestamp: string;
    reviewedBy?: string;
    rejectionReason?: string;

    // Driver / Transport fields
    odometerStart?: number;
    odometerEnd?: number;
    odometerStartImg?: string;
    odometerEndImg?: string;
    distance?: number;

    // Attachments
    receiptUrl: string; // Mandatory receipt image
    itemPhotoUrl?: string; // Optional item photo
}

// 12. Product Variants (NEW for Production Control)
export type ProductLayer = 'Single' | 'Double';
export type ProductMaterial = 'Clear' | 'Black' | 'Silver';
export type PackagingColor = 'Orange' | 'Pink' | 'Blue' | 'Yellow' | 'Green' | 'Transparent';
export type ProductSize = '100cm' | '50cm' | '33cm' | '25cm' | '20cm';

export interface ProductVariant {
    layer: ProductLayer;
    material: ProductMaterial;
    packaging: PackagingColor;
    size: ProductSize;
    rollsPerSet: number;
}

export const PRODUCT_LAYERS: { label: string; value: ProductLayer; code: string }[] = [
    { label: 'Single Layer (单层)', value: 'Single', code: 'SL' },
    { label: 'Double Layer (双层)', value: 'Double', code: 'DL' },
];

export const PRODUCT_MATERIALS: { label: string; value: ProductMaterial; code: string }[] = [
    { label: 'Clear (透明)', value: 'Clear', code: 'CLR' },
    { label: 'Black (Hitam)', value: 'Black', code: 'BLK' },
    { label: 'Silver (Grey)', value: 'Silver', code: 'SLV' },
];

export const PACKAGING_COLORS: { label: string; value: PackagingColor; code: string; class: string }[] = [
    { label: 'Orange (Oren)', value: 'Orange', code: 'ORG', class: 'bg-orange-500' },
    { label: 'Red (Merah)', value: 'Pink', code: 'PNK', class: 'bg-pink-500' },
    { label: 'Blue (Biru)', value: 'Blue', code: 'BLU', class: 'bg-blue-500' },
    { label: 'Yellow (Kuning)', value: 'Yellow', code: 'YEL', class: 'bg-yellow-400 text-black' },
    { label: 'Green (Hijau)', value: 'Green', code: 'GRN', class: 'bg-green-500' },
    { label: 'Transparent', value: 'Transparent', code: 'TRP', class: 'bg-gray-200 border border-gray-400 text-black' },
];

// 14. Factory Types (Supabase)
export * from './factory';

export const PRODUCT_SIZES: { label: string; value: ProductSize; code: string; rolls: number }[] = [
    { label: '100cm (1 Roll)', value: '100cm', code: '100', rolls: 1 },
    { label: '50cm (2 Rolls)', value: '50cm', code: '50', rolls: 2 },
    { label: '33cm (3 Rolls)', value: '33cm', code: '33', rolls: 3 },
    { label: '25cm (4 Rolls)', value: '25cm', code: '25', rolls: 4 },
    { label: '20cm (5 Rolls)', value: '20cm', code: '20', rolls: 5 },
];
