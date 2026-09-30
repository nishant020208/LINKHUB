import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level Error Boundary.
 * Catches unhandled runtime exceptions inside page routes so that an error
 * in one tab does NOT blank the entire app or unmount the navigation shell.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RouteErrorBoundary] Caught error:', error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="py-12 max-w-xl mx-auto">
          <Card variant="bento" className="p-6 sm:p-8 space-y-5 border-status-error/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-status-error/10 text-status-error border border-status-error/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">
                  {this.props.fallbackTitle || 'Failed to render this section'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  An error occurred while loading this view.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-status-error/5 border border-status-error/20 font-mono text-xs text-status-error/90 break-words">
              {this.state.error?.message || 'Unknown render exception'}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={this.reset}>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Loading View</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  this.reset();
                  window.location.href = '/';
                }}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
