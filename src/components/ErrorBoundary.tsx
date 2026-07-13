import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log error to monitoring service in production
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-brand-surface border border-red-500/30 text-center gap-3 min-h-[200px]">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <p className="text-red-400 font-mono text-sm font-bold">
            {this.props.name ? `${this.props.name} failed to render` : 'Component error'}
          </p>
          {this.state.error?.message && (
            <p className="text-brand-text-muted text-xs font-mono max-w-xs break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-elevated text-brand-text-muted hover:text-white text-xs font-mono transition-colors mt-1"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
