import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(32px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 40px 120px rgba(37, 99, 235, 0.25)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: '#60a5fa',
              fontSize: '28px'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              System Exception Encountered
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
              {this.state.error?.message || 'An unexpected runtime error occurred in the application.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 12px 35px rgba(37, 99, 235, 0.45)',
                transition: 'all 200ms ease',
              }}
            >
              Reload DEVOS Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
