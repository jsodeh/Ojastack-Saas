import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Upload, 
  FileText, 
  Globe, 
  Database, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  MessageSquare
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: 'document' | 'website' | 'faq' | 'api' | 'database';
  status: 'processing' | 'ready' | 'error' | 'updating';
  file_count: number;
  total_size: number;
  chunk_count: number;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface KnowledgeBaseFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

const typeIcons = {
  document: FileText,
  website: Globe,
  faq: MessageSquare,
  api: Database,
  database: Database
};

const statusColors = {
  processing: 'bg-yellow-500',
  ready: 'bg-green-500',
  error: 'bg-red-500',
  updating: 'bg-blue-500'
};

export default function KnowledgeBaseManager() {
  const { user } = useAuth();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Create KB form state
  const [newKB, setNewKB] = useState({
    name: '',
    description: '',
    type: 'document' as const,
    tags: [] as string[],
    is_public: false
  });

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    if (selectedKB) {
      fetchKnowledgeBaseFiles(selectedKB.id);
    }
  }, [selectedKB]);

  const fetchKnowledgeBases = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockKBs: KnowledgeBase[] = [
        {
          id: '1',
          name: 'Product Documentation',
          description: 'Complete product documentation and user guides',
          type: 'document',
          status: 'ready',
          file_count: 25,
          total_size: 15728640, // 15MB
          chunk_count: 342,
          tags: ['product', 'documentation', 'help'],
          is_public: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T14:30:00Z'
        },
        {
          id: '2',
          name: 'Company FAQ',
          description: 'Frequently asked questions and answers',
          type: 'faq',
          status: 'ready',
          file_count: 1,
          total_size: 524288, // 512KB
          chunk_count: 45,
          tags: ['faq', 'support'],
          is_public: true,
          created_at: '2024-01-10T09:00:00Z',
          updated_at: '2024-01-18T16:45:00Z'
        },
        {
          id: '3',
          name: 'Website Content',
          description: 'Scraped content from company website',
          type: 'website',
          status: 'processing',
          file_count: 0,
          total_size: 0,
          chunk_count: 0,
          tags: ['website', 'marketing'],
          is_public: false,
          created_at: '2024-01-25T11:00:00Z',
          updated_at: '2024-01-25T11:00:00Z'
        }
      ];

      setKnowledgeBases(mockKBs);
      if (mockKBs.length > 0) {
        setSelectedKB(mockKBs[0]);
      }
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKnowledgeBaseFiles = async (kbId: string) => {
    try {
      // Mock data for now
      const mockFiles: KnowledgeBaseFile[] = [
        {
          id: '1',
          filename: 'user-guide.pdf',
          file_type: 'application/pdf',
          file_size: 2097152, // 2MB
          embedding_status: 'completed',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          filename: 'api-documentation.md',
          file_type: 'text/markdown',
          file_size: 1048576, // 1MB
          embedding_status: 'completed',
          created_at: '2024-01-16T14:00:00Z'
        },
        {
          id: '3',
          filename: 'troubleshooting.docx',
          file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_size: 3145728, // 3MB
          embedding_status: 'processing',
          created_at: '2024-01-20T09:30:00Z'
        }
      ];

      setFiles(mockFiles);
    } catch (error) {
      console.error('Error fetching knowledge base files:', error);
    }
  };

  const createKnowledgeBase = async () => {
    try {
      // Mock creation - replace with actual API call
      const newKnowledgeBase: KnowledgeBase = {
        id: Date.now().toString(),
        ...newKB,
        status: 'ready',
        file_count: 0,
        total_size: 0,
        chunk_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setKnowledgeBases(prev => [newKnowledgeBase, ...prev]);
      setSelectedKB(newKnowledgeBase);
      setCreateDialogOpen(false);
      setNewKB({
        name: '',
        description: '',
        type: 'document',
        tags: [],
        is_public: false
      });
    } catch (error) {
      console.error('Error creating knowledge base:', error);
    }
  };

  const deleteKnowledgeBase = async (kbId: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base? This action cannot be undone.')) {
      return;
    }

    try {
      setKnowledgeBases(prev => prev.filter(kb => kb.id !== kbId));
      if (selectedKB?.id === kbId) {
        setSelectedKB(knowledgeBases[0] || null);
      }
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'updating': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Knowledge Bases</h2>
            <p className="text-muted-foreground">Manage your AI agent's knowledge sources</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
          <div className="lg:col-span-2">
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Bases</h2>
          <p className="text-muted-foreground">Manage your AI agent's knowledge sources</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Knowledge Base
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Knowledge Base</DialogTitle>
              <DialogDescription>
                Create a new knowledge base to store information for your AI agents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newKB.name}
                  onChange={(e) => setNewKB(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Product Documentation"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newKB.description}
                  onChange={(e) => setNewKB(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this knowledge base contains..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={newKB.type} onValueChange={(value: any) => setNewKB(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="api">API Data</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createKnowledgeBase} disabled={!newKB.name}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Base List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Your Knowledge Bases</h3>
            <Badge variant="secondary">{knowledgeBases.length}</Badge>
          </div>
          
          {knowledgeBases.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No knowledge bases yet</p>
              </CardContent>
            </Card>
          ) : (
            knowledgeBases.map((kb) => {
              const IconComponent = typeIcons[kb.type];
              return (
                <Card 
                  key={kb.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedKB?.id === kb.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedKB(kb)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-sm">{kb.name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2">
                            {kb.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(kb.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-3 w-3 mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteKnowledgeBase(kb.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{kb.file_count} files</span>
                      <span>{formatFileSize(kb.total_size)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {kb.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {kb.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{kb.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Knowledge Base Details */}
        <div className="lg:col-span-2">
          {selectedKB ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{selectedKB.name}</span>
                      {getStatusIcon(selectedKB.status)}
                      <Badge variant="outline" className="text-xs">
                        {selectedKB.type}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{selectedKB.description}</CardDescription>
                  </div>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="files" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="files" className="space-y-4">
                    {files.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">No files uploaded yet</p>
                        <Button>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Your First File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{file.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={file.embedding_status === 'completed' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {file.embedding_status}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="h-3 w-3 mr-2" />
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="h-3 w-3 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Processing Settings</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Chunk Size</span>
                            <Select defaultValue="1000">
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="500">500 tokens</SelectItem>
                                <SelectItem value="1000">1000 tokens</SelectItem>
                                <SelectItem value="2000">2000 tokens</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Overlap</span>
                            <Select defaultValue="200">
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="100">100 tokens</SelectItem>
                                <SelectItem value="200">200 tokens</SelectItem>
                                <SelectItem value="300">300 tokens</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Total Chunks</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedKB.chunk_count}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Storage Used</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatFileSize(selectedKB.total_size)}</div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Knowledge Base</h3>
                <p className="text-muted-foreground">
                  Choose a knowledge base from the list to view its details and manage files.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}