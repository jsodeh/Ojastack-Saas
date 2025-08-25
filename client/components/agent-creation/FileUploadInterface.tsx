import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  File as FileIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  chunkedUploadService, 
  ChunkUploadProgress,
  ChunkUploadOptions 
} from '@/lib/chunked-upload-service';
import FileUploadProgress from './FileUploadProgress';

export interface FileUploadItem {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'complete' | 'error' | 'paused';
  progress: number;
  error?: string;
}

export interface SupportedFileType {
  extension: string;
  mimeType: string;
  icon: React.ComponentType<{ className?: string }>;
  maxSize: number; // in bytes
  description: string;
}

export const SUPPORTED_FILE_TYPES: SupportedFileType[] = [
  {
    extension: '.pdf',
    mimeType: 'application/pdf',
    icon: FileText,
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'PDF documents'
  },
  {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    icon: FileText,
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Word documents'
  },
  {
    extension: '.doc',
    mimeType: 'application/msword',
    icon: FileText,
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Word documents'
  },
  {
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    icon: FileSpreadsheet,
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Excel spreadsheets'
  },
  {
    extension: '.xls',
    mimeType: 'application/vnd.ms-excel',
    icon: FileSpreadsheet,
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Excel spreadsheets'
  },
  {
    extension: '.txt',
    mimeType: 'text/plain',
    icon: FileText,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Text files'
  },
  {
    extension: '.md',
    mimeType: 'text/markdown',
    icon: FileText,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Markdown files'
  },
  {
    extension: '.jpg',
    mimeType: 'image/jpeg',
    icon: ImageIcon,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'JPEG images'
  },
  {
    extension: '.jpeg',
    mimeType: 'image/jpeg',
    icon: ImageIcon,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'JPEG images'
  },
  {
    extension: '.png',
    mimeType: 'image/png',
    icon: ImageIcon,
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'PNG images'
  }
];

interface FileUploadInterfaceProps {
  files: FileUploadItem[];
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  onUploadComplete?: (fileId: string, result: any) => void;
  onUploadError?: (fileId: string, error: Error) => void;
  maxFiles?: number;
  disabled?: boolean;
  knowledgeBaseId?: string;
  enableChunkedUpload?: boolean;
  chunkSize?: number;
}

function getFileIcon(file: File): React.ComponentType<{ className?: string }> {
  const fileType = SUPPORTED_FILE_TYPES.find(type => 
    file.type === type.mimeType || file.name.toLowerCase().endsWith(type.extension)
  );
  return fileType?.icon || FileIcon;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function validateFile(file: File): { valid: boolean; error?: string } {
  const fileType = SUPPORTED_FILE_TYPES.find(type => 
    file.type === type.mimeType || file.name.toLowerCase().endsWith(type.extension)
  );

  if (!fileType) {
    return {
      valid: false,
      error: `File type not supported. Supported types: ${SUPPORTED_FILE_TYPES.map(t => t.extension).join(', ')}`
    };
  }

  if (file.size > fileType.maxSize) {
    return {
      valid: false,
      error: `File size exceeds limit. Maximum size for ${fileType.extension} files is ${formatFileSize(fileType.maxSize)}`
    };
  }

  return { valid: true };
}

export default function FileUploadInterface({ 
  files, 
  onFilesAdded, 
  onFileRemove,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  disabled = false,
  knowledgeBaseId = 'default',
  enableChunkedUpload = true,
  chunkSize = 1024 * 1024 // 1MB default
}: FileUploadInterfaceProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set());
  const [uploadFileIds, setUploadFileIds] = useState<string[]>([]);

  // Update upload file IDs when files change
  useEffect(() => {
    const fileIds = files.map(f => f.id);
    setUploadFileIds(fileIds);
  }, [files]);

  const startChunkedUpload = async (file: File): Promise<string> => {
    const options: ChunkUploadOptions = {
      chunkSize,
      maxRetries: 3,
      retryDelay: 1000,
      onProgress: (progress: ChunkUploadProgress) => {
        // Update file status based on progress
        const fileItem = files.find(f => f.id === progress.fileId);
        if (fileItem) {
          fileItem.status = progress.status === 'completed' ? 'complete' : 
                           progress.status === 'error' ? 'error' :
                           progress.status === 'processing' ? 'processing' :
                           progress.status === 'paused' ? 'paused' : 'uploading';
          fileItem.progress = progress.progress;
          if (progress.error) {
            fileItem.error = progress.error;
          }
        }
      },
      onComplete: (fileId: string, result: any) => {
        setActiveUploads(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        onUploadComplete?.(fileId, result);
      },
      onError: (fileId: string, error: Error) => {
        setActiveUploads(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        onUploadError?.(fileId, error);
      },
    };

    try {
      const result = await chunkedUploadService.uploadFile(file, knowledgeBaseId, options);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationErrors([]);
    const errors: string[] = [];

    // Check if adding these files would exceed the limit
    if (files.length + acceptedFiles.length > maxFiles) {
      errors.push(`Cannot upload more than ${maxFiles} files at once`);
    }

    // Validate each accepted file
    const validFiles: File[] = [];
    acceptedFiles.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    // Handle rejected files
    rejectedFiles.forEach(({ file, errors: fileErrors }) => {
      const errorMessages = fileErrors.map((error: any) => {
        switch (error.code) {
          case 'file-too-large':
            return 'File is too large';
          case 'file-invalid-type':
            return 'File type not supported';
          default:
            return error.message;
        }
      });
      errors.push(`${file.name}: ${errorMessages.join(', ')}`);
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
    }

    if (validFiles.length > 0) {
      // Add files to the list first
      onFilesAdded(validFiles);

      // Start chunked uploads if enabled
      if (enableChunkedUpload) {
        for (const file of validFiles) {
          const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setActiveUploads(prev => new Set(prev).add(fileId));
          
          try {
            await startChunkedUpload(file);
          } catch (error) {
            console.error('Upload failed:', error);
          }
        }
      }
    }
  }, [files.length, maxFiles, onFilesAdded, enableChunkedUpload, knowledgeBaseId, chunkSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FILE_TYPES.reduce((acc, type) => {
      acc[type.mimeType] = [type.extension];
      return acc;
    }, {} as Record<string, string[]>),
    disabled,
    multiple: true
  });

  const clearErrors = () => setValidationErrors([]);

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/10 scale-[1.02]' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className={`transition-transform duration-200 ${isDragActive ? 'scale-110' : ''}`}>
            <Upload className={`h-12 w-12 mx-auto ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
          </div>
          
          {isDragActive ? (
            <div>
              <p className="text-lg font-medium text-primary">Drop files here to upload</p>
              <p className="text-sm text-primary/70">Release to add files</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-700">
                Drag & drop files here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Upload up to {maxFiles} files at once
              </p>
            </div>
          )}
          
          {/* Supported file types */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {SUPPORTED_FILE_TYPES.slice(0, 6).map((type) => (
              <Badge key={type.extension} variant="secondary" className="text-xs">
                {type.extension.toUpperCase()}
              </Badge>
            ))}
            {SUPPORTED_FILE_TYPES.length > 6 && (
              <Badge variant="secondary" className="text-xs">
                +{SUPPORTED_FILE_TYPES.length - 6} more
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Upload errors:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearErrors}
                className="mt-2"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* File Upload Progress */}
      {enableChunkedUpload && uploadFileIds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">
              File Uploads ({files.length}/{maxFiles})
            </h4>
            {files.some(f => f.status === 'complete') && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {files.filter(f => f.status === 'complete').length} completed
              </Badge>
            )}
          </div>
          
          <FileUploadProgress
            fileIds={uploadFileIds}
            onFileRemove={(fileId) => {
              onFileRemove(fileId);
              setUploadFileIds(prev => prev.filter(id => id !== fileId));
            }}
            onRetry={(fileId) => {
              const fileItem = files.find(f => f.id === fileId);
              if (fileItem && enableChunkedUpload) {
                startChunkedUpload(fileItem.file);
              }
            }}
            showOverallProgress={files.length > 1}
          />
        </div>
      )}

      {/* Legacy File List (when chunked upload is disabled) */}
      {!enableChunkedUpload && files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">
              Uploaded Files ({files.length}/{maxFiles})
            </h4>
            {files.some(f => f.status === 'complete') && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {files.filter(f => f.status === 'complete').length} processed
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            {files.map((fileItem) => {
              const IconComponent = getFileIcon(fileItem.file);
              
              return (
                <div 
                  key={fileItem.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg bg-white"
                >
                  <div className="flex-shrink-0">
                    <IconComponent className="h-8 w-8 text-gray-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileItem.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(fileItem.file.size)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileRemove(fileItem.id)}
                          className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress and Status */}
                    <div className="mt-2">
                      {fileItem.status === 'uploading' && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-blue-600">Uploading...</span>
                            <span className="text-gray-500">{fileItem.progress}%</span>
                          </div>
                          <Progress value={fileItem.progress} className="h-1" />
                        </div>
                      )}
                      
                      {fileItem.status === 'processing' && (
                        <div className="flex items-center space-x-2 text-xs text-orange-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Processing content...</span>
                        </div>
                      )}
                      
                      {fileItem.status === 'complete' && (
                        <div className="flex items-center space-x-2 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Ready for use</span>
                        </div>
                      )}

                      {fileItem.status === 'paused' && (
                        <div className="flex items-center space-x-2 text-xs text-yellow-600">
                          <Pause className="h-3 w-3" />
                          <span>Upload paused</span>
                        </div>
                      )}
                      
                      {fileItem.status === 'error' && (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>Upload failed</span>
                          </div>
                          {fileItem.error && (
                            <p className="text-xs text-red-500">{fileItem.error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Type Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-700 mb-2">Supported File Types</h5>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
          {SUPPORTED_FILE_TYPES.map((type) => (
            <div key={type.extension} className="flex items-center space-x-2">
              <type.icon className="h-3 w-3" />
              <span>{type.description}</span>
              <span className="text-gray-400">({formatFileSize(type.maxSize)} max)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}