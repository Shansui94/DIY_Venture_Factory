import { useState } from 'react';
import { supabase } from '../services/supabase';

type ParsedCustomer = {
    code: string;
    name: string;
    phone: string;
    address: string;
    state: string;
    status: 'pending' | 'success' | 'error';
    message?: string;
};

export default function CustomerImport() {
    const [input, setInput] = useState('');
    const [parsedData, setParsedData] = useState<ParsedCustomer[]>([]);
    const [importing, setImporting] = useState(false);
    const [step, setStep] = useState<'input' | 'preview'>('input');

    const parseData = () => {
        const lines = input.split('\n').filter(line => line.trim());
        const parsed: ParsedCustomer[] = [];

        lines.forEach((line, index) => {
            if (index === 0 && line.toLowerCase().includes('company_name')) return;

            const parts = line.split(',');
            if (parts.length < 4) return;

            const code = parts[0].trim();
            const name = parts[1].trim();
            const phone = parts[2].trim();
            const state = parts[parts.length - 1].trim();
            const addressParts = parts.slice(3, parts.length - 1);
            const address = addressParts.join(', ').trim();

            parsed.push({
                code,
                name,
                phone,
                address,
                state,
                status: 'pending'
            });
        });

        setParsedData(parsed);
        setStep('preview');
    };

    const doImport = async () => {
        setImporting(true);
        const updatedData = [...parsedData];

        // 1. Get all codes from input
        const allCodes = updatedData.map(d => d.code).filter(c => c);
        const uniqueCodes = Array.from(new Set(allCodes));

        try {
            // 2. Fetch existing IDs for these codes
            const { data: existingRows, error: fetchError } = await supabase
                .from('sys_customers')
                .select('id, customer_code')
                .in('customer_code', uniqueCodes);

            if (fetchError) throw fetchError;

            // Map code -> id
            const codeToIdMap: Record<string, string> = {};
            existingRows?.forEach(row => {
                if (row.customer_code) codeToIdMap[row.customer_code] = row.id;
            });

            // 3. Process in chunks
            const chunkSize = 50;
            for (let i = 0; i < updatedData.length; i += chunkSize) {
                const chunk = updatedData.slice(i, i + chunkSize);

                // Prepare records with ID if it exists, OR generate new one
                const records = chunk.map(c => ({
                    id: codeToIdMap[c.code] || crypto.randomUUID(), // Use existing or generate NEW
                    customer_code: c.code,
                    name: c.name,
                    phone: c.phone || null,
                    address: c.address || null,
                    zone: null,
                    created_at: new Date().toISOString()
                }));

                // Upsert (ID is PK, so it works automatically)
                const { error } = await supabase
                    .from('sys_customers')
                    .upsert(records); // No onConflict needed if ID is provided

                const status = error ? 'error' : 'success';
                const message = error ? error.message : 'Imported';

                for (let j = 0; j < chunk.length; j++) {
                    updatedData[i + j].status = status;
                    updatedData[i + j].message = message;
                }
                // Update UI progress
                setParsedData([...updatedData]);
            }

        } catch (err: any) {
            console.error("Critical Import Error:", err);
            // Mark all remaining as error if pre-fetch fails
            updatedData.forEach(d => {
                if (d.status === 'pending') {
                    d.status = 'error';
                    d.message = err.message;
                }
            });
            setParsedData([...updatedData]);
        }

        setImporting(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Batch Import Customers</h1>
                    <div className="text-sm text-slate-500">Paste your CSV list below</div>
                </div>

                {step === 'input' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <textarea
                            className="w-full h-96 p-4 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Data Format: Code, Company Name, Phone, Full Address..., State"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={parseData}
                                disabled={!input.trim()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                Parse Data
                            </button>
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex gap-4">
                                <span className="font-bold text-slate-700">Total: {parsedData.length}</span>
                                <span className="font-bold text-green-600">Success: {parsedData.filter(d => d.status === 'success').length}</span>
                                <span className="font-bold text-red-600">Error: {parsedData.filter(d => d.status === 'error').length}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('input')}
                                    disabled={importing}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={doImport}
                                    disabled={importing || parsedData.every(p => p.status === 'success')}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {importing ? 'Importing...' : 'Start Import'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-red-600">Error</th>
                                            <th className="p-4">Code</th>
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Phone</th>
                                            <th className="p-4">Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedData.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-4 font-bold">
                                                    {row.status === 'success' ? '✅' : row.status === 'error' ? '❌' : '⏳'}
                                                </td>
                                                <td className="p-4 text-xs text-red-600 max-w-xs break-words">
                                                    {row.message}
                                                </td>
                                                <td className="p-4 font-mono">{row.code}</td>
                                                <td className="p-4 font-medium">{row.name}</td>
                                                <td className="p-4">{row.phone}</td>
                                                <td className="p-4 truncate max-w-xs" title={row.address}>{row.address}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
