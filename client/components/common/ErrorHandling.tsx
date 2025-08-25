import React, { Component, ReactNode, useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Error types
export interface AppError {
  id: string;
  type: 'network' | 'validation' | 'auth' | 'permission' | 'server' | 'client' | 'integration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  timestamp: Date;
  component?: string;
  userId?: string;
  stackTrace?: string;
  context?: Record<string, any>;
  retryable?: boolean;
  handled?: boolean;
}

// Error storage interface
interface ErrorState {
  errors: AppError[];
  isOnline: boolean;
  retryCount: Record<string, number>;
}

// Global error context
interface ErrorContextType {
  reportError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  retryOperation: (errorId: string, operation: () => Promise<any>) => void;
  errors: AppError[];
}

const ErrorContext = React.createContext<ErrorContextType | undefined>(undefined);

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (error: Error, errorInfo: React.ErrorInfo) => void },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Report error to error tracking service
    this.reportError(error, errorInfo);
    
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorData: Omit<AppError, 'id' | 'timestamp'> = {
      type: 'client',
      severity: 'high',
      message: error.message,
      details: error.stack,
      component: errorInfo.componentStack,
      stackTrace: error.stack,
      context: { errorInfo },
      retryable: false
    };

    // Send to error tracking service
    this.sendErrorToService(errorData);
  };

  sendErrorToService = async (error: Omit<AppError, 'id' | 'timestamp'>) => {
    try {
      await fetch('/.netlify/functions/error-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...error,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {this.state.error?.message || 'An unexpected error occurred'}
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2 justify-center">
                <Button onClick={this.handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 p-4 bg-muted rounded-lg text-sm">
                  <summary className="cursor-pointer font-medium">Error Details (Dev)</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error provider component
export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errorState, setErrorState] = useState<ErrorState>({
    errors: [],
    isOnline: navigator.onLine,
    retryCount: {}
  });

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setErrorState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setErrorState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const reportError = (error: Omit<AppError, 'id' | 'timestamp'>) => {
    const appError: AppError = {
      ...error,
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date(),
      handled: false
    };

    setErrorState(prev => ({
      ...prev,
      errors: [...prev.errors, appError]
    }));

    // Show toast notification based on severity
    const toastMessage = error.message;
    switch (error.severity) {
      case 'critical':
        toast.error(toastMessage, {
          duration: Infinity,
          action: {
            label: 'Retry',
            onClick: () => {
              if (error.retryable) {
                // Implement retry logic
              }
            }
          }
        });
        break;
      case 'high':
        toast.error(toastMessage, { duration: 8000 });
        break;
      case 'medium':
        toast.warning(toastMessage, { duration: 5000 });
        break;
      case 'low':
        toast.info(toastMessage, { duration: 3000 });
        break;
    }

    // Auto-report to service
    reportErrorToService(appError);
  };

  const clearError = (id: string) => {
    setErrorState(prev => ({
      ...prev,
      errors: prev.errors.filter(error => error.id !== id)
    }));
  };

  const clearAllErrors = () => {
    setErrorState(prev => ({ ...prev, errors: [] }));
  };

  const retryOperation = async (errorId: string, operation: () => Promise<any>) => {
    const error = errorState.errors.find(e => e.id === errorId);
    if (!error?.retryable) return;

    const currentRetries = errorState.retryCount[errorId] || 0;
    if (currentRetries >= 3) {
      toast.error('Maximum retry attempts reached');
      return;
    }

    setErrorState(prev => ({
      ...prev,
      retryCount: { ...prev.retryCount, [errorId]: currentRetries + 1 }
    }));

    try {
      await operation();
      clearError(errorId);
      toast.success('Operation completed successfully');
    } catch (e) {
      reportError({
        type: 'client',
        severity: 'medium',
        message: 'Retry operation failed',
        details: e instanceof Error ? e.message : 'Unknown error',
        retryable: true
      });
    }
  };

  const reportErrorToService = async (error: AppError) => {
    if (!errorState.isOnline) return;

    try {
      await fetch('/.netlify/functions/error-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (e) {
      console.error('Failed to report error to service:', e);
    }
  };

  const contextValue: ErrorContextType = {
    reportError,
    clearError,
    clearAllErrors,
    retryOperation,
    errors: errorState.errors
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
      <ErrorNotificationCenter />
      {!errorState.isOnline && <OfflineIndicator />}
    </ErrorContext.Provider>
  );
}

// Hook to use error context
export function useErrorHandler() {
  const context = React.useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
}

// Error notification center component
function ErrorNotificationCenter() {
  const { errors, clearError, retryOperation } = useErrorHandler();
  const [isExpanded, setIsExpanded] = useState(false);

  const criticalErrors = errors.filter(e => e.severity === 'critical' && !e.handled);
  
  if (criticalErrors.length === 0 && !isExpanded) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {criticalErrors.length > 0 && (
        <Card className="mb-2 border-red-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Issues ({criticalErrors.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </CardHeader>
          {isExpanded && (
            <CardContent className="pt-0 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {criticalErrors.map(error => (
                  <ErrorNotificationItem
                    key={error.id}
                    error={error}
                    onClear={() => clearError(error.id)}
                    onRetry={error.retryable ? () => retryOperation(error.id, async () => {}) : undefined}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

// Individual error notification component
interface ErrorNotificationItemProps {
  error: AppError;
  onClear: () => void;
  onRetry?: () => void;
}

function ErrorNotificationItem({ error, onClear, onRetry }: ErrorNotificationItemProps) {
  const getSeverityColor = (severity: AppError['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityIcon = (severity: AppError['severity']) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'high': return AlertCircle;
      case 'medium': return Info;
      case 'low': return CheckCircle;
      default: return Info;
    }
  };

  const Icon = getSeverityIcon(error.severity);

  return (
    <Alert className={cn("relative pr-12", {
      'border-red-200 bg-red-50': error.severity === 'critical',
      'border-orange-200 bg-orange-50': error.severity === 'high',
      'border-yellow-200 bg-yellow-50': error.severity === 'medium',
      'border-blue-200 bg-blue-50': error.severity === 'low'
    })}>
      <Icon className={cn("h-4 w-4", getSeverityColor(error.severity))} />
      <AlertDescription className="pr-8">
        <div className="space-y-2">
          <div>
            <p className="font-medium">{error.message}</p>
            {error.details && (
              <p className="text-sm text-muted-foreground">{error.details}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {error.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {error.timestamp.toLocaleTimeString()}
            </span>
          </div>
          
          {(onRetry || onClear) && (
            <div className="flex gap-2">
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClear}>
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
      
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={onClear}
      >
        <X className="w-3 h-3" />
      </Button>
    </Alert>
  );
}

// Offline indicator component
function OfflineIndicator() {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <Alert className="bg-orange-50 border-orange-200">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          You're currently offline. Some features may not work properly.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Error handling hooks and utilities
export function useAsyncError() {
  const { reportError } = useErrorHandler();
  
  return {
    handleError: (error: unknown, context?: Record<string, any>) => {
      const appError: Omit<AppError, 'id' | 'timestamp'> = {
        type: 'client',
        severity: 'medium',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : String(error),
        context,
        retryable: false
      };
      
      reportError(appError);
    },
    
    wrapAsync: <T extends any[], R>(
      fn: (...args: T) => Promise<R>
    ) => {
      return async (...args: T): Promise<R | void> => {
        try {
          return await fn(...args);
        } catch (error) {
          const appError: Omit<AppError, 'id' | 'timestamp'> = {
            type: 'client',
            severity: 'medium',
            message: error instanceof Error ? error.message : 'Async operation failed',
            details: error instanceof Error ? error.stack : String(error),
            retryable: true
          };
          
          reportError(appError);
        }
      };
    }
  };
}

// Network error handler
export function handleNetworkError(error: any, operation?: string) {
  const { reportError } = useErrorHandler();
  
  let message = 'Network request failed';
  let severity: AppError['severity'] = 'medium';
  
  if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
    message = 'Unable to connect to server. Please check your internet connection.';
    severity = 'high';
  } else if (error.status >= 500) {
    message = 'Server error occurred. Please try again later.';
    severity = 'high';
  } else if (error.status === 401) {
    message = 'Authentication required. Please log in again.';
    severity = 'high';
  } else if (error.status === 403) {
    message = 'Access denied. You don\'t have permission to perform this action.';
    severity = 'medium';
  }
  
  reportError({
    type: 'network',
    severity,
    message,
    details: `${operation ? `Operation: ${operation}, ` : ''}Status: ${error.status || 'Unknown'}, Response: ${error.statusText || error.message}`,
    retryable: error.status !== 401 && error.status !== 403
  });
}

// Validation error handler  
export function handleValidationError(errors: Record<string, string[]>) {
  const { reportError } = useErrorHandler();
  
  const errorMessages = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('; ');
    
  reportError({
    type: 'validation',
    severity: 'low',
    message: 'Please correct the following errors:',
    details: errorMessages,
    retryable: false
  });
}