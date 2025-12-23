import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Simple Error Boundary to catch crash and show it to user
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, background: '#1a1a1a', color: '#ff5555', height: '100vh', fontFamily: 'monospace' }}>
                    <h1>💥 Something went wrong</h1>
                    <h3 style={{ color: 'white' }}>{this.state.error?.toString()}</h3>
                    <pre style={{ background: '#000', padding: 10, overflow: 'auto' }}>{this.state.error?.stack}</pre>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: 20 }}>Reload Page</button>
                </div>
            );
        }

        return this.props.children;
    }
}

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </StrictMode>,
    );
}
