import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Filter, 
  Star, 
  Users, 
  Eye, 
  Sparkles,
  MessageSquare,
  Mic,
  Image,
  Video,
  Settings,
  Play,
  Pause,
  Trash2,
  Copy
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import {
  fetchAgentTemplates,
  fetchUserAgents,
  getTemplateCategories,
  type AgentTemplate,
  type UserAgent,
  type TemplateFilters,
  getCapabilityLabels,
  getUserAgentCapabilityLabels,
  formatAgentStatus,
  AgentServiceError
} from '@/lib/agent-service';

export default function AgentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState<'templates' | 'my-agents'>('templates');
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Template filters
  const [filters, setFilters] = useState<TemplateFilters>({
    sortBy: 'rating',
    sortOrder: 'desc'
  });
  
  // Preview modal
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [user?.id, activeTab]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'templates') {
        const [templatesData, categoriesData] = await Promise.all([
          fetchAgentTemplates(filters),
          getTemplateCategories()
        ]);
        setTemplates(templatesData);
        setCategories(categoriesData);
      } else {
        const agentsData = await fetchUserAgents(user.id);
        setUserAgents(agentsData);
      }
    } catch (err) {
      console.error('Error loading agents data:', err);
      const error = err instanceof Error ? err : new Error('Failed to load data');
      setError(error);
      
      toast({
        title: "Error Loading Data",
        description: error instanceof AgentServiceError 
          ? error.message 
          : "Failed to load agents data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<TemplateFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handlePreviewTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleUseTemplate = (template: AgentTemplate) => {
    // Navigate to agent creation wizard with template using parameterized route
    window.location.href = `/dashboard/agents/create/${template.id}`;
  };

  const handleCreateCustomAgent = () => {
    // Navigate to agent creation wizard without template
    window.location.href = '/dashboard/agents/create';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">
            Create and manage your AI agents
          </p>
        </div>
        <Button onClick={handleCreateCustomAgent} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Agent
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'templates' | 'my-agents')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Templates</span>
            </TabsTrigger>
            <TabsTrigger value="my-agents" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>My Agents ({userAgents.length})</span>
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'templates' && (
            <Button variant="outline" onClick={handleCreateCustomAgent}>
              <Sparkles className="h-4 w-4 mr-2" />
              Create Custom Agent
            </Button>
          )}
        </div>

        <TabsContent value="templates" className="space-y-6">
          <TemplatesTab 
            templates={templates}
            categories={categories}
            filters={filters}
            loading={loading}
            onFilterChange={handleFilterChange}
            onPreview={handlePreviewTemplate}
            onUseTemplate={handleUseTemplate}
          />
        </TabsContent>

        <TabsContent value="my-agents" className="space-y-6">
          <MyAgentsTab 
            agents={userAgents}
            loading={loading}
            onRefresh={loadData}
          />
        </TabsContent>
      </Tabs>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  );
}

// Templates Tab Component
function TemplatesTab({
  templates,
  categories,
  filters,
  loading,
  onFilterChange,
  onPreview,
  onUseTemplate
}: {
  templates: AgentTemplate[];
  categories: string[];
  filters: TemplateFilters;
  loading: boolean;
  onFilterChange: (filters: Partial<TemplateFilters>) => void;
  onPreview: (template: AgentTemplate) => void;
  onUseTemplate: (template: AgentTemplate) => void;
}) {
  return (
    <>
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-10"
          />
        </div>
        
        <Select value={filters.category || 'all'} onValueChange={(value) => onFilterChange({ category: value === 'all' ? undefined : value })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sortBy || 'rating'} onValueChange={(value) => onFilterChange({ sortBy: value as any })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="usage">Popular</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="created_at">Newest</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => onFilterChange({ featured: !filters.featured })}>
          <Filter className="h-4 w-4 mr-2" />
          {filters.featured ? 'All' : 'Featured'}
        </Button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="flex space-x-2">
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or search terms
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template, index) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={onPreview}
              onUseTemplate={onUseTemplate}
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>
      )}
    </>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onPreview,
  onUseTemplate,
  style
}: {
  template: AgentTemplate;
  onPreview: (template: AgentTemplate) => void;
  onUseTemplate: (template: AgentTemplate) => void;
  style?: React.CSSProperties;
}) {
  // For templates, capabilities might be in configuration field as JSON
  const templateConfig = template.configuration ? 
    (typeof template.configuration === 'string' ? 
      JSON.parse(template.configuration) : 
      template.configuration) : {};
  const capabilities = getCapabilityLabels(templateConfig.capabilities || null);

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4"
      style={style}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {(template as any).featured && (
                <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="mb-2">{template.category}</Badge>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Capabilities */}
          <div className="flex flex-wrap gap-1">
            {capabilities.map(capability => (
              <Badge key={capability} variant="secondary" className="text-xs">
                {capability === 'Text' && <MessageSquare className="h-3 w-3 mr-1" />}
                {capability === 'Voice' && <Mic className="h-3 w-3 mr-1" />}
                {capability === 'Image' && <Image className="h-3 w-3 mr-1" />}
                {capability === 'Video' && <Video className="h-3 w-3 mr-1" />}
                {capability}
              </Badge>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{template.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{template.usage_count.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onPreview(template)} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button size="sm" onClick={() => onUseTemplate(template)} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// My Agents Tab Component
function MyAgentsTab({
  agents,
  loading,
  onRefresh
}: {
  agents: UserAgent[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No agents created yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first AI agent to get started
        </p>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Agent
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent, index) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          style={{ animationDelay: `${index * 100}ms` }}
        />
      ))}
    </div>
  );
}

// Agent Card Component
function AgentCard({
  agent,
  style
}: {
  agent: UserAgent;
  style?: React.CSSProperties;
}) {
  const status = formatAgentStatus(agent.status);
  const capabilities = getUserAgentCapabilityLabels(agent);

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4"
      style={style}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge 
                variant="outline" 
                className={`${
                  status.color === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                  status.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  status.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                  status.color === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <span className="mr-1">{status.icon}</span>
                {status.label}
              </Badge>
              {(agent as any).is_draft && (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
          </div>
        </div>
        {agent.description && (
          <CardDescription className="line-clamp-2">
            {agent.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Capabilities */}
          <div className="flex flex-wrap gap-1">
            {capabilities.map(capability => (
              <Badge key={capability} variant="secondary" className="text-xs">
                {capability === 'Text' && <MessageSquare className="h-3 w-3 mr-1" />}
                {capability === 'Voice' && <Mic className="h-3 w-3 mr-1" />}
                {capability === 'Image' && <Image className="h-3 w-3 mr-1" />}
                {capability === 'Video' && <Video className="h-3 w-3 mr-1" />}
                {capability}
              </Badge>
            ))}
          </div>

          {/* Knowledge Bases */}
          {agent.knowledge_base_ids && agent.knowledge_base_ids.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{agent.knowledge_base_ids.length}</span> knowledge base{agent.knowledge_base_ids.length !== 1 ? 's' : ''} connected
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            {agent.status === 'active' ? (
              <Button variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button size="sm">
                <Play className="h-4 w-4 mr-2" />
                Deploy
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Template Preview Modal Component
function TemplatePreviewModal({
  template,
  open,
  onOpenChange,
  onUseTemplate
}: {
  template: AgentTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (template: AgentTemplate) => void;
}) {
  // For templates, capabilities might be in configuration field as JSON
  const templateConfig = template.configuration ? 
    (typeof template.configuration === 'string' ? 
      JSON.parse(template.configuration) : 
      template.configuration) : {};
  const capabilities = getCapabilityLabels(templateConfig.capabilities || null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{template.name}</DialogTitle>
              <DialogDescription className="mt-2">
                {template.description}
              </DialogDescription>
            </div>
            {(template as any).featured && (
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stats and Capabilities */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Template Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rating:</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{template.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usage:</span>
                  <span>{template.usage_count.toLocaleString()} times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="outline">{template.category}</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {capabilities.map(capability => (
                  <Badge key={capability} variant="secondary">
                    {capability === 'Text' && <MessageSquare className="h-3 w-3 mr-1" />}
                    {capability === 'Voice' && <Mic className="h-3 w-3 mr-1" />}
                    {capability === 'Image' && <Image className="h-3 w-3 mr-1" />}
                    {capability === 'Video' && <Video className="h-3 w-3 mr-1" />}
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Sample Conversations */}
          {(template as any).sample_conversations && (template as any).sample_conversations.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Sample Conversation</h4>
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                {(template as any).sample_conversations[0].messages.map((message: any, index: number) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => {
              onUseTemplate(template);
              onOpenChange(false);
            }}>
              <Play className="h-4 w-4 mr-2" />
              Use This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}