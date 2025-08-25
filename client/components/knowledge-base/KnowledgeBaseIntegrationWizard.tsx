import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Eye, 
  Check, 
  AlertCircle, 
  Clock, 
  Database, 
  Search,
  Plus,
  Settings,
  BookOpen,
  Zap,
  Brain,
  Target
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documents_count: number;
  size_bytes: number;
  status: 'active' | 'processing' | 'error';
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  knowledge_base_id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  status: 'processed' | 'processing' | 'error';
  metadata: any;
  created_at: string;
  processed_at?: string;
}

interface ProcessingStatus {
  documentId: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'chunking' | 'vectorizing' | 'completed' | 'error';
  progress: number;
  message?: string;
  error?: string;
}

interface KnowledgeBaseIntegrationWizardProps {
  agentId?: string;
  onComplete: (knowledgeBases: string[]) => void;
  onBack: () => void;
  initialData?: {
    selectedKnowledgeBases?: string[];
    uploadedDocuments?: File[];
  };
}

const SUPPORTED_FILE_TYPES = {
  'application/pdf': 'PDF Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'text/plain': 'Text File',
  'application/vnd.ms-excel': 'Excel File',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel File',
  'text/csv': 'CSV File',
  'application/json': 'JSON File',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function KnowledgeBaseIntegrationWizard({
  agentId,
  onComplete,
  onBack,
  initialData
}: KnowledgeBaseIntegrationWizardProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'upload' | 'configure'>('existing');
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>(
    initialData?.selectedKnowledgeBases || []
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processingStatuses, setProcessingStatuses] = useState<Map<string, ProcessingStatus>>(new Map());
  const [newKnowledgeBaseName, setNewKnowledgeBaseName] = useState('');
  const [newKnowledgeBaseDescription, setNewKnowledgeBaseDescription] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreatingKB, setIsCreatingKB] = useState(false);
  
  // Configuration settings
  const [retrievalSettings, setRetrievalSettings] = useState({
    mode: 'hybrid' as 'semantic' | 'keyword' | 'hybrid',
    confidenceThreshold: 0.7,
    maxResults: 5,
    chunkSize: 1000,
    chunkOverlap: 200
  });

  const queryClient = useQueryClient();

  // Fetch existing knowledge bases
  const { data: knowledgeBases, isLoading: loadingKB } = useQuery({
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

  // Create knowledge base mutation
  const createKnowledgeBaseMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: kb, error } = await supabase
        .from('knowledge_bases')
        .insert({
          user_id: user.user.id,
          name: data.name,
          description: data.description,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return kb;
    },
    onSuccess: (newKB) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
      setSelectedKnowledgeBases(prev => [...prev, newKB.id]);
      setShowCreateDialog(false);
      setNewKnowledgeBaseName('');
      setNewKnowledgeBaseDescription('');
      toast.success('Knowledge base created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create knowledge base: ' + error.message);
    }
  });

  // File upload functionality
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
        toast.error(`${file.name} is not a supported file type.`);
        return false;
      }
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    // Initialize processing status for new files
    validFiles.forEach(file => {
      const fileId = `${file.name}-${Date.now()}`;
      setProcessingStatuses(prev => new Map(prev).set(fileId, {
        documentId: fileId,
        fileName: file.name,
        status: 'uploading',
        progress: 0
      }));
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.keys(SUPPORTED_FILE_TYPES).reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as any),
    multiple: true
  });

  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Process uploaded files
  const processUploadedFiles = async (knowledgeBaseId: string) => {
    if (uploadedFiles.length === 0) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const fileId = `${file.name}-${Date.now()}`;
      
      try {
        // Update status to processing
        setProcessingStatuses(prev => new Map(prev).set(fileId, {
          documentId: fileId,
          fileName: file.name,
          status: 'processing',
          progress: 25,
          message: 'Starting file processing...'
        }));

        // Create form data for chunked upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('knowledgeBaseId', knowledgeBaseId);

        // Simulate chunked upload process
        const response = await fetch('/.netlify/functions/finalize-upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();

        // Update processing status
        setProcessingStatuses(prev => new Map(prev).set(fileId, {
          documentId: fileId,
          fileName: file.name,
          status: 'completed',
          progress: 100,
          message: 'File processed successfully'
        }));

      } catch (error) {
        setProcessingStatuses(prev => new Map(prev).set(fileId, {
          documentId: fileId,
          fileName: file.name,
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        toast.error(`Failed to process ${file.name}`);
      }
    }
  };

  // Handle create new knowledge base
  const handleCreateKnowledgeBase = () => {
    if (!newKnowledgeBaseName.trim()) {
      toast.error('Please enter a knowledge base name');
      return;
    }
    
    setIsCreatingKB(true);
    createKnowledgeBaseMutation.mutate({
      name: newKnowledgeBaseName,
      description: newKnowledgeBaseDescription
    });
    setIsCreatingKB(false);
  };

  // Handle completion
  const handleComplete = async () => {
    if (selectedKnowledgeBases.length === 0 && uploadedFiles.length === 0) {
      toast.error('Please select at least one knowledge base or upload documents');
      return;
    }

    // If files were uploaded, process them
    if (uploadedFiles.length > 0 && selectedKnowledgeBases.length > 0) {
      await processUploadedFiles(selectedKnowledgeBases[0]);
    }

    onComplete(selectedKnowledgeBases);
  };

  const canProceed = selectedKnowledgeBases.length > 0 || uploadedFiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Knowledge Base Integration</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Connect your agent to knowledge bases or upload documents to enhance its capabilities with your business information.
        </p>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="existing" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Existing Knowledge Bases
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Documents
          </TabsTrigger>
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Existing Knowledge Bases Tab */}
        <TabsContent value="existing" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Select Knowledge Bases</h3>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </div>

          {loadingKB ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : knowledgeBases && knowledgeBases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeBases.map((kb) => (
                <Card 
                  key={kb.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedKnowledgeBases.includes(kb.id) && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    setSelectedKnowledgeBases(prev => 
                      prev.includes(kb.id) 
                        ? prev.filter(id => id !== kb.id)
                        : [...prev, kb.id]
                    );
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{kb.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {kb.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <Checkbox 
                        checked={selectedKnowledgeBases.includes(kb.id)}
                        onChange={() => {}}
                      />
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Documents:</span>
                        <span className="font-medium">{kb.documents_count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-medium">
                          {(kb.size_bytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge 
                          variant={kb.status === 'active' ? 'default' : 
                                  kb.status === 'processing' ? 'secondary' : 'destructive'}
                        >
                          {kb.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Knowledge Bases Found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first knowledge base to get started.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Knowledge Base
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upload Documents Tab */}
        <TabsContent value="upload" className="space-y-4">
          <h3 className="text-lg font-semibold">Upload Documents</h3>
          
          {/* File Upload Area */}
          <Card>
            <CardContent className="p-6">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-lg">Drop the files here...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg">Drag & drop files here, or click to select</p>
                    <p className="text-sm text-muted-foreground">
                      Supports: PDF, DOCX, TXT, CSV, JSON (max 10MB each)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => {
                    const fileId = `${file.name}-${Date.now()}`;
                    const status = processingStatuses.get(fileId);
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB • {SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {status && (
                            <div className="flex items-center space-x-2">
                              {status.status === 'completed' && (
                                <Check className="w-5 h-5 text-green-500" />
                              )}
                              {status.status === 'error' && (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                              )}
                              {status.status === 'processing' && (
                                <Clock className="w-5 h-5 text-yellow-500 animate-spin" />
                              )}
                            </div>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => removeFile(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Status */}
          {processingStatuses.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(processingStatuses.values()).map((status) => (
                    <div key={status.documentId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{status.fileName}</span>
                        <Badge 
                          variant={
                            status.status === 'completed' ? 'default' :
                            status.status === 'error' ? 'destructive' : 'secondary'
                          }
                        >
                          {status.status}
                        </Badge>
                      </div>
                      <Progress value={status.progress} className="w-full" />
                      {status.message && (
                        <p className="text-sm text-muted-foreground">{status.message}</p>
                      )}
                      {status.error && (
                        <p className="text-sm text-red-500">{status.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configure" className="space-y-4">
          <h3 className="text-lg font-semibold">Retrieval Configuration</h3>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Retrieval Settings
              </CardTitle>
              <CardDescription>
                Configure how your agent searches and retrieves information from knowledge bases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Retrieval Mode</Label>
                  <Select 
                    value={retrievalSettings.mode} 
                    onValueChange={(value: any) => setRetrievalSettings(prev => ({ ...prev, mode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semantic">Semantic (AI-powered)</SelectItem>
                      <SelectItem value="keyword">Keyword Matching</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Hybrid mode combines semantic understanding with keyword matching for best results.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Confidence Threshold</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={retrievalSettings.confidenceThreshold}
                    onChange={(e) => setRetrievalSettings(prev => ({ 
                      ...prev, 
                      confidenceThreshold: parseFloat(e.target.value) 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum confidence score (0-1) for retrieved content.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={retrievalSettings.maxResults}
                    onChange={(e) => setRetrievalSettings(prev => ({ 
                      ...prev, 
                      maxResults: parseInt(e.target.value) 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of document chunks to retrieve per query.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Chunk Size</Label>
                  <Input
                    type="number"
                    min="100"
                    max="2000"
                    step="100"
                    value={retrievalSettings.chunkSize}
                    onChange={(e) => setRetrievalSettings(prev => ({ 
                      ...prev, 
                      chunkSize: parseInt(e.target.value) 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Size of document chunks in tokens (larger = more context, slower processing).
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Performance Optimization
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <Card className="p-4">
                    <Zap className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                    <h5 className="font-medium">Speed</h5>
                    <p className="text-sm text-muted-foreground">Fast response times</p>
                  </Card>
                  <Card className="p-4">
                    <Search className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <h5 className="font-medium">Accuracy</h5>
                    <p className="text-sm text-muted-foreground">Precise results</p>
                  </Card>
                  <Card className="p-4">
                    <Brain className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <h5 className="font-medium">Context</h5>
                    <p className="text-sm text-muted-foreground">Rich understanding</p>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleComplete}
          disabled={!canProceed}
        >
          Continue to Channel Setup
        </Button>
      </div>

      {/* Create Knowledge Base Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Knowledge Base</DialogTitle>
            <DialogDescription>
              Create a new knowledge base to organize your documents and information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kb-name">Name *</Label>
              <Input
                id="kb-name"
                placeholder="e.g., Product Documentation"
                value={newKnowledgeBaseName}
                onChange={(e) => setNewKnowledgeBaseName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kb-description">Description</Label>
              <Textarea
                id="kb-description"
                placeholder="Describe what this knowledge base contains..."
                value={newKnowledgeBaseDescription}
                onChange={(e) => setNewKnowledgeBaseDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateKnowledgeBase}
              disabled={!newKnowledgeBaseName.trim() || isCreatingKB}
            >
              {isCreatingKB ? 'Creating...' : 'Create Knowledge Base'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}