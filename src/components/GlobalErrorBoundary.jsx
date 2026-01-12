import React from 'react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Global Error Capture:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
                    <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-10 border border-red-100">
                        <h1 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                            <span className="text-red-500">⚠️</span> Something went wrong.
                        </h1>
                        <p className="text-gray-600 mb-6">The application encountered a critical error. Please reproduce the steps and share the details below with support.</p>

                        <div className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto text-sm font-mono mb-6">
                            <p className="font-bold text-red-300 mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre className="opacity-70">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-primary hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors w-full"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
