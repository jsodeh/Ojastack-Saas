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
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Mock data
  const mockKnowledgeBases: KnowledgeBase[] = [
    {
      id: "kb_1",
      name: "Customer Support Knowledge",
      description: "Comprehensive support documentation and FAQs for customer service agents",
      documents: 245,
      size: "12.3 MB",
      lastUpdated: "2 hours ago",
      status: "active",
      type: "documents",
      agents: ["agent_1", "agent_2"],
      createdAt: "2024-01-15"
    },
    {
      id: "kb_2",
      name: "Product Catalog",
      description: "Complete product information, specifications, and pricing",
      documents: 89,
      size: "8.7 MB", 
      lastUpdated: "1 day ago",
      status: "active",
      type: "documents",
      agents: ["agent_1"],
      createdAt: "2024-01-10"
    },
    {
      id: "kb_3",
      name: "Website Content",
      description: "Scraped content from company website and blog",
      documents: 156,
      size: "15.2 MB",
      lastUpdated: "6 hours ago",
      status: "processing",
      type: "website",
      agents: ["agent_2", "agent_3"],
      createdAt: "2024-01-20"
    }
  ];

  const mockDocuments: Document[] = [
    {
      id: "doc_1",
      name: "Customer Service Manual.pdf",
      type: "pdf",
      size: "2.4 MB",
      uploadedAt: "2024-01-15",
      status: "processed",
      chunks: 45,
      knowledgeBaseId: "kb_1"
    },
    {
      id: "doc_2", 
      name: "FAQ Database.docx",
      type: "docx",
      size: "1.8 MB",
      uploadedAt: "2024-01-14",
      status: "processed",
      chunks: 32,
      knowledgeBaseId: "kb_1"
    },
    {
      id: "doc_3",
      name: "Product Specifications.txt",
      type: "txt",
      size: "0.9 MB",
      uploadedAt: "2024-01-13",
      status: "processing",
      chunks: 0,
      knowledgeBaseId: "kb_2"
    }
  ];

  React.useEffect(() => {
    setKnowledgeBases(mockKnowledgeBases);
    setDocuments(mockDocuments);
  }, []);

  const filteredKnowledgeBases = knowledgeBases.filter(kb => {
    const matchesSearch = kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kb.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || kb.status === filterStatus;
    const matchesType = filterType === "all" || kb.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
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

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf": return <File className="h-4 w-4 text-red-500" />;
      case "docx": return <FileText className="h-4 w-4 text-blue-500" />;
      case "txt": return <FileText className="h-4 w-4 text-gray-500" />;
      case "url": return <ExternalLink className="h-4 w-4 text-green-500" />;
      case "api": return <Link className="h-4 w-4 text-purple-500" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Manage your AI agents' knowledge sources and documentation
            </p>
          </div>
          <div className="flex items-center space-x-3">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Knowledge Bases</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{knowledgeBases.length}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+1</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {knowledgeBases.reduce((sum, kb) => sum + kb.documents, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+32</span> from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">36.2 MB</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-muted-foreground">of 1 GB used</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter(d => d.status === 'processing').length}
              </div>
              <p className="text-xs text-muted-foreground">
                documents processing
              </p>
            </CardContent>
          </Card>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKnowledgeBases.map((kb) => (
            <Card key={kb.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      {getTypeIcon(kb.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{kb.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className={getStatusColor(kb.status)}>
                          {getStatusIcon(kb.status)}
                          <span className="ml-1">{kb.status}</span>
                        </Badge>
                        <Badge variant="secondary">
                          {kb.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 line-clamp-2">
                  {kb.description}
                </CardDescription>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Documents</span>
                    <span className="font-medium">{kb.documents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium">{kb.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{kb.lastUpdated}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Used by Agents</span>
                    <span className="font-medium">{kb.agents.length}</span>
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

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>Recently uploaded and processed documents</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(doc.type)}
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>{doc.uploadedAt}</span>
                        <span>•</span>
                        <span>{doc.chunks} chunks</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className={getStatusColor(doc.status)}>
                      {getStatusIcon(doc.status)}
                      <span className="ml-1">{doc.status}</span>
                    </Badge>
                    {doc.status === 'processing' && (
                      <Progress value={65} className="w-20" />
                    )}
                  </div>
                </div>
              ))}
            </div>
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
    </div>
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
