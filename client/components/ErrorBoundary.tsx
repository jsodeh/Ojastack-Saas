import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log the error, don't update state to prevent infinite loops
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
    });
  };

  private handleReload = () => {
    // Force a page reload for DOM-related errors
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDOMError = this.state.error?.message?.includes('removeChild') ||
                        this.state.error?.message?.includes('insertBefore') ||
                        this.state.error?.message?.includes('createRoot');

      const isWidgetError = this.state.error?.message?.includes('elevenlabs') ||
                           this.state.error?.message?.includes('convai');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                {isDOMError 
                  ? "There was a rendering issue. Please reload the page."
                  : isWidgetError
                  ? "The chat widget encountered an issue. The main app is still functional."
                  : "An unexpected error occurred."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                {isDOMError && (
                  <Button 
                    onClick={this.handleReload} 
                    variant="outline"
                    className="flex-1"
                  >
                    Reload Page
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
