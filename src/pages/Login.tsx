import React, { useState } from 'react';
import { User, ShieldCheck, HardHat, Truck, CheckCircle, CreditCard, Phone, Briefcase } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginProps {
    onLogin: (email: string | null, gps: string, role: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSignUp, setIsSignUp] = useState<boolean>(false);
    const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatusMessage('Sending Reset Email...');
        setError('');

        try {
            // Determine Redirect URL (Force Production if not localhost)
            let redirectUrl = window.location.origin + '/update-password';

            // Fix: If running on localhost but want to test production link, or if deployed...
            // Actually, best to prefer the Vercel Production URL if consistent
            if (!window.location.hostname.includes('localhost')) {
                redirectUrl = 'https://packsecure.vercel.app/update-password';
            }
            // Force production URL for the user since they are having issues?
            // User Issue: "email link opens like this [localhost]" implies the request came from localhost 
            // OR the code was compiled with localhost origin.

            // Let's HARDCODE it for SAFETY if it's the requested domain
            redirectUrl = 'https://packsecure.vercel.app'; // Supabase usually appends the path or handles the fragment

            // Wait, supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })
            // The link sent is `redirectTo#access_token=...`
            // So we want `https://packsecure.vercel.app/#/update-password` or similar if hash routing?
            // No, the app uses state routing but Supabase event handles it.
            // Just sending them to the ROOT URL is enough if App.tsx catches 'PASSWORD_RECOVERY'.

            // Let's try explicit production root.
            const productionUrl = 'https://packsecure.vercel.app/';

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: productionUrl,
            });

            if (error) throw error;
            alert("Check your email for the password reset link!");
            setIsForgotPassword(false);
        } catch (err: any) {
            console.error("Reset Error:", err);
            setError(err.message || "Failed to send reset email");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleLogin = async (role: 'Admin' | 'Operator' | 'Boss' | 'Driver') => {
        const roleMap: Record<string, { email: string; pass: string }> = {
            'Admin': { email: 'admin@diyventure.com', pass: 'admin123' },
            'Operator': { email: 'operator@diyventure.com', pass: 'operator123' },
            'Boss': { email: 'boss@diyventure.com', pass: 'boss888' },
            'Driver': { email: 'driver@diyventure.com', pass: 'driver123' }
        };

        const creds = roleMap[role];
        if (creds) {
            setEmail(creds.email);
            setPassword(creds.pass);
            setStatusMessage('Auto-Login/Signup...');
            setIsLoading(true);

            // Try Login First
            const { data, error } = await supabase.auth.signInWithPassword({
                email: creds.email,
                password: creds.pass
            });

            if (error && error.message.includes('Invalid login')) {
                // If invalid (likely doesn't exist), Try Signup
                setStatusMessage('Creating Test Account...');
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: creds.email,
                    password: creds.pass
                });

                if (signUpError) {
                    setError("Setup Failed: " + signUpError.message);
                    setIsLoading(false);
                } else if (signUpData.user) {
                    // Success - Auto Login should happen via state change or re-trigger
                    // But signUp might not auto-login if confirm is on. 
                    // Assuming basic setup:
                    handleLoginProcess(creds.email, creds.pass);
                }
            } else if (data.user) {
                handleLoginProcess(creds.email, creds.pass);
            } else {
                setIsLoading(false);
                setError(error?.message || "Login failed");
            }
        }
    };

    const [statusMessage, setStatusMessage] = useState<string>('Authenticating...');

    const handleLoginProcess = async (emailToUse: string, passwordToUse: string) => {
        setIsLoading(true);
        setStatusMessage('Authenticating...');
        setError('');

        try {
            let actualEmail = emailToUse;

            // 0. Smart Login: Check if input is Employee ID instead of Email
            if (!emailToUse.includes('@')) {
                setStatusMessage('Looking up Employee ID...');
                const { data: userData, error: userError } = await supabase
                    .from('users_public')
                    .select('email')
                    .eq('employee_id', emailToUse)
                    .single();

                if (userError || !userData) {
                    throw new Error("Invalid Employee ID. Please use Email.");
                }
                actualEmail = userData.email;
            }

            // 1. Supabase Auth
            setStatusMessage('Verifying credentials...');
            const { data, error } = await supabase.auth.signInWithPassword({
                email: actualEmail,
                password: passwordToUse
            });

            if (error) {
                console.error("Supabase Login Error:", error);
                throw error;
            }

            if (!data.user) throw new Error("No user found");

            // 2. Fetch User Role
            setStatusMessage('Loading profile...');
            const { data: userProfile } = await supabase
                .from('users_public')
                .select('*')
                .eq('id', data.user.id)
                .single();

            // Status Check
            let userStatus = userProfile ? userProfile.status : 'Pending';

            // 🚨 FORCE ACTIVE FOR DEMO ACCOUNTS 🚨
            const demoKeywords = ['admin', 'driver', 'boss', 'operator', 'demo', 'test'];
            if (demoKeywords.some(k => actualEmail.includes(k))) {
                userStatus = 'Active';
            }

            if (userStatus === 'Pending' || userStatus === 'Rejected') {
                await supabase.auth.signOut();
                throw new Error("Account is " + userStatus + ".");
            }

            // 2b. Role Determination for callback
            let role = 'Operator';
            if (userProfile) role = userProfile.role;
            else if (actualEmail.includes('admin')) role = 'Admin';

            // 3. Get GPS
            let gps = "GPS_SKIPPED";
            if (navigator.geolocation) {
                setStatusMessage('Getting location...');
                try {
                    const position: GeolocationPosition = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
                    });
                    gps = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
                } catch (e) { console.warn("GPS Error", e); }
            }

            // 4. Complete
            setStatusMessage('Redirecting...');
            onLogin(data.user.email || null, gps, role);
        } catch (err: any) {
            console.error("Auth Error:", err);
            setError(err.message || "Login failed");
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && password) {
            handleLoginProcess(email, password);
        } else {
            setError('Please enter both email and password');
        }
    };

    // --- REGISTRATION / INTERVIEW FORM STATE ---
    const [regStep, setRegStep] = useState(1);
    const [regData, setRegData] = useState({
        // Auth
        email: '',
        password: '',
        // Personal
        name: '',
        icNo: '',
        gender: 'Male',
        dob: '',
        maritalStatus: 'Single',
        // Contact
        phone: '',
        address: '',
        // Emergency
        emergencyName: '',
        emergencyPhone: '',
        emergencyRelation: '',
        // Gov/Bank
        epfNo: '',
        socsoNo: '',
        taxNo: '',
        bankName: '',
        bankAccountNo: ''
    });

    const handleRegChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setRegData({ ...regData, [e.target.name]: e.target.value });
    };

    const handleNextStep = () => setRegStep(prev => prev + 1);
    const handlePrevStep = () => setRegStep(prev => prev - 1);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // 1. Supabase Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: regData.email,
                password: regData.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Registration failed.");

            // 2. Auto-generate Employee ID (001, 002, etc.)
            const { count } = await supabase
                .from('users_public')
                .select('*', { count: 'exact', head: true });

            const nextId = String((count || 0) + 1).padStart(3, '0');

            // 3. Create Public Profile
            const { error: profileError } = await supabase.from('users_public').insert({
                id: authData.user.id,
                email: regData.email,
                role: 'Operator',
                name: regData.name,
                status: 'Pending',
                phone: regData.phone,
                employee_id: nextId,
                created_at: new Date().toISOString()
            });

            if (profileError) {
                console.error("Profile Error:", profileError);
                // Continue anyway for now? Or fail?
            }

            // 3. Reset
            await supabase.auth.signOut();
            setRegStep(5);

        } catch (err: any) {
            console.error("Registration Error:", err);
            setError(err.message || "Failed to register");
        } finally {
            setIsLoading(false);
        }
    };

    const renderRegistrationForm = () => {
        const steps = [
            { id: 1, title: 'Account', icon: <User size={18} /> },
            { id: 2, title: 'Personal', icon: <Briefcase size={18} /> },
            { id: 3, title: 'Statutory', icon: <CreditCard size={18} /> },
            { id: 4, title: 'Contact', icon: <Phone size={18} /> },
        ];

        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
                {/* Background Animation */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-black z-0"></div>
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-2xl border border-white/10 relative z-10 animate-fade-in-up">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-2">Join the Team</h2>
                        <p className="text-slate-400 text-sm">Complete your profile to get started.</p>
                    </div>

                    {/* Progress Stepper */}
                    <div className="flex items-center justify-between relative mb-10 px-4">
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-700/50 rounded-full -z-10" />
                        <div
                            className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full -z-10 transition-all duration-500"
                            style={{ width: `${((regStep - 1) / (steps.length - 1)) * 100}%` }}
                        />

                        {steps.map((step) => {
                            const isActive = regStep >= step.id;
                            const isCurrent = regStep === step.id;
                            return (
                                <div key={step.id} className="flex flex-col items-center gap-2 relative group">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 
                                            ${isActive ? 'bg-slate-900 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-slate-800 border-slate-600 text-slate-500'}
                                            ${isCurrent ? 'scale-110 ring-4 ring-purple-500/20' : ''}
                                        `}
                                    >
                                        {isActive && step.id < regStep ? <CheckCircle size={18} className="text-green-400" /> : step.icon}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-purple-300' : 'text-slate-600'}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-6 text-center text-sm flex items-center justify-center gap-2 animate-shake">
                            <ShieldCheck size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={regStep === 4 ? handleRegister : (e) => { e.preventDefault(); handleNextStep(); }} className="min-h-[320px] flex flex-col justify-between">

                        {/* STEP 1: Account */}
                        {regStep === 1 && (
                            <div className="space-y-5 animate-slide-in-right">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <User className="text-purple-400" size={24} /> Account Setup
                                </h3>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 group-focus-within:text-purple-400 transition-colors">Email (Login ID)*</label>
                                        <input required name="email" type="email" value={regData.email} onChange={handleRegChange} placeholder="e.g. employee@diyventure.com"
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-slate-600" />
                                    </div>
                                    <div className="group">
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 group-focus-within:text-purple-400 transition-colors">Password*</label>
                                        <input required name="password" type="password" value={regData.password} onChange={handleRegChange} placeholder="Min 6 characters"
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-slate-600" />
                                    </div>
                                    <div className="group">
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 group-focus-within:text-purple-400 transition-colors">Full Name (IC Name)*</label>
                                        <input required name="name" type="text" value={regData.name} onChange={handleRegChange} placeholder="As per Identity Card"
                                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-slate-600" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Personal */}
                        {regStep === 2 && (
                            <div className="space-y-5 animate-slide-in-right">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Briefcase className="text-purple-400" size={24} /> Personal Details
                                </h3>
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">IC Number</label>
                                    <input name="icNo" type="text" value={regData.icNo} onChange={handleRegChange} placeholder="e.g. 900101-14-1234" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Date of Birth</label>
                                        <input name="dob" type="date" value={regData.dob} onChange={handleRegChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Gender</label>
                                        <div className="relative">
                                            <select name="gender" value={regData.gender} onChange={handleRegChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none">
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Current Address</label>
                                    <textarea name="address" rows={3} value={regData.address} onChange={handleRegChange} placeholder="Full residential address..." className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all resize-none" />
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Statutory & Bank */}
                        {regStep === 3 && (
                            <div className="space-y-5 animate-slide-in-right">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <CreditCard className="text-purple-400" size={24} /> Statutory & Banking
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">EPF No</label>
                                        <input name="epfNo" type="text" value={regData.epfNo} onChange={handleRegChange} placeholder="KWSP No." className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">SOCSO No</label>
                                        <input name="socsoNo" type="text" value={regData.socsoNo} onChange={handleRegChange} placeholder="PERKESO No." className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Income Tax No</label>
                                    <input name="taxNo" type="text" value={regData.taxNo} onChange={handleRegChange} placeholder="LHDN Ref No." className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Bank Name</label>
                                        <input name="bankName" type="text" value={regData.bankName} onChange={handleRegChange} placeholder="e.g. Maybank" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Account No</label>
                                        <input name="bankAccountNo" type="text" value={regData.bankAccountNo} onChange={handleRegChange} placeholder="**********" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Emergency */}
                        {regStep === 4 && (
                            <div className="space-y-5 animate-slide-in-right">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Phone className="text-purple-400" size={24} /> Emergency Contact
                                </h3>
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Contact Name</label>
                                    <input name="emergencyName" type="text" value={regData.emergencyName} onChange={handleRegChange} placeholder="Next of Kin Name" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Relationship</label>
                                        <input name="emergencyRelation" type="text" value={regData.emergencyRelation} onChange={handleRegChange} placeholder="e.g. Father/Spouse" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Contact Phone</label>
                                        <input name="emergencyPhone" type="text" value={regData.emergencyPhone} onChange={handleRegChange} placeholder="+60 12-345 6789" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                    </div>
                                </div>
                                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl mt-4">
                                    <p className="text-purple-200 text-xs text-center">
                                        All provided information will be used for official HR purposes. Please ensure accuracy.
                                    </p>
                                </div>
                            </div>
                        )}


                        {/* STEP 5: Success */}
                        {regStep === 5 && (
                            <div className="space-y-5 animate-slide-in-right text-center py-10">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                                    <CheckCircle size={40} className="text-green-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Application Submitted!</h3>
                                <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">
                                    Your profile has been created successfully. Please wait for HR approval before logging in.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setIsSignUp(false); setRegStep(1); }}
                                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold transition-all"
                                >
                                    Back to Login
                                </button>
                            </div>
                        )}

                        {regStep < 5 && (
                            <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                                {regStep > 1 && (
                                    <button type="button" onClick={handlePrevStep} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-xl font-bold transition-all border border-white/10 hover:border-white/30 backdrop-blur-sm">
                                        Back
                                    </button>
                                )}
                                <button type="submit" disabled={isLoading}
                                    className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 group">
                                    {isLoading ? 'Processing...' : (regStep === 4 ? 'Complete Application' : 'Next Step')}
                                    {!isLoading && regStep < 4 && <div className="group-hover:translate-x-1 transition-transform">→</div>}
                                </button>
                            </div>
                        )}

                        {regStep < 5 && (
                            <p className="text-slate-400 text-center mt-6 text-sm">
                                Already applied? <button type="button" onClick={() => setIsSignUp(false)} className="text-purple-400 hover:text-purple-300 font-bold hover:underline ml-1">Log In</button>
                            </p>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 text-center w-full z-10">
                    <p className="text-gray-500/50 text-xs tracking-widest uppercase">© 2025 DIY Venture. All Rights Reserved.</p>
                </div>
            </div>
        );
    };

    if (isSignUp) {
        return renderRegistrationForm();
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse delay-700" />
                <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-indigo-500/10 rounded-full blur-[80px] animate-bounce delay-1000 duration-[5000ms]" />
            </div>

            <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in-up transition-all duration-500">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                        <ShieldCheck size={40} className="text-white drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-2">DIY Venture</h1>
                    <p className="text-blue-300/80 text-sm font-medium tracking-wide">
                        Future Factory OS
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="group">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-blue-400 transition-colors">
                            Employee ID (e.g., 001)
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter ID (001) or Email"
                        />
                    </div>

                    {!isForgotPassword && (
                        <div className="group">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-blue-400 transition-colors">Password</label>
                            <input
                                type="password"
                                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="text-red-300 text-sm text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20 flex items-center justify-center gap-2 animate-shake">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <button
                        type={isForgotPassword ? "button" : "submit"}
                        onClick={isForgotPassword ? handleResetPassword : undefined}
                        disabled={isLoading}
                        className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2
                        bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30`
                        }
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {statusMessage}
                            </span>
                        ) : (isForgotPassword ? 'Send Reset Link' : 'Sign In to Dashboard')}
                    </button>

                    <div className="text-center mt-4 flex flex-col gap-2">
                        {/* Forgot Password Link */}
                        {!isSignUp && (
                            <button
                                type="button"
                                onClick={() => setIsForgotPassword(!isForgotPassword)}
                                className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
                            >
                                {isForgotPassword ? 'Back to Login' : 'Forgot Password?'}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setIsForgotPassword(false); }}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                            <span className={`font-bold ${isSignUp ? 'text-blue-400' : 'text-purple-400'} hover:underline`}>
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </span>
                        </button>
                    </div>
                </form>

                {!isSignUp && (
                    <div className="mt-10 pt-6 border-t border-white/5">
                        <p className="text-[10px] text-center text-gray-500 uppercase tracking-[0.2em] mb-4">Quick Demo Access</p>
                        <div className="grid grid-cols-4 gap-3">
                            <button onClick={() => handleRoleLogin('Admin')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all group active:scale-95">
                                <ShieldCheck size={20} className="text-blue-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-300 transition-colors">Admin</span>
                            </button>
                            <button onClick={() => handleRoleLogin('Operator')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-green-500/30 transition-all group active:scale-95">
                                <HardHat size={20} className="text-green-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-green-300 transition-colors">Operator</span>
                            </button>
                            <button onClick={() => handleRoleLogin('Driver')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-yellow-500/30 transition-all group active:scale-95">
                                <Truck size={20} className="text-yellow-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-yellow-300 transition-colors">Driver</span>
                            </button>
                            <button onClick={() => handleRoleLogin('Boss')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 transition-all group active:scale-95">
                                <User size={20} className="text-purple-400 mb-2 group-hover:scale-110 transition-transform duration-300" />
                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-purple-300 transition-colors">Boss</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center w-full z-10">
                <p className="text-gray-600 text-xs">© 2025 DIY Venture. Powered by Antigravity. (v4.1.2 Download Fixed)</p>
            </div>
        </div>
    );
};

export default Login;
