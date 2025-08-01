/**
 * Template Marketplace API Service
 * Handles all API operations for the template marketplace
 */

import { supabase } from './supabase';

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  templateData: any;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isPublic: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  downloadCount: number;
  ratingAverage: number;
  ratingCount: number;
  version: string;
  changelog?: string;
  requirements: {
    integrations: string[];
    credentials: string[];
    minimumVersion: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface TemplateRating {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCollection {
  id: string;
  name: string;
  description: string;
  curatorId: string;
  curatorName: string;
  isPublic: boolean;
  isOfficial: boolean;
  coverImage?: string;
  colorTheme?: string;
  templateCount: number;
  totalDownloads: number;
  averageRating: number;
  followers: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceAnalytics {
  totalTemplates: number;
  totalDownloads: number;
  totalRatings: number;
  averageRating: number;
  activeUsers: number;
  templatesGrowth: number;
  downloadsGrowth: number;
  usersGrowth: number;
  topTemplates: Array<{
    id: string;
    name: string;
    category: string;
    downloads: number;
    rating: number;
    growth: number;
  }>;
  categoryStats: Array<{
    category: string;
    templateCount: number;
    downloads: number;
    averageRating: number;
    growth: number;
  }>;
}

export interface SearchFilters {
  search?: string;
  category?: string;
  tags?: string[];
  author?: string;
  featured?: boolean;
  verified?: boolean;
  minRating?: number;
  sortBy?: 'popular' | 'recent' | 'rating' | 'downloads' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

class TemplateMarketplaceAPI {
  private static instance: TemplateMarketplaceAPI;

  static getInstance(): TemplateMarketplaceAPI {
    if (!TemplateMarketplaceAPI.instance) {
      TemplateMarketplaceAPI.instance = new TemplateMarketplaceAPI();
    }
    return TemplateMarketplaceAPI.instance;
  }

  // Template Management
  async publishTemplate(templateData: {
    workflowId: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPublic: boolean;
    requirements: {
      integrations: string[];
      credentials: string[];
    };
    changelog?: string;
  }): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the source workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('agent_workflows')
        .select('*')
        .eq('id', templateData.workflowId)
        .eq('user_id', user.id)
        .single();

      if (workflowError || !workflow) {
        throw new Error('Workflow not found or access denied');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      // Sanitize workflow data
      const sanitizedData = this.sanitizeWorkflowData(workflow.workflow_data);

      // Create template record
      const templateRecord = {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        tags: templateData.tags,
        template_data: sanitizedData,
        author_id: user.id,
        author_name: profile?.full_name || 'Anonymous',
        author_avatar: profile?.avatar_url,
        is_public: templateData.isPublic,
        is_verified: false,
        is_featured: false,
        download_count: 0,
        rating_average: 0,
        rating_count: 0,
        version: this.generateVersion(),
        changelog: templateData.changelog,
        requirements: templateData.requirements,
        source_workflow_id: templateData.workflowId,
        published_at: templateData.isPublic ? new Date().toISOString() : null
      };

      const { data: template, error } = await supabase
        .from('workflow_templates')
        .insert(templateRecord)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await this.logActivity(template.id, user.id, 'published', {
        version: template.version,
        isPublic: templateData.isPublic
      });

      return template.id;
    } catch (error) {
      console.error('Failed to publish template:', error);
      throw error;
    }
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<{
      name: string;
      description: string;
      category: string;
      tags: string[];
      isPublic: boolean;
      requirements: any;
      changelog: string;
    }>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Verify ownership
      const { data: template, error: checkError } = await supabase
        .from('workflow_templates')
        .select('id')
        .eq('id', templateId)
        .eq('author_id', user.id)
        .single();

      if (checkError || !template) {
        throw new Error('Template not found or access denied');
      }

      // Prepare update data
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Handle visibility change
      if (updates.isPublic !== undefined) {
        if (updates.isPublic && !template.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('workflow_templates')
        .update(updateData)
        .eq('id', templateId);

      if (error) throw error;

      // Log activity
      await this.logActivity(templateId, user.id, 'updated', updates);
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Verify ownership
      const { data: template, error: checkError } = await supabase
        .from('workflow_templates')
        .select('id')
        .eq('id', templateId)
        .eq('author_id', user.id)
        .single();

      if (checkError || !template) {
        throw new Error('Template not found or access denied');
      }

      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      // Log activity
      await this.logActivity(templateId, user.id, 'deleted', {});
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  // Template Discovery
  async searchTemplates(filters: SearchFilters = {}): Promise<{
    templates: MarketplaceTemplate[];
    total: number;
  }> {
    try {
      let query = supabase
        .from('workflow_templates')
        .select('*', { count: 'exact' })
        .eq('is_public', true);

      // Apply filters
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters.author) {
        query = query.eq('author_id', filters.author);
      }

      if (filters.featured) {
        query = query.eq('is_featured', true);
      }

      if (filters.verified) {
        query = query.eq('is_verified', true);
      }

      if (filters.minRating) {
        query = query.gte('rating_average', filters.minRating);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'popular';
      const sortOrder = filters.sortOrder || 'desc';

      switch (sortBy) {
        case 'popular':
          query = query.order('download_count', { ascending: sortOrder === 'asc' });
          break;
        case 'recent':
          query = query.order('created_at', { ascending: sortOrder === 'asc' });
          break;
        case 'rating':
          query = query.order('rating_average', { ascending: sortOrder === 'asc' });
          break;
        case 'downloads':
          query = query.order('download_count', { ascending: sortOrder === 'asc' });
          break;
        case 'name':
          query = query.order('name', { ascending: sortOrder === 'asc' });
          break;
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data: templates, error, count } = await query;

      if (error) throw error;

      return {
        templates: (templates || []).map(this.formatTemplate),
        total: count || 0
      };
    } catch (error) {
      console.error('Failed to search templates:', error);
      return { templates: [], total: 0 };
    }
  }

  async getTemplate(templateId: string): Promise<MarketplaceTemplate | null> {
    try {
      const { data: template, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !template) return null;

      return this.formatTemplate(template);
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  async downloadTemplate(templateId: string): Promise<MarketplaceTemplate> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get template
      const { data: template, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !template) {
        throw new Error('Template not found');
      }

      // Check accessibility
      if (!template.is_public && template.author_id !== user.id) {
        throw new Error('Template is not publicly available');
      }

      // Record download
      await supabase
        .from('template_downloads')
        .insert({
          template_id: templateId,
          user_id: user.id,
          version: template.version,
          downloaded_at: new Date().toISOString()
        });

      // Increment download count
      await supabase
        .from('workflow_templates')
        .update({
          download_count: template.download_count + 1
        })
        .eq('id', templateId);

      // Log activity
      await this.logActivity(templateId, user.id, 'downloaded', {
        version: template.version
      });

      return this.formatTemplate({ ...template, download_count: template.download_count + 1 });
    } catch (error) {
      console.error('Failed to download template:', error);
      throw error;
    }
  }

  // Rating System
  async rateTemplate(
    templateId: string,
    rating: number,
    review?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check for existing rating
      const { data: existingRating } = await supabase
        .from('template_ratings')
        .select('id')
        .eq('template_id', templateId)
        .eq('user_id', user.id)
        .single();

      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from('template_ratings')
          .update({
            rating: rating,
            review: review,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRating.id);

        if (error) throw error;
      } else {
        // Create new rating
        const { error } = await supabase
          .from('template_ratings')
          .insert({
            template_id: templateId,
            user_id: user.id,
            rating: rating,
            review: review
          });

        if (error) throw error;
      }

      // Update template rating statistics (handled by database trigger)
      
      // Log activity
      await this.logActivity(templateId, user.id, 'rated', {
        rating: rating,
        hasReview: !!review
      });
    } catch (error) {
      console.error('Failed to rate template:', error);
      throw error;
    }
  }

  async getTemplateRatings(templateId: string, limit: number = 10): Promise<TemplateRating[]> {
    try {
      const { data: ratings, error } = await supabase
        .from('template_ratings')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (ratings || []).map(rating => ({
        id: rating.id,
        templateId: rating.template_id,
        userId: rating.user_id,
        rating: rating.rating,
        review: rating.review,
        createdAt: rating.created_at,
        updatedAt: rating.updated_at,
        userProfile: rating.profiles
      }));
    } catch (error) {
      console.error('Failed to get template ratings:', error);
      return [];
    }
  }

  // Analytics
  async getMarketplaceAnalytics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<MarketplaceAnalytics> {
    try {
      // This would typically involve complex queries and aggregations
      // For now, returning mock data structure
      const mockAnalytics: MarketplaceAnalytics = {
        totalTemplates: 0,
        totalDownloads: 0,
        totalRatings: 0,
        averageRating: 0,
        activeUsers: 0,
        templatesGrowth: 0,
        downloadsGrowth: 0,
        usersGrowth: 0,
        topTemplates: [],
        categoryStats: []
      };

      // Get basic counts
      const [templatesResult, downloadsResult, ratingsResult] = await Promise.all([
        supabase.from('workflow_templates').select('id', { count: 'exact' }).eq('is_public', true),
        supabase.from('template_downloads').select('id', { count: 'exact' }),
        supabase.from('template_ratings').select('rating', { count: 'exact' })
      ]);

      mockAnalytics.totalTemplates = templatesResult.count || 0;
      mockAnalytics.totalDownloads = downloadsResult.count || 0;
      mockAnalytics.totalRatings = ratingsResult.count || 0;

      // Calculate average rating
      if (ratingsResult.data && ratingsResult.data.length > 0) {
        const totalRating = ratingsResult.data.reduce((sum, r) => sum + r.rating, 0);
        mockAnalytics.averageRating = totalRating / ratingsResult.data.length;
      }

      return mockAnalytics;
    } catch (error) {
      console.error('Failed to get marketplace analytics:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    try {
      const { data: templates, error } = await supabase
        .from('workflow_templates')
        .select('category')
        .eq('is_public', true);

      if (error) throw error;

      const categoryCounts = (templates || []).reduce((acc, template) => {
        acc[template.category] = (acc[template.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }

  async getPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    try {
      const { data: templates, error } = await supabase
        .from('workflow_templates')
        .select('tags')
        .eq('is_public', true);

      if (error) throw error;

      const tagCounts = (templates || []).reduce((acc, template) => {
        (template.tags || []).forEach((tag: string) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get popular tags:', error);
      return [];
    }
  }

  // User Templates
  async getUserTemplates(userId?: string): Promise<MarketplaceTemplate[]> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return [];

      const { data: templates, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (templates || []).map(this.formatTemplate);
    } catch (error) {
      console.error('Failed to get user templates:', error);
      return [];
    }
  }

  // Private helper methods
  private sanitizeWorkflowData(workflowData: any): any {
    const sanitized = JSON.parse(JSON.stringify(workflowData));

    // Remove sensitive information
    if (sanitized.nodes) {
      sanitized.nodes = sanitized.nodes.map((node: any) => {
        const cleanNode = { ...node };
        if (cleanNode.configuration) {
          delete cleanNode.configuration.credentialId;
          delete cleanNode.configuration.apiKey;
          delete cleanNode.configuration.token;
          delete cleanNode.configuration.secret;
        }
        return cleanNode;
      });
    }

    // Clear sensitive variables
    if (sanitized.variables) {
      Object.keys(sanitized.variables).forEach(key => {
        if (key.toLowerCase().includes('credential') || 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('secret')) {
          delete sanitized.variables[key];
        }
      });
    }

    return sanitized;
  }

  private generateVersion(): string {
    const timestamp = Date.now();
    return `1.0.${timestamp}`;
  }

  private formatTemplate(template: any): MarketplaceTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags || [],
      templateData: template.template_data,
      authorId: template.author_id,
      authorName: template.author_name,
      authorAvatar: template.author_avatar,
      isPublic: template.is_public,
      isVerified: template.is_verified,
      isFeatured: template.is_featured,
      downloadCount: template.download_count,
      ratingAverage: template.rating_average,
      ratingCount: template.rating_count,
      version: template.version,
      changelog: template.changelog,
      requirements: template.requirements || {
        integrations: [],
        credentials: [],
        minimumVersion: '1.0.0'
      },
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      publishedAt: template.published_at
    };
  }

  private async logActivity(
    templateId: string,
    userId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    try {
      await supabase
        .from('template_activities')
        .insert({
          template_id: templateId,
          user_id: userId,
          action: action,
          metadata: metadata
        });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

// Export singleton instance
export const templateMarketplaceAPI = TemplateMarketplaceAPI.getInstance();
export default templateMarketplaceAPI;