import React from 'react';
import {
    LayoutDashboard,
    ClipboardList,
    BarChart3,
    Box,
    LogOut,
    User,
    Users,
    Menu,
    X,
    Scan,
    CalendarClock,
    BookOpen,
    DollarSign,
    Truck,
    Package,
    FileCheck,
    FileText
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    activePage: string;
    setActivePage: (page: string) => void;
    userRole?: string; // Loose type to accommodate string | undefined from App
    user?: any;
    onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, userRole, user, onLogout }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const NavItem = ({ id, icon: Icon, label, roles }: { id: string, icon: any, label: string, roles?: string[] }) => {
        // Role check
        if (roles && userRole && !roles.includes(userRole)) return null;

        return (
            <button
                onClick={() => {
                    setActivePage(id);
                    setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activePage === id
                    ? 'bg-blue-600 shadow-lg shadow-blue-900/40 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
            >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-blue-500/30">
            {/* Mobile Header */}
            <div className="lg:hidden bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
                        V
                    </div>
                    <span className="font-bold text-lg tracking-tight">Venture Factory</span>
                </div>
                <button onClick={toggleMobileMenu} className="text-gray-300 hover:text-white">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <div className="flex h-screen overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className={`
                    fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <div className="h-full flex flex-col p-4 pt-20 lg:pt-4">
                        {/* Logo Area */}
                        <div className="hidden lg:flex items-center gap-3 px-2 mb-8 mt-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg">
                                V
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-tight">DIY Venture</h1>
                                <p className="text-xs text-gray-500">Factory OS v2.0</p>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                            <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-2">Operations</p>

                            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" roles={['Admin', 'Manager', 'Operator']} />
                            <NavItem id="sales" icon={Truck} label="Delivery Orders" roles={['Admin', 'Manager']} />
                            <NavItem id="planning" icon={Box} label="Planning Board" roles={['Admin', 'Manager']} />
                            <NavItem id="jobs" icon={ClipboardList} label="Job Orders" roles={['Operator', 'Admin', 'Manager']} />
                            <NavItem id="production" icon={BarChart3} label="Production Logs" roles={['Admin', 'Manager', 'Operator']} />
                            <NavItem id="inventory" icon={Box} label="Inventory" roles={['Admin', 'Manager', 'Operator']} />
                            <NavItem id="livestock" icon={BarChart3} label="Live Stock (Monitor)" roles={['Admin', 'Manager', 'Operator']} />
                            <NavItem id="scanner" icon={Scan} label="Production Control" roles={['Operator', 'Admin', 'Manager']} />
                            <NavItem id="recipes" icon={FileText} label="Recipes (BOM)" roles={['Admin', 'Manager']} />
                            <NavItem id="products" icon={Package} label="Product Library" roles={['Admin', 'Manager']} />

                            <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6">Logistics</p>
                            <NavItem id="dispatch" icon={Truck} label="Dispatch" roles={['Admin', 'Manager']} />
                            <NavItem id="delivery" icon={Package} label="My Delivery" roles={['Driver']} />

                            <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6">HR & Admin</p>
                            <NavItem id="shift" icon={CalendarClock} label="Shift & Attendance" roles={['Admin', 'Manager', 'Operator', 'Driver']} />
                            <NavItem id="payroll" icon={DollarSign} label="Payroll" roles={['Admin', 'Manager']} />
                            <NavItem id="claims" icon={FileCheck} label="My Claims" roles={['Admin', 'Manager', 'Operator', 'Driver']} />
                            <NavItem id="hr" icon={Users} label="HR Portal" roles={['Admin', 'Manager']} />
                            <NavItem id="users" icon={Users} label="User Management" roles={['Admin']} />
                            <NavItem id="sop" icon={BookOpen} label="SOP / Training" roles={['Operator', 'Driver']} />
                        </nav>

                        {/* User Profile & Logout */}
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <button
                                onClick={() => setActivePage('profile')}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-700 transition-colors mb-2 ${activePage === 'profile' ? 'bg-gray-700' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden border-2 border-gray-500">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={20} className="text-gray-300" />
                                    )}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{user?.name || 'User'}</p>
                                    <p className="text-xs text-blue-400 font-bold truncate border border-blue-500/30 rounded px-1 inline-block mt-1">
                                        Role: {userRole || 'None'}
                                    </p>
                                </div>
                            </button>

                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-2 p-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors font-bold text-sm"
                            >
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-gray-900 relative">
                    {/* Overlay for mobile sidebar */}
                    {isMobileMenuOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    )}

                    <div className="p-4 lg:p-8 max-w-7xl mx-auto min-h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
