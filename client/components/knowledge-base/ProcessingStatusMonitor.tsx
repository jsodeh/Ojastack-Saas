import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Pause,
  Play,
  X
} from 'lucide-react';
import { ProcessingStatus, ProcessingError, fileProcessingService } from '../../lib/file-processing-service';
import { formatProcessingTime, getFileTypeIcon } from '../../lib/file-processing-service';

interface ProcessingStatusMonitorProps {
  documentIds: string[];
  onStatusChange?: (documentId: string, status: ProcessingStatus) => void;
  onComplete?: (documentId: string) => void;
  onError?: (documentId: string, error: ProcessingError) => void;
  showIndividualFiles?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface ProcessingStatusItemProps {
  status: ProcessingStatus;
  onRetry?: () => void;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  showActions?: boolean;
}

const ProcessingStatusItem: React.FC<ProcessingStatusItemProps> = ({
  status,
  onRetry,
  onCancel,
  onPause,
  onResume,
  showActions = true,
}) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
  };

  const isProcessing = ['extracting', 'chunking', 'embedding', 'indexing'].includes(status.status);
  const canRetry = status.status === 'error' && status.error?.retryable;
  const canPause = isProcessing;
  const canResume = status.status === 'paused';

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getFileTypeIcon(status.fileName)}</span>
            <div>
              <h4 className="font-medium text-sm">{status.fileName}</h4>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon()}
                <Badge variant="secondary" className={getStatusColor()}>
                  {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                </Badge>
                {status.totalChunks && (
                  <span className="text-xs text-gray-500">
                    {status.processedChunks || 0}/{status.totalChunks} chunks
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-2">
              {canRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="h-8 px-2"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              {canPause && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPause}
                  className="h-8 px-2"
                >
                  <Pause className="h-3 w-3" />
                </Button>
              )}
              {canResume && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onResume}
                  className="h-8 px-2"
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                className="h-8 px-2 text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {status.status !== 'error' && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{status.currentStep}</span>
              <span>{status.progress}%</span>
            </div>
            <Progress value={status.progress} className="h-2" />
          </div>
        )}

        {/* Processing Details */}
        <div className="flex justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Step {status.totalSteps - (status.totalSteps - Math.ceil((status.progress / 100) * status.totalSteps))} of {status.totalSteps}</span>
            {status.estimatedTimeRemaining && status.estimatedTimeRemaining > 0 && (
              <span>~{formatTimeRemaining(status.estimatedTimeRemaining)} remaining</span>
            )}
          </div>
          <span>
            {status.completedAt 
              ? `Completed in ${formatProcessingTime(status.startedAt, status.completedAt)}`
              : `Started ${formatProcessingTime(status.startedAt)}`
            }
          </span>
        </div>

        {/* Error Details */}
        {status.error && (
          <Alert className="mt-3" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">{status.error.message}</div>
              {status.error.details && (
                <div className="text-xs mt-1 opacity-80">
                  {JSON.stringify(status.error.details, null, 2)}
                </div>
              )}
              {status.error.retryCount && (
                <div className="text-xs mt-1">
                  Retry attempt: {status.error.retryCount}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const ProcessingStatusMonitor: React.FC<ProcessingStatusMonitorProps> = ({
  documentIds,
  onStatusChange,
  onComplete,
  onError,
  showIndividualFiles = true,
  autoRefresh = true,
  refreshInterval = 1000,
}) => {
  const [statuses, setStatuses] = useState<Map<string, ProcessingStatus>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Update status for a specific document
  const updateStatus = useCallback((documentId: string, status: ProcessingStatus) => {
    setStatuses(prev => {
      const newStatuses = new Map(prev);
      newStatuses.set(documentId, status);
      return newStatuses;
    });

    onStatusChange?.(documentId, status);

    if (status.status === 'completed') {
      onComplete?.(documentId);
    } else if (status.status === 'error' && status.error) {
      onError?.(documentId, status.error);
    }

    setLastUpdate(new Date());
  }, [onStatusChange, onComplete, onError]);

  // Subscribe to processing updates
  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    documentIds.forEach(documentId => {
      // Get initial status
      const initialStatus = fileProcessingService.getProcessingStatus(documentId);
      if (initialStatus) {
        updateStatus(documentId, initialStatus);
      }

      // Subscribe to updates
      const unsubscribe = fileProcessingService.onProcessingUpdate(documentId, (status) => {
        updateStatus(documentId, status);
      });

      unsubscribeFunctions.push(unsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [documentIds, updateStatus]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      
      // Check for updates on all documents
      documentIds.forEach(documentId => {
        const status = fileProcessingService.getProcessingStatus(documentId);
        if (status) {
          updateStatus(documentId, status);
        }
      });

      setIsRefreshing(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, documentIds, updateStatus]);

  // Calculate overall statistics
  const overallStats = React.useMemo(() => {
    const statusArray = Array.from(statuses.values());
    const total = statusArray.length;
    const completed = statusArray.filter(s => s.status === 'completed').length;
    const processing = statusArray.filter(s => 
      ['extracting', 'chunking', 'embedding', 'indexing'].includes(s.status)
    ).length;
    const failed = statusArray.filter(s => s.status === 'error').length;
    const pending = statusArray.filter(s => s.status === 'pending').length;
    
    const overallProgress = total > 0 
      ? Math.round(statusArray.reduce((sum, s) => sum + s.progress, 0) / total)
      : 0;

    const totalChunks = statusArray.reduce((sum, s) => sum + (s.totalChunks || 0), 0);
    const processedChunks = statusArray.reduce((sum, s) => sum + (s.processedChunks || 0), 0);

    return {
      total,
      completed,
      processing,
      failed,
      pending,
      overallProgress,
      totalChunks,
      processedChunks,
    };
  }, [statuses]);

  const handleRetry = (documentId: string) => {
    // Implementation would depend on your retry mechanism
    console.log('Retry processing for:', documentId);
  };

  const handleCancel = (documentId: string) => {
    // Implementation would depend on your cancellation mechanism
    console.log('Cancel processing for:', documentId);
  };

  const handlePause = (documentId: string) => {
    // Implementation would depend on your pause mechanism
    console.log('Pause processing for:', documentId);
  };

  const handleResume = (documentId: string) => {
    // Implementation would depend on your resume mechanism
    console.log('Resume processing for:', documentId);
  };

  if (documentIds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Processing Status</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin" />}
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{overallStats.total}</div>
              <div className="text-xs text-gray-500">Total Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{overallStats.processing}</div>
              <div className="text-xs text-gray-500">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallStats.completed}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overallStats.failed}</div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{overallStats.pending}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{overallStats.overallProgress}%</span>
            </div>
            <Progress value={overallStats.overallProgress} className="h-3" />
          </div>

          {overallStats.totalChunks > 0 && (
            <div className="text-sm text-gray-500 text-center">
              {overallStats.processedChunks} / {overallStats.totalChunks} chunks processed
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual File Status */}
      {showIndividualFiles && (
        <div>
          <h3 className="text-lg font-medium mb-3">File Processing Details</h3>
          {Array.from(statuses.entries()).map(([documentId, status]) => (
            <ProcessingStatusItem
              key={documentId}
              status={status}
              onRetry={() => handleRetry(documentId)}
              onCancel={() => handleCancel(documentId)}
              onPause={() => handlePause(documentId)}
              onResume={() => handleResume(documentId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessingStatusMonitor;