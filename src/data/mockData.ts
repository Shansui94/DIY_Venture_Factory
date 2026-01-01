export interface User {
    UserID: string;
    Name: string;
    Email: string;
    Role: string;
    Phone: string;
}

export interface Product {
    SKU_ID: string;
    Product_Name: string;
    Color: string;
    Dimensions: string;
    Packing_Rolls: number;
    Raw_Material_ID: string;
    Image_Url: string;
}

export interface JobOrder {
    Job_ID: string;
    Timestamp: string;
    SKU_ID: string;
    Target_Qty: number;
    Priority: string;
    Status: string;
    Assigned_To: string;
}

export interface InventoryItem {
    Raw_Material_ID: string;
    Name: string;
    Stock_Kg: number;
}

export const users: User[] = [
    { UserID: 'USR-001', Name: 'John Doe', Email: 'john.doe@diyventure.com', Role: 'Admin', Phone: '+1234567890' },
    { UserID: 'USR-002', Name: 'Jane Smith', Email: 'jane.smith@diyventure.com', Role: 'Manager', Phone: '+1234567891' },
    { UserID: 'USR-003', Name: 'Bob Operator', Email: 'bob.op@diyventure.com', Role: 'Operator', Phone: '+1234567892' },
    { UserID: 'USR-006', Name: 'David Miller', Email: 'david.m@diyventure.com', Role: 'Operator', Phone: '+1234567895' },
];

export const products: Product[] = [
    {
        SKU_ID: 'SKU-101',
        Product_Name: 'BW-50x1-CLR-2R',
        Color: 'Clear',
        Dimensions: '50cm x 1m',
        Packing_Rolls: 2,
        Raw_Material_ID: 'RM-001',
        Image_Url: 'https://placehold.co/100x100/png?text=Clear+50x1'
    },
    {
        SKU_ID: 'SKU-102',
        Product_Name: 'BW-33x1-BLK-3R',
        Color: 'Black',
        Dimensions: '33cm x 1m',
        Packing_Rolls: 3,
        Raw_Material_ID: 'RM-002',
        Image_Url: 'https://placehold.co/100x100/png?text=Black+33x1'
    },
    {
        SKU_ID: 'SKU-103',
        Product_Name: 'BW-25x4-PNK-4R',
        Color: 'Pink',
        Dimensions: '25cm x 4m',
        Packing_Rolls: 4,
        Raw_Material_ID: 'RM-003',
        Image_Url: 'https://placehold.co/100x100/png?text=Pink+25x4'
    },
    {
        SKU_ID: 'SKU-104',
        Product_Name: 'BW-100x1-CLR-1R',
        Color: 'Clear',
        Dimensions: '100cm x 1m',
        Packing_Rolls: 1,
        Raw_Material_ID: 'RM-001',
        Image_Url: 'https://placehold.co/100x100/png?text=Clear+100x1'
    },
];

export const jobOrders: JobOrder[] = [
    { Job_ID: 'JOB-2023-001', Timestamp: '2023-10-27 08:00:00', SKU_ID: 'SKU-101', Target_Qty: 50, Priority: 'Normal', Status: 'Completed', Assigned_To: 'USR-003' },
    { Job_ID: 'JOB-2023-004', Timestamp: '2023-10-28 08:00:00', SKU_ID: 'SKU-102', Target_Qty: 200, Priority: 'High', Status: 'Production', Assigned_To: 'USR-006' },
    { Job_ID: 'JOB-2023-005', Timestamp: '2023-10-28 09:00:00', SKU_ID: 'SKU-101', Target_Qty: 50, Priority: 'Low', Status: 'Pending', Assigned_To: 'USR-003' },
    { Job_ID: 'JOB-2023-006', Timestamp: '2023-10-28 10:00:00', SKU_ID: 'SKU-103', Target_Qty: 75, Priority: 'Normal', Status: 'Pending', Assigned_To: 'USR-003' },
];

export const inventory: InventoryItem[] = [
    { Raw_Material_ID: 'RM-001', Name: 'Resin - Clear', Stock_Kg: 500 },
    { Raw_Material_ID: 'RM-002', Name: 'Resin - Black', Stock_Kg: 300 },
    { Raw_Material_ID: 'RM-003', Name: 'Resin - Pink', Stock_Kg: 200 },
];
