
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Users, Download, Search, Filter, Eye, ArrowRight, Sparkles, Bot, MessageSquare, Phone, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Database template type
type DatabaseTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  icon?: string;
  preview_image?: string;
  is_featured?: boolean;
  is_premium?: boolean;
  created_at: string;
  updated_at?: string;
  template_reviews?: { rating: number }[];
  template_installations?: { id: string }[];
  created_by?: any;
  capabilities?: any;
  configuration?: any;
};

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon?: string;
  preview_image?: string;
  is_featured: boolean;
  is_premium: boolean;
  rating: number;
  usage_count: number;
  created_by: {
    id: string;
    name: string;
    avatar?: string;
  };
  capabilities: {
    text: boolean;
    voice: boolean;
    video: boolean;
    tools: string[];
  };
  configuration: {
    personality: any;
    instructions: string;
    sample_conversations: any[];
  };
  pricing?: {
    type: 'free' | 'premium' | 'enterprise';
    price?: number;
  };
  created_at: string;
  updated_at: string;
}

interface TemplateSelectionWizardProps {
  onSelectTemplate: (template: AgentTemplate) => void;
  onCreateFromScratch: () => void;
  selectedCategory?: string;
}

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: '🤖' },
  { id: 'customer-support', name: 'Customer Support', icon: '🎧' },
  { id: 'sales', name: 'Sales Assistant', icon: '💼' },
  { id: 'lead-generation', name: 'Lead Generation', icon: '🎯' },
  { id: 'e-commerce', name: 'E-commerce', icon: '🛒' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'real-estate', name: 'Real Estate', icon: '🏠' },
  { id: 'finance', name: 'Finance', icon: '💰' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'name', label: 'Name A-Z' },
];

export default function TemplateSelectionWizard({ 
  onSelectTemplate, 
  onCreateFromScratch,
  selectedCategory = 'all'
}: TemplateSelectionWizardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryState, setSelectedCategoryState] = useState(selectedCategory);
  const [sortBy, setSortBy] = useState('popular');
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<AgentTemplate | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Fetch templates from database
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['agent-templates', selectedCategoryState, searchQuery, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('agent_templates')
        .select(`
          *,
          created_by:profiles(id, full_name, avatar_url),
          template_reviews(rating),
          template_installations(id)
        `);

      // Apply category filter
      if (selectedCategoryState !== 'all') {
        query = query.eq('category', selectedCategoryState);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
      }

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          query = query.order('usage_count', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'name':
          query = query.order('name');
          break;
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching templates:', error);
        throw error;
      }

      return data?.map((template: any): AgentTemplate => ({
        id: template.id,
        name: template.name || 'Untitled Template',
        description: template.description || 'No description available',
        category: template.category || 'general',
        tags: template.tags || [],
        icon: template.icon,
        preview_image: template.preview_image,
        is_featured: template.is_featured || false,
        is_premium: template.is_premium || false,
        created_by: {
          id: template.created_by?.id || '',
          name: template.created_by?.name || template.created_by?.full_name || 'Anonymous',
          avatar: template.created_by?.avatar || template.created_by?.avatar_url
        },
        rating: Array.isArray(template.template_reviews) && template.template_reviews.length > 0 
          ? template.template_reviews.reduce((acc: number, review: any) => acc + review.rating, 0) / template.template_reviews.length 
          : 0,
        usage_count: Array.isArray(template.template_installations) ? template.template_installations.length : 0,
        capabilities: {
          text: true,
          voice: false,
          video: false,
          tools: [],
          ...(template.capabilities || {})
        },
        configuration: {
          personality: {},
          instructions: '',
          sample_conversations: [],
          ...(template.configuration || {})
        },
        created_at: template.created_at,
        updated_at: template.updated_at || template.created_at
      })) || [];
    }
  });

  // Get unique tags from templates
  const availableTags = templates 
    ? [...new Set(templates.flatMap(t => t.tags || []))]
    : [];

  const filteredTemplates = templates?.filter(template => {
    if (selectedTags.length === 0) return true;
    return selectedTags.some(tag => template.tags?.includes(tag));
  }) || [];

  const handlePreviewTemplate = (template: AgentTemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleSelectTemplate = (template: AgentTemplate) => {
    onSelectTemplate(template);
    toast.success(`Selected template: ${template.name}`);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500 text-sm">Failed to load templates</div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choose Your Agent Template</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Start with a pre-built template designed for your use case, or create your own from scratch.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Card className="flex-1 max-w-sm cursor-pointer hover:shadow-md transition-shadow" 
              onClick={onCreateFromScratch}>
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Start from Scratch</h3>
              <p className="text-sm text-muted-foreground">Build your agent from the ground up</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 max-w-sm border-primary">
          <CardContent className="flex items-center space-x-4 p-6">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Use Template</h3>
              <p className="text-sm text-muted-foreground">Start with proven configurations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategoryState} onValueChange={setSelectedCategoryState}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 w-full">
            {CATEGORIES.map(category => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                <span className="mr-1">{category.icon}</span>
                <span className="hidden sm:inline">{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tags Filter */}
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter by tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.slice(0, 10).map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="w-full h-32 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {template.icon ? (
                      <div className="text-2xl">{template.icon}</div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {template.is_featured && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                        ⭐ Featured
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="line-clamp-2">{template.name}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Capabilities */}
                <div className="flex items-center space-x-2">
                  {template.capabilities?.text && <MessageSquare className="w-4 h-4 text-blue-500" />}
                  {template.capabilities?.voice && <Phone className="w-4 h-4 text-green-500" />}
                  {template.capabilities?.video && <Video className="w-4 h-4 text-purple-500" />}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {template.capabilities?.tools?.length || 0} tools
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {template.tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags && template.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-current text-yellow-500" />
                    <span>{template.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Download className="w-4 h-4" />
                    <span>{template.usage_count}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{template.created_by.name}</span>
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={() => handleSelectTemplate(template)}
                >
                  Use This Template
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search criteria or create a new agent from scratch.
          </p>
          <Button onClick={onCreateFromScratch}>
            Create from Scratch
          </Button>
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {previewTemplate?.icon && (
                <span className="text-2xl">{previewTemplate.icon}</span>
              )}
              <span>{previewTemplate?.name}</span>
              {previewTemplate?.is_featured && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                  Featured
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {previewTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                {/* Template Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Category</h4>
                    <Badge variant="outline">{previewTemplate.category}</Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Created by</h4>
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={previewTemplate.created_by?.avatar} />
                        <AvatarFallback>
                          {previewTemplate.created_by?.name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{previewTemplate.created_by?.name || 'Anonymous'}</span>
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <h4 className="font-semibold mb-2">Capabilities</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span>Text Chat</span>
                      {previewTemplate.capabilities?.text && <Badge variant="secondary">✓</Badge>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span>Voice</span>
                      {previewTemplate.capabilities?.voice && <Badge variant="secondary">✓</Badge>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Video className="w-4 h-4 text-purple-500" />
                      <span>Video</span>
                      {previewTemplate.capabilities?.video && <Badge variant="secondary">✓</Badge>}
                    </div>
                  </div>
                </div>

                {/* Sample Instructions */}
                {previewTemplate.configuration?.instructions && (
                  <div>
                    <h4 className="font-semibold mb-2">Sample Instructions</h4>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      {previewTemplate.configuration.instructions}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      handleSelectTemplate(previewTemplate);
                      setShowPreview(false);
                    }}
                  >
                    Use This Template
                  </Button>
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}