import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import FileUploadInterface, { FileUploadItem } from './FileUploadInterface';

export default function ChunkedUploadDemo() {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesAdded = (newFiles: File[]) => {
    const newFileItems: FileUploadItem[] = newFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'uploading',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFileItems]);
    setIsUploading(true);

    // Simulate upload progress for demo
    newFileItems.forEach(fileItem => {
      simulateUploadProgress(fileItem.id);
    });
  };

  const handleFileRemove = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUploadComplete = (fileId: string, result: any) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'complete', progress: 100 }
        : f
    ));
    
    // Check if all uploads are complete
    const allComplete = files.every(f => f.id === fileId || f.status === 'complete');
    if (allComplete) {
      setIsUploading(false);
    }
  };

  const handleUploadError = (fileId: string, error: Error) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'error', error: error.message }
        : f
    ));
  };

  const simulateUploadProgress = async (fileId: string) => {
    // Simulate chunked upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress } : f
      ));
    }

    // Simulate processing
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'processing' } : f
    ));

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Complete
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'complete', progress: 100 } : f
    ));

    setIsUploading(false);
  };

  const clearAll = () => {
    setFiles([]);
    setIsUploading(false);
  };

  const getStatusSummary = () => {
    const total = files.length;
    const completed = files.filter(f => f.status === 'complete').length;
    const failed = files.filter(f => f.status === 'error').length;
    const uploading = files.filter(f => f.status === 'uploading' || f.status === 'processing').length;

    return { total, completed, failed, uploading };
  };

  const { total, completed, failed, uploading } = getStatusSummary();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Chunked File Upload Demo</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Demonstrates real-time upload progress, chunked uploads, pause/resume functionality, and retry mechanisms.
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Status Summary */}
          {total > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Upload Status</h3>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{total}</div>
                  <div className="text-sm text-gray-500">Total Files</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{completed}</div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{uploading}</div>
                  <div className="text-sm text-gray-500">Uploading</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{failed}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Interface */}
          <FileUploadInterface
            files={files}
            onFilesAdded={handleFilesAdded}
            onFileRemove={handleFileRemove}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            maxFiles={20}
            disabled={isUploading}
            knowledgeBaseId="demo-kb"
            enableChunkedUpload={true}
            chunkSize={1024 * 512} // 512KB chunks for demo
          />

          {/* Features Demonstration */}
          {files.length === 0 && (
            <div className="mt-8 grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Key Features</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">✓</Badge>
                      <span>Chunked file upload for large files</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">✓</Badge>
                      <span>Real-time progress tracking</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">✓</Badge>
                      <span>Individual and overall progress</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">✓</Badge>
                      <span>Pause and resume functionality</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">✓</Badge>
                      <span>Automatic retry on failures</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">✓</Badge>
                      <span>Upload speed and time estimation</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Supported Files</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• PDF documents (50MB)</div>
                    <div>• Word documents (25MB)</div>
                    <div>• Excel spreadsheets (25MB)</div>
                    <div>• Text files (10MB)</div>
                    <div>• Markdown files (10MB)</div>
                    <div>• Images (10MB)</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Files are automatically chunked for reliable upload and processing.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}