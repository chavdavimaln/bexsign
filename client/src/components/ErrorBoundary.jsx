import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Bexsign ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center font-sans">
          <div className="max-w-2xl w-full bg-slate-800 border border-red-500/50 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
              <span className="bg-[#E71414] text-white px-2.5 py-1 rounded font-black text-sm">BEXSIGN</span>
              <h1 className="text-xl font-bold text-red-400">Component Render Exception</h1>
            </div>
            <p className="text-sm text-slate-300">
              An unexpected error occurred while rendering this page:
            </p>
            <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-red-400 overflow-x-auto border border-slate-800">
              {this.state.error && this.state.error.toString()}
            </div>
            {this.state.errorInfo && (
              <details className="text-xs text-slate-400 font-mono bg-slate-950/50 p-3 rounded border border-slate-800">
                <summary className="cursor-pointer font-bold text-slate-300 mb-2">Stack Trace</summary>
                <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-[#E71414] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="border border-slate-600 px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
