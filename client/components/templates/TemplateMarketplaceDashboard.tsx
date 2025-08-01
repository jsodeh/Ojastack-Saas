/**
 * Template Marketplace Dashboard
 * Main interface for browsing, discovering, and managing templates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Search,
  Filter,
  Star,
  Download,
  TrendingUp,
  Heart,
  Eye,
  Plus,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Users,
  Clock,
  Award
} from 'lucide-react';
import { templateManager, type AgentTemplate, type TemplateCategory } from '../../lib/template-manager';
import { templateRecommendationEngine } from '../../lib/template-recommendation-engine';
import TemplatePublisher from './TemplatePublisher';
import TemplateRating from './TemplateRating';
import { supabase } from '../../lib/supabase';

interface TemplateMarketplaceDashboardProps {
  className?: string;
}

export const TemplateMarketplaceDashboard: React.FC<TemplateMarketplaceDashboardProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('discover');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | ''>('');
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'recent' | 'name'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Data states
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [recommendedTemplates, setRecommendedTemplates] = useState<AgentTemplate[]>([]);
  const [trendingTemplates, setTrendingTemplates] = useState<AgentTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // UI states
  const [showPublisher, setShowPublisher] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (searchTerm || selectedCategory) {
      searchTemplates();
    } else {
      loadPopularTemplates();
    }
  }, [searchTerm, selectedCategory, sortBy, sortOrder]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Load different template sets
      await Promise.all([
        loadPopularTemplates(),
        loadRecommendedTemplates(currentUser?.id),
        loadTrendingTemplates(),
        loadUserTemplates(currentUser?.id)
      ]);

    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPopularTemplates = async () => {
    try {
      const popular = await templateManager.getPopularTemplates(20);
      setTemplates(popular);
    } catch (error) {
      console.error('Failed to load popular templates:', error);
    }
  };

  const loadRecommendedTemplates = async (userId?: string) => {
    if (!userId) return;
    
    try {
      const { templates: recommended } = await templateRecommendationEngine.getRecommendations(
        userId,
        { limit: 10, excludeUsed: true }
      );
      setRecommendedTemplates(recommended);
    } catch (error) {
      console.error('Failed to load recommended templates:', error);
    }
  };

  const loadTrendingTemplates = async () => {
    try {
      const trending = await templateRecommendationEngine.getTrendingTemplates('week', 10);
      setTrendingTemplates(trending);
    } catch (error) {
      console.error('Failed to load trending templates:', error);
    }
  };

  const loadUserTemplates = async (userId?: string) => {
    if (!userId) return;
    
    try {
      const userTemps = await templateManager.getUserTemplates(userId);
      setUserTemplates(userTemps);
    } catch (error) {
      console.error('Failed to load user templates:', error);
    }
  };

  const searchTemplates = async () => {
    try {
      const { templates: searchResults } = await templateManager.searchTemplates({
        searchTerm: searchTerm || undefined,
        category: selectedCategory || undefined,
        isPublic: true
      });

      // Sort results
      const sorted = [...searchResults].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'rating':
            comparison = a.rating - b.rating;
            break;
          case 'usage':
            comparison = a.usageCount - b.usageCount;
            break;
          case 'recent':
            comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });

      setTemplates(sorted);
    } catch (error) {
      console.error('Failed to search templates:', error);
    }
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    
    // Record interaction for recommendations
    if (user) {
      templateRecommendationEngine.recordTemplateUsage(user.id, template.id, {
        usedAt: new Date().toISOString(),
        completed: false
      });
    }
  };

  const handleTemplateInstall = async (template: AgentTemplate) => {
    if (!user) {
      alert('Please log in to install templates');
      return;
    }

    try {
      // This would typically open an installation wizard
      alert(`Installing template: ${template.name}`);
      
      // Record usage
      await templateRecommendationEngine.recordTemplateUsage(user.id, template.id, {
        usedAt: new Date().toISOString(),
        completed: true
      });

    } catch (error) {
      console.error('Failed to install template:', error);
      alert('Failed to install template. Please try again.');
    }
  };

  const renderTemplateCard = (template: AgentTemplate) => (
    <Card 
      key={template.id} 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => handleTemplateSelect(template)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {template.description}
            </CardDescription>
          </div>
          
          {template.isOfficial && (
            <Badge variant="default" className="ml-2">
              <Award className="h-3 w-3 mr-1" />
              Official
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span>{template.rating.toFixed(1)}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Download className="h-3 w-3" />
                <span>{template.usageCount}</span>
              </div>
            </div>

            <Badge variant="outline" className="text-xs">
              {template.category.replace('_', ' ')}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleTemplateInstall(template);
              }}
            >
              <Download className="h-3 w-3 mr-2" />
              Install
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTemplate(template);
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTemplateList = (templateList: AgentTemplate[], title: string, showAll: boolean = false) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {!showAll && templateList.length > 6 && (
          <Button variant="outline" size="sm">
            View All
          </Button>
        )}
      </div>
      
      <div className={`grid gap-4 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
      }`}>
        {(showAll ? templateList : templateList.slice(0, 6)).map(renderTemplateCard)}
      </div>
    </div>
  );

  const categories: Array<{ value: TemplateCategory | ''; label: string }> = [
    { value: '', label: 'All Categories' },
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'sales', label: 'Sales' },
    { value: 'support', label: 'Support' },
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'legal', label: 'Legal' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'general', label: 'General' }
  ];

  if (showPublisher) {
    return (
      <TemplatePublisher
        onPublished={(template) => {
          setShowPublisher(false);
          loadUserTemplates(user?.id);
        }}
        onCancel={() => setShowPublisher(false)}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Marketplace</h1>
          <p className="text-gray-600">Discover and share AI agent templates</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          
          {user && (
            <Button onClick={() => setShowPublisher(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Publish Template
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | '')}
              className="px-3 py-2 border rounded-md"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 border rounded-md"
            >
              <option value="rating-desc">Highest Rated</option>
              <option value="usage-desc">Most Popular</option>
              <option value="recent-desc">Recently Updated</option>
              <option value="name-asc">Name A-Z</option>
            </select>

            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
          {user && (
            <>
              <TabsTrigger value="recommended">For You</TabsTrigger>
              <TabsTrigger value="my-templates">My Templates</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="discover" className="space-y-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse">Loading templates...</div>
            </div>
          ) : (
            renderTemplateList(templates, 'All Templates', true)
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-8">
          {renderTemplateList(trendingTemplates, 'Trending This Week', true)}
        </TabsContent>

        {user && (
          <>
            <TabsContent value="recommended" className="space-y-8">
              {renderTemplateList(recommendedTemplates, 'Recommended for You', true)}
            </TabsContent>

            <TabsContent value="my-templates" className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">My Templates</h3>
                <Button onClick={() => setShowPublisher(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </div>
              
              {userTemplates.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first template to share with the community
                    </p>
                    <Button onClick={() => setShowPublisher(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                renderTemplateList(userTemplates, '', true)
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex">
              {/* Template Details */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedTemplate.name}</h2>
                    <p className="text-gray-600">{selectedTemplate.description}</p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    ×
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Template Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Category</h4>
                      <Badge variant="outline">
                        {selectedTemplate.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedTemplate.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="font-medium mb-2">Features</h4>
                    <ul className="space-y-1">
                      {selectedTemplate.previewData.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600">• {feature}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Use Cases */}
                  <div>
                    <h4 className="font-medium mb-2">Use Cases</h4>
                    <ul className="space-y-1">
                      {selectedTemplate.previewData.useCases.map((useCase, index) => (
                        <li key={index} className="text-sm text-gray-600">• {useCase}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-4 pt-4 border-t">
                    <Button 
                      className="flex-1"
                      onClick={() => handleTemplateInstall(selectedTemplate)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Install Template
                    </Button>
                    
                    <Button variant="outline">
                      <Heart className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* Ratings Section */}
              <div className="w-96 border-l bg-gray-50 p-6 overflow-auto">
                <TemplateRating
                  templateId={selectedTemplate.id}
                  onRatingChange={() => {
                    // Refresh template data
                    loadInitialData();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateMarketplaceDashboard;