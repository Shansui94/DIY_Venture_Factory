import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ClipboardCheck, UserPlus, CheckCircle, LayoutDashboard, FileText } from "lucide-react";
import { User as UserType, Claim } from '../types';

const HRManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'applicants' | 'employees' | 'claims'>('applicants');
    const [applicants, setApplicants] = useState<UserType[]>([]);
    const [employees, setEmployees] = useState<UserType[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'applicants') {
                const { data } = await supabase
                    .from('users_public')
                    .select('*')
                    .eq('status', 'Pending');

                if (data) {
                    const mapped: UserType[] = data.map(u => ({
                        id: u.id,
                        uid: u.id,
                        email: u.email,
                        role: u.role as any,
                        name: u.name,
                        phone: u.phone,
                        status: u.status as any,
                        createdAt: u.created_at,
                        // Add extra fields if needed and available in DB schema or Types
                        // For now mapping minimal required for UI
                        employeeId: u.employee_id
                    }));
                    setApplicants(mapped);
                    setApplicants(mapped);
                }
            } else if (activeTab === 'claims') {
                const { data } = await supabase
                    .from('claims')
                    .select('*')
                    .eq('status', 'Pending')
                    .order('timestamp', { ascending: false });

                if (data) setClaims(data as Claim[]);
            } else {
                // Fetch active employees
                // The original code checked 'Active'


                // Let's retry strict active
                const { data: activeData } = await supabase
                    .from('users_public')
                    .select('*')
                    .eq('status', 'Active');

                if (activeData) {
                    const mapped: UserType[] = activeData.map(u => ({
                        id: u.id,
                        uid: u.id,
                        email: u.email,
                        role: u.role as any,
                        name: u.name,
                        phone: u.phone,
                        status: u.status as any,
                        employeeId: u.employee_id,
                        createdAt: u.created_at
                    }));

                    // Filter those with ID
                    const withId = mapped.filter(u => u.employeeId);
                    // Sort
                    withId.sort((a, b) => (Number(a.employeeId) || 0) - (Number(b.employeeId) || 0));
                    setEmployees(withId);
                }
            }
        } catch (error) {
            console.error("Error fetching HR data:", error);
        }
        setIsLoading(false);
    };

    const handleApprove = async (userId: string) => {
        setProcessingId(userId);
        try {
            // 1. Fetch Target Applicant Data
            const { data: applicantData } = await supabase
                .from('users_public')
                .select('*')
                .eq('id', userId)
                .single();

            if (!applicantData) throw new Error("Applicant not found");
            const applicantEmail = applicantData.email?.toLowerCase();

            // 2. Scan Existing Users for ID usage
            const { data: allUsers } = await supabase
                .from('users_public')
                .select('employee_id');

            const usedIds = new Set<string>();
            let maxId = 0;

            if (allUsers) {
                allUsers.forEach(u => {
                    if (u.employee_id) {
                        usedIds.add(u.employee_id);
                        if (!isNaN(Number(u.employee_id))) {
                            maxId = Math.max(maxId, Number(u.employee_id));
                        }
                    }
                });
            }

            // 3. Determine Next ID (Logic Ported from Previous)
            let nextId = '';

            // Rule A: Specific Email -> 002
            if (applicantEmail === 'khailoon94@gmail.com') {
                nextId = '002';
                if (usedIds.has('002')) {
                    alert("Warning: ID 002 is already taken! Proceeding to overwrite/assign anyway.");
                }
            }
            // Rule B: First User / Boss -> 001 (If not taken)
            else if (!usedIds.has('001')) {
                nextId = '001';
            }
            // Rule C: Standard Assignment
            else {
                if (maxId < 7) {
                    nextId = '008'; // Reserve 003-007
                } else {
                    nextId = String(maxId + 1).padStart(3, '0');
                }
            }

            console.log(`Assigning ID ${nextId} to ${applicantEmail}`);

            // 4. Update User Doc
            const { data: updatedData, error: updateError } = await supabase
                .from('users_public')
                .update({
                    status: 'Active',
                    employee_id: nextId,
                    // joined_date: new Date().toISOString() // Assuming schema has joined_date or created_at is sufficient
                })
                .eq('id', userId)
                .select(); // Select to check if update actually happened

            if (updateError) throw updateError;
            if (!updatedData || updatedData.length === 0) {
                throw new Error("Update failed. You might not have permission/RLS policy to update this user.");
            }

            // 5. Refresh
            // Optimistic Update: Remove from UI immediately
            setApplicants(prev => prev.filter(app => app.id !== userId && app.uid !== userId));

            // Background refresh to be safe
            fetchData();
            alert(`Employee Approved! Assigned ID: ${nextId}`);

        } catch (error: any) {
            console.error("Error approving user:", error);
            alert("Failed to approve user: " + error.message);
        }
        setProcessingId(null);
    }

    const handleApproveClaim = async (claim: Claim) => {
        if (!confirm(`Approve claim for RM ${claim.amount}? This will add to user's payroll.`)) return;
        setProcessingId(claim.id);

        try {
            // 1. Update Claim Status
            const { error: claimError } = await supabase
                .from('claims')
                .update({ status: 'Approved' })
                .eq('id', claim.id);
            if (claimError) throw claimError;

            // 2. Update/Create Payroll Entry
            const today = new Date();
            const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

            // Check existing payroll
            const { data: existingPayroll } = await supabase
                .from('payroll')
                .select('*')
                .eq('userId', claim.userId)
                .eq('month', monthStr)
                .maybeSingle();

            if (existingPayroll) {
                // Update
                const newTotal = (existingPayroll.claimsTotal || 0) + claim.amount;
                await supabase.from('payroll').update({
                    claimsTotal: newTotal,
                    // netSalary triggers DB compute or we update manually if simple
                    // For now assuming simple:
                    // total: ...
                }).eq('id', existingPayroll.id);
            } else {
                // Create New
                await supabase.from('payroll').insert({
                    month: monthStr,
                    userId: claim.userId,
                    userName: claim.userName,
                    baseSalary: 1500, // Default constant or fetch from profile
                    claimsTotal: claim.amount,
                    status: 'Pending'
                });
            }

            alert("Claim Approved & Payroll Updated!");
            fetchData();

        } catch (error: any) {
            console.error("Claim Approval Error:", error);
            alert("Error: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const [selectedApplicant, setSelectedApplicant] = useState<UserType | null>(null);

    return (
        <div className="p-6 bg-slate-900 min-h-screen text-white relative animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-purple-500/20 p-3 rounded-xl border border-purple-500/30">
                    <UserPlus size={32} className="text-purple-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        HR Portal
                    </h1>
                    <p className="text-slate-400">Manage Applications & Onboarding</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-slate-700 pb-2">
                <button
                    onClick={() => setActiveTab('applicants')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'applicants'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                        : 'text-slate-400 hover:bg-slate-800'
                        }`}
                >
                    <ClipboardCheck size={18} />
                    Applicants
                    {applicants.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {applicants.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'employees'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                        : 'text-slate-400 hover:bg-slate-800'
                        }`}
                >
                    <LayoutDashboard size={18} />
                    Active Employees
                </button>
                <button
                    onClick={() => setActiveTab('claims')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'claims'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                        : 'text-slate-400 hover:bg-slate-800'
                        }`}
                >
                    <FileText size={18} />
                    Claims Review
                    {claims.length > 0 && (
                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {claims.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTab === 'claims' ? (
                        claims.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                                <p>No pending claims to review.</p>
                            </div>
                        ) : (
                            claims.map(claim => (
                                <div key={claim.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{claim.userName}</h3>
                                            <p className="text-slate-400 text-xs">{new Date(claim.timestamp).toLocaleDateString()} • {claim.type}</p>
                                        </div>
                                        <span className="text-xl font-bold text-green-400">RM {claim.amount.toFixed(2)}</span>
                                    </div>

                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                        <p className="text-sm text-slate-300 italic">"{claim.description}"</p>

                                        {/* Driver Odometer Data */}
                                        {claim.type === 'Transport' && claim.distance && (
                                            <div className="mt-2 text-xs grid grid-cols-2 gap-2 border-t border-slate-700 pt-2">
                                                <div>
                                                    <span className="text-slate-500 block">Distance</span>
                                                    <span className="text-blue-400 font-bold">{claim.distance} km</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Efficiency</span>
                                                    {/* Simple calc just for display */}
                                                    <span className="text-blue-400 font-bold">{(claim.amount / (claim.distance || 1)).toFixed(2)} RM/km</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-auto">
                                        <a
                                            href={claim.receiptUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 py-2 text-center rounded-lg border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-colors"
                                        >
                                            View Photo
                                        </a>
                                        <button
                                            onClick={() => handleApproveClaim(claim)}
                                            disabled={!!processingId}
                                            className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-900/20"
                                        >
                                            {processingId === claim.id ? 'Saving...' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )
                    ) : activeTab === 'applicants' ? (
                        applicants.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                                <p>No pending applications</p>
                            </div>
                        ) : (
                            applicants.map(app => (
                                <div key={app.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all flex flex-col justify-between">
                                    <div className="mb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-white">{app.name || 'Unknown'}</h3>
                                            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded border border-yellow-500/30">
                                                Pending
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-1">{app.email}</p>
                                        <p className="text-slate-500 text-xs mb-4">Applied: {new Date(app.createdAt || '').toLocaleDateString()}</p>

                                        <button
                                            onClick={() => setSelectedApplicant(app)}
                                            className="text-purple-400 text-sm hover:text-purple-300 underline mb-4 block"
                                        >
                                            View Full Profile
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleApprove(app.id || app.uid)}
                                        disabled={!!processingId}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-2 rounded-lg shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {processingId === app.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            <>
                                                <CheckCircle size={18} className="group-hover:scale-110 transition-transform" />
                                                Approve
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))
                        )
                    ) : (
                        employees.map(emp => (
                            <div key={emp.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800" onClick={() => setSelectedApplicant(emp)}>
                                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center font-mono text-xl text-purple-400 font-bold border border-slate-600">
                                    {emp.employeeId}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{emp.name}</h4>
                                    <p className="text-xs text-slate-400">{emp.role} • {emp.email}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* APPLICANT DETAILS MODAL */}
            {selectedApplicant && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedApplicant.name}</h2>
                                <p className="text-slate-400 text-sm">{selectedApplicant.email}</p>
                            </div>
                            <button onClick={() => setSelectedApplicant(null)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Personal */}
                            <section>
                                <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-3 border-b border-purple-500/20 pb-1">Personal Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500 block">IC Number</span> <span className="text-white">{selectedApplicant.icNo || '-'}</span></div>
                                    <div><span className="text-slate-500 block">Date of Birth</span> <span className="text-white">{selectedApplicant.dob || '-'}</span></div>
                                    <div><span className="text-slate-500 block">Gender</span> <span className="text-white">{selectedApplicant.gender || '-'}</span></div>
                                    <div><span className="text-slate-500 block">Marital Status</span> <span className="text-white">{selectedApplicant.maritalStatus || '-'}</span></div>
                                </div>
                            </section>

                            {/* Contact */}
                            <section>
                                <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-3 border-b border-purple-500/20 pb-1">Contact Info</h3>
                                <div className="space-y-2 text-sm">
                                    <div><span className="text-slate-500 block">Address</span> <span className="text-white">{selectedApplicant.address || '-'}</span></div>
                                    <div><span className="text-slate-500 block">Phone</span> <span className="text-white">{selectedApplicant.phone || '-'}</span></div>
                                </div>
                            </section>

                            {/* Statutory & Bank */}
                            <section>
                                <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-3 border-b border-purple-500/20 pb-1">Gov & Banking</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500 block">EPF (KWSP)</span> <span className="text-white">{selectedApplicant.epfNo || '-'}</span></div>
                                    <div><span className="text-slate-500 block">SOCSO</span> <span className="text-white">{selectedApplicant.socsoNo || '-'}</span></div>
                                    <div><span className="text-slate-500 block">Income Tax</span> <span className="text-white">{selectedApplicant.taxNo || '-'}</span></div>
                                    <div><span className="text-slate-500 block">Bank Info</span> <span className="text-white">{selectedApplicant.bankName} - {selectedApplicant.bankAccountNo}</span></div>
                                </div>
                            </section>

                            {/* Emergency */}
                            <section>
                                <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-3 border-b border-purple-500/20 pb-1">Emergency Contact</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500 block">Name</span> <span className="text-white">{selectedApplicant.emergencyName || '-'}</span></div>
                                    <div><span className="text-slate-500 block">Relationship</span> <span className="text-white">{selectedApplicant.emergencyRelation || '-'}</span></div>
                                    <div><span className="text-slate-500 block">Phone</span> <span className="text-white">{selectedApplicant.emergencyPhone || '-'}</span></div>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3 sticky bottom-0">
                            <button onClick={() => setSelectedApplicant(null)} className="px-5 py-2 text-slate-300 font-medium hover:text-white">Close</button>
                            {selectedApplicant.status === 'Pending' && (
                                <button
                                    onClick={() => { handleApprove(selectedApplicant.uid || selectedApplicant.id || ''); setSelectedApplicant(null); }}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-600/20"
                                >
                                    Approve Application
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRManagement;
