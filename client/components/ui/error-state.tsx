import React from 'react';
import { AlertCircle, RefreshCw, Wifi, Shield, Database, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KnowledgeBaseServiceError } from '@/lib/knowledge-base-service';

interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
  onReset?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({ 
  error, 
  onRetry, 
  onReset, 
  className = '', 
  compact = false 
}: ErrorStateProps) {
  const getErrorIcon = (error: Error) => {
    if (error instanceof KnowledgeBaseServiceError) {
      switch (error.type) {
        case 'network':
          return <Wifi className={compact ? "h-6 w-6" : "h-12 w-12"} />;
        case 'permission':
          return <Shield className={compact ? "h-6 w-6" : "h-12 w-12"} />;
        case 'database':
          return <Database className={compact ? "h-6 w-6" : "h-12 w-12"} />;
        default:
          return <HelpCircle className={compact ? "h-6 w-6" : "h-12 w-12"} />;
      }
    }
    return <AlertCircle className={compact ? "h-6 w-6" : "h-12 w-12"} />;
  };

  const getErrorTitle = (error: Error) => {
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
    return 'Error';
  };

  const getErrorMessage = (error: Error) => {
    if (error instanceof KnowledgeBaseServiceError) {
      return error.message;
    }
    return error.message || 'An unexpected error occurred.';
  };

  const getRecoveryGuidance = (error: Error) => {
    if (error instanceof KnowledgeBaseServiceError) {
      switch (error.type) {
        case 'network':
          return 'Please check your internet connection and try again.';
        case 'permission':
          return 'You may need to log in again or contact support.';
        case 'database':
          return 'This is a temporary issue. Please try again in a few moments.';
        default:
          return 'If this problem persists, please contact support.';
      }
    }
    return 'Try refreshing or contact support if the issue continues.';
  };

  const isRetryable = error instanceof KnowledgeBaseServiceError ? error.retryable : true;

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="text-red-500">
            {getErrorIcon(error)}
          </div>
          <div>
            <p className="text-sm font-medium text-red-800">
              {getErrorTitle(error)}
            </p>
            <p className="text-xs text-red-600">
              {getErrorMessage(error)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isRetryable && onRetry && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRetry}
              className="text-red-600 border-red-200 hover:bg-red-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="text-red-500 mb-4">
            {getErrorIcon(error)}
          </div>
          
          <h3 className="font-medium text-lg mb-2 text-red-800">
            {getErrorTitle(error)}
          </h3>
          
          <p className="text-sm text-red-600 mb-2 max-w-md">
            {getErrorMessage(error)}
          </p>
          
          <p className="text-xs text-red-500 mb-6 max-w-md">
            {getRecoveryGuidance(error)}
          </p>

          <div className="flex items-center space-x-3">
            {isRetryable && onRetry && (
              <Button 
                variant="outline" 
                onClick={onRetry}
                className="text-red-600 border-red-200 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            {onReset && (
              <Button 
                variant="outline" 
                onClick={onReset}
                className="text-red-600 border-red-200 hover:bg-red-100"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specific error states for different sections
export function StatsErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <ErrorState 
      error={error} 
      onRetry={onRetry} 
      compact 
      className="col-span-full"
    />
  );
}

export function KnowledgeBasesErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <ErrorState 
      error={error} 
      onRetry={onRetry}
    />
  );
}

export function DocumentsErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <ErrorState 
      error={error} 
      onRetry={onRetry} 
      compact
    />
  );
}