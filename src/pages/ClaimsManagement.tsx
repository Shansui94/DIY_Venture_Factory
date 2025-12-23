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

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('claims')
                .select('*')
                .eq('userId', user.id || user.uid) // Assuming userId stored matches auth id
                .order('timestamp', { ascending: false });

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

        const channel = supabase.channel('my-claims')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'claims', filter: `userId=eq.${user.id}` }, fetchClaims)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

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

    const scanImage = async (file: File, type: 'receipt' | 'odometer', field: string) => {
        setScanning(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', type);

        try {
            // Determine backend URL (Cloud Run or Local)
            const backendUrl = window.location.hostname === 'localhost'
                ? 'http://localhost:8080/api/analyze-image'
                : 'https://factory-voice-backend-874011854758.asia-southeast1.run.app/api/analyze-image';

            const res = await fetch(backendUrl, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Scan failed");

            const data = await res.json();
            console.log("Scan Result:", data);

            if (type === 'receipt') {
                if (data.amount) setAmount(data.amount.toString());
                if (data.merchant) setDescription(`${data.merchant} (${data.category || 'Expense'})`);
            } else if (type === 'odometer') {
                if (data.mileage) {
                    if (field === 'start') setOdometerStart(data.mileage.toString());
                    if (field === 'end') setOdometerEnd(data.mileage.toString());
                }
            }

        } catch (error) {
            console.error("AI Scan Error:", error);
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
                        My Claims
                    </h1>
                    <p className="text-gray-400 mt-1">Submit and track your expense reimbursements.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-green-500/20 transition-all"
                >
                    <Plus size={20} /> New Claim
                </button>
            </div>

            {/* Claims Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 font-bold uppercase">Pending</p>
                    <p className="text-2xl font-bold text-yellow-400">
                        RM {claims.filter(c => c.status === 'Pending').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                    </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 font-bold uppercase">Approved</p>
                    <p className="text-2xl font-bold text-green-400">
                        RM {claims.filter(c => c.status === 'Approved').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                    </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 font-bold uppercase">Total</p>
                    <p className="text-2xl font-bold text-white">
                        RM {claims.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading claims...</div>
                ) : claims.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No claims submitted yet.</div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {claims.map(claim => (
                            <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-gray-800 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${claim.type === 'Meal' ? 'bg-orange-500/20 text-orange-500' :
                                        claim.type === 'Transport' ? 'bg-blue-500/20 text-blue-500' :
                                            'bg-purple-500/20 text-purple-500'
                                        }`}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{claim.description}</h3>
                                        <p className="text-xs text-gray-500">{new Date(claim.timestamp).toLocaleDateString()} • {claim.type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white text-lg">RM {claim.amount.toFixed(2)}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase flex items-center justify-end gap-1 ${claim.status === 'Approved' ? 'text-green-400 bg-green-900/20' :
                                        claim.status === 'Rejected' ? 'text-red-400 bg-red-900/20' :
                                            'text-yellow-400 bg-yellow-900/20'
                                        }`}>
                                        {claim.status === 'Pending' && <Clock size={10} />}
                                        {claim.status === 'Approved' && <CheckCircle size={10} />}
                                        {claim.status === 'Rejected' && <AlertTriangle size={10} />}
                                        {claim.status}
                                    </span>
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
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Receipt Photo {scanning && <span className="text-green-500 animate-pulse">(Scanning...)</span>}</label>
                                <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center hover:border-green-500 transition-colors cursor-pointer relative bg-gray-900/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'receipt')}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Upload className="mx-auto text-gray-500 mb-2" />
                                    <p className="text-xs text-gray-400">{receiptFile ? 'File Selected (AI Scanned)' : 'Take Photo (Auto-Fill)'}</p>
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
