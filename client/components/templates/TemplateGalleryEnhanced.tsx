import React, { useState, useEffect } from 'react';
import { AgentTemplate, TemplateSearchFilters, templateManager } from '@/lib/template-manager';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Filter,
  Star,
  Users,
  Download,
  Eye,
  Heart,
  TrendingUp,
  Clock,
  Grid,
  List,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateGalleryEnhancedProps {
  onTemplateSelect?: (template: AgentTemplate) => void;
  onTemplatePreview?: (template: AgentTemplate) => void;
  showUserTemplates?: boolean;
  userId?: string;
  className?: string;
}

export default function TemplateGalleryEnhanced({
  onTemplateSelect,
  onTemplatePreview,
  showUserTemplates = false,
  userId,
  className
}: TemplateGalleryEnhancedProps) {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<AgentTemplate[]>([]);
  const [recommendedTemplates, setRecommendedTemplates] = useState<AgentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TemplateSearchFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent' | 'name'>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadTemplates();
    loadPopularTemplates();
    if (userId) {
      loadRecommendedTemplates();
    }
  }, [filters, sortBy, currentPage, showUserTemplates, userId]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== filters.searchTerm) {
        setFilters(prev => ({ ...prev, searchTerm }));
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      
      let searchFilters = { ...filters };
      if (showUserTemplates && userId) {
        searchFilters.createdBy = userId;
      }

      const result = await templateManager.searchTemplates(searchFilters, currentPage, 20);
      
      if (currentPage === 1) {
        setTemplates(result.templates);
      } else {
        setTemplates(prev => [...prev, ...result.templates]);
      }
      
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPopularTemplates = async () => {
    try {
      const popular = await templateManager.getPopularTemplates(6);
      setPopularTemplates(popular);
    } catch (error) {
      console.error('Failed to load popular templates:', error);
    }
  };

  const loadRecommendedTemplates = async () => {
    if (!userId) return;
    
    try {
      const recommended = await templateManager.getRecommendedTemplates(userId, 6);
      setRecommendedTemplates(recommended);
    } catch (error) {
      console.error('Failed to load recommended templates:', error);
    }
  };

  const handleFilterChange = (key: keyof TemplateSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      customer_service: 'bg-blue-100 text-blue-800',
      sales: 'bg-green-100 text-green-800',
      support: 'bg-purple-100 text-purple-800',
      education: 'bg-yellow-100 text-yellow-800',
      healthcare: 'bg-red-100 text-red-800',
      finance: 'bg-indigo-100 text-indigo-800',
      legal: 'bg-gray-100 text-gray-800',
      hr: 'bg-pink-100 text-pink-800',
      marketing: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const renderTemplateCard = (template: AgentTemplate, size: 'small' | 'medium' | 'large' = 'medium') => {
    const cardClass = cn(
      'group cursor-pointer transition-all duration-200 hover:shadow-lg',
      size === 'small' && 'p-3',
      size === 'medium' && 'p-4',
      size === 'large' && 'p-6'
    );

    return (
      <Card key={template.id} className={cardClass} onClick={() => onTemplateSelect?.(template)}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  'font-semibold truncate',
                  size === 'small' ? 'text-sm' : 'text-base'
                )}>
                  {template.name}
                </h3>
                {template.isOfficial && (
                  <Badge variant="default" className="text-xs">
                    Official
                  </Badge>
                )}
              </div>
              <p className={cn(
                'text-gray-600 line-clamp-2',
                size === 'small' ? 'text-xs' : 'text-sm'
              )}>
                {template.description}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTemplatePreview?.(template);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {/* Preview Images */}
          {template.previewData.screenshots.length > 0 && size !== 'small' && (
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={template.previewData.screenshots[0]}
                alt={`${template.name} preview`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Features */}
          {template.previewData.features.length > 0 && size === 'large' && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Key Features</h4>
              <div className="flex flex-wrap gap-1">
                {template.previewData.features.slice(0, 3).map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {template.previewData.features.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.previewData.features.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            <Badge className={cn('text-xs', getCategoryColor(template.category))}>
              {template.category.replace('_', ' ')}
            </Badge>
            {template.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 2}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{template.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{template.usageCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>Use</span>
              </div>
            </div>
            
            {size !== 'small' && (
              <div className="text-xs text-gray-400">
                {new Date(template.updatedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderListView = () => (
    <div className="space-y-3">
      {templates.map(template => (
        <Card key={template.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onTemplateSelect?.(template)}>
          <div className="flex items-center gap-4">
            {/* Preview */}
            {template.previewData.screenshots.length > 0 && (
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={template.previewData.screenshots[0]}
                  alt={`${template.name} preview`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{template.name}</h3>
                {template.isOfficial && (
                  <Badge variant="default" className="text-xs">Official</Badge>
                )}
                <Badge className={cn('text-xs', getCategoryColor(template.category))}>
                  {template.category.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                {template.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{template.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{template.usageCount.toLocaleString()}</span>
                </div>
                <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onTemplatePreview?.(template);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Use
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {showUserTemplates ? 'My Templates' : 'Template Gallery'}
          </h2>
          <p className="text-gray-600">
            {showUserTemplates 
              ? 'Manage your custom agent templates'
              : 'Discover and use pre-built agent templates'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="recent">Most Recent</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All Categories</option>
                  <option value="customer_service">Customer Service</option>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                  <option value="education">Education</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Rating</label>
                <select
                  value={filters.rating || ''}
                  onChange={(e) => handleFilterChange('rating', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <select
                  value={filters.isOfficial?.toString() || ''}
                  onChange={(e) => handleFilterChange('isOfficial', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All Templates</option>
                  <option value="true">Official Only</option>
                  <option value="false">Community Only</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Popular Templates Section */}
      {!showUserTemplates && popularTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Popular Templates</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTemplates.map(template => renderTemplateCard(template, 'small'))}
          </div>
        </div>
      )}

      {/* Recommended Templates Section */}
      {!showUserTemplates && recommendedTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold">Recommended for You</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedTemplates.map(template => renderTemplateCard(template, 'small'))}
          </div>
        </div>
      )}

      {/* Main Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {showUserTemplates ? 'Your Templates' : 'All Templates'}
          </h3>
          <span className="text-sm text-gray-500">
            {totalCount.toLocaleString()} templates
          </span>
        </div>

        {isLoading && templates.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="aspect-video bg-gray-200 rounded"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => renderTemplateCard(template))}
              </div>
            ) : (
              renderListView()
            )}

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Templates'
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {templates.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600">
              {showUserTemplates 
                ? "You haven't created any templates yet."
                : "Try adjusting your search or filters."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}