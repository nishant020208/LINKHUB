import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, RotateCcw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { hardResetApp } from '@/lib/cacheReset';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
  isResetting: boolean;
}

/**
 * Global Root Error Boundary with design system styling, collapsible debug details,
 * and a true hard-reset purge engine (unregisters SW, clears CacheStorage, wipes query cache).
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
    isResetting: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Unhandled render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleHardReset = async () => {
    this.setState({ isResetting: true });
    await hardResetApp();
  };

  private handleCopy = () => {
    const errorText = `${this.state.error?.name}: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack || ''}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected runtime error occurred.';
      const componentStack = this.state.errorInfo?.componentStack || this.state.error?.stack || '';

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 antialiased">
          <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl glass-panel border border-border/80 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-status-error/10 text-status-error border border-status-error/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-xl text-foreground">Something went wrong</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  UnifyHub encountered an unexpected render issue.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-status-error/10 border border-status-error/25 font-mono text-xs text-status-error break-words leading-relaxed">
              {errorMessage}
            </div>

            {/* Collapsible Error Stack Details */}
            <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <span>{this.state.showDetails ? 'Hide technical trace' : 'View technical trace'}</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="p-3 border-t border-border/50 bg-background/80 space-y-2">
                  <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-48 p-2 rounded bg-muted/40 whitespace-pre-wrap break-all leading-tight">
                    {componentStack || 'No stack trace available'}
                  </pre>
                  <button
                    type="button"
                    onClick={this.handleCopy}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-primary hover:underline cursor-pointer"
                  >
                    {this.state.copied ? <Check className="w-3.5 h-3.5 text-status-connected" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{this.state.copied ? 'Copied details to clipboard' : 'Copy error details'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={this.handleHardReset}
                disabled={this.state.isResetting}
                className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${this.state.isResetting ? 'animate-spin' : ''}`} />
                <span>{this.state.isResetting ? 'Purging caches & resetting…' : 'Reload app (Hard Reset)'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.href = '/';
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-card hover:bg-muted/80 text-foreground border border-border/70 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Return to Dashboard</span>
              </button>
            </div>

            <p className="text-[11px] font-mono text-muted-foreground text-center">
              Hard reset clears service workers and cache storage to load the latest deployment bundle.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
