import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
}

export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart rendering error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-center border border-red-200 bg-red-50 rounded-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="font-medium text-lg mb-2 text-red-800">Chart Error</h3>
          <p className="text-sm text-red-600 mb-4 max-w-sm">
            There was an error rendering this chart. Please try again.
          </p>
          <Button 
            variant="outline" 
            onClick={this.handleRetry}
            className="text-red-600 border-red-200 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}