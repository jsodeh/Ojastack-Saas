import React from 'react';
import { AlertCircle, RefreshCw, Wifi, Shield, Database, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KnowledgeBaseServiceError } from '@/lib/knowledge-base-service';

interface KnowledgeBaseErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface KnowledgeBaseErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
  onReset?: () => void;
}

export class KnowledgeBaseErrorBoundary extends React.Component<
  KnowledgeBaseErrorBoundaryProps,
  KnowledgeBaseErrorBoundaryState
> {
  constructor(props: KnowledgeBaseErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): KnowledgeBaseErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Knowledge Base component error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  getErrorIcon = (error?: Error) => {
    if (error instanceof KnowledgeBaseServiceError) {
      switch (error.type) {
        case 'network':
          return <Wifi className="h-12 w-12 text-red-500" />;
        case 'permission':
          return <Shield className="h-12 w-12 text-red-500" />;
        case 'database':
          return <Database className="h-12 w-12 text-red-500" />;
        default:
          return <HelpCircle className="h-12 w-12 text-red-500" />;
      }
    }
    return <AlertCircle className="h-12 w-12 text-red-500" />;
  };

  getErrorTitle = (error?: Error) => {
    if (error instanceof KnowledgeBaseServiceError) {
      switch (error.type) {
        case 'network':
          return 'Connection Error';
        case 'permission':
          return 'Access Denied';
        case 'database':
          return 'Database Error';
        default:
          return 'Unexpected Error';
      }
    }
    return 'Component Error';
  };

  getErrorMessage = (error?: Error) => {
    if (error instanceof KnowledgeBaseServiceError) {
      return error.message;
    }
    return 'An unexpected error occurred while loading the knowledge base. Please try again.';
  };

  getRecoveryGuidance = (error?: Error) => {
    if (error instanceof KnowledgeBaseServiceError) {
      switch (error.type) {
        case 'network':
          return 'Please check your internet connection and try again.';
        case 'permission':
          return 'You may need to log in again or contact support if this persists.';
        case 'database':
          return 'This is a temporary issue. Please try again in a few moments.';
        default:
          return 'If this problem persists, please contact support.';
      }
    }
    return 'Try refreshing the page or contact support if the issue continues.';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;
      const isRetryable = error instanceof KnowledgeBaseServiceError ? error.retryable : true;

      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-8">
              {this.getErrorIcon(error)}
              
              <h3 className="font-medium text-lg mb-2 text-red-800">
                {this.getErrorTitle(error)}
              </h3>
              
              <p className="text-sm text-red-600 mb-2 max-w-md">
                {this.getErrorMessage(error)}
              </p>
              
              <p className="text-xs text-red-500 mb-6 max-w-md">
                {this.getRecoveryGuidance(error)}
              </p>

              <div className="flex items-center space-x-3">
                {isRetryable && (
                  <Button 
                    variant="outline" 
                    onClick={this.handleRetry}
                    className="text-red-600 border-red-200 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={this.handleReset}
                  className="text-red-600 border-red-200 hover:bg-red-100"
                >
                  Reset Component
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-6 text-left">
                  <summary className="text-xs text-red-400 cursor-pointer">
                    Technical Details (Development)
                  </summary>
                  <pre className="text-xs text-red-400 mt-2 p-2 bg-red-100 rounded overflow-auto max-w-md">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useKnowledgeBaseErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Knowledge Base error captured:', error);
    setError(error);
  }, []);

  return {
    error,
    resetError,
    captureError,
    hasError: error !== null,
  };
}