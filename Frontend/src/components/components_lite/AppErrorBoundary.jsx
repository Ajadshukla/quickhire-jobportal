import React from "react";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-xl w-full rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-red-700">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              A runtime error occurred in the frontend. Open browser DevTools Console to see the exact file and line.
            </p>
            <pre className="mt-4 overflow-auto rounded bg-slate-100 dark:bg-slate-800 p-3 text-xs text-slate-800 dark:text-slate-200">
              {String(this.state.error?.message || this.state.error || "Unknown error")}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
