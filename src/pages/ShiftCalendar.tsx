import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle, UserPlus, XCircle, Clock } from 'lucide-react';
import { Shift, UserRole } from '../types';
import { MACHINES } from '../data/factoryData';

interface ShiftCalendarProps {
    loginTime?: string | null;
    currentShift: Shift | null;
    onClockIn: () => void;
    onClockOut: () => void;
    userRole: UserRole | string;
}

// Local interface for the Machine Schedule view
interface MachineShift {
    id: string;
    day: number;
    shiftName: string;
    operator: string;
    status: 'Active' | 'Leave' | 'Replaced';
    isLeave: boolean;
    isReplacement?: boolean;
    originalOperator?: string;
}

interface MyShift {
    day: number;
    type: string;
    status: 'Completed' | 'Upcoming';
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ currentShift, onClockIn, onClockOut, userRole }) => {
    // Duration state removed as it was unused

    const [selectedMachine, setSelectedMachine] = useState<string>('M01');
    const [machineShifts, setMachineShifts] = useState<MachineShift[]>([]);

    // Mock Data Generator for Machine Shifts
    useEffect(() => {
        const generateShifts = () => {
            const days = 30;
            const shifts: MachineShift[] = [];
            const operators = ['John Doe', 'Mike Lee', 'Sarah Tan', 'David Chen', 'Emily Wong', 'Alex Lim'];

            for (let i = 1; i <= days; i++) {
                shifts.push({
                    id: `d${i}-m`,
                    day: i,
                    shiftName: 'Morning (8am-4pm)',
                    operator: operators[i % operators.length],
                    status: 'Active',
                    isLeave: false
                });
                shifts.push({
                    id: `d${i}-e`,
                    day: i,
                    shiftName: 'Evening (4pm-12am)',
                    operator: operators[(i + 1) % operators.length],
                    status: 'Active',
                    isLeave: false
                });
                shifts.push({
                    id: `d${i}-n`,
                    day: i,
                    shiftName: 'Night (12am-8am)',
                    operator: operators[(i + 2) % operators.length],
                    status: 'Active',
                    isLeave: false
                });
            }
            setMachineShifts(shifts);
        };

        generateShifts();
    }, [selectedMachine]);



    const handleMarkLeave = (shiftId: string) => {
        const newShifts = machineShifts.map(s =>
            s.id === shiftId ? { ...s, isLeave: true, status: 'Leave' as const, originalOperator: s.operator, operator: 'Unassigned' } : s
        );
        setMachineShifts(newShifts);
    };

    const handleAssignReplacement = (shiftId: string) => {
        const replacements = ['Replacement A', 'Replacement B', 'Super Sub'];
        const randomRep = replacements[Math.floor(Math.random() * replacements.length)];

        const newShifts = machineShifts.map(s =>
            s.id === shiftId ? { ...s, isLeave: false, status: 'Replaced' as const, operator: `${randomRep} (Sub)`, isReplacement: true } : s
        );

        setMachineShifts(newShifts);
        alert(`Assigned ${randomRep} as replacement!`);
    };

    // Operator View (Original)
    const renderOperatorView = () => {
        const myShifts: MyShift[] = Array.from({ length: 30 }, (_, i) => ({
            day: i + 1,
            type: i % 7 === 0 ? 'Off' : (i % 2 === 0 ? 'Morning (08:00 - 17:00)' : 'Night (20:00 - 05:00)'),
            status: i < 5 ? 'Completed' : 'Upcoming'
        }));

        return (
            <div>
                <div className="glass-card mb-8 flex items-center justify-between bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 p-6 rounded-xl">
                    <div>
                        <div className="text-sm text-gray-400">Current Status</div>
                        <div className={`text-4xl font-bold ${currentShift ? 'text-green-400' : 'text-gray-500'}`}>
                            {currentShift ? 'ON DUTY' : 'OFF DUTY'}
                        </div>
                    </div>
                    <div className="text-right">
                        {!currentShift ? (
                            <button
                                onClick={onClockIn}
                                className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
                            >
                                <Clock size={24} /> Clock In
                            </button>
                        ) : (
                            <button
                                onClick={onClockOut}
                                className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
                            >
                                <XCircle size={24} /> Clock Out
                            </button>
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Calendar className="text-blue-400" /> My Schedule (November)
                    </h2>
                    <div className="space-y-2">
                        {myShifts.map(shift => (
                            <div key={shift.day} className={`flex items-center p-4 rounded-lg border-l-4 ${shift.type === 'Off' ? 'bg-white/5 border-gray-500' :
                                (shift.type.includes('Morning') ? 'bg-blue-500/10 border-blue-400' : 'bg-purple-500/10 border-purple-400')
                                }`}>
                                <div className="w-12 text-xl font-bold text-gray-400">{shift.day}</div>
                                <div className="flex-1">
                                    <div className="font-bold text-white">{shift.type}</div>
                                    <div className="text-xs text-gray-500">{shift.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Manager View (Machine Calendar - Table Layout)
    const renderManagerView = () => {
        // Group shifts by day for the table
        const days = Array.from({ length: 30 }, (_, i) => i + 1);

        return (
            <div className="space-y-6">
                {/* Controls */}
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Calendar className="text-purple-400" /> Machine Schedule
                    </h2>
                    <select
                        value={selectedMachine}
                        onChange={(e) => setSelectedMachine(e.target.value)}
                        className="bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2"
                    >
                        {MACHINES.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.factoryId})</option>
                        ))}
                    </select>
                </div>

                {/* Table View */}
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-gray-400 text-sm uppercase tracking-wider">
                                    <th className="p-4 border-b border-gray-700 w-24">Date</th>
                                    <th className="p-4 border-b border-gray-700 w-24">Day</th>
                                    <th className="p-4 border-b border-gray-700 text-blue-400">Morning (8am-4pm)</th>
                                    <th className="p-4 border-b border-gray-700 text-orange-400">Evening (4pm-12am)</th>
                                    <th className="p-4 border-b border-gray-700 text-purple-400">Night (12am-8am)</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {days.map(day => {
                                    const dayShifts = machineShifts.filter(s => s.day === day);
                                    const morningShift = dayShifts.find(s => s.shiftName.includes('Morning'));
                                    const eveningShift = dayShifts.find(s => s.shiftName.includes('Evening'));
                                    const nightShift = dayShifts.find(s => s.shiftName.includes('Night'));

                                    // Mock Day of Week
                                    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                    const dayOfWeek = daysOfWeek[(day - 1) % 7];
                                    const isWeekend = dayOfWeek === 'Sat' || dayOfWeek === 'Sun';

                                    const renderCell = (shift?: MachineShift) => {
                                        if (!shift) return <td className="p-4 border-b border-gray-800">-</td>;

                                        return (
                                            <td key={shift.id} className={`p-4 border-b border-gray-800 border-l border-gray-800/50 relative group transition-colors hover:bg-white/5`}>
                                                <div className="flex justify-between items-center">
                                                    <span className={`font-medium ${shift.isLeave ? 'text-red-400 line-through' : 'text-white'}`}>
                                                        {shift.isLeave ? shift.originalOperator : shift.operator}
                                                    </span>

                                                    <div className="flex gap-2">
                                                        {shift.isLeave && <AlertCircle size={14} className="text-red-500" />}
                                                        {shift.isReplacement && <CheckCircle size={14} className="text-green-500" />}
                                                    </div>
                                                </div>

                                                {/* Hover Actions */}
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    {!shift.isLeave && !shift.isReplacement && (
                                                        <button
                                                            onClick={() => handleMarkLeave(shift.id)}
                                                            className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-1 rounded"
                                                            title="Mark Leave"
                                                        >
                                                            <XCircle size={14} />
                                                        </button>
                                                    )}
                                                    {shift.isLeave && (
                                                        <button
                                                            onClick={() => handleAssignReplacement(shift.id)}
                                                            className="bg-green-500/20 hover:bg-green-500/40 text-green-400 p-1 rounded"
                                                            title="Assign Replacement"
                                                        >
                                                            <UserPlus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    };

                                    return (
                                        <tr key={day} className={`${isWeekend ? 'bg-white/5' : ''} hover:bg-white/10 transition-colors`}>
                                            <td className="p-4 border-b border-gray-800 font-bold text-white">Nov {day}</td>
                                            <td className={`p-4 border-b border-gray-800 ${isWeekend ? 'text-red-400' : 'text-gray-400'}`}>{dayOfWeek}</td>
                                            {renderCell(morningShift)}
                                            {renderCell(eveningShift)}
                                            {renderCell(nightShift)}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white">Shift Management</h1>
                <p className="text-gray-400">
                    {userRole === 'Manager' || userRole === 'Admin' || userRole === 'HR'
                        ? 'Manage machine schedules and operator leaves'
                        : 'View your upcoming shifts and attendance'}
                </p>
            </header>

            {userRole === 'Manager' || userRole === 'Admin' || userRole === 'HR' ? renderManagerView() : renderOperatorView()}
        </div>
    );
};

export default ShiftCalendar;
