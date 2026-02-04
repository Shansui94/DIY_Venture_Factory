
import fs from 'fs';
const path = "c:/Users/Max Tan/Downloads/Packsecure OS/packsecure/src/pages/DeliveryOrderManagement.tsx";
let content = fs.readFileSync(path, 'utf8');

// 1. Double label fix in Modal
content = content.replace(/<label className=\"block text-xs font-bold text-slate-500 uppercase mb-2\">Delivery Date<\/label>\s+<div className=\"grid grid-cols-2 gap-4\">/g,
    '<div className=\"grid grid-cols-2 gap-4\">');

// 2. Fix handleSubmitOrder order_date logic
content = content.replace(/order_date: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\],/g,
    'order_date: newOrderDate || new Date().toISOString().split("T")[0],');

// 3. Add newOrderDate assignment in handleEditOrder logic
// We target the place where modal is opened for editing
content = content.replace(/setEditingOrderId\(order\.id\);/g, "setEditingOrderId(order.id); setNewOrderDate(order.orderDate || '');");

// 4. Reset newOrderDate in handleCloseModal
content = content.replace(/setEditingOrderId\(null\);/g, "setEditingOrderId(null); setNewOrderDate('');");

fs.writeFileSync(path, content);
console.log('Final UI and Logic cleanup done.');
