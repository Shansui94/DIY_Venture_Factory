
import { UserRole } from '../types';

// Local interface for Payroll Entry since it's currently mock data
interface PayrollEntry {
    id: number;
    employee: string;
    role: UserRole | string;
    hours: number;
    rate: number;
    total: number;
    status: 'Pending' | 'Paid';
}

const Payroll: React.FC = () => {
    // Mock Data for Demo
    const payrollData: PayrollEntry[] = [
        { id: 1, employee: 'John Doe', role: 'Operator', hours: 160, rate: 15.00, total: 2400.00, status: 'Pending' },
        { id: 2, employee: 'Jane Smith', role: 'Manager', hours: 160, rate: 25.00, total: 4000.00, status: 'Paid' },
        { id: 3, employee: 'Mike Lee', role: 'Operator', hours: 160, rate: 10.00, total: 1600.00, status: 'Pending' },
    ];

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">HR & Payroll Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-card p-6">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Total Employees</h3>
                    <p className="text-3xl font-bold text-white">24</p>
                    <span className="text-green-400 text-xs flex items-center gap-1 mt-2">
                        +2 this month
                    </span>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Payroll Status</h3>
                    <p className="text-3xl font-bold text-blue-400">Pending</p>
                    <span className="text-gray-500 text-xs flex items-center gap-1 mt-2">
                        Due in 5 days
                    </span>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Total Payroll (Est.)</h3>
                    <p className="text-3xl font-bold text-green-400">$42,500</p>
                    <span className="text-gray-500 text-xs flex items-center gap-1 mt-2">
                        Based on system records
                    </span>
                </div>
            </div>

            <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-white mb-4">Employee Payroll List</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700 text-sm">
                                <th className="p-3">Employee</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Hours Worked</th>
                                <th className="p-3">Rate/Hr</th>
                                <th className="p-3">Total Pay</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-300">
                            {payrollData.map((item) => (
                                <tr key={item.id} className="border-b border-gray-800 hover:bg-white/5">
                                    <td className="p-3 font-medium text-white">{item.employee}</td>
                                    <td className="p-3">
                                        <span className={`badge ${item.role === 'Manager' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'} px-2 py-1 rounded text-xs`}>
                                            {item.role}
                                        </span>
                                    </td>
                                    <td className="p-3">{item.hours} hrs</td>
                                    <td className="p-3">${item.rate.toFixed(2)}</td>
                                    <td className="p-3 font-bold text-white">${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="p-3">
                                        <span className={item.status === 'Paid' ? 'text-green-500' : 'text-yellow-500'}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        {item.status === 'Pending' ? (
                                            <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs shadow transition-colors">Process</button>
                                        ) : (
                                            <button className="text-gray-500 cursor-not-allowed px-3 py-1 text-xs">View</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Payroll;
