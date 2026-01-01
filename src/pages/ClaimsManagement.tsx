import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Claim } from '../types';
import { DollarSign, FileText, Plus, X, Upload, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface ClaimsManagementProps {
    user: any;
}

const ClaimsManagement: React.FC<ClaimsManagementProps> = ({ user }) => {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Claim Form
    const [claimType, setClaimType] = useState<Claim['type']>('Meal');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    // Driver / Fuel Specifics
    const [odometerStart, setOdometerStart] = useState('');
    const [odometerEnd, setOdometerEnd] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [startFile, setStartFile] = useState<File | null>(null);
    const [endFile, setEndFile] = useState<File | null>(null);

    const [scanning, setScanning] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Auto-Calculate Distance logic
    const distance = (Number(odometerEnd) && Number(odometerStart))
        ? (Number(odometerEnd) - Number(odometerStart)).toFixed(1)
        : '0';

    // --- ADMIN ACTIONS ---
    const handleUpdateStatus = async (claimId: string, newStatus: 'Approved' | 'Rejected', reason?: string) => {
        if (!confirm(`Are you sure you want to ${newStatus} this claim?`)) return;

        try {
            const { error } = await supabase
                .from('claims')
                .update({ status: newStatus, rejectionReason: reason })
                .eq('id', claimId);

            if (error) throw error;
            fetchClaims(); // Refresh
        } catch (error: any) {
            alert("Update failed: " + error.message);
        }
    };

    const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';
    const [viewMode, setViewMode] = useState<'all' | 'my'>('all');

    const fetchClaims = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('claims')
                .select('*')
                .order('timestamp', { ascending: false });

            // If NOT Admin OR (Admin in 'My View' mode), filter by own ID
            if (!isAdmin || viewMode === 'my') {
                query = query.eq('userId', user.id || user.uid);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                setClaims(data as any);
            }
        } catch (error) {
            console.error("Error fetching claims:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchClaims();

        // Optional: Real-time subscription could go here
    }, [user, viewMode]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'receipt' | 'start' | 'end') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (field === 'receipt') setReceiptFile(file);
            if (field === 'start') setStartFile(file);
            if (field === 'end') setEndFile(file);

            // Auto-Scan Trigger
            await scanImage(file, field === 'receipt' ? 'receipt' : 'odometer', field);
        }
    };

    // AI / API Key State
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('google_api_key') || '');
    const [showKeyInput, setShowKeyInput] = useState(false);

    const handleSaveKey = () => {
        localStorage.setItem('google_api_key', apiKey);
        setShowKeyInput(false);
        alert("API Key saved locally!");
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const scanImage = async (file: File, type: 'receipt' | 'odometer', field: string) => {
        if (!apiKey) {
            // Quietly abort or prompt? Let's just prompt once if it's the main receipt
            if (type === 'receipt') {
                const wantToSet = confirm("AI Auto-fill requires a Google Gemini API Key. Set it now?");
                if (wantToSet) setShowKeyInput(true);
            }
            return;
        }

        setScanning(true);
        try {
            const base64Full = await fileToBase64(file);
            // Gemini needs base64 without the "data:image/xyz;base64," prefix
            const base64Data = base64Full.split(',')[1];
            const mimeType = file.type || 'image/jpeg';

            // Google Gemini API Request
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Analyze this receipt/image. Return purely a JSON object (no markdown) with keys: 'amount' (number, digits only), 'merchant' (string, name of shop), 'category' (string, best guess: Meal, Transport, Medical, Other, Otba), 'date' (string, YYYY-MM-DD)." },
                            { inline_data: { mime_type: mimeType, data: base64Data } }
                        ]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            // Parse content from Gemini candidate
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) throw new Error("No analysis returned.");

            // cleanup potential markdown code blocks
            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonStr);

            console.log("Gemini Result:", result);

            if (type === 'receipt') {
                if (result.amount) setAmount(result.amount.toString());
                if (result.merchant) setDescription(result.merchant);
                if (result.category) {
                    // Map inferred category to exact state values
                    const allowedTypes = ['Meal', 'Transport', 'Medical', 'Otba', 'Other'];
                    if (allowedTypes.includes(result.category)) {
                        setClaimType(result.category as any);
                    } else {
                        // Fallback mapping
                        if (result.category.toLowerCase().includes('food')) setClaimType('Meal');
                        else if (result.category.toLowerCase().includes('fuel') || result.category.toLowerCase().includes('taxi')) setClaimType('Transport');
                        else setClaimType('Other');
                    }
                }
            }
            // Odometer could be handled similarly if needed, but receipt is priority

        } catch (error: any) {
            console.error("AI Scan Error:", error);
            alert("Auto-scan failed: " + error.message);
        } finally {
            setScanning(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description || !receiptFile) {
            alert("Please fill in all fields and upload a receipt.");
            return;
        }

        setSubmitting(true);
        try {
            // 1. Upload Receipt
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `receipts/${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('receipts') // Ensure 'receipts' bucket exists
                .upload(filePath, receiptFile);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
            const receiptUrl = urlData.publicUrl;

            // 2. Upload Optional Driver Images
            let startUrl = null;
            let endUrl = null;

            if (claimType === 'Transport' && startFile && endFile) {
                const startPath = `receipts/${user.id}/start_${Date.now()}`;
                const endPath = `receipts/${user.id}/end_${Date.now()}`;

                await supabase.storage.from('receipts').upload(startPath, startFile);
                await supabase.storage.from('receipts').upload(endPath, endFile);

                const { data: sData } = supabase.storage.from('receipts').getPublicUrl(startPath);
                const { data: eData } = supabase.storage.from('receipts').getPublicUrl(endPath);
                startUrl = sData.publicUrl;
                endUrl = eData.publicUrl;
            }

            // 3. Create Claim Record
            const newClaim = {
                userId: user.id || user.uid,
                userName: user.email,
                type: claimType,
                amount: parseFloat(amount),
                description: claimType === 'Transport' ? `${description} (Dist: ${distance}km)` : description,
                status: 'Pending',
                timestamp: new Date().toISOString(),
                receiptUrl,
                // New Fields
                odometerStart: claimType === 'Transport' ? parseFloat(odometerStart) : null,
                odometerEnd: claimType === 'Transport' ? parseFloat(odometerEnd) : null,
                odometerStartImg: startUrl,
                odometerEndImg: endUrl,
                distance: claimType === 'Transport' ? parseFloat(distance) : 0
            };

            const { error: dbError } = await supabase
                .from('claims')
                .insert(newClaim);

            if (dbError) throw dbError;

            setIsModalOpen(false);
            setAmount('');
            setDescription('');
            setReceiptFile(null);
            alert("Claim Submitted Successfully!");
            fetchClaims(); // Refresh list immediately

        } catch (error: any) {
            console.error("Submission failed:", error);
            alert("Create Claim Failed: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <DollarSign className="text-green-500" />
                        {isAdmin ? 'Claims Management' : 'My Claims'}
                    </h1>
                    <p className="text-gray-400 mt-1">Submit and track expense reimbursements.</p>
                </div>
                <div className="flex gap-3">
                    {/* API Key Toggle - More Visible */}
                    <button
                        onClick={() => setShowKeyInput(!showKeyInput)}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-blue-400 px-3 py-2 rounded-lg transition-all border border-blue-500/30"
                        title="Configure Auto-Fill"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <span className="text-xs font-bold">AI Key</span>
                    </button>

                    {isAdmin && (
                        <div className="bg-gray-800 p-1 rounded-lg flex text-xs font-bold">
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'all' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Review All
                            </button>
                            <button
                                onClick={() => setViewMode('my')}
                                className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'my' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                My Claims
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/20 transition-all"
                    >
                        <Plus size={20} /> New Claim
                    </button>
                </div>
            </div>

            {/* API Key Modal/Input (Conditional) */}
            {showKeyInput && (
                <div className="bg-gray-800 p-4 rounded-xl border border-blue-500/30 mb-6 flex items-center gap-4 animate-fade-in">
                    <span className="text-sm font-bold text-blue-400 whitespace-nowrap">Google API Key:</span>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIza..."
                        className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500"
                    />
                    <button
                        onClick={handleSaveKey}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold"
                    >
                        Save
                    </button>
                </div>
            )}

            {/* Claims Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 font-bold uppercase">Pending</p>
                    <p className="text-2xl font-bold text-yellow-400">
                        RM {claims.filter(c => c.status === 'Pending').reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)}
                    </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 font-bold uppercase">Approved</p>
                    <p className="text-2xl font-bold text-green-400">
                        RM {claims.filter(c => c.status === 'Approved').reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)}
                    </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 font-bold uppercase">Total</p>
                    <p className="text-2xl font-bold text-white">
                        RM {claims.reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading claims...</div>
                ) : claims.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No claims found.</div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {claims.map(claim => (
                            <div key={claim.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-800 transition-colors gap-4">
                                <div className="flex items-center gap-4">
                                    <div onClick={() => window.open(claim.receiptUrl, '_blank')} className={`cursor-pointer p-3 rounded-full ${claim.type === 'Meal' ? 'bg-orange-500/20 text-orange-500' :
                                        claim.type === 'Transport' ? 'bg-blue-500/20 text-blue-500' :
                                            'bg-purple-500/20 text-purple-500'
                                        }`}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{claim.description}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                            {new Date(claim.timestamp).toLocaleDateString()} • {claim.type}
                                            {isAdmin && <span className="text-blue-400">• By {claim.userName || 'Unknown'}</span>}
                                        </p>
                                        {/* View Receipt Link */}
                                        {claim.receiptUrl && (
                                            <a href={claim.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-green-400 hover:underline mt-1 block">
                                                View Receipt Photo
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 justify-end">
                                    <div className="text-right">
                                        <p className="font-bold text-white text-lg">RM {Number(claim.amount).toFixed(2)}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase flex items-center justify-end gap-1 ${claim.status === 'Approved' ? 'text-green-400 bg-green-900/20' :
                                            claim.status === 'Rejected' ? 'text-red-400 bg-red-900/20' :
                                                'text-yellow-400 bg-yellow-900/20'
                                            }`}>
                                            {claim.status}
                                        </span>
                                    </div>

                                    {/* ADMIN ACTIONS */}
                                    {isAdmin && claim.status === 'Pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdateStatus(claim.id, 'Approved')}
                                                className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg" title="Approve">
                                                <CheckCircle size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(claim.id, 'Rejected')}
                                                className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg" title="Reject">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">New Claim</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                <select
                                    value={claimType}
                                    onChange={e => setClaimType(e.target.value as any)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-green-500"
                                >
                                    <option value="Meal">Meal Allowance</option>
                                    <option value="Transport">Transport / Petrol</option>
                                    <option value="Medical">Medical</option>
                                    <option value="Otba">Overtime (Backup)</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (RM)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-green-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <input
                                    type="text"
                                    required
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-green-500"
                                    placeholder="Dinner with client..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Receipt Photo {scanning && <span className="text-green-500 animate-pulse">(Analyzing...)</span>}</label>
                                <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center hover:border-green-500 transition-colors cursor-pointer relative bg-gray-900/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'receipt')}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Upload className="mx-auto text-gray-500 mb-2" />
                                    <p className="text-xs text-gray-400">{receiptFile ? 'Photo/Upload Selected' : 'Take Photo / Upload'}</p>
                                </div>
                            </div>

                            {/* DRIVER SPECIFIC FIELDS */}
                            {claimType === 'Transport' && (
                                <div className="space-y-4 bg-gray-700/30 p-4 rounded-xl border border-gray-600">
                                    <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Driver Trip Log
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Start ODO */}
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 mb-1">Start ODO (Photo)</label>
                                            <div className="relative border border-gray-600 rounded-lg p-2 text-center bg-gray-800">
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'start')} className="absolute inset-0 opacity-0 z-10" />
                                                <span className="text-xs text-blue-300">{startFile ? 'Captured' : '+ Photo'}</span>
                                            </div>
                                            <input
                                                type="number"
                                                value={odometerStart}
                                                onChange={e => setOdometerStart(e.target.value)}
                                                className="w-full bg-transparent border-b border-gray-600 text-white text-sm mt-2 focus:border-blue-500 outline-none"
                                                placeholder="00000"
                                            />
                                        </div>

                                        {/* End ODO */}
                                        <div>
                                            <label className="block text-[10px] uppercase text-gray-500 mb-1">End ODO (Photo)</label>
                                            <div className="relative border border-gray-600 rounded-lg p-2 text-center bg-gray-800">
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'end')} className="absolute inset-0 opacity-0 z-10" />
                                                <span className="text-xs text-blue-300">{endFile ? 'Captured' : '+ Photo'}</span>
                                            </div>
                                            <input
                                                type="number"
                                                value={odometerEnd}
                                                onChange={e => setOdometerEnd(e.target.value)}
                                                className="w-full bg-transparent border-b border-gray-600 text-white text-sm mt-2 focus:border-blue-500 outline-none"
                                                placeholder="00000"
                                            />
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Total Distance: <span className="text-white font-bold text-lg">{distance} km</span></p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold mt-4 shadow-lg ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {submitting ? 'Submitting...' : 'Submit Claim'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimsManagement;
