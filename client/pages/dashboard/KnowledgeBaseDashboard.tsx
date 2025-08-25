import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Database,
  Search,
  Upload,
  FileText,
  Globe,
  MessageSquare,
  Plus,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  BarChart3,
  Share,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/lib/auth-context';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: 'document' | 'website' | 'faq' | 'api';
  status: 'processing' | 'ready' | 'error' | 'updating';
  documents: number;
  size: number;
  chunks: number;
  queries: number;
  avgRelevance: number;
  lastUsed: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'processed' | 'processing' | 'error';
  chunks: number;
  queries: number;
  avgRelevance: number;
  uploadedAt: string;
  processedAt?: string;
}

interface SearchResult {
  id: string;
  content: string;
  source: string;
  relevance: number;
  metadata: Record<string, any>;
}

const TYPE_ICONS = {
  document: FileText,
  website: Globe,
  faq: MessageSquare,
  api: Database
};

const STATUS_COLORS = {
  processing: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  updating: 'bg-blue-100 text-blue-800'
};

export default function KnowledgeBaseDashboard() {
  const { user } = useAuth();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  useEffect(() => {
    if (selectedKB) {
      loadDocuments(selectedKB.id);
    }
  }, [selectedKB]);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API
      const mockKBs: KnowledgeBase[] = [
        {
          id: '1',
          name: 'Product Documentation',
          description: 'Comprehensive product guides and documentation',
          type: 'document',
          status: 'ready',
          documents: 25,
          size: 15728640, // 15MB
          chunks: 342,
          queries: 1250,
          avgRelevance: 0.87,
          lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          tags: ['product', 'documentation', 'help'],
          isPublic: false,
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z'
        },
        {
          id: '2',
          name: 'Customer Support FAQ',
          description: 'Frequently asked questions and answers',
          type: 'faq',
          status: 'ready',
          documents: 8,
          size: 524288, // 512KB
          chunks: 45,
          queries: 890,
          avgRelevance: 0.92,
          lastUsed: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          tags: ['faq', 'support', 'customer'],
          isPublic: true,
          createdAt: '2024-01-10T09:00:00Z',
          updatedAt: '2024-01-18T16:45:00Z'
        },
        {
          id: '3',
          name: 'Website Content',
          description: 'Company website pages and blog posts',
          type: 'website',
          status: 'processing',
          documents: 0,
          size: 0,
          chunks: 0,
          queries: 0,
          avgRelevance: 0,
          lastUsed: '',
          tags: ['website', 'marketing', 'blog'],
          isPublic: false,
          createdAt: '2024-01-25T11:00:00Z',
          updatedAt: '2024-01-25T11:00:00Z'
        }
      ];
      
      setKnowledgeBases(mockKBs);
      if (mockKBs.length > 0) {
        setSelectedKB(mockKBs[0]);
      }
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (kbId: string) => {
    try {
      // Mock documents data
      const mockDocs: Document[] = [
        {
          id: '1',
          name: 'Getting Started Guide.pdf',
          type: 'application/pdf',
          size: 2097152,
          status: 'processed',
          chunks: 45,
          queries: 123,
          avgRelevance: 0.89,
          uploadedAt: '2024-01-15T10:00:00Z',
          processedAt: '2024-01-15T10:05:00Z'
        },
        {
          id: '2',
          name: 'API Reference.md',
          type: 'text/markdown',
          size: 1048576,
          status: 'processed',
          chunks: 67,
          queries: 89,
          avgRelevance: 0.85,
          uploadedAt: '2024-01-16T14:00:00Z',
          processedAt: '2024-01-16T14:02:00Z'
        },
        {
          id: '3',
          name: 'Troubleshooting Guide.docx',
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 3145728,
          status: 'processing',
          chunks: 0,
          queries: 0,
          avgRelevance: 0,
          uploadedAt: '2024-01-20T09:30:00Z'
        }
      ];
      
      setDocuments(mockDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      // Mock search results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          content: 'To get started with our platform, first create an account and then follow the setup wizard...',
          source: 'Getting Started Guide.pdf',
          relevance: 0.95,
          metadata: { page: 1, section: 'Introduction' }
        },
        {
          id: '2',
          content: 'The API requires authentication using bearer tokens. Include the token in the Authorization header...',
          source: 'API Reference.md',
          relevance: 0.78,
          metadata: { section: 'Authentication' }
        },
        {
          id: '3',
          content: 'If you encounter login issues, first check your credentials and ensure your account is active...',
          source: 'Troubleshooting Guide.docx',
          relevance: 0.82,
          metadata: { page: 3, section: 'Common Issues' }
        }
      ];
      
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setSearchResults(mockResults);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredKnowledgeBases = knowledgeBases.filter(kb => {
    if (filters.type !== 'all' && kb.type !== filters.type) return false;
    if (filters.status !== 'all' && kb.status !== filters.status) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage your AI agent's knowledge sources and documents
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Knowledge Base
          </Button>
        </div>
      </div>

      {/* Knowledge Base Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Knowledge Base</span>
          </CardTitle>
          <CardDescription>
            Search across all your knowledge bases and documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <div className="flex-1">
              <Input
                placeholder="Search for information across all knowledge bases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && performSearch(searchQuery)}
              />
            </div>
            <Button 
              onClick={() => performSearch(searchQuery)}
              disabled={searchLoading}
            >
              {searchLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Search Results ({searchResults.length})</h4>
              {searchResults.map((result) => (
                <Card key={result.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">
                        From: {result.source}
                      </p>
                      <p className="text-sm mb-2">{result.content}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Relevance: {Math.round(result.relevance * 100)}%</span>
                        {result.metadata.page && (
                          <span>Page: {result.metadata.page}</span>
                        )}
                        {result.metadata.section && (
                          <span>Section: {result.metadata.section}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {Math.round(result.relevance * 100)}%
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Bases List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Knowledge Bases</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>All Types</DropdownMenuItem>
                    <DropdownMenuItem>Documents</DropdownMenuItem>
                    <DropdownMenuItem>Websites</DropdownMenuItem>
                    <DropdownMenuItem>FAQs</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                filteredKnowledgeBases.map((kb) => {
                  const Icon = TYPE_ICONS[kb.type];
                  return (
                    <div
                      key={kb.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedKB?.id === kb.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedKB(kb)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Icon className="h-5 w-5 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{kb.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {kb.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              {getStatusIcon(kb.status)}
                              <span className="text-xs capitalize">{kb.status}</span>
                              <span className="text-xs text-muted-foreground">
                                {kb.documents} docs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Knowledge Base Details */}
        <div className="lg:col-span-2">
          {selectedKB ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          {React.createElement(TYPE_ICONS[selectedKB.type], { className: "h-5 w-5" })}
                          <span>{selectedKB.name}</span>
                        </CardTitle>
                        <CardDescription>{selectedKB.description}</CardDescription>
                      </div>
                      <Badge className={STATUS_COLORS[selectedKB.status]}>
                        {selectedKB.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{selectedKB.documents}</div>
                        <p className="text-xs text-muted-foreground">Documents</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{selectedKB.chunks}</div>
                        <p className="text-xs text-muted-foreground">Chunks</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{formatFileSize(selectedKB.size)}</div>
                        <p className="text-xs text-muted-foreground">Total Size</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{selectedKB.queries}</div>
                        <p className="text-xs text-muted-foreground">Queries</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Documents ({documents.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5" />
                            <div>
                              <p className="font-medium text-sm">{doc.name}</p>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <span>{formatFileSize(doc.size)}</span>
                                <span>•</span>
                                <span>{doc.chunks} chunks</span>
                                <span>•</span>
                                <span>{doc.queries} queries</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(doc.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Metadata
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{selectedKB.queries}</div>
                        <p className="text-sm text-muted-foreground">Total Queries</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Relevance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(selectedKB.avgRelevance * 100)}%
                        </div>
                        <p className="text-sm text-muted-foreground">Avg Score</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Last Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {selectedKB.lastUsed 
                            ? new Date(selectedKB.lastUsed).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                        <p className="text-sm text-muted-foreground">Date</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Knowledge Base Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedKB.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Public Access</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow other agents to use this knowledge base
                        </p>
                      </div>
                      <Badge variant={selectedKB.isPublic ? 'default' : 'secondary'}>
                        {selectedKB.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>

                    <div className="pt-4 border-t">
                      <Button variant="outline" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Advanced Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Knowledge Base</h3>
                <p className="text-muted-foreground">
                  Choose a knowledge base from the list to view details and manage documents
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}