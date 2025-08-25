import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Trash2, 
  Edit, 
  FileText, 
  Image, 
  FileSpreadsheet,
  Clock,
  Calendar,
  HardDrive,
  Layers,
  MoreHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KnowledgeDocument {
  id: string;
  knowledge_base_id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  status: 'processed' | 'processing' | 'error';
  content?: string;
  metadata: {
    pages?: number;
    words?: number;
    characters?: number;
    language?: string;
    author?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
    created_date?: string;
    modified_date?: string;
  };
  chunks_count?: number;
  created_at: string;
  processed_at?: string;
  file_url?: string;
}

interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  created_at: string;
  embedding_json?: string;
  metadata: {
    type?: string;
    confidence?: number;
    page?: number;
    section?: string;
    start_index?: number;
    end_index?: number;
    tokens?: number;
  };
}

interface DocumentViewerProps {
  knowledgeBaseId?: string;
  onDocumentSelect?: (document: KnowledgeDocument) => void;
}

const FILE_TYPE_ICONS = {
  'application/pdf': { icon: FileText, color: 'text-red-500', name: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-500', name: 'DOCX' },
  'text/plain': { icon: FileText, color: 'text-gray-500', name: 'TXT' },
  'application/vnd.ms-excel': { icon: FileSpreadsheet, color: 'text-green-500', name: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-500', name: 'XLSX' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-green-500', name: 'CSV' },
  'image/jpeg': { icon: Image, color: 'text-purple-500', name: 'JPEG' },
  'image/png': { icon: Image, color: 'text-purple-500', name: 'PNG' },
};

export default function DocumentViewer({ knowledgeBaseId, onDocumentSelect }: DocumentViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents', knowledgeBaseId, searchQuery, filterStatus, filterType, sortBy, sortOrder],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      let query = supabase
        .from('documents')
        .select(`
          *,
          knowledge_bases!inner(user_id),
          document_chunks(count)
        `);

      // Filter by knowledge base if specified
      if (knowledgeBaseId) {
        query = query.eq('knowledge_base_id', knowledgeBaseId);
      } else {
        query = query.eq('knowledge_bases.user_id', user.user.id);
      }

      // Apply filters
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterType !== 'all') {
        query = query.eq('file_type', filterType);
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;
      
      if (error) throw error;

      return data?.map(doc => ({
        ...doc,
        status: doc.status as 'processed' | 'processing' | 'error',
        metadata: (typeof doc.metadata === 'object' && doc.metadata ? doc.metadata : {}) as {
          pages?: number;
          words?: number;
          characters?: number;
          language?: string;
          author?: string;
          title?: string;
          subject?: string;
          keywords?: string[];
          created_date?: string;
          modified_date?: string;
        },
        chunks_count: doc.document_chunks?.[0]?.count || 0
      })) || [];
    }
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete document: ' + error.message);
    }
  });

  // Fetch document chunks for preview
  const { data: documentChunks } = useQuery({
    queryKey: ['document-chunks', selectedDocument?.id],
    queryFn: async () => {
      if (!selectedDocument?.id) return [];

      const { data, error } = await supabase
        .from('document_chunks')
        .select('*')
        .eq('document_id', selectedDocument.id)
        .order('start_index');

      if (error) throw error;
      return (data || []).map(chunk => ({
        id: chunk.id,
        document_id: chunk.document_id,
        content: chunk.content,
        chunk_index: chunk.chunk_index,
        created_at: chunk.created_at,
        embedding_json: chunk.embedding_json,
        metadata: {
          ...(typeof chunk.metadata === 'object' && chunk.metadata ? chunk.metadata : {}),
          start_index: (chunk.metadata as any)?.start_index,
          end_index: (chunk.metadata as any)?.end_index,
          tokens: (chunk.metadata as any)?.tokens
        }
      }));
    },
    enabled: !!selectedDocument?.id
  });

  const handleDocumentPreview = (document: KnowledgeDocument) => {
    setSelectedDocument(document);
    setPreviewOpen(true);
    onDocumentSelect?.(document);
  };

  const handleDeleteDocument = (documentId: string) => {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  const downloadDocument = async (document: KnowledgeDocument) => {
    if (document.file_url) {
      try {
        const response = await fetch(document.file_url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        toast.error('Failed to download document');
      }
    }
  };

  const getFileTypeInfo = (mimeType: string) => {
    return FILE_TYPE_ICONS[mimeType as keyof typeof FILE_TYPE_ICONS] || 
           { icon: FileText, color: 'text-gray-500', name: 'File' };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get unique file types for filter
  const uniqueFileTypes = documents 
    ? [...new Set(documents.map(doc => doc.file_type))]
    : [];

  // Pagination
  const totalPages = Math.ceil((documents?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = documents?.slice(startIndex, endIndex) || [];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500 text-sm">Failed to load documents</div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Document Library</h3>
            <p className="text-muted-foreground">
              Browse and manage your knowledge base documents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {documents?.length || 0} documents
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="File Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueFileTypes.map(type => {
                const typeInfo = getFileTypeInfo(type);
                return (
                  <SelectItem key={type} value={type}>
                    {typeInfo.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field);
            setSortOrder(order as 'asc' | 'desc');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="size_bytes-desc">Largest First</SelectItem>
              <SelectItem value="size_bytes-asc">Smallest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Document List/Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : paginatedDocuments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents found</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                ? 'Try adjusting your search criteria'
                : 'Upload your first document to get started'
              }
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedDocuments.map((document) => {
            const fileTypeInfo = getFileTypeInfo(document.file_type);
            const Icon = fileTypeInfo.icon;
            
            return (
              <Card key={document.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className={cn("w-6 h-6", fileTypeInfo.color)} />
                      <Badge variant={
                        document.status === 'processed' ? 'default' :
                        document.status === 'processing' ? 'secondary' : 'destructive'
                      }>
                        {document.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <CardTitle className="text-sm line-clamp-2" title={document.name}>
                    {document.name}
                  </CardTitle>
                  
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Size:</span>
                      <span>{formatFileSize(document.size_bytes)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Chunks:</span>
                      <span>{document.chunks_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Created:</span>
                      <span>{new Date(document.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDocumentPreview(document)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadDocument(document)}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDocument(document.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {paginatedDocuments.map((document) => {
                const fileTypeInfo = getFileTypeInfo(document.file_type);
                const Icon = fileTypeInfo.icon;
                
                return (
                  <div key={document.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <Icon className={cn("w-8 h-8", fileTypeInfo.color)} />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{document.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <HardDrive className="w-3 h-3 mr-1" />
                              {formatFileSize(document.size_bytes)}
                            </span>
                            <span className="flex items-center">
                              <Layers className="w-3 h-3 mr-1" />
                              {document.chunks_count} chunks
                            </span>
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(document.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        <Badge variant={
                          document.status === 'processed' ? 'default' :
                          document.status === 'processing' ? 'secondary' : 'destructive'
                        }>
                          {document.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDocumentPreview(document)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDocument(document)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteDocument(document.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, documents?.length || 0)} of {documents?.length || 0} documents
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedDocument && (
                <>
                  {(() => {
                    const fileTypeInfo = getFileTypeInfo(selectedDocument.file_type);
                    const Icon = fileTypeInfo.icon;
                    return <Icon className={cn("w-5 h-5", fileTypeInfo.color)} />;
                  })()}
                  <span>{selectedDocument.name}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Document preview and analysis
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="chunks">Chunks ({documentChunks?.length || 0})</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="mt-4">
                <ScrollArea className="h-96 w-full border rounded-md p-4">
                  {selectedDocument.content ? (
                    <div className="whitespace-pre-wrap text-sm">
                      {selectedDocument.content}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Content preview not available</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="chunks" className="mt-4">
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-3">
                    {documentChunks?.map((chunk, index) => (
                      <Card key={chunk.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Chunk {index + 1}</CardTitle>
                            <Badge variant="outline">
                              {chunk.metadata?.tokens || 0} tokens
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            Position: {chunk.metadata?.start_index || 0}-{chunk.metadata?.end_index || 0}
                            {(chunk.metadata as any)?.page && ` • Page ${(chunk.metadata as any).page}`}
                            {(chunk.metadata as any)?.section && ` • ${(chunk.metadata as any).section}`}
                          </p>
                          <div className="text-sm bg-gray-50 p-3 rounded">
                            {chunk.content}
                          </div>
                        </CardContent>
                      </Card>
                    )) || (
                      <div className="text-center text-muted-foreground">
                        <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No chunks available</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="metadata" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">File Information</Label>
                      <div className="mt-1 space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span>{formatFileSize(selectedDocument.size_bytes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span>{getFileTypeInfo(selectedDocument.file_type).name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="capitalize">{selectedDocument.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Chunks:</span>
                          <span>{selectedDocument.chunks_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Processing Information</Label>
                      <div className="mt-1 space-y-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Created:</span>
                          <span>{formatDate(selectedDocument.created_at)}</span>
                        </div>
                        {selectedDocument.processed_at && (
                          <div className="flex justify-between">
                            <span>Processed:</span>
                            <span>{formatDate(selectedDocument.processed_at)}</span>
                          </div>
                        )}
                        {selectedDocument.metadata?.pages && (
                          <div className="flex justify-between">
                            <span>Pages:</span>
                            <span>{selectedDocument.metadata.pages}</span>
                          </div>
                        )}
                        {selectedDocument.metadata?.words && (
                          <div className="flex justify-between">
                            <span>Words:</span>
                            <span>{selectedDocument.metadata.words.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedDocument.metadata && Object.keys(selectedDocument.metadata).length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Document Metadata</Label>
                    <div className="mt-2 bg-gray-50 p-3 rounded text-sm">
                      <pre>{JSON.stringify(selectedDocument.metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}