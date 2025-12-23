export type ItemType = 'raw' | 'product';
export type RecipeStatus = 'active' | 'draft' | 'archived';
export type TransactionType = 'production_in' | 'production_out' | 'adjustment' | 'purchase';

// A. 物品主表 (Items Table)
export interface Item {
    id: string; // UUID
    name: string;
    sku: string;
    type: ItemType;
    current_stock: number;
    unit: string;
    created_at?: string;
}

// B. 配方头表 (Recipes Table)
export interface Recipe {
    id: string; // UUID
    product_id: string; // Reference to Item
    name: string;
    is_default: boolean;
    status: RecipeStatus;
    created_at?: string;

    // Optional: Expanded relation
    product?: Item;
    items?: RecipeItem[];
}

// C. 配方详情表 (Recipe Items Table)
export interface RecipeItem {
    id: string;
    recipe_id: string;
    material_id: string;
    quantity: number; // Qty required to make 1 unit of product

    // Optional: Expanded relation
    material?: Item;
}

// D. 库存流水表 (Inventory Transactions)
export interface InventoryTransaction {
    id: string;
    item_id: string;
    change_amount: number;
    action_type: TransactionType;
    reference_id?: string; // e.g., recipe_id or order_id
    created_at: string;
}

// Result from the stored procedure
export interface ProductionRunResult {
    success: boolean;
    message: string;
    recipe_id: string;
    quantity: number;
}

// E. 工厂表 (Factories Table)
export interface Factory {
    id: string; // UUID
    name: string;
    address?: string;
    type: 'Production' | 'Warehouse' | 'Mixed';
    created_at?: string;
}

// F. 机器表 (Machines Table)
export interface Machine {
    id: string; // UUID
    name: string;
    factory_id: string; // Reference to Factory
    type: 'Extruder' | 'Slitter' | 'Other';
    status: 'Running' | 'Idle' | 'Maintenance' | 'Offline';
    created_at?: string;
}

// G. 工厂库存表 (Factory Inventory Table)
export interface FactoryInventory {
    id: string;
    item_id: string;
    factory_id: string;
    quantity: number;
    min_stock?: number;
    updated_at?: string;
}
