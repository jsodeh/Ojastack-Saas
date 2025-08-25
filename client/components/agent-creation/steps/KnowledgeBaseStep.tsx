import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  FileText, 
  Calendar, 
  HardDrive, 
  Eye, 
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Plus,
  Share2,
  Shield,
  Users,
  Zap
} from 'lucide-react';
import { useAgentCreation } from '../AgentCreationContext';
import { 
  KnowledgeBase, 
  formatFileSize, 
  formatTimeAgo,
  getStatusColor,
  getStatusIcon,
  KnowledgeBaseServiceError
} from '@/lib/knowledge-base-service';
import { 
  agentKnowledgeBaseIntegration,
  type SharedKnowledgeBase,
  type UploadedDocument,
  type KnowledgeBaseValidationResult,
  getKnowledgeBaseRequirementsForAgent,
  formatValidationResult
} from '@/lib/agent-knowledge-base-integration';
import { useProfile } from '@/hooks/useProfile';
import FileUploadInterface, { FileUploadItem } from '../FileUploadInterface';

interface KnowledgeBasePreviewModalProps {
  knowledgeBase: KnowledgeBase | SharedKnowledgeBase;
  isOpen: boolean;
  onClose: () => void;
}

function KnowledgeBasePreviewModal({ knowledgeBase, isOpen, onClose }: KnowledgeBasePreviewModalProps) {
  const isShared = 'permission' in knowledgeBase;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold">{knowledgeBase.name}</h3>
              {isShared && (
                <Badge variant="outline">
                  <Share2 className="h-3 w-3 mr-1" />
                  Shared
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
          {isShared && (
            <p className="text-sm text-muted-foreground mt-2">
              Shared by user • {(knowledgeBase as SharedKnowledgeBase).permission} access
            </p>
          )}
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-muted-foreground">
              {knowledgeBase.description || 'No description provided'}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Documents:</span>
                  <span>{knowledgeBase.documentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Size:</span>
                  <span>{formatFileSize(knowledgeBase.totalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge className={getStatusColor(knowledgeBase.status)}>
                    {getStatusIcon(knowledgeBase.status)} {knowledgeBase.status}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Timeline</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{formatTimeAgo(knowledgeBase.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span>{formatTimeAgo(knowledgeBase.lastUpdated)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Sample Content</h4>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground">
                Content preview will be available once document processing is complete.
                This knowledge base contains {knowledgeBase.documentCount} documents
                that can be used to answer questions related to your specific domain.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50">
          <Button onClick={onClose} className="w-full">
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
}

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase | SharedKnowledgeBase;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onPreview: (knowledgeBase: KnowledgeBase | SharedKnowledgeBase) => void;
}

function KnowledgeBaseCard({ knowledgeBase, isSelected, onToggleSelection, onPreview }: KnowledgeBaseCardProps) {
  const isShared = 'permission' in knowledgeBase;
  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(knowledgeBase.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-base">{knowledgeBase.name}</CardTitle>
                {isShared && (
                  <Badge variant="outline" className="text-xs">
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                {knowledgeBase.description || 'No description provided'}
                {isShared && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    Shared by user • {(knowledgeBase as SharedKnowledgeBase).permission} access
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isShared && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {(knowledgeBase as SharedKnowledgeBase).permission}
              </Badge>
            )}
            <Badge className={getStatusColor(knowledgeBase.status)}>
              {getStatusIcon(knowledgeBase.status)} {knowledgeBase.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{knowledgeBase.documentCount} docs</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>{formatFileSize(knowledgeBase.totalSize)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatTimeAgo(knowledgeBase.lastUpdated)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Created {formatTimeAgo(knowledgeBase.createdAt)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(knowledgeBase)}
            className="flex items-center space-x-1"
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { StepProps } from '../AgentCreationWizard';

export default function KnowledgeBaseStep({ onNext, onPrevious }: StepProps) {
  const { state, setKnowledgeBases, dispatch, setStepValidation } = useAgentCreation();
  const { profile } = useProfile();
  const [ownedKBs, setOwnedKBs] = useState<KnowledgeBase[]>([]);
  const [sharedKBs, setSharedKBs] = useState<SharedKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewKB, setPreviewKB] = useState<KnowledgeBase | SharedKnowledgeBase | null>(null);
  const [selectedKBs, setSelectedKBs] = useState<string[]>(state.knowledgeBases);
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadItem[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [showUploadInterface, setShowUploadInterface] = useState(false);
  
  // Validation state
  const [validationResult, setValidationResult] = useState<KnowledgeBaseValidationResult | null>(null);
  const [processingProgress, setProcessingProgress] = useState<{
    total: number;
    processing: number;
    completed: number;
    failed: number;
    percentage: number;
  } | null>(null);
  
  // Real-time monitoring
  const [sessionId] = useState(() => `kb-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Load knowledge bases on component mount
  useEffect(() => {
    if (profile?.id) {
      loadKnowledgeBases();
      startRealTimeMonitoring();
    }
    
    return () => {
      stopRealTimeMonitoring();
    };
  }, [profile?.id]);

  // Update context when selection changes
  useEffect(() => {
    setKnowledgeBases(selectedKBs);
    
    // Update the context with uploaded files info
    if (uploadedDocs.length > 0) {
      dispatch({ 
        type: 'SET_NEW_KNOWLEDGE_BASE', 
        payload: {
          name: `${state.agentName} Knowledge Base`,
          files: uploadedDocs.map(doc => new File([], doc.fileName, { type: doc.fileType })),
          uploadProgress: new Map(uploadedDocs.map(doc => [doc.id, doc.progress])),
          processingStatus: new Map(uploadedDocs.map(doc => [doc.id, doc.status === 'completed' ? 'complete' : doc.status]))
        }
      });
    } else {
      dispatch({ type: 'SET_NEW_KNOWLEDGE_BASE', payload: undefined });
    }
    
    // Trigger validation update
    setTimeout(() => {
      dispatch({ type: 'MARK_UNSAVED_CHANGES', payload: true });
    }, 100);
    
    validateConfiguration();
  }, [selectedKBs, uploadedDocs, setKnowledgeBases, dispatch, state.agentName]);

  // Monitor processing progress
  useEffect(() => {
    if (selectedKBs.length > 0) {
      updateProcessingProgress();
    }
  }, [selectedKBs]);

  const loadKnowledgeBases = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const { owned, shared } = await agentKnowledgeBaseIntegration.getAvailableKnowledgeBases(profile.id);
      setOwnedKBs(owned);
      setSharedKBs(shared);
    } catch (err) {
      const errorMessage = err instanceof KnowledgeBaseServiceError 
        ? err.message 
        : 'Failed to load knowledge bases';
      setError(errorMessage);
      console.error('Error loading knowledge bases:', err);
    } finally {
      setLoading(false);
    }
  };

  const startRealTimeMonitoring = () => {
    if (!profile?.id || isMonitoring) return;
    
    setIsMonitoring(true);
    agentKnowledgeBaseIntegration.startRealTimeMonitoring(
      profile.id,
      sessionId,
      (data) => {
        // Update knowledge bases with real-time data
        if (data.knowledgeBases) {
          setOwnedKBs(data.knowledgeBases.filter((kb: KnowledgeBase) => kb.userId === profile.id));
        }
        updateProcessingProgress();
      },
      (error) => {
        console.error('Real-time monitoring error:', error);
      }
    );
  };

  const stopRealTimeMonitoring = () => {
    if (isMonitoring) {
      agentKnowledgeBaseIntegration.stopRealTimeMonitoring(sessionId);
      setIsMonitoring(false);
    }
  };

  const validateConfiguration = async () => {
    if (!profile?.id || (!selectedKBs.length && !uploadedDocs.length)) {
      setValidationResult(null);
      return;
    }

    try {
      const allKBs = [...ownedKBs, ...sharedKBs];
      const selectedKnowledgeBases = allKBs.filter(kb => selectedKBs.includes(kb.id));
      const requirements = getKnowledgeBaseRequirementsForAgent(state.capabilities || {
        text: { enabled: true, provider: 'openai', model: 'gpt-4' },
        voice: { enabled: false, provider: 'elevenlabs', voiceId: 'default' },
        image: { enabled: false },
        video: { enabled: false },
        tools: []
      });
      
      const result = agentKnowledgeBaseIntegration.validateKnowledgeBaseSelection(
        selectedKnowledgeBases,
        uploadedDocs,
        requirements,
        state.capabilities || {
          text: { enabled: true, provider: 'openai', model: 'gpt-4' },
          voice: { enabled: false, provider: 'elevenlabs', voiceId: 'default' },
          image: { enabled: false },
          video: { enabled: false },
          tools: []
        }
      );
      
      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const updateProcessingProgress = async () => {
    if (selectedKBs.length === 0) {
      setProcessingProgress(null);
      return;
    }

    try {
      const progress = await agentKnowledgeBaseIntegration.getKnowledgeBaseProcessingProgress(selectedKBs);
      setProcessingProgress(progress);
    } catch (error) {
      console.error('Error updating processing progress:', error);
    }
  };

  const handleToggleSelection = (id: string) => {
    setSelectedKBs(prev => 
      prev.includes(id) 
        ? prev.filter(kbId => kbId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const filteredKBs = getFilteredKnowledgeBases();
    const allSelected = filteredKBs.every(kb => selectedKBs.includes(kb.id));
    
    if (allSelected) {
      // Deselect all filtered KBs
      setSelectedKBs(prev => prev.filter(id => !filteredKBs.some(kb => kb.id === id)));
    } else {
      // Select all filtered KBs
      const newSelections = filteredKBs.map(kb => kb.id);
      setSelectedKBs(prev => [...new Set([...prev, ...newSelections])]);
    }
  };

  const getFilteredKnowledgeBases = () => {
    const allKBs = [...ownedKBs, ...sharedKBs];
    if (!searchQuery.trim()) return allKBs;
    
    const query = searchQuery.toLowerCase();
    return allKBs.filter(kb => 
      kb.name.toLowerCase().includes(query) ||
      kb.description.toLowerCase().includes(query)
    );
  };

  // File upload handlers
  const handleFilesAdded = (files: File[]) => {
    const newFileItems: FileUploadItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'uploading',
      progress: 0
    }));

    const newUploadedDocs: UploadedDocument[] = files.map((file, index) => ({
      id: newFileItems[index].id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: 'uploading',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFileItems]);
    setUploadedDocs(prev => [...prev, ...newUploadedDocs]);

    // Immediately update context to trigger validation
    dispatch({ 
      type: 'SET_NEW_KNOWLEDGE_BASE', 
      payload: {
        name: `${state.agentName} Knowledge Base`,
        files: [...uploadedDocs, ...newUploadedDocs].map(doc => new File([], doc.fileName, { type: doc.fileType })),
        uploadProgress: new Map([...uploadedDocs, ...newUploadedDocs].map(doc => [doc.id, doc.progress])),
        processingStatus: new Map([...uploadedDocs, ...newUploadedDocs].map(doc => [doc.id, doc.status === 'completed' ? 'complete' : doc.status]))
      }
    });
    
    // Explicitly mark the knowledge step as valid
    setStepValidation('knowledge', true);

    // Start real upload and processing
    newFileItems.forEach((fileItem, index) => {
      processFileUpload(fileItem.id, files[index]);
    });
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    const updatedDocs = uploadedDocs.filter(d => d.id !== fileId);
    setUploadedDocs(updatedDocs);
    
    // Update context immediately
    if (updatedDocs.length > 0) {
      dispatch({ 
        type: 'SET_NEW_KNOWLEDGE_BASE', 
        payload: {
          name: `${state.agentName} Knowledge Base`,
          files: updatedDocs.map(doc => new File([], doc.fileName, { type: doc.fileType })),
          uploadProgress: new Map(updatedDocs.map(doc => [doc.id, doc.progress])),
          processingStatus: new Map(updatedDocs.map(doc => [doc.id, doc.status === 'completed' ? 'complete' : doc.status]))
        }
      });
      setStepValidation('knowledge', true);
    } else {
      dispatch({ type: 'SET_NEW_KNOWLEDGE_BASE', payload: undefined });
      // Check if we still have selected knowledge bases
      const hasSelectedKB = selectedKBs.length > 0;
      setStepValidation('knowledge', hasSelectedKB);
    }
  };

  const processFileUpload = async (fileId: string, file: File) => {
    try {
      // Start monitoring file processing
      const unsubscribe = agentKnowledgeBaseIntegration.monitorFileProcessing(
        fileId,
        (status) => {
          setUploadedDocs(prev => prev.map(doc => 
            doc.id === fileId ? {
              ...doc,
              status: status.status === 'completed' ? 'completed' : 
                     status.status === 'error' ? 'error' : 'processing',
              progress: status.progress,
              processingStatus: status,
              error: status.error?.message,
            } : doc
          ));

          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? {
              ...f,
              status: status.status === 'completed' ? 'complete' : 
                     status.status === 'error' ? 'error' : 'uploading',
              progress: status.progress,
            } : f
          ));
        }
      );

      // Simulate upload progress first
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress } : f
        ));
        setUploadedDocs(prev => prev.map(d => 
          d.id === fileId ? { ...d, progress } : d
        ));
      }

      // Change to processing status
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'processing', progress: 100 } : f
      ));
      setUploadedDocs(prev => prev.map(d => 
        d.id === fileId ? { ...d, status: 'processing', progress: 100 } : d
      ));

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mark as complete
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'complete' } : f
      ));
      setUploadedDocs(prev => prev.map(d => 
        d.id === fileId ? { ...d, status: 'completed' } : d
      ));

      // Cleanup listener
      unsubscribe();
    } catch (error) {
      console.error('File processing error:', error);
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error' } : f
      ));
      setUploadedDocs(prev => prev.map(d => 
        d.id === fileId ? { ...d, status: 'error', error: 'Processing failed' } : d
      ));
    }
  };

  const filteredKnowledgeBases = getFilteredKnowledgeBases();
  const allFilteredSelected = filteredKnowledgeBases.length > 0 && 
    filteredKnowledgeBases.every(kb => selectedKBs.includes(kb.id));
  const totalKBs = ownedKBs.length + sharedKBs.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Knowledge Base Selection</span>
            </CardTitle>
            <CardDescription>
              Choose existing knowledge bases for your agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span>Loading knowledge bases...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Knowledge Base Selection</span>
            </CardTitle>
            <CardDescription>
              Choose existing knowledge bases for your agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                <div>
                  <p className="font-medium">Failed to load knowledge bases</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button onClick={loadKnowledgeBases} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Knowledge Base Selection</span>
          </CardTitle>
          <CardDescription>
            Choose existing knowledge bases to provide context for your agent
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Processing Progress Indicator */}
          {processingProgress && processingProgress.processing > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-600 animate-spin" />
                  <span className="font-medium text-yellow-800">Processing Documents</span>
                </div>
                <span className="text-sm text-yellow-600">
                  {processingProgress.processing} of {processingProgress.total} processing
                </span>
              </div>
              <Progress value={processingProgress.percentage} className="h-2 mb-2" />
              <p className="text-xs text-yellow-600">
                {processingProgress.completed} completed, {processingProgress.failed} failed
              </p>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className={`mb-6 p-4 rounded-lg border ${
              validationResult.isValid 
                ? 'bg-green-50 border-green-200' 
                : validationResult.errors.length > 0 
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start space-x-2">
                {validationResult.isValid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                ) : validationResult.errors.length > 0 ? (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium text-sm ${
                    validationResult.isValid 
                      ? 'text-green-800' 
                      : validationResult.errors.length > 0 
                        ? 'text-red-800'
                        : 'text-yellow-800'
                  }`}>
                    {validationResult.isValid ? 'Configuration Valid' : 'Configuration Issues'}
                  </p>
                  {validationResult.errors.length > 0 && (
                    <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <ul className="mt-1 text-xs text-yellow-700 list-disc list-inside">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.recommendations.length > 0 && (
                    <ul className="mt-1 text-xs text-blue-700 list-disc list-inside">
                      {validationResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {totalKBs === 0 && uploadedFiles.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No knowledge bases found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You can select existing knowledge bases or upload new documents to create one.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" onClick={() => window.open('/dashboard/knowledge-base', '_blank')}>
                  <Database className="h-4 w-4 mr-2" />
                  Manage Knowledge Bases
                </Button>
                <Button onClick={() => setShowUploadInterface(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and controls */}
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search knowledge bases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedKBs.length} of {filteredKnowledgeBases.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={filteredKnowledgeBases.length === 0}
                  >
                    {allFilteredSelected ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              {/* Selection summary */}
              {(selectedKBs.length > 0 || uploadedFiles.length > 0) && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">
                      {selectedKBs.length > 0 && `${selectedKBs.length} knowledge base${selectedKBs.length !== 1 ? 's' : ''} selected`}
                      {selectedKBs.length > 0 && uploadedFiles.length > 0 && ', '}
                      {uploadedFiles.length > 0 && `${uploadedFiles.length} document${uploadedFiles.length !== 1 ? 's' : ''} uploaded`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your agent will have access to information from the selected knowledge bases and uploaded documents
                    to provide more accurate and contextual responses.
                  </p>
                  {isMonitoring && (
                    <div className="flex items-center space-x-2 mt-2 text-xs text-green-600">
                      <Zap className="h-3 w-3" />
                      <span>Real-time updates active</span>
                    </div>
                  )}
                </div>
              )}

              {/* Knowledge base sections */}
              {ownedKBs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    Your Knowledge Bases ({ownedKBs.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {ownedKBs.filter(kb => 
                      !searchQuery || 
                      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      kb.description.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((kb) => (
                      <KnowledgeBaseCard
                        key={kb.id}
                        knowledgeBase={kb}
                        isSelected={selectedKBs.includes(kb.id)}
                        onToggleSelection={handleToggleSelection}
                        onPreview={setPreviewKB}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sharedKBs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Shared with You ({sharedKBs.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {sharedKBs.filter(kb => 
                      !searchQuery || 
                      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      kb.description.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((kb) => (
                      <KnowledgeBaseCard
                        key={kb.id}
                        knowledgeBase={kb}
                        isSelected={selectedKBs.includes(kb.id)}
                        onToggleSelection={handleToggleSelection}
                        onPreview={setPreviewKB}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No results message */}
              {searchQuery && filteredKnowledgeBases.length === 0 && (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No knowledge bases match your search</p>
                </div>
              )}

              {/* Upload new documents section */}
              {totalKBs > 0 && (
                <div className="border-t pt-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">Upload New Documents</h3>
                      <p className="text-sm text-muted-foreground">
                        Add documents to create a new knowledge base for this agent
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowUploadInterface(!showUploadInterface)}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{showUploadInterface ? 'Hide Upload' : 'Upload Documents'}</span>
                    </Button>
                  </div>

                  {showUploadInterface && (
                    <FileUploadInterface
                      files={uploadedFiles}
                      onFilesAdded={handleFilesAdded}
                      onFileRemove={handleFileRemove}
                      onUploadComplete={(fileId, result) => {
                        console.log('Upload completed:', fileId, result);
                      }}
                      onUploadError={(fileId, error) => {
                        console.error('Upload failed:', fileId, error);
                      }}
                      maxFiles={20}
                      knowledgeBaseId="agent-creation"
                      enableChunkedUpload={true}
                      chunkSize={1024 * 1024} // 1MB chunks
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload interface for empty state */}
      {totalKBs === 0 && showUploadInterface && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload Documents</span>
            </CardTitle>
            <CardDescription>
              Upload documents to create a new knowledge base for your agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadInterface
              files={uploadedFiles}
              onFilesAdded={handleFilesAdded}
              onFileRemove={handleFileRemove}
              onUploadComplete={(fileId, result) => {
                console.log('Upload completed:', fileId, result);
              }}
              onUploadError={(fileId, error) => {
                console.error('Upload failed:', fileId, error);
              }}
              maxFiles={20}
              knowledgeBaseId="agent-creation"
              enableChunkedUpload={true}
              chunkSize={1024 * 1024} // 1MB chunks
            />
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {previewKB && (
        <KnowledgeBasePreviewModal
          knowledgeBase={previewKB}
          isOpen={true}
          onClose={() => setPreviewKB(null)}
        />
      )}
    </div>
  );
}