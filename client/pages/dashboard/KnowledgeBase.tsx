import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Database,
  Plus,
  Search,
  Filter,
  Upload,
  FileText,
  Globe,
  Link,
  Trash2,
  Edit,
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  File,
  Image,
  Video,
  Music,
  Archive,
  ExternalLink,
  Settings
} from "lucide-react";
import { useDropzone } from "react-dropzone";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { 
  fetchKnowledgeBaseData, 
  formatFileSize, 
  formatTimeAgo,
  getStatusColor as getKBStatusColor,
  getStatusIcon as getKBStatusIcon,
  retryWithBackoff,
  KnowledgeBaseServiceError,
  createRealTimeUpdater,
  hasProcessingDocuments,
  getProcessingProgress,
  type KnowledgeBase as KBType,
  type Document as DocType,
  type KnowledgeBaseStats,
  type KnowledgeBaseData,
  type KnowledgeBaseRealTimeUpdater,
  type RealTimeUpdateConfig
} from "@/lib/knowledge-base-service";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { KnowledgeBaseErrorBoundary, useKnowledgeBaseErrorBoundary } from "@/components/ui/knowledge-base-error-boundary";
import { ErrorState, StatsErrorState, KnowledgeBasesErrorState, DocumentsErrorState } from "@/components/ui/error-state";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documents: number;
  size: string;
  lastUpdated: string;
  status: 'active' | 'processing' | 'error';
  type: 'documents' | 'website' | 'api';
  agents: string[];
  createdAt: string;
}

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'url' | 'api';
  size: string;
  uploadedAt: string;
  status: 'processed' | 'processing' | 'error';
  chunks: number;
  knowledgeBaseId: string;
}

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Real data state
  const [knowledgeBaseData, setKnowledgeBaseData] = useState<KnowledgeBaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Real-time updates state
  const [realTimeUpdater, setRealTimeUpdater] = useState<KnowledgeBaseRealTimeUpdater | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'error'>('idle');
  
  // Error boundary hook
  const { captureError } = useKnowledgeBaseErrorBoundary();
  
  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedKB, setSelectedKB] = useState<KBType | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Fetch real data with retry logic
  const loadKnowledgeBaseData = async (withRetry: boolean = false) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      if (withRetry) {
        setRetrying(true);
        setRetryCount(prev => prev + 1);
      }
      
      const data = await (withRetry 
        ? retryWithBackoff(() => fetchKnowledgeBaseData(user.id), 3, 1000)
        : fetchKnowledgeBaseData(user.id)
      );
      
      setKnowledgeBaseData(data);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error loading knowledge base data:', err);
      const error = err instanceof Error ? err : new Error('Failed to load knowledge base data');
      setError(error);
      captureError(error);
      
      // Show toast for user feedback
      toast({
        title: "Error Loading Data",
        description: error instanceof KnowledgeBaseServiceError 
          ? error.message 
          : "Failed to load knowledge base data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  // Retry function for user-initiated retries
  const handleRetry = () => {
    loadKnowledgeBaseData(true);
  };

  // Reset error state
  const handleResetError = () => {
    setError(null);
    setRetryCount(0);
    loadKnowledgeBaseData();
  };

  // Force refresh function
  const handleForceRefresh = async () => {
    setUpdateStatus('updating');
    
    if (realTimeUpdater) {
      await realTimeUpdater.forceUpdate();
    } else {
      await loadKnowledgeBaseData(true);
    }
  };

  // Toggle real-time updates
  const toggleRealTimeUpdates = () => {
    if (!realTimeUpdater) return;

    if (isRealTimeEnabled) {
      realTimeUpdater.stop();
      setIsRealTimeEnabled(false);
      toast({
        title: "Real-time Updates Disabled",
        description: "You can still refresh manually.",
      });
    } else {
      realTimeUpdater.start();
      setIsRealTimeEnabled(true);
      toast({
        title: "Real-time Updates Enabled",
        description: "Data will refresh automatically every 10 seconds.",
      });
    }
  };

  // Initialize real-time updater
  React.useEffect(() => {
    if (!user?.id) return;

    const config: RealTimeUpdateConfig = {
      enabled: true,
      interval: 10000, // 10 seconds
      maxRetries: 3,
      onUpdate: (data) => {
        setKnowledgeBaseData(data);
        setLastUpdateTime(new Date());
        setUpdateStatus('idle');
        
        // Show toast for significant changes
        if (knowledgeBaseData) {
          const oldProcessing = knowledgeBaseData.stats.processingQueue;
          const newProcessing = data.stats.processingQueue;
          const oldProgress = getProcessingProgress(knowledgeBaseData);
          const newProgress = getProcessingProgress(data);
          
          // Notify when all processing is complete
          if (oldProcessing > newProcessing && newProcessing === 0) {
            toast({
              title: "Processing Complete",
              description: "All documents have finished processing.",
              variant: "default",
            });
          }
          
          // Notify when new documents complete processing
          if (newProgress.completed > oldProgress.completed) {
            const newlyCompleted = newProgress.completed - oldProgress.completed;
            toast({
              title: `${newlyCompleted} Document${newlyCompleted > 1 ? 's' : ''} Processed`,
              description: `${newProgress.completed} of ${newProgress.total} documents completed.`,
              variant: "default",
            });
          }
          
          // Notify when documents fail processing
          if (newProgress.failed > oldProgress.failed) {
            const newlyFailed = newProgress.failed - oldProgress.failed;
            toast({
              title: `Processing Failed`,
              description: `${newlyFailed} document${newlyFailed > 1 ? 's' : ''} failed to process.`,
              variant: "destructive",
            });
          }
        }
      },
      onError: (error) => {
        setUpdateStatus('error');
        console.warn('Real-time update error:', error);
      },
    };

    const updater = createRealTimeUpdater(user.id, config);
    setRealTimeUpdater(updater);

    return () => {
      updater.stop();
    };
  }, [user?.id]);

  // Start/stop real-time updates based on processing status
  React.useEffect(() => {
    if (!realTimeUpdater || !knowledgeBaseData) return;

    const shouldEnableRealTime = hasProcessingDocuments(knowledgeBaseData);
    
    if (shouldEnableRealTime && !isRealTimeEnabled) {
      realTimeUpdater.start();
      setIsRealTimeEnabled(true);
    } else if (!shouldEnableRealTime && isRealTimeEnabled) {
      realTimeUpdater.stop();
      setIsRealTimeEnabled(false);
    }
  }, [realTimeUpdater, knowledgeBaseData, isRealTimeEnabled]);

  React.useEffect(() => {
    loadKnowledgeBaseData();
  }, [user?.id]);

  // Get real data with fallbacks
  const knowledgeBases = knowledgeBaseData?.knowledgeBases || [];
  const documents = knowledgeBaseData?.recentDocuments || [];
  const stats = knowledgeBaseData?.stats || {
    totalBases: 0,
    totalDocuments: 0,
    storageUsed: 0,
    processingQueue: 0,
  };

  // Data state indicators
  const hasData = knowledgeBases.length > 0 || documents.length > 0;
  const isProcessing = hasProcessingDocuments(knowledgeBaseData || {
    stats: { totalBases: 0, totalDocuments: 0, storageUsed: 0, processingQueue: 0 },
    knowledgeBases: [],
    recentDocuments: [],
  });

  const filteredKnowledgeBases = knowledgeBases.filter(kb => {
    const matchesSearch = kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kb.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || kb.status === filterStatus;
    // Note: type filtering removed since our data model doesn't include type field
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700 border-green-300";
      case "processing": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "error": return "bg-red-100 text-red-700 border-red-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4" />;
      case "processing": return <Clock className="h-4 w-4" />;
      case "error": return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "website": return <Globe className="h-4 w-4" />;
      case "api": return <Link className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getFileTypeFromFilename = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension || 'file';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf": return <File className="h-4 w-4 text-red-500" />;
      case "docx": 
      case "doc": return <FileText className="h-4 w-4 text-blue-500" />;
      case "txt": 
      case "md": return <FileText className="h-4 w-4 text-gray-500" />;
      case "url": return <ExternalLink className="h-4 w-4 text-green-500" />;
      case "api": return <Link className="h-4 w-4 text-purple-500" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <KnowledgeBaseErrorBoundary onRetry={handleRetry} onReset={handleResetError}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-muted-foreground">
                Manage your AI agents' knowledge sources and documentation
              </p>
              {lastUpdateTime && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className={`w-2 h-2 rounded-full ${
                    updateStatus === 'updating' ? 'bg-yellow-500 animate-pulse' :
                    updateStatus === 'error' ? 'bg-red-500' :
                    isRealTimeEnabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <span>
                    {updateStatus === 'updating' ? 'Updating...' :
                     updateStatus === 'error' ? 'Update failed' :
                     `Updated ${formatTimeAgo(lastUpdateTime.toISOString())}`}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={handleForceRefresh}
              disabled={loading || retrying || updateStatus === 'updating'}
            >
              {loading || retrying || updateStatus === 'updating' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {updateStatus === 'updating' ? 'Updating...' : 
               retrying ? 'Retrying...' : 'Refresh'}
            </Button>
            {knowledgeBaseData && hasProcessingDocuments(knowledgeBaseData) && (
              <Button 
                variant="outline" 
                onClick={toggleRealTimeUpdates}
                className={isRealTimeEnabled ? 'bg-green-50 border-green-200' : ''}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                {isRealTimeEnabled ? 'Auto-refresh On' : 'Auto-refresh Off'}
              </Button>
            )}
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Knowledge Base
            </Button>
          </div>
        </div>

        {/* Global Error State */}
        {error && !loading && (
          <ErrorState 
            error={error} 
            onRetry={handleRetry} 
            onReset={handleResetError}
          />
        )}

        {/* Processing Progress Banner */}
        {knowledgeBaseData && hasProcessingDocuments(knowledgeBaseData) && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <div>
                    <p className="font-medium text-yellow-800">Processing Documents</p>
                    <p className="text-sm text-yellow-600">
                      {(() => {
                        const progress = getProcessingProgress(knowledgeBaseData);
                        return `${progress.processing} documents processing, ${progress.completed} completed`;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-800">
                    {(() => {
                      const progress = getProcessingProgress(knowledgeBaseData);
                      return `${progress.percentage}%`;
                    })()}
                  </div>
                  <p className="text-xs text-yellow-600">Complete</p>
                </div>
              </div>
              <Progress 
                value={getProcessingProgress(knowledgeBaseData).percentage} 
                className="mt-3 h-2"
              />
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <KnowledgeBaseErrorBoundary onRetry={handleRetry} onReset={handleResetError}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Knowledge Bases</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
              ) : (
                <div className="text-2xl font-bold">{stats.totalBases}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Knowledge bases in your account
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
              ) : (
                <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Documents across all knowledge bases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
              ) : (
                <div className="text-2xl font-bold">{formatFileSize(stats.storageUsed)}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Total storage consumed
              </p>
            </CardContent>
          </Card>

          <Card className={stats.processingQueue > 0 ? 'border-yellow-200 bg-yellow-50/30' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
              <div className="flex items-center space-x-1">
                {stats.processingQueue > 0 && (
                  <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
                )}
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
              ) : (
                <div className={`text-2xl font-bold ${stats.processingQueue > 0 ? 'text-yellow-700' : ''}`}>
                  {stats.processingQueue}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                documents processing
              </p>
            </CardContent>
          </Card>
        </div>
        </KnowledgeBaseErrorBoundary>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge bases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="api">API</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Knowledge Bases Grid */}
        <KnowledgeBaseErrorBoundary onRetry={handleRetry} onReset={handleResetError}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-lg"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-3 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredKnowledgeBases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No knowledge bases yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Create your first knowledge base to start organizing your AI agent's knowledge and documentation
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Knowledge Base
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredKnowledgeBases.map((kb, index) => (
                <Card 
                  key={kb.id} 
                  className="hover:shadow-md transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Database className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{kb.name}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className={getKBStatusColor(kb.status)}>
                              <span className="mr-1">{getKBStatusIcon(kb.status)}</span>
                              <span>{kb.status}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 line-clamp-2">
                      {kb.description || 'No description provided'}
                    </CardDescription>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Documents</span>
                        <span className="font-medium">{kb.documentCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-medium">{formatFileSize(kb.totalSize)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span className="font-medium">{formatTimeAgo(kb.lastUpdated)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created</span>
                        <span className="font-medium">{formatTimeAgo(kb.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => setIsUploadDialogOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Add Docs
                      </Button>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </KnowledgeBaseErrorBoundary>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Recent Documents</span>
                  {knowledgeBaseData && hasProcessingDocuments(knowledgeBaseData) && (
                    <div className="flex items-center space-x-1 text-sm text-yellow-600">
                      <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs">Live updates</span>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>Recently uploaded and processed documents</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                {lastUpdateTime && (
                  <span className="text-xs text-muted-foreground">
                    Updated {formatTimeAgo(lastUpdateTime.toISOString())}
                  </span>
                )}
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <KnowledgeBaseErrorBoundary onRetry={handleRetry} onReset={handleResetError}>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-muted rounded"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-48"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                        </div>
                      </div>
                      <div className="w-16 h-6 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No documents uploaded</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload documents to your knowledge bases to provide context for your AI agents
                  </p>
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.slice(0, 5).map((doc, index) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-4 border rounded-lg transition-all duration-300 hover:shadow-sm hover:border-primary/20 animate-in fade-in slide-in-from-left-4"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center space-x-3">
                        {getFileIcon(getFileTypeFromFilename(doc.filename))}
                        <div>
                          <p className="font-medium">{doc.filename}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(doc.createdAt)}</span>
                            <span>•</span>
                            <span>{doc.chunkCount} chunks</span>
                            {doc.knowledgeBaseName && (
                              <>
                                <span>•</span>
                                <span>{doc.knowledgeBaseName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className={getKBStatusColor(doc.status)}>
                          <span className="mr-1">{getKBStatusIcon(doc.status)}</span>
                          <span>{doc.status}</span>
                        </Badge>
                        {doc.status === 'processing' && (
                          <Progress value={65} className="w-20" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </KnowledgeBaseErrorBoundary>
          </CardContent>
        </Card>

        {/* Create Knowledge Base Dialog */}
        <CreateKnowledgeBaseDialog 
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

        {/* Upload Documents Dialog */}
        <UploadDocumentsDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
        />
      </div>
    </KnowledgeBaseErrorBoundary>
  );
}

// Create Knowledge Base Dialog
function CreateKnowledgeBaseDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [kbData, setKbData] = useState({
    name: "",
    description: "",
    type: "documents"
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
          <DialogDescription>
            Create a new knowledge base to store and organize information for your AI agents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Knowledge Base Name</Label>
              <Input
                id="name"
                placeholder="Customer Support Knowledge"
                value={kbData.name}
                onChange={(e) => setKbData({...kbData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this knowledge base contains..."
                value={kbData.description}
                onChange={(e) => setKbData({...kbData, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Knowledge Base Type</Label>
              <Select value={kbData.type} onValueChange={(value) => setKbData({...kbData, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documents">Document Collection</SelectItem>
                  <SelectItem value="website">Website Scraping</SelectItem>
                  <SelectItem value="api">API Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {kbData.type === "website" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Website Configuration</CardTitle>
                <CardDescription>Configure website scraping settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    placeholder="https://yourwebsite.com"
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depth">Crawl Depth</Label>
                  <Select defaultValue="2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 level</SelectItem>
                      <SelectItem value="2">2 levels</SelectItem>
                      <SelectItem value="3">3 levels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {kbData.type === "api" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Configuration</CardTitle>
                <CardDescription>Configure API integration settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url">API Endpoint</Label>
                  <Input
                    id="api-url"
                    placeholder="https://api.example.com/knowledge"
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    placeholder="Your API key"
                    type="password"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Create Knowledge Base
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Upload Documents Dialog
function UploadDocumentsDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [uploadMethod, setUploadMethod] = useState("files");
  const [urls, setUrls] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("Files dropped:", acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Add documents to your knowledge base for AI training.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={uploadMethod} onValueChange={setUploadMethod}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="urls">URLs</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p>Drop files here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium">Drag & drop files here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports PDF, DOCX, TXT, MD files up to 10MB each
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="urls" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="urls">URLs (one per line)</Label>
              <Textarea
                id="urls"
                placeholder={`https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3`}
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={6}
              />
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                placeholder="Document title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Paste your text content here..."
                rows={8}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Upload & Process
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
