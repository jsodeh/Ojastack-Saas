import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  Plus
} from 'lucide-react';
import { useAgentCreation } from '../AgentCreationContext';
import { 
  KnowledgeBase, 
  fetchKnowledgeBases, 
  formatFileSize, 
  formatTimeAgo,
  getStatusColor,
  getStatusIcon,
  KnowledgeBaseServiceError
} from '@/lib/knowledge-base-service';
import { useProfile } from '@/hooks/useProfile';
import FileUploadInterface, { FileUploadItem } from '../FileUploadInterface';

interface KnowledgeBasePreviewModalProps {
  knowledgeBase: KnowledgeBase;
  isOpen: boolean;
  onClose: () => void;
}

function KnowledgeBasePreviewModal({ knowledgeBase, isOpen, onClose }: KnowledgeBasePreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{knowledgeBase.name}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
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
  knowledgeBase: KnowledgeBase;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onPreview: (knowledgeBase: KnowledgeBase) => void;
}

function KnowledgeBaseCard({ knowledgeBase, isSelected, onToggleSelection, onPreview }: KnowledgeBaseCardProps) {
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
              <CardTitle className="text-base">{knowledgeBase.name}</CardTitle>
              <CardDescription className="mt-1">
                {knowledgeBase.description || 'No description provided'}
              </CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(knowledgeBase.status)}>
            {getStatusIcon(knowledgeBase.status)} {knowledgeBase.status}
          </Badge>
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

export default function KnowledgeBaseStep() {
  const { state, setKnowledgeBases } = useAgentCreation();
  const { profile } = useProfile();
  const [knowledgeBases, setKnowledgeBasesData] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewKB, setPreviewKB] = useState<KnowledgeBase | null>(null);
  const [selectedKBs, setSelectedKBs] = useState<string[]>(state.knowledgeBases);
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadItem[]>([]);
  const [showUploadInterface, setShowUploadInterface] = useState(false);

  // Load knowledge bases on component mount
  useEffect(() => {
    if (profile?.id) {
      loadKnowledgeBases();
    }
  }, [profile?.id]);

  // Update context when selection changes
  useEffect(() => {
    setKnowledgeBases(selectedKBs);
  }, [selectedKBs, setKnowledgeBases]);

  const loadKnowledgeBases = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await fetchKnowledgeBases(profile.id);
      setKnowledgeBasesData(data);
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
    if (!searchQuery.trim()) return knowledgeBases;
    
    const query = searchQuery.toLowerCase();
    return knowledgeBases.filter(kb => 
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

    setUploadedFiles(prev => [...prev, ...newFileItems]);

    // Simulate upload progress for each file
    newFileItems.forEach(fileItem => {
      simulateFileUpload(fileItem.id);
    });
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const simulateFileUpload = async (fileId: string) => {
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress } : f
      ));
    }

    // Change to processing status
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'processing', progress: 100 } : f
    ));

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mark as complete
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'complete' } : f
    ));
  };

  const filteredKnowledgeBases = getFilteredKnowledgeBases();
  const allFilteredSelected = filteredKnowledgeBases.length > 0 && 
    filteredKnowledgeBases.every(kb => selectedKBs.includes(kb.id));

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
          {knowledgeBases.length === 0 && uploadedFiles.length === 0 ? (
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
                </div>
              )}

              {/* Knowledge base grid */}
              {filteredKnowledgeBases.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No knowledge bases match your search</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredKnowledgeBases.map((kb) => (
                    <KnowledgeBaseCard
                      key={kb.id}
                      knowledgeBase={kb}
                      isSelected={selectedKBs.includes(kb.id)}
                      onToggleSelection={handleToggleSelection}
                      onPreview={setPreviewKB}
                    />
                  ))}
                </div>
              )}

              {/* Upload new documents section */}
              {knowledgeBases.length > 0 && (
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
                      maxFiles={20}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload interface for empty state */}
      {knowledgeBases.length === 0 && showUploadInterface && (
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
              maxFiles={20}
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