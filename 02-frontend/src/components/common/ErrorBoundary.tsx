import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('DEVOS render boundary caught an error', error, info);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: 24, display: 'grid', gap: 12, color: 'var(--color-text-primary)' }}>
          <strong>Something went wrong.</strong>
          <span style={{ color: 'var(--color-text-muted)' }}>
            The workspace recovered to a safe fallback state. Try reloading the page or returning to a stable route.
          </span>
          <button className="btn btn-primary btn-sm" onClick={this.reset} type="button">
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
