
import fs from 'fs';
const path = "c:/Users/Max Tan/Downloads/Packsecure OS/packsecure/src/pages/SimpleStock.tsx";
let content = fs.readFileSync(path, 'utf8');

// We will target the entire Stock Out Info section to be sure it's correct
const startMarker = '{/* 1. DRIVER SELECTION (Now Mandatory) */}';
const endMarker = '{/* Batch Notes (Noted) */}';

const newSection = `{/* 1. DRIVER SELECTION (Now Mandatory) */}
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                        <User size={12} /> Stock Out Info
                    </div>

                    <SearchableSelect
                        placeholder="Select Driver (Mandatory)"
                        options={driverOptions}
                        value={selectedDriver}
                        onChange={setSelectedDriver}
                    />

                    <div className="pt-2 border-t border-slate-800 flex gap-3">
                        <div className="flex-1">
                            <SearchableSelect
                                placeholder="Select State / Area (Mandatory)"
                                options={stateOptions}
                                value={selectedState}
                                onChange={setSelectedState}
                                minimal={true}
                            />
                        </div>
                        <div className="flex-1">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-600 uppercase mb-1 tracking-tighter">📦 Order Date</label>
                                    <input
                                        type="date"
                                        value={entryDate}
                                        onChange={(e) => setEntryDate(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2 text-slate-400 text-[11px] outline-none [color-scheme:dark]"
                                    />
                                    <div className="text-[8px] text-slate-700 mt-0.5 font-bold">{formatDateDMY(entryDate)}</div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-blue-500/80 uppercase mb-1 tracking-tighter">🚚 Deliver Date</label>
                                    <input
                                        type="date"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-[11px] font-black outline-none [color-scheme:dark] focus:border-blue-500/30"
                                    />
                                    <div className="text-[8px] text-blue-500/60 mt-0.5 font-bold">{formatDateDMY(deliveryDate)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Place Selection */}
                    <div className="pt-2 border-t border-slate-800">
                        <SearchableSelect
                            label="Total Places (Drops)"
                            placeholder="Select drop count..."
                            options={placeOptions}
                            value={selectedPlace}
                            onChange={setSelectedPlace}
                            minimal={true}
                        />
                    </div>
                </div>

                `;

// Find the section and replace it
const regex = new RegExp(startMarker.replace(/[.*+?^$\${}()|[\\]\\\\]/g, '\\\\$&') + '[\\\\s\\\\S]+' + endMarker.replace(/[.*+?^$\${}()|[\\]\\\\]/g, '\\\\$&'));

if (regex.test(content)) {
    content = content.replace(regex, newSection + '\n\n                ' + endMarker);
    console.log("Re-applied Stock Out Info section with correct tag balancing.");
} else {
    console.log("Could not find Stock Out Info section markers.");
}

fs.writeFileSync(path, content);
