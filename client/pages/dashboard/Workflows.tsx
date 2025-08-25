import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus,
  Search,
  Play,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Settings,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Grid,
  List,
  Filter,
  SortAsc
} from 'lucide-react';
import { Workflow } from '@/lib/workflow-types';
import { workflowService } from '@/lib/workflow-service';
import WorkflowBuilder from '@/components/workflow-builder/WorkflowBuilder';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'status'>('updated');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const userWorkflows = await workflowService.getWorkflows('current-user');
      setWorkflows(userWorkflows);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setSelectedWorkflow(null);
    loadWorkflows(); // Refresh workflows after editing
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await workflowService.deleteWorkflow(workflowId);
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    }
  };

  const handleDuplicateWorkflow = (workflow: Workflow) => {
    const duplicated: Workflow = {
      ...workflow,
      id: '',
      name: `${workflow.name} (Copy)`,
      status: 'draft',
      metadata: {
        ...workflow.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    setSelectedWorkflow(duplicated);
    setShowBuilder(true);
  };

  const handleExecuteWorkflow = async (workflow: Workflow) => {
    try {
      await workflowService.executeWorkflow(workflow.id, {
        userMessage: 'Quick test execution',
        userId: 'current-user'
      });
      
      // Could show execution results in a modal or navigate to execution view
      console.log('Workflow executed successfully');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  // Filter and sort workflows
  const filteredWorkflows = workflows
    .filter(workflow => {
      const matchesSearch = !searchQuery || 
        workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterStatus === 'all' || workflow.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'updated':
        default:
          return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
      }
    });

  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflowId={selectedWorkflow?.id}
        onSave={(workflow) => {
          console.log('Workflow saved:', workflow);
          loadWorkflows();
        }}
        onClose={handleCloseBuilder}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">
            Create and manage automated workflows for your AI agents
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleCreateWorkflow} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="updated">Sort by Updated</option>
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows List/Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Loading workflows...</span>
          </div>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="mb-2">
              {searchQuery || filterStatus !== 'all' ? 'No workflows found' : 'No workflows yet'}
            </CardTitle>
            <CardDescription className="mb-4">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first workflow to automate agent behavior'
              }
            </CardDescription>
            {!searchQuery && filterStatus === 'all' && (
              <Button onClick={handleCreateWorkflow} className="flex items-center mx-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredWorkflows.map((workflow) => (
            <Card 
              key={workflow.id} 
              className={`transition-all duration-200 hover:shadow-md ${
                viewMode === 'list' ? 'flex' : ''
              }`}
            >
              <CardHeader className={viewMode === 'list' ? 'flex-1' : ''}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <Badge className={getStatusColor(workflow.status)}>
                        {getStatusIcon(workflow.status)}
                        <span className="ml-1">{workflow.status}</span>
                      </Badge>
                    </div>
                    <CardDescription className="mb-3">
                      {workflow.description || 'No description provided'}
                    </CardDescription>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{workflow.nodes.length} nodes</span>
                      <span>{workflow.edges.length} connections</span>
                      <span>v{workflow.version}</span>
                    </div>
                  </div>
                </div>
                
                {workflow.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {workflow.metadata.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {workflow.metadata.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{workflow.metadata.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              
              <CardContent className={`pt-0 ${viewMode === 'list' ? 'flex items-center' : ''}`}>
                <div className={`flex items-center ${viewMode === 'list' ? 'space-x-2' : 'justify-between'}`}>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(workflow.metadata.updatedAt).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {workflow.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExecuteWorkflow(workflow)}
                        className="flex items-center"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWorkflow(workflow)}
                      className="flex items-center"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateWorkflow(workflow)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}