import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Image, 
  FileSpreadsheet,
  FileCode,
  Trash2, 
  Check, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Download,
  Search,
  Filter,
  Zap,
  Database,
  Eye,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  knowledgeBaseId?: string;
  chunks?: number;
  errorMessage?: string;
  processingStats?: {
    startTime: Date;
    endTime?: Date;
    tokensProcessed?: number;
    chunksCreated?: number;
  };
}

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documents_count: number;
  size_bytes: number;
  status: 'active' | 'processing' | 'error';
}

interface DocumentUploadInterfaceProps {
  knowledgeBaseId?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
}

const SUPPORTED_FILE_TYPES = {
  'application/pdf': { name: 'PDF Document', icon: FileText, color: 'text-red-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { name: 'Word Document', icon: FileText, color: 'text-blue-500' },
  'text/plain': { name: 'Text File', icon: FileText, color: 'text-gray-500' },
  'application/vnd.ms-excel': { name: 'Excel File', icon: FileSpreadsheet, color: 'text-green-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { name: 'Excel File', icon: FileSpreadsheet, color: 'text-green-500' },
  'text/csv': { name: 'CSV File', icon: FileSpreadsheet, color: 'text-green-500' },
  'application/json': { name: 'JSON File', icon: FileCode, color: 'text-yellow-500' },
  'image/jpeg': { name: 'JPEG Image', icon: Image, color: 'text-purple-500' },
  'image/png': { name: 'PNG Image', icon: Image, color: 'text-purple-500' },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_BATCH_SIZE = 20;

export default function DocumentUploadInterface({ 
  knowledgeBaseId, 
  onUploadComplete 
}: DocumentUploadInterfaceProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState(knowledgeBaseId || '');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [processingOptions, setProcessingOptions] = useState({
    chunkSize: 1000,
    chunkOverlap: 200,
    enableOCR: true,
    extractImages: false,
    processMetadata: true
  });

  const queryClient = useQueryClient();

  // Fetch knowledge bases
  const { data: knowledgeBases } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeBase[];
    }
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, knowledgeBaseId }: { file: File; knowledgeBaseId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('knowledgeBaseId', knowledgeBaseId);
      formData.append('processingOptions', JSON.stringify(processingOptions));

      const response = await fetch('/.netlify/functions/upload-chunk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    }
  });

  // Batch upload mutation
  const batchUploadMutation = useMutation({
    mutationFn: async (files: UploadedFile[]) => {
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const fileUpload = files[i];
        if (fileUpload.status !== 'pending') continue;

        try {
          // Update status to uploading
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { ...f, status: 'uploading', progress: 10, processingStats: { startTime: new Date() } }
              : f
          ));

          // Upload file
          const result = await uploadFileMutation.mutateAsync({
            file: fileUpload.file,
            knowledgeBaseId: selectedKnowledgeBase
          });

          // Update to processing
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { ...f, status: 'processing', progress: 50 }
              : f
          ));

          // Simulate processing steps
          await simulateProcessing(fileUpload.id);

          results.push(result);
        } catch (error) {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { 
                  ...f, 
                  status: 'error', 
                  progress: 0, 
                  errorMessage: error instanceof Error ? error.message : 'Unknown error'
                }
              : f
          ));
        }
      }

      return results;
    },
    onSuccess: (results) => {
      toast.success(`Successfully processed ${results.length} files`);
      setBatchProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
      onUploadComplete?.(uploadedFiles.filter(f => f.status === 'completed'));
    },
    onError: (error) => {
      toast.error('Batch upload failed: ' + error.message);
      setBatchProcessing(false);
    }
  });

  // Simulate processing steps for demo
  const simulateProcessing = async (fileId: string) => {
    const steps = [
      { progress: 60, message: 'Extracting text content...' },
      { progress: 70, message: 'Creating document chunks...' },
      { progress: 85, message: 'Generating embeddings...' },
      { progress: 95, message: 'Indexing for search...' },
      { progress: 100, message: 'Processing completed' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              progress: step.progress,
              status: step.progress === 100 ? 'completed' : 'processing'
            }
          : f
      ));
    }

    // Add final stats
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { 
            ...f,
            processingStats: {
              ...f.processingStats!,
              endTime: new Date(),
              tokensProcessed: Math.floor(Math.random() * 10000) + 1000,
              chunksCreated: Math.floor(Math.random() * 50) + 5
            }
          }
        : f
    ));
  };

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (uploadedFiles.length + acceptedFiles.length > MAX_BATCH_SIZE) {
      toast.error(`Maximum ${MAX_BATCH_SIZE} files allowed per batch`);
      return;
    }

    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum file size is 50MB.`);
        return false;
      }
      if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
        toast.error(`${file.name} is not a supported file type.`);
        return false;
      }
      return true;
    });

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0,
      knowledgeBaseId: selectedKnowledgeBase
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, [uploadedFiles.length, selectedKnowledgeBase]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.keys(SUPPORTED_FILE_TYPES).reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as any),
    multiple: true
  });

  // Remove file
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Retry failed file
  const retryFile = (fileId: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'pending', progress: 0, errorMessage: undefined }
        : f
    ));
  };

  // Start batch processing
  const startBatchProcessing = () => {
    if (!selectedKnowledgeBase) {
      toast.error('Please select a knowledge base');
      return;
    }

    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast.error('No files ready for processing');
      return;
    }

    setBatchProcessing(true);
    batchUploadMutation.mutate(pendingFiles);
  };

  // Clear all files
  const clearAllFiles = () => {
    setUploadedFiles([]);
  };

  // Filter files
  const filteredFiles = uploadedFiles.filter(file => {
    const matchesSearch = file.file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || file.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getFileTypeInfo = (mimeType: string) => {
    return SUPPORTED_FILE_TYPES[mimeType as keyof typeof SUPPORTED_FILE_TYPES] || 
           { name: 'Unknown', icon: FileText, color: 'text-gray-500' };
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'uploading': return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'processing': return <Zap className="w-4 h-4 text-purple-500 animate-pulse" />;
      case 'completed': return <Check className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    const variants = {
      pending: 'secondary',
      uploading: 'default',
      processing: 'default',
      completed: 'default',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Document Upload</h3>
          <p className="text-muted-foreground">
            Upload and process documents for your knowledge base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {uploadedFiles.length} files
          </Badge>
          <Badge variant="outline">
            {uploadedFiles.filter(f => f.status === 'completed').length} processed
          </Badge>
        </div>
      </div>

      {/* Knowledge Base Selection & Upload Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Knowledge Base Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Target Knowledge Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedKnowledgeBase} onValueChange={setSelectedKnowledgeBase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a knowledge base" />
                </SelectTrigger>
                <SelectContent>
                  {knowledgeBases?.map(kb => (
                    <SelectItem key={kb.id} value={kb.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{kb.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {kb.documents_count} docs
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* File Upload Area */}
          <Card>
            <CardContent className="p-6">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  !selectedKnowledgeBase && "opacity-50 cursor-not-allowed"
                )}
              >
                <input {...getInputProps()} disabled={!selectedKnowledgeBase} />
                <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-lg">Drop the files here...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg">Drag & drop files here, or click to select</p>
                    <p className="text-sm text-muted-foreground">
                      Supports: PDF, DOCX, TXT, CSV, JSON, Images (max 50MB each, {MAX_BATCH_SIZE} files max)
                    </p>
                    {!selectedKnowledgeBase && (
                      <p className="text-sm text-red-500">Please select a knowledge base first</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Processing Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Chunk Size (tokens)</Label>
              <Input
                type="number"
                min="100"
                max="2000"
                value={processingOptions.chunkSize}
                onChange={(e) => setProcessingOptions(prev => ({ 
                  ...prev, 
                  chunkSize: parseInt(e.target.value) 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Chunk Overlap (tokens)</Label>
              <Input
                type="number"
                min="0"
                max="500"
                value={processingOptions.chunkOverlap}
                onChange={(e) => setProcessingOptions(prev => ({ 
                  ...prev, 
                  chunkOverlap: parseInt(e.target.value) 
                }))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-ocr"
                  checked={processingOptions.enableOCR}
                  onCheckedChange={(checked) => setProcessingOptions(prev => ({ 
                    ...prev, 
                    enableOCR: !!checked 
                  }))}
                />
                <Label htmlFor="enable-ocr">Enable OCR</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="extract-images"
                  checked={processingOptions.extractImages}
                  onCheckedChange={(checked) => setProcessingOptions(prev => ({ 
                    ...prev, 
                    extractImages: !!checked 
                  }))}
                />
                <Label htmlFor="extract-images">Extract Images</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="process-metadata"
                  checked={processingOptions.processMetadata}
                  onCheckedChange={(checked) => setProcessingOptions(prev => ({ 
                    ...prev, 
                    processMetadata: !!checked 
                  }))}
                />
                <Label htmlFor="process-metadata">Process Metadata</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={startBatchProcessing}
                  disabled={batchProcessing || !selectedKnowledgeBase || uploadedFiles.filter(f => f.status === 'pending').length === 0}
                >
                  {batchProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Process All
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={clearAllFiles}>
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="uploading">Uploading</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File List */}
            <div className="space-y-3">
              {filteredFiles.map((fileUpload) => {
                const fileTypeInfo = getFileTypeInfo(fileUpload.file.type);
                const Icon = fileTypeInfo.icon;
                
                return (
                  <div key={fileUpload.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className={cn("w-6 h-6", fileTypeInfo.color)} />
                        <div>
                          <p className="font-medium">{fileUpload.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(fileUpload.file.size / (1024 * 1024)).toFixed(1)} MB • {fileTypeInfo.name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(fileUpload.status)}
                        
                        {fileUpload.status === 'error' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryFile(fileUpload.id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(fileUpload.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(fileUpload.status === 'uploading' || fileUpload.status === 'processing') && (
                      <div className="space-y-2">
                        <Progress value={fileUpload.progress} className="w-full" />
                        <p className="text-xs text-muted-foreground">
                          {fileUpload.progress}% complete
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {fileUpload.status === 'error' && fileUpload.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        {fileUpload.errorMessage}
                      </div>
                    )}

                    {/* Processing Stats */}
                    {fileUpload.status === 'completed' && fileUpload.processingStats && (
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Processing Time:</span> {
                            fileUpload.processingStats.endTime && fileUpload.processingStats.startTime
                              ? Math.round((fileUpload.processingStats.endTime.getTime() - fileUpload.processingStats.startTime.getTime()) / 1000)
                              : 0
                          }s
                        </div>
                        <div>
                          <span className="font-medium">Tokens:</span> {fileUpload.processingStats.tokensProcessed?.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Chunks:</span> {fileUpload.processingStats.chunksCreated}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> Ready
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}