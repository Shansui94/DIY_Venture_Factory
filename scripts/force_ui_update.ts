
import fs from 'fs';
const path = "c:/Users/Max Tan/Downloads/Packsecure OS/packsecure/src/pages/DeliveryOrderManagement.tsx";
let content = fs.readFileSync(path, 'utf8');

// Use Regex to be space-agnostic for the Card Section
const cardRegex = /<div className=\"text-xs text-slate-500 flex items-center gap-2 mb-3 line-clamp-1\">\s*<Calendar size=\{12\} className=\"text-slate-600\" \/>\s*<span className=\{!order\.orderDate \? 'opacity-50' : ''\}>\{formatDateDMY\(order\.orderDate \|\| ''\) \|\| \"No Date\"\}<\/span>\s*<\/div>/g;

const newCardBlock = `<div className="text-xs text-slate-500 flex items-center gap-2 mb-3">
                                                                <Calendar size={14} className="text-slate-600 shrink-0" />
                                                                <div className="flex flex-col gap-0.5 leading-tight">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">📦 Ord:</span>
                                                                        <span className="text-[10px] text-slate-500 font-bold">{formatDateDMY(order.orderDate)}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] font-black text-blue-500/50 uppercase tracking-tighter">🚚 Del:</span>
                                                                        <span className="text-[10px] text-blue-400 font-black">{formatDateDMY(order.deadline) || "No Date"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>`;

if (cardRegex.test(content)) {
    content = content.replace(cardRegex, newCardBlock);
    console.log("Card UI updated.");
} else {
    console.log("Card UI NOT found via Regex.");
}

// Modal Section: Target the current state of the Delivery Date block
const modalRegex = /<div className=\"relative group\">\s*<div className=\"absolute left-4 top-1\/2 -translate-y-1\/2 text-slate-500 group-focus-within:text-blue-500 pointer-events-none transition-colors\">\s*<Calendar size=\{18\} \/>\s*<\/div>\s*<input\s+type=\"date\"\s+className=\"w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-300 focus:border-blue-500\/50 outline-none appearance-none cursor-pointer \[color-scheme:dark\] hover:border-slate-700 transition-all font-bold\"\s+value=\{newOrderDeliveryDate\}\s+onChange=\{e => setNewOrderDeliveryDate\(e\.target\.value\)\}\s*\/>\s*<\/div>/g;

const newModalTarget = `<div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-2 tracking-widest flex items-center gap-2">
                                            <Calendar size={12} /> Order Date
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="date"
                                                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 focus:border-blue-500/30 outline-none appearance-none cursor-pointer [color-scheme:dark] transition-all"
                                                value={newOrderDate}
                                                onChange={e => setNewOrderDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-blue-500/80 uppercase mb-2 tracking-widest flex items-center gap-2">
                                            <Calendar size={12} /> Delivery Date
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="date"
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-blue-500/50 outline-none appearance-none cursor-pointer [color-scheme:dark] transition-all font-bold"
                                                value={newOrderDeliveryDate}
                                                onChange={e => setNewOrderDeliveryDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-1 flex justify-between px-1">
                                    <div className="text-[9px] text-slate-700 font-bold uppercase">Ord: {formatDateDMY(newOrderDate) || "Today"}</div>
                                    <div className="text-[9px] text-blue-500/60 font-black uppercase">Del: {formatDateDMY(newOrderDeliveryDate) || "Not Set"}</div>
                                </div>`;

if (content.includes('value={newOrderDeliveryDate}')) {
    // If it includes the value, we are in the right ballpark.
    // Let's replace the encompassing block if the regex failed or just target a simpler string
    content = content.replace(modalRegex, newModalTarget);
}

fs.writeFileSync(path, content);
console.log("Applied dual-date UI updates successfully.");
