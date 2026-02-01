import React from 'react';

class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('App error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
                        <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
                        <p className="text-gray-600 mb-4">
                            The dashboard encountered an error. Try refreshing the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
