import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import JobOrders from './pages/JobOrders';
import ProductionLog from './pages/ProductionLog';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import ProductionControl from './pages/ProductionControl';
import ShiftCalendar from './pages/ShiftCalendar';
import SOP from './pages/SOP';
import Payroll from './pages/Payroll';
import MyProfile from './pages/MyProfile';
// import MachineCheckIn from './pages/MachineCheckIn'; // DISABLED: v2.6
import Dispatch from './pages/Dispatch';
import DriverDelivery from './pages/DriverDelivery';
import UserManagement from './pages/UserManagement';
import HRManagement from './pages/HRManagement';
import ClaimsManagement from './pages/ClaimsManagement';
import DeliveryOrderManagement from './pages/DeliveryOrderManagement';
import ProductionPlanning from './pages/ProductionPlanning';
import LiveStock from './pages/LiveStock';
import RecipeManager from './pages/RecipeManager';
import ProductLibrary from './pages/ProductLibrary';
import { User, UserRole, InventoryItem, ProductionLog as ProductionLogType, JobOrder, Shift } from './types';
import { VoiceCommand } from './components/VoiceCommand';
import { determineZone } from './utils/logistics';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';

// --- CONFIGURATION ---




function App() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [activePage, setActivePage] = useState<string>('dashboard');

    // Global State (Synced with Firestore)
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<ProductionLogType[]>([]);
    const [jobs, setJobs] = useState<JobOrder[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [shifts, setShifts] = useState<Shift[]>([]); // New: Dashboard needs all shifts

    // Attendance State
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [currentShift, setCurrentShift] = useState<Shift | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const [loadingAttendance, setLoadingAttendance] = useState<boolean>(true);

    // 0. Auth State Listener
    useEffect(() => {
        // Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        // Listen for Changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSession = async (session: Session | null) => {
        if (!session?.user) {
            setUser(null);
            setIsLoggedIn(false);
            return;
        }

        const currentUser = session.user;
        let role: UserRole = 'Operator';
        let status = 'Active';
        let name = currentUser.email?.split('@')[0] || 'User';
        let employeeId = undefined;

        try {
            // Fetch Public Profile
            const { data: profile } = await supabase
                .from('users_public')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (profile) {
                role = (profile.role as UserRole) || 'Operator';
                status = profile.status || 'Active';
                name = profile.name || name;
                employeeId = profile.employee_id;

                // --- SUPER ADMIN ENFORCEMENT ---
                if (employeeId === '001' || employeeId === '002') {
                    role = 'Admin';
                }
            } else {
                // Fallback for Demo / Legacy
                if (currentUser.email?.includes('admin')) { role = 'Admin'; status = 'Active'; }
                if (currentUser.email?.includes('driver')) { role = 'Driver'; status = 'Active'; }
                if (currentUser.email?.includes('boss')) { role = 'Manager'; status = 'Active'; }
                if (currentUser.email?.includes('operator')) { role = 'Operator'; status = 'Active'; }
            }

            // 🚨 FIX: Normalize legacy 'User' role to 'Operator'
            if (role === 'User' as any) role = 'Operator';

            // 🚨 FORCE ACTIVE FOR DEMO ACCOUNTS (Override DB) 🚨
            const demoKeywords = ['admin', 'driver', 'boss', 'operator', 'demo', 'test'];
            if (demoKeywords.some(k => currentUser.email?.includes(k))) {
                status = 'Active';
            }

            // CHECK STATUS
            if (status === 'Pending' || status === 'Rejected') {
                console.warn(`User status is ${status}. Signing out.`);
                await supabase.auth.signOut();
                setUser(null);
                setIsLoggedIn(false);
                alert(`Account is ${status}. Please contact Admin/HR.`);
                return;
            }

            setUser({
                email: currentUser.email || '',
                name: name,
                role: role,
                uid: currentUser.id,
                employeeId: employeeId,
                gps: 'Unknown',
                status: status as any,
                loginTime: new Date().toLocaleTimeString()
            });
            setIsLoggedIn(true);

            // Initial Routing (if needed, mostly handled by activePage default)
            if (!user) { // Only if not already logged in
                if (role === 'Operator') setActivePage('scanner');
                else if (role === 'Driver') setActivePage('delivery');
                else setActivePage('dashboard');
            }

        } catch (e) {
            console.error("Profile Fetch Error:", e);
        }
    };

    // 1. Subscribe to Firestore Data (or Load Mock Data)
    useEffect(() => {
        if (!user) return; // Only fetch data if logged in

        // DEMO/MOCK MODE: 
        // Enable for specific IDs, generic 'demo' emails, or Drivers (to simplify mobile testing)
        // Also includes 'test' in email
        // DEMO/MOCK MODE: DISABLED
        // We want to force real Supabase data for all users now.
        const isDemoUser = false;
        /* 
        const isDemoUser = user.uid === 'demo-123' ||
            user.role === 'Driver' ||
            user.email?.includes('demo') ||
            user.email?.includes('test'); 
        */

        if (isDemoUser) {
            console.log("Demo/Driver Mode: Loading Mock Data for:", user.email);
            setInventory([
                { Raw_Material_ID: 'RM-001', Material_Name: 'Resin A', Stock_Kg: 5000 },
                { Raw_Material_ID: 'RM-002', Material_Name: 'Pigment Red', Stock_Kg: 200 }
            ]);
            setJobs([
                {
                    Job_ID: 'JOB-101', customer: 'Tan Furniture', product: 'BW-50x1-CLR-2R', target: 500, produced: 500, status: 'Completed', machine: 'M01', Priority: 'High',
                    deliveryAddress: '123 Jalan Industri 5, Taiping', deliveryZone: 'North', deliveryStatus: 'Pending'
                },
                {
                    Job_ID: 'JOB-102', customer: 'KL Logistics', product: 'BW-33x1-BLK-3R', target: 200, produced: 200, status: 'Completed', machine: 'M02', Priority: 'Normal',
                    deliveryAddress: '88 Shah Alam Sek 15', deliveryZone: 'Central', deliveryStatus: 'In-Transit', driverId: 'driver-01' // Example assigned
                },
                {
                    Job_ID: 'JOB-103', customer: 'Johor Mart', product: 'BW-33x1-BLK-3R', target: 200, produced: 200, status: 'Completed', machine: 'M02', Priority: 'Normal',
                    deliveryAddress: 'JB Sentral', deliveryZone: 'South', deliveryStatus: 'Pending'
                },
                {
                    Job_ID: 'JOB-104', customer: 'Penang Tech', product: 'BW-50x1-CLR-2R', target: 100, produced: 20, status: 'Production', machine: 'M01', Priority: 'High',
                    deliveryAddress: 'Bayan Lepas FIZ', deliveryZone: 'North', deliveryStatus: 'Pending'
                }
            ]);
            return;
        }

        // --- SUPABASE MIGRATION: REALTIME DATA SYNC ---

        // 1. Inventory Sync
        const fetchInventory = async () => {
            const { data } = await supabase.from('items').select('*');
            if (data) {
                // Map Supabase -> Legacy Interface
                const mapped: InventoryItem[] = data.map(item => ({
                    Raw_Material_ID: item.sku,
                    Material_Name: item.name,
                    Stock_Kg: item.current_stock,
                    // Extra props for compatibility
                    id: item.id,
                    qty: item.current_stock,
                    name: item.name
                }));
                setInventory(mapped);
            }
        };
        fetchInventory();

        const invChannel = supabase.channel('inventory-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, fetchInventory)
            .subscribe();

        // 2. Logs Sync
        const fetchLogs = async () => {
            const { data } = await supabase.from('production_logs').select('*').order('timestamp', { ascending: false }).limit(100);
            if (data) {
                const mapped: ProductionLogType[] = data.map(log => ({
                    Log_ID: log.log_id,
                    Timestamp: log.timestamp,
                    Job_ID: log.job_id,
                    Operator_Email: log.operator_email,
                    Output_Qty: log.output_qty,
                    GPS_Coordinates: log.gps_coordinates || undefined,
                    Note: log.note || undefined,
                    AI_Verification: { Verified: log.verified, Detected_Rolls: log.detected_rolls || 0, Confidence: 'Supabase' }
                }));
                setLogs(mapped);
            }
        };
        fetchLogs();

        const logsChannel = supabase.channel('logs-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, fetchLogs)
            .subscribe();

        // 3. Jobs Sync
        const fetchJobs = async () => {
            const { data } = await supabase.from('job_orders').select('*').order('order_index', { ascending: true });
            if (data) {
                const mapped: JobOrder[] = data.map(job => ({
                    Job_ID: job.job_id,
                    id: job.job_id, // alias
                    customer: job.customer,
                    product: job.product,
                    target: job.target_qty,
                    produced: job.produced_qty,
                    status: job.status as any,
                    machine: job.machine,
                    Priority: job.priority as any,
                    deliveryZone: job.delivery_zone as any,
                    deliveryStatus: job.delivery_status as any,
                    deliveryAddress: job.delivery_address || undefined,
                    driverId: job.driver_id || undefined,
                    orderIndex: job.order_index
                }));
                setJobs(mapped);
            }
        };
        fetchJobs();

        const jobsChannel = supabase.channel('jobs-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, fetchJobs)
            .subscribe();

        return () => {
            supabase.removeChannel(invChannel);
            supabase.removeChannel(logsChannel);
            supabase.removeChannel(jobsChannel);
        };
    }, [user]);

    // 2. Attendance Listener (Supabase Realtime)
    // 2. Attendance Listener (Supabase Realtime) -> DISABLED v2.8 (Shift Disabled)
    // useEffect(() => {
    //     if (!user?.email) {
    //         setLoadingAttendance(false);
    //         return;
    //     }
    //
    //     const fetchShifts = async () => {
    //         const { data } = await supabase.from('shifts').select('*');
    //         if (data) {
    //             // Map to Shift Type
    //             const mappedShifts: Shift[] = data.map(s => ({
    //                 id: s.id,
    //                 User_Email: s.user_email,
    //                 Start_Time: s.start_time,
    //                 End_Time: s.end_time || undefined,
    //                 Status: s.status as 'Active' | 'Completed',
    //                 GPS_Start: s.gps_start || 'Unknown',
    //                 GPS_End: s.gps_end || 'Unknown',
    //                 Machine_ID: s.machine_id || 'Unknown'
    //             }));
    //             setShifts(mappedShifts);
    //
    //             const active = mappedShifts.find(s => s.User_Email === user.email && s.Status === 'Active');
    //             setCurrentShift(active || null);
    //             setLoadingAttendance(false);
    //         }
    //     };
    //
    //     fetchShifts();
    //
    //     const channel = supabase.channel('shifts-changes')
    //         .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, fetchShifts)
    //         .subscribe();
    //
    //     return () => {
    //         supabase.removeChannel(channel);
    //     };
    // }, [user]);

    const handleLogin = (email: string | null, gps: string, role: string) => {
        console.log("Login callback triggered", email, gps, role);
    };

    const handleClockIn = async (machineId?: string) => {
        if (!user) return;
        const timestamp = new Date().toISOString();

        try {
            const { error } = await supabase.from('shifts').insert({
                user_email: user.email,
                start_time: timestamp,
                status: 'Active',
                gps_start: user.gps || 'Unknown',
                machine_id: machineId || 'Unknown'
            });

            if (error) throw error;
        } catch (error: any) {
            console.error("Error clocking in:", error);
            alert("Clock In Failed: " + error.message);
        }
    };

    const handleClockOut = async () => {
        if (!currentShift) return;
        const timestamp = new Date().toISOString();
        try {
            const { error } = await supabase.from('shifts').update({
                end_time: timestamp,
                status: 'Completed',
                gps_end: user?.gps || 'Unknown'
            }).eq('id', currentShift.id);

            if (error) throw error;
        } catch (error: any) {
            console.error("Error clocking out:", error);
            alert("Clock Out Failed: " + error.message);
        }
    };

    // handleProductionSubmit removed (Moved to ProductionControl)

    const handleUpdateJob = async (jobId: string, updates: Partial<JobOrder>) => {
        try {
            // Map Legacy updates to Supabase Columns
            // We need to map camelCase back to snake_case
            const supaUpdates: any = {};
            if (updates.status) supaUpdates.status = updates.status;
            if (updates.produced !== undefined) supaUpdates.produced_qty = updates.produced;
            if (updates.driverId) supaUpdates.driver_id = updates.driverId;
            if (updates.deliveryStatus) supaUpdates.delivery_status = updates.deliveryStatus;

            // Safe update using job_id fetch key
            const { error } = await supabase.from('job_orders').update(supaUpdates).eq('job_id', jobId);

            if (error) throw error;
            // alert("Job Updated Successfully"); // Quiet update
        } catch (error: any) {
            console.error("Error updating job:", error);
            alert("Update Failed: " + error.message);
        }
    };

    // ... (existing imports)

    const handleCreateJob = async (newJobData: Partial<JobOrder>) => {
        const jobId = `JOB-${Date.now().toString().slice(-4)}`;
        // Determine Zone automatically if location/address is provided
        const address = newJobData.deliveryAddress || (newJobData as any).location || '';
        const autoZone = determineZone(address);

        const newJob = {
            job_id: jobId,
            customer: newJobData.customer || 'Unknown',
            product: newJobData.product || 'Unknown',
            target_qty: Number(newJobData.target) || 0,
            produced_qty: 0,
            status: 'Pending',
            machine: newJobData.machine || 'M01',
            priority: newJobData.Priority || 'Normal',
            delivery_zone: autoZone,
            delivery_status: 'Pending',
            order_index: 9999,
            created_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase.from('job_orders').insert(newJob);
            if (error) throw error;
        } catch (error) {
            console.error("Error creating job:", error);
            alert("Failed to create job");
        }
    };

    const handleReorderJobs = async (newJobOrder: JobOrder[]) => {
        // Optimistic Update
        setJobs(newJobOrder);

        // Persist to Supabase
        // Upsert approach: Update order_index for each modified job
        // Batching is harder in Supabase client directly without RPC, but we can parallelize or straightforward loop
        // For 50 items, 50 requests is okay.
        try {
            const updates = newJobOrder.map((job, index) =>
                supabase.from('job_orders').update({ order_index: index }).eq('job_id', job.Job_ID)
            );
            await Promise.all(updates);
            console.log("Job order updated in Supabase");
        } catch (error) {
            console.error("Error updating job order:", error);
        }
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    // Machine Check-In (DISABLED per user request "delete shift")
    // if (user?.role === 'Operator' && !loadingAttendance && !currentShift) {
    //     return <MachineCheckIn onCheckIn={handleClockIn} />;
    // }

    const renderContent = () => {
        switch (activePage) {
            case 'dashboard':
                return <Dashboard logs={logs} inventory={inventory} jobs={jobs} shifts={shifts} />;
            case 'sales':
                return <DeliveryOrderManagement />;
            case 'planning':
                return <ProductionPlanning />;
            case 'livestock':
                return <LiveStock />;
            case 'jobs':
                return <JobOrders jobs={jobs} onCreateJob={handleCreateJob} onReorderJobs={handleReorderJobs} />;
            case 'production':
                return <ProductionLog logs={logs} userRole={user?.role || 'Operator'} />;
            case 'inventory':
                return <Inventory inventory={inventory} />;
            case 'scanner':
                return <ProductionControl user={user as any} jobs={jobs} />;
            case 'recipes':
                return <RecipeManager />;
            case 'products':
                return <ProductLibrary />;
            case 'dispatch':
                return <Dispatch jobs={jobs} onUpdateJob={handleUpdateJob} />;
            case 'delivery':
                return <DriverDelivery user={user} />;
            case 'shift':
                return <ShiftCalendar
                    loginTime={user?.loginTime || ''}
                    currentShift={currentShift}
                    onClockIn={handleClockIn}
                    onClockOut={handleClockOut}
                    userRole={user?.role || 'Operator'}
                />;
            case 'sop':
                return <SOP />;
            case 'payroll':
                return <Payroll />;
            case 'claims':
                return <ClaimsManagement user={user} />;
            case 'hr':
                return <HRManagement />;
            case 'users':
                return <UserManagement currentUser={user} />;
            case 'profile':
                return <MyProfile user={user} />;
            default:
                // Default handling based on role if an unknown page is selected
                return user?.role === 'Operator' ? <ProductionControl user={user as any} jobs={jobs} />
                    : user?.role === 'Driver' ? <DriverDelivery user={user} />
                        : <Dashboard logs={logs} inventory={inventory} jobs={jobs} shifts={shifts} />;
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setIsLoggedIn(false);
            setActivePage('dashboard');
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <Layout activePage={activePage} setActivePage={setActivePage} userRole={user?.role} user={user} onLogout={handleLogout}>
            {/* DEBUG BANNER */}
            <div className="fixed top-0 left-0 right-0 bg-green-500 text-white text-xs py-1 px-4 text-center z-[9999] pointer-events-none opacity-80">
                v3.0.1: Build Restored (No Config)
            </div>
            {renderContent()}
            <VoiceCommand />
        </Layout >
    );
}

export default App;
