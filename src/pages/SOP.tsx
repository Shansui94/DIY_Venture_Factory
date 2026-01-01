import React from 'react';

const SOP: React.FC = () => {
    return (
        <div style={{ paddingBottom: '2rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 className="text-3xl font-bold text-white mb-2">Standard Operating Procedures</h1>
                <p className="text-slate-400">User Manual & Guidelines</p>
            </header>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>👷 Operator SOP (操作员)</h2>
                <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--accent-primary)' }}>
                    <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }} className="text-white font-bold">1. Start Work (登录)</h3>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }} className="list-disc pl-5">
                        <li><strong>Login:</strong> Sign in to record GPS & Start Time automatically.</li>
                    </ul>

                    <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }} className="text-white font-bold">2. Production (生产)</h3>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }} className="list-disc pl-5">
                        <li><strong>Prepare:</strong> Place rolls (1-6) next to the Whiteboard.</li>
                        <li><strong>Scan:</strong> Go to <em>Smart Scan</em> and take a photo.</li>
                        <li><strong>Verify:</strong> Check AI result (Count/Type) and click Submit.</li>
                    </ul>

                    <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }} className="text-white font-bold">3. End Work (下班)</h3>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }} className="list-disc pl-5">
                        <li>Log out to end session safely.</li>
                    </ul>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--accent-warning)', marginBottom: '1rem' }}>👔 Manager SOP (管理层)</h2>
                <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--accent-warning)' }}>
                    <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }} className="text-white font-bold">1. Monitoring (监控)</h3>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }} className="list-disc pl-5">
                        <li>Check <em>Dashboard</em> for real-time output and active jobs.</li>
                    </ul>

                    <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }} className="text-white font-bold">2. Management (管理)</h3>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }} className="list-disc pl-5">
                        <li><strong>Jobs:</strong> Create and assign new orders in <em>Job Orders</em>.</li>
                        <li><strong>Inventory:</strong> Monitor resin levels and finished goods.</li>
                    </ul>

                    <h3 style={{ fontSize: '1.1rem', marginTop: '1rem' }} className="text-white font-bold">3. Audit (稽核)</h3>
                    <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }} className="list-disc pl-5">
                        <li>Review <em>Production Log</em> for GPS locations and AI confidence scores.</li>
                    </ul>
                </div>
            </div>

            <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">🆘 Troubleshooting</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                    <strong>GPS Error?</strong> Allow browser location permissions.<br />
                    <strong>Camera Error?</strong> Allow browser camera permissions.<br />
                    <strong>Wrong Count?</strong> Retake photo with better lighting.
                </p>
            </div>
        </div>
    );
};

export default SOP;
