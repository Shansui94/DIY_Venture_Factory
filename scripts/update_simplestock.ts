
import fs from 'fs';
const path = "c:/Users/Max Tan/Downloads/Packsecure OS/packsecure/src/pages/SimpleStock.tsx";
let content = fs.readFileSync(path, 'utf8');

// 1. Add formatDateDMY utility if not exists (inside or outside component, but SimpleStock doesn't have it yet)
if (!content.includes('const formatDateDMY')) {
    const utility = `
const formatDateDMY = (dateStr?: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return \`\${d}/\${m}/\${y}\`;
};
`;
    content = content.replace('interface SimpleStockProps', utility + '\ninterface SimpleStockProps');
}

// 2. Update States: rename orderDate to deliveryDate and add entryDate
content = content.replace('const [orderDate, setOrderDate] = useState(() => {',
    'const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);\n    const [deliveryDate, setDeliveryDate] = useState(() => {');
content = content.replace('setOrderDate(e.target.value)}', 'setDeliveryDate(e.target.value)}');

// 3. Update handleBatchSubmit payload mapping
content = content.replace('const yymmdd = orderDate.replace(/-/g, \'\').slice(2);', 'const yymmdd = deliveryDate.replace(/-/g, \'\').slice(2);');
content = content.replace('order_date: orderDate,', 'order_date: entryDate,\n                deadline: deliveryDate,');

// 4. Update UI: Transform single date into double grid
const uiOldBlock = `<div className=\"w-1/3\">
                            <label className=\"block text-[10px] font-bold text-slate-500 uppercase mb-1\">Delivery Date</label>
                            <div className=\"relative w-full\">
                                <input
                                    type=\"date\"
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    className=\"w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold focus:border-slate-700 outline-none h-full\"
                                />
                            </div>
                        </div>`;

const uiNewBlock = `<div className=\"flex-1\">
                            <div className=\"grid grid-cols-2 gap-2\">
                                <div>
                                    <label className=\"block text-[9px] font-black text-slate-600 uppercase mb-1 tracking-tighter\">📦 Order Date</label>
                                    <input
                                        type=\"date\"
                                        value={entryDate}
                                        onChange={(e) => setEntryDate(e.target.value)}
                                        className=\"w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2 text-slate-400 text-[11px] outline-none [color-scheme:dark]\"
                                    />
                                    <div className=\"text-[8px] text-slate-700 mt-0.5 font-bold\">{formatDateDMY(entryDate)}</div>
                                </div>
                                <div>
                                    <label className=\"block text-[9px] font-black text-blue-500/80 uppercase mb-1 tracking-tighter\">🚚 Deliver Date</label>
                                    <input
                                        type=\"date\"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                        className=\"w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-[11px] font-black outline-none [color-scheme:dark] focus:border-blue-500/30\"
                                    />
                                    <div className=\"text-[8px] text-blue-500/60 mt-0.5 font-bold\">{formatDateDMY(deliveryDate)}</div>
                                </div>
                            </div>
                        </div>`;

// Simple string replacement if the code matches exactly, otherwise use regex
if (content.includes('value={orderDate}') || content.includes('value={deliveryDate}')) {
    // Note: I already replaced setOrderDate with setDeliveryDate in previous step, so the value={orderDate} might still be there but the setter changed.
    // Let's be safer and replace the whole block based on surrounding context.
    content = content.replace(/<div className=\"w-1\/3\">\s*<label className=\"block text-\[10px\] font-bold text-slate-500 uppercase mb-1\">Delivery Date<\/label>[\s\S]+?<\/div>\s*<\/div>/, uiNewBlock + '</div>');
}

fs.writeFileSync(path, content);
console.log("Applied SimpleStock dual-date UI updates successfully.");
