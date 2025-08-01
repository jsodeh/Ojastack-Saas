/**
 * Template Marketplace Component
 * Main interface for the complete template marketplace experience
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
  Eye,
  Heart,
  TrendingUp,
  Award,
  User,
  Calendar,
  Tag,
  Grid,
  List,
  SortAsc,
  SortDesc,
  BarChart3,
  BookOpen,
  Plus,
  Settings
} from 'lucide-react';
import { templateMarketplaceAPI, type MarketplaceTemplate, type SearchFilters } from '../../lib/template-marketplace-api';
import { supabase } from '../../lib/supabase';
import TemplateAnalyticsDashboard from './TemplateAnalyticsDashboard';
import TemplateCollectionManager from './TemplateCollectionManager';
import TemplatePublisher from './TemplatePublisher';
import TemplateRating from './TemplateRating';

interface TemplateMarketplaceProps {
  onTemplateSelect?: (template: MarketplaceTemplate) => void;
  onTemplateDownload?: (template: MarketplaceTemplate) => void;
  className?: string;
}

export const TemplateMarketplace: React.FC<TemplateMarketplaceProps> = ({
  onTemplateSelect,
  onTemplateDownload,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('discover');
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [featuredTemplates, setFeaturedTemplates] = useState<MarketplaceTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<MarketplaceTemplate[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [popularTags, setPopularTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating' | 'downloads' | 'name'>('popular');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  // Modal states
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [showPublisher, setShowPublisher] = useState(false);

  // User state
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    searchTemplates();
  }, [
    searchQuery,
    selectedCategory,
    selectedTags,
    sortBy,
    sortOrder,
    minRating,
    showFeaturedOnly,
    showVerifiedOnly
  ]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Load initial data
      const [
        templatesResult,
        categoriesResult,
        tagsResult,
        userTemplatesResult
      ] = await Promise.all([
        templateMarketplaceAPI.searchTemplates({ limit: 20 }),
        templateMarketplaceAPI.getCategories(),
        templateMarketplaceAPI.getPopularTags(15),
        currentUser ? templateMarketplaceAPI.getUserTemplates() : Promise.resolve([])
      ]);

      setTemplates(templatesResult.templates);
      setCategories(categoriesResult);
      setPopularTags(tagsResult);
      setUserTemplates(userTemplatesResult);

      // Load featured templates
      const featuredResult = await templateMarketplaceAPI.searchTemplates({
        featured: true,
        limit: 6
      });
      setFeaturedTemplates(featuredResult.templates);

    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchTemplates = async () => {
    try {
      setSearchLoading(true);

      const filters: SearchFilters = {
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        featured: showFeaturedOnly || undefined,
        verified: showVerifiedOnly || undefined,
        minRating: minRating > 0 ? minRating : undefined,
        sortBy,
        sortOrder,
        limit: 50
      };

      const result = await templateMarketplaceAPI.searchTemplates(filters);
      setTemplates(result.templates);

    } catch (error) {
      console.error('Failed to search templates:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleTemplateDownload = async (template: MarketplaceTemplate) => {
    try {
      if (!user) {
        alert('Please log in to download templates');
        return;
      }

      const downloadedTemplate = await templateMarketplaceAPI.downloadTemplate(template.id);

      if (onTemplateDownload) {
        onTemplateDownload(downloadedTemplate);
      }

      // Update local state
      setTemplates(prev =>
        prev.map(t => t.id === template.id ? downloadedTemplate : t)
      );

      alert('Template downloaded successfully!');
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTags([]);
    setMinRating(0);
    setShowFeaturedOnly(false);
    setShowVerifiedOnly(false);
  };

  const renderTemplateCard = (template: MarketplaceTemplate) => (
    <Card
      key={template.id}
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => setSelectedTemplate(template)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
                {template.name}
              </CardTitle>
              {template.isFeatured && (
                <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                  <Award className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {template.isVerified && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  ✓ Verified
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {template.authorName}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(template.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {template.downloadCount}
          </div>
          {template.ratingCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {template.ratingAverage.toFixed(1)} ({template.ratingCount})
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Category and Tags */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {template.category}
            </Badge>
            {template.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>

          {/* Requirements */}
          {template.requirements.integrations.length > 0 && (
            <div className="text-xs text-gray-600">
              <strong>Requires:</strong> {template.requirements.integrations.join(', ')}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTemplate(template);
              }}
            >
              <Eye className="h-3 w-3 mr-2" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTemplateDownload(template);
              }}
            >
              <Download className="h-3 w-3 mr-2" />
              Use Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTemplateList = (template: MarketplaceTemplate) => (
    <Card
      key={template.id}
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedTemplate(template)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium hover:text-blue-600 transition-colors">
                {template.name}
              </h3>
              {template.isFeatured && (
                <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs">
                  Featured
                </Badge>
              )}
              {template.isVerified && (
                <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
              {template.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{template.authorName}</span>
              <span>{template.downloadCount} downloads</span>
              {template.ratingCount > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {template.ratingAverage.toFixed(1)}
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTemplate(template);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTemplateDownload(template);
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Use
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (showPublisher) {
    return (
      <TemplatePublisher
        onPublished={(template) => {
          setShowPublisher(false);
          loadInitialData();
        }}
        onCancel={() => setShowPublisher(false)}
        className={className}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template Marketplace</h1>
          <p className="text-gray-600">Discover, share, and use AI agent templates</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>

          {user && (
            <Button onClick={() => setShowPublisher(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Publish Template
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="featured">
            <Award className="h-4 w-4 mr-2" />
            Featured
          </TabsTrigger>
          <TabsTrigger value="collections">
            <BookOpen className="h-4 w-4 mr-2" />
            Collections
          </TabsTrigger>
          {user && (
            <TabsTrigger value="my-templates">My Templates</TabsTrigger>
          )}
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('-');
                  setSortBy(sort as any);
                  setSortOrder(order as any);
                }}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="popular-desc">Most Popular</option>
                <option value="recent-desc">Most Recent</option>
                <option value="rating-desc">Highest Rated</option>
                <option value="downloads-desc">Most Downloaded</option>
                <option value="name-asc">Name A-Z</option>
              </select>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Categories */}
                    <div>
                      <h4 className="font-medium mb-3">Categories</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        <button
                          onClick={() => setSelectedCategory('')}
                          className={`block w-full text-left px-3 py-2 rounded text-sm transition-colors ${selectedCategory === ''
                            ? 'bg-blue-100 text-blue-800'
                            : 'hover:bg-gray-100'
                            }`}
                        >
                          All Categories
                        </button>
                        {categories.map(category => (
                          <button
                            key={category.name}
                            onClick={() => setSelectedCategory(category.name)}
                            className={`block w-full text-left px-3 py-2 rounded text-sm transition-colors ${selectedCategory === category.name
                              ? 'bg-blue-100 text-blue-800'
                              : 'hover:bg-gray-100'
                              }`}
                          >
                            {category.name} ({category.count})
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <h4 className="font-medium mb-3">Popular Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {popularTags.map(({ tag, count }) => (
                          <button
                            key={tag}
                            onClick={() => handleTagToggle(tag)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedTags.includes(tag)
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                          >
                            {tag} ({count})
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Additional Filters */}
                    <div>
                      <h4 className="font-medium mb-3">Filters</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm mb-1">Minimum Rating</label>
                          <select
                            value={minRating}
                            onChange={(e) => setMinRating(Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            <option value={0}>Any Rating</option>
                            <option value={4}>4+ Stars</option>
                            <option value={4.5}>4.5+ Stars</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={showFeaturedOnly}
                              onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                            />
                            <span className="text-sm">Featured only</span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={showVerifiedOnly}
                              onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                            />
                            <span className="text-sm">Verified only</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button onClick={clearFilters} variant="outline" size="sm">
                      Clear All Filters
                    </Button>
                    <Button onClick={() => setShowFilters(false)} size="sm">
                      Apply Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {searchLoading ? 'Searching...' : `${templates.length} template${templates.length !== 1 ? 's' : ''} found`}
              </p>
            </div>

            {templates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No templates found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search criteria or browse all templates
                  </p>
                  <Button onClick={clearFilters}>
                    Browse All Templates
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {templates.map(template =>
                  viewMode === 'grid'
                    ? renderTemplateCard(template)
                    : renderTemplateList(template)
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="featured" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Featured Templates</h2>
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {featuredTemplates.map(template =>
                viewMode === 'grid'
                  ? renderTemplateCard(template)
                  : renderTemplateList(template)
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collections">
          <TemplateCollectionManager />
        </TabsContent>

        {user && (
          <TabsContent value="my-templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Templates</h2>
              <Button onClick={() => setShowPublisher(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Publish New Template
              </Button>
            </div>

            {userTemplates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Publish your first template to share with the community
                  </p>
                  <Button onClick={() => setShowPublisher(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Publish Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {userTemplates.map(template =>
                  viewMode === 'grid'
                    ? renderTemplateCard(template)
                    : renderTemplateList(template)
                )}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="analytics">
          <TemplateAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex h-full">
              {/* Template Details */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
                      {selectedTemplate.isFeatured && (
                        <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                          <Award className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {selectedTemplate.isVerified && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>by {selectedTemplate.authorName}</span>
                      <span>•</span>
                      <span>{selectedTemplate.downloadCount} downloads</span>
                      <span>•</span>
                      <span>v{selectedTemplate.version}</span>
                    </div>
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
                        {selectedTemplate.category}
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

                  {/* Requirements */}
                  {selectedTemplate.requirements.integrations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Requirements</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Integrations: </span>
                          <span className="text-sm text-gray-600">
                            {selectedTemplate.requirements.integrations.join(', ')}
                          </span>
                        </div>
                        {selectedTemplate.requirements.credentials.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">Credentials: </span>
                            <span className="text-sm text-gray-600">
                              {selectedTemplate.requirements.credentials.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Changelog */}
                  {selectedTemplate.changelog && (
                    <div>
                      <h4 className="font-medium mb-2">What's New</h4>
                      <p className="text-sm text-gray-600">{selectedTemplate.changelog}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-4 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => handleTemplateDownload(selectedTemplate)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Use This Template
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

export default TemplateMarketplace;