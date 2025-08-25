import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChunkUploadProgress, 
  chunkedUploadService,
  formatUploadSpeed,
  formatTimeRemaining,
  formatFileSize
} from '@/lib/chunked-upload-service';

interface FileUploadProgressProps {
  fileIds: string[];
  onFileRemove: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  showOverallProgress?: boolean;
}

function getFileIcon(fileName: string): React.ComponentType<{ className?: string }> {
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'md':
      return FileText;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return ImageIcon;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return FileSpreadsheet;
    default:
      return FileIcon;
  }
}

function getStatusColor(status: ChunkUploadProgress['status']): string {
  switch (status) {
    case 'completed':
      return 'text-green-600';
    case 'uploading':
      return 'text-blue-600';
    case 'paused':
      return 'text-yellow-600';
    case 'error':
      return 'text-red-600';
    case 'processing':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
}

function getStatusIcon(status: ChunkUploadProgress['status']): React.ComponentType<{ className?: string }> {
  switch (status) {
    case 'completed':
      return CheckCircle2;
    case 'uploading':
      return Upload;
    case 'paused':
      return Pause;
    case 'error':
      return AlertCircle;
    case 'processing':
      return Loader2;
    default:
      return Clock;
  }
}

interface FileProgressItemProps {
  progress: ChunkUploadProgress;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

function FileProgressItem({ progress, onPause, onResume, onCancel, onRetry }: FileProgressItemProps) {
  const IconComponent = getFileIcon(progress.fileName);
  const StatusIcon = getStatusIcon(progress.status);
  const statusColor = getStatusColor(progress.status);

  const canPause = progress.status === 'uploading';
  const canResume = progress.status === 'paused';
  const canRetry = progress.status === 'error';
  const isActive = progress.status === 'uploading' || progress.status === 'processing';

  return (
    <Card className="transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* File Icon */}
          <div className="flex-shrink-0 mt-1">
            <IconComponent className="h-8 w-8 text-gray-500" />
          </div>

          {/* File Info and Progress */}
          <div className="flex-1 min-w-0">
            {/* File Name and Size */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {progress.fileName}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(progress.totalSize)}
                  {progress.speed && progress.status === 'uploading' && (
                    <span className="ml-2">• {formatUploadSpeed(progress.speed)}</span>
                  )}
                </p>
              </div>
              
              {/* Status Badge */}
              <Badge variant="outline" className={`ml-2 ${statusColor}`}>
                <StatusIcon className={`h-3 w-3 mr-1 ${progress.status === 'processing' ? 'animate-spin' : ''}`} />
                {progress.status}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={statusColor}>
                  {progress.status === 'uploading' && (
                    <>
                      Chunk {progress.currentChunk + 1} of {progress.totalChunks}
                      {progress.estimatedTimeRemaining && (
                        <span className="ml-2">• {formatTimeRemaining(progress.estimatedTimeRemaining)} remaining</span>
                      )}
                    </>
                  )}
                  {progress.status === 'completed' && 'Upload complete'}
                  {progress.status === 'paused' && 'Upload paused'}
                  {progress.status === 'error' && 'Upload failed'}
                  {progress.status === 'processing' && 'Processing file...'}
                  {progress.status === 'pending' && 'Preparing upload...'}
                </span>
                <span className="text-gray-500">
                  {progress.progress.toFixed(1)}%
                </span>
              </div>
              
              <Progress 
                value={progress.progress} 
                className={`h-2 ${isActive ? 'animate-pulse' : ''}`}
              />

              {/* Detailed Progress Info */}
              {(progress.status === 'uploading' || progress.status === 'completed') && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {formatFileSize(progress.uploadedBytes)} of {formatFileSize(progress.totalSize)}
                  </span>
                  <span>
                    {progress.uploadedChunks} / {progress.totalChunks} chunks
                  </span>
                </div>
              )}

              {/* Error Message */}
              {progress.status === 'error' && progress.error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {progress.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {canPause && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPause}
                className="h-8 w-8 p-0 hover:bg-yellow-50 hover:text-yellow-600"
                title="Pause upload"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}

            {canResume && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResume}
                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                title="Resume upload"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            {canRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                title="Retry upload"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
              title="Cancel upload"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface OverallProgressProps {
  fileIds: string[];
}

function OverallProgress({ fileIds }: OverallProgressProps) {
  const [overallProgress, setOverallProgress] = useState({
    totalFiles: 0,
    completedFiles: 0,
    totalBytes: 0,
    uploadedBytes: 0,
    overallProgress: 0,
    averageSpeed: 0,
  });

  useEffect(() => {
    const updateProgress = () => {
      const progress = chunkedUploadService.getOverallProgress(fileIds);
      setOverallProgress(progress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 500);

    return () => clearInterval(interval);
  }, [fileIds]);

  if (fileIds.length === 0) return null;

  const hasActiveUploads = fileIds.some(id => {
    const progress = chunkedUploadService.getUploadProgress(id);
    return progress && (progress.status === 'uploading' || progress.status === 'processing');
  });

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Overall Progress
            </h4>
            <div className="text-sm text-gray-500">
              {overallProgress.completedFiles} of {overallProgress.totalFiles} files completed
            </div>
          </div>

          <Progress 
            value={overallProgress.overallProgress} 
            className={`h-3 ${hasActiveUploads ? 'animate-pulse' : ''}`}
          />

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {formatFileSize(overallProgress.uploadedBytes)} of {formatFileSize(overallProgress.totalBytes)}
            </span>
            <div className="flex items-center space-x-4">
              {overallProgress.averageSpeed > 0 && hasActiveUploads && (
                <span>
                  {formatUploadSpeed(overallProgress.averageSpeed)}
                </span>
              )}
              <span>
                {overallProgress.overallProgress.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FileUploadProgress({ 
  fileIds, 
  onFileRemove, 
  onRetry,
  showOverallProgress = true 
}: FileUploadProgressProps) {
  const [progresses, setProgresses] = useState<Map<string, ChunkUploadProgress>>(new Map());

  useEffect(() => {
    const updateProgresses = () => {
      const newProgresses = new Map<string, ChunkUploadProgress>();
      
      fileIds.forEach(fileId => {
        const progress = chunkedUploadService.getUploadProgress(fileId);
        if (progress) {
          newProgresses.set(fileId, progress);
        }
      });

      setProgresses(newProgresses);
    };

    updateProgresses();
    const interval = setInterval(updateProgresses, 500);

    return () => clearInterval(interval);
  }, [fileIds]);

  const handlePause = (fileId: string) => {
    chunkedUploadService.pauseUpload(fileId);
  };

  const handleResume = async (fileId: string) => {
    const progress = progresses.get(fileId);
    if (progress) {
      // Note: In a real implementation, you'd need to store the original File object
      // For now, we'll just show that the resume functionality is available
      console.log('Resume upload for:', fileId);
      onRetry?.(fileId);
    }
  };

  const handleCancel = (fileId: string) => {
    chunkedUploadService.cancelUpload(fileId);
    onFileRemove(fileId);
  };

  const handleRetry = (fileId: string) => {
    onRetry?.(fileId);
  };

  if (fileIds.length === 0) {
    return null;
  }

  const progressArray = Array.from(progresses.values());
  const hasErrors = progressArray.some(p => p.status === 'error');
  const hasActive = progressArray.some(p => p.status === 'uploading' || p.status === 'processing');
  const allCompleted = progressArray.length > 0 && progressArray.every(p => p.status === 'completed');

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      {showOverallProgress && fileIds.length > 1 && (
        <OverallProgress fileIds={fileIds} />
      )}

      {/* Status Summary */}
      {(hasErrors || hasActive || allCompleted) && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            {allCompleted && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  All uploads completed successfully
                </span>
              </>
            )}
            {hasActive && !allCompleted && (
              <>
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-blue-600">
                  Uploading files...
                </span>
              </>
            )}
            {hasErrors && (
              <>
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  Some uploads failed
                </span>
              </>
            )}
          </div>

          {hasErrors && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                progressArray
                  .filter(p => p.status === 'error')
                  .forEach(p => handleRetry(p.fileId));
              }}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Retry Failed
            </Button>
          )}
        </div>
      )}

      {/* Individual File Progress */}
      <div className="space-y-3">
        {fileIds.map(fileId => {
          const progress = progresses.get(fileId);
          if (!progress) return null;

          return (
            <FileProgressItem
              key={fileId}
              progress={progress}
              onPause={() => handlePause(fileId)}
              onResume={() => handleResume(fileId)}
              onCancel={() => handleCancel(fileId)}
              onRetry={() => handleRetry(fileId)}
            />
          );
        })}
      </div>

      {/* Upload Tips */}
      {hasActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Upload className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Upload Tips:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>You can pause and resume uploads at any time</li>
                <li>Failed uploads will automatically retry up to 3 times</li>
                <li>Keep this tab open for the best upload experience</li>
                <li>Large files are uploaded in chunks for reliability</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}