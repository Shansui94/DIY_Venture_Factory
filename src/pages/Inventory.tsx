import React from 'react';
import { Edit3 } from 'lucide-react';
import { InventoryItem } from '../types';

interface InventoryProps {
    inventory: InventoryItem[];
    onUpdateStock?: (id: string, newQty: number) => void;
}

const Inventory: React.FC<InventoryProps> = ({ inventory, onUpdateStock }) => {
    // Fallback if inventory is undefined
    const items = inventory || [];

    const handleEditStock = (item: InventoryItem) => {
        // Handle inconsistent naming from legacy data vs type definition
        const displayName = item.Material_Name || item.Product_Name || item.name;
        const currentStock = item.Stock_Kg || item.qty;
        const id = item.Raw_Material_ID || item.id || item.SKU_ID;

        // Fix: prompt expects string default
        const newQty = prompt(`Adjust stock for ${displayName}:`, String(currentStock || 0));

        if (newQty && !isNaN(parseInt(newQty))) {
            // Call parent handler to update Firestore
            if (onUpdateStock && id) {
                onUpdateStock(id, parseInt(newQty));
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-white">Raw Material Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => {
                    const displayName = item.Material_Name || item.Product_Name || item.name;
                    const displayId = item.Raw_Material_ID || item.id || item.SKU_ID;
                    const displayStock = item.Stock_Kg || item.qty;

                    return (
                        <div key={displayId} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex justify-between items-center group hover:border-blue-500/50 transition-all">
                            <div>
                                <h4 className="font-bold text-white">{displayName}</h4>
                                <p className="text-xs text-gray-500">ID: {displayId}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-mono font-bold text-blue-400">{displayStock} <span className="text-xs text-gray-500">kg</span></p>
                                <button
                                    onClick={() => handleEditStock(item)}
                                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                >
                                    <Edit3 size={10} /> Edit Stock
                                </button>
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-10">
                        No inventory items found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inventory;
