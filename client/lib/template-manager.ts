/**
 * Template Management System
 * Handles CRUD operations for agent templates and marketplace functionality
 */

import { supabase } from './supabase';
import { AgentPersona, PersonaTemplate } from './persona-types';
import { AgentWorkflow } from './workflow-types';

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  workflowId?: string;
  personaId?: string;
  configuration: TemplateConfiguration;
  customizationOptions: CustomizationOption[];
  setupInstructions: SetupInstruction[];
  previewData: TemplatePreviewData;
  metadata: TemplateMetadata;
  isOfficial: boolean;
  isPublic: boolean;
  usageCount: number;
  rating: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateConfiguration {
  persona?: Partial<AgentPersona>;
  workflow?: Partial<AgentWorkflow>;
  integrations?: IntegrationConfig[];
  channels?: ChannelConfig[];
  variables?: TemplateVariable[];
}

export interface CustomizationOption {
  id: string;
  field: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'boolean' | 'number' | 'color' | 'image';
  required: boolean;
  description?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: any; description?: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
  dependencies?: Array<{
    field: string;
    value: any;
    condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  }>;
}

export interface SetupInstruction {
  id: string;
  step: number;
  title: string;
  description: string;
  type: 'info' | 'action' | 'warning' | 'code';
  content?: string;
  image?: string;
  links?: Array<{ label: string; url: string }>;
  isOptional?: boolean;
}

export interface TemplatePreviewData {
  screenshots: string[];
  demoConversation?: Array<{
    role: 'user' | 'agent';
    message: string;
    timestamp?: string;
  }>;
  features: string[];
  useCases: string[];
  integrations: string[];
}

export interface TemplateMetadata {
  version: string;
  author: string;
  license: string;
  supportUrl?: string;
  documentationUrl?: string;
  changeLog?: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
  compatibility: {
    minVersion: string;
    maxVersion?: string;
    requiredFeatures: string[];
  };
}

export interface IntegrationConfig {
  type: string;
  name: string;
  required: boolean;
  configuration: Record<string, any>;
}

export interface ChannelConfig {
  type: string;
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  defaultValue: any;
  description: string;
  required: boolean;
}

export type TemplateCategory = 
  | 'customer_service'
  | 'sales'
  | 'support'
  | 'education'
  | 'healthcare'
  | 'finance'
  | 'legal'
  | 'hr'
  | 'marketing'
  | 'general';

export interface TemplateSearchFilters {
  category?: TemplateCategory;
  tags?: string[];
  rating?: number;
  isOfficial?: boolean;
  isPublic?: boolean;
  createdBy?: string;
  searchTerm?: string;
}

export interface TemplateSearchResult {
  templates: AgentTemplate[];
  totalCount: number;
  hasMore: boolean;
  filters: {
    categories: Array<{ category: TemplateCategory; count: number }>;
    tags: Array<{ tag: string; count: number }>;
    authors: Array<{ author: string; count: number }>;
  };
}

export interface TemplateForkOptions {
  name: string;
  description?: string;
  isPublic: boolean;
  customizations: Record<string, any>;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  review?: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

export class TemplateManager {
  private static instance: TemplateManager;

  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Search templates with filters and pagination
   */
  async searchTemplates(
    filters: TemplateSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<TemplateSearchResult> {
    try {
      let query = supabase
        .from('agent_templates')
        .select(`
          *,
          template_reviews(rating),
          profiles:created_by(name, avatar_url)
        `)
        .eq('is_active', true);

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.isOfficial !== undefined) {
        query = query.eq('is_official', filters.isOfficial);
      }

      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
      }

      if (filters.rating) {
        query = query.gte('rating', filters.rating);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      // Order by usage and rating
      query = query.order('usage_count', { ascending: false })
                   .order('rating', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data
      const templates: AgentTemplate[] = (data || []).map(this.transformTemplateData);

      // Get filter aggregations (simplified for now)
      const filterData = await this.getFilterAggregations(filters);

      return {
        templates,
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit,
        filters: filterData
      };
    } catch (error) {
      console.error('Failed to search templates:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<AgentTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select(`
          *,
          template_reviews(rating, review, helpful_count, created_at, profiles:user_id(name, avatar_url)),
          profiles:created_by(name, avatar_url)
        `)
        .eq('id', templateId)
        .single();

      if (error || !data) {
        console.error('Failed to get template:', error);
        return null;
      }

      return this.transformTemplateData(data);
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  /**
   * Create new template
   */
  async createTemplate(
    userId: string,
    templateData: Omit<AgentTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating'>
  ): Promise<AgentTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          tags: templateData.tags,
          workflow_id: templateData.workflowId,
          persona_id: templateData.personaId,
          configuration: templateData.configuration,
          customization_options: templateData.customizationOptions,
          setup_instructions: templateData.setupInstructions,
          preview_data: templateData.previewData,
          metadata: templateData.metadata,
          is_official: templateData.isOfficial,
          is_public: templateData.isPublic,
          created_by: userId,
          usage_count: 0,
          rating: 0
        })
        .select()
        .single();

      if (error) throw error;

      return this.transformTemplateData(data);
    } catch (error) {
      console.error('Failed to create template:', error);
      return null;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    updates: Partial<AgentTemplate>
  ): Promise<AgentTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .update({
          name: updates.name,
          description: updates.description,
          category: updates.category,
          tags: updates.tags,
          configuration: updates.configuration,
          customization_options: updates.customizationOptions,
          setup_instructions: updates.setupInstructions,
          preview_data: updates.previewData,
          metadata: updates.metadata,
          is_public: updates.isPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) throw error;

      return this.transformTemplateData(data);
    } catch (error) {
      console.error('Failed to update template:', error);
      return null;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_templates')
        .delete()
        .eq('id', templateId)
        .eq('created_by', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to delete template:', error);
      return false;
    }
  }

  /**
   * Fork template with customizations
   */
  async forkTemplate(
    templateId: string,
    userId: string,
    options: TemplateForkOptions
  ): Promise<AgentTemplate | null> {
    try {
      // Get original template
      const originalTemplate = await this.getTemplate(templateId);
      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      // Apply customizations to configuration
      const customizedConfig = this.applyCustomizations(
        originalTemplate.configuration,
        originalTemplate.customizationOptions,
        options.customizations
      );

      // Create new template
      const forkedTemplate = await this.createTemplate(userId, {
        ...originalTemplate,
        name: options.name,
        description: options.description || `Forked from ${originalTemplate.name}`,
        isPublic: options.isPublic,
        isOfficial: false,
        configuration: customizedConfig,
        metadata: {
          ...originalTemplate.metadata,
          version: '1.0.0',
          author: userId,
          license: originalTemplate.metadata.license
        }
      });

      // Increment usage count of original template
      await this.incrementUsageCount(templateId);

      return forkedTemplate;
    } catch (error) {
      console.error('Failed to fork template:', error);
      return null;
    }
  }

  /**
   * Get template reviews
   */
  async getTemplateReviews(
    templateId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: TemplateReview[]; totalCount: number }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('template_reviews')
        .select(`
          *,
          profiles:user_id(name, avatar_url)
        `, { count: 'exact' })
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const reviews: TemplateReview[] = (data || []).map(review => ({
        id: review.id,
        templateId: review.template_id,
        userId: review.user_id,
        rating: review.rating,
        review: review.review,
        helpfulCount: review.helpful_count,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
        user: review.profiles ? {
          name: review.profiles.name,
          avatar: review.profiles.avatar_url
        } : undefined
      }));

      return {
        reviews,
        totalCount: count || 0
      };
    } catch (error) {
      console.error('Failed to get template reviews:', error);
      return { reviews: [], totalCount: 0 };
    }
  }

  /**
   * Add or update template review
   */
  async reviewTemplate(
    templateId: string,
    userId: string,
    rating: number,
    review?: string
  ): Promise<TemplateReview | null> {
    try {
      const { data, error } = await supabase
        .from('template_reviews')
        .upsert({
          template_id: templateId,
          user_id: userId,
          rating,
          review,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update template average rating
      await this.updateTemplateRating(templateId);

      return {
        id: data.id,
        templateId: data.template_id,
        userId: data.user_id,
        rating: data.rating,
        review: data.review,
        helpfulCount: data.helpful_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Failed to review template:', error);
      return null;
    }
  }

  /**
   * Get user's templates
   */
  async getUserTemplates(userId: string): Promise<AgentTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('created_by', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformTemplateData);
    } catch (error) {
      console.error('Failed to get user templates:', error);
      return [];
    }
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<AgentTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false })
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(this.transformTemplateData);
    } catch (error) {
      console.error('Failed to get popular templates:', error);
      return [];
    }
  }

  /**
   * Get recommended templates for user
   */
  async getRecommendedTemplates(userId: string, limit: number = 10): Promise<AgentTemplate[]> {
    try {
      // Simple recommendation based on user's previous template usage
      // In a real implementation, this would use more sophisticated algorithms
      
      const { data, error } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('is_public', true)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(this.transformTemplateData);
    } catch (error) {
      console.error('Failed to get recommended templates:', error);
      return [];
    }
  }

  private transformTemplateData(data: any): AgentTemplate {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags || [],
      workflowId: data.workflow_id,
      personaId: data.persona_id,
      configuration: data.configuration || {},
      customizationOptions: data.customization_options || [],
      setupInstructions: data.setup_instructions || [],
      previewData: data.preview_data || { screenshots: [], features: [], useCases: [], integrations: [] },
      metadata: data.metadata || { version: '1.0.0', author: data.created_by, license: 'MIT' },
      isOfficial: data.is_official,
      isPublic: data.is_public,
      usageCount: data.usage_count,
      rating: data.rating,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private async getFilterAggregations(filters: TemplateSearchFilters): Promise<any> {
    // Simplified aggregation - in real implementation, this would be more sophisticated
    return {
      categories: [
        { category: 'customer_service', count: 25 },
        { category: 'sales', count: 18 },
        { category: 'support', count: 15 }
      ],
      tags: [
        { tag: 'chatbot', count: 45 },
        { tag: 'automation', count: 32 },
        { tag: 'ai-assistant', count: 28 }
      ],
      authors: [
        { author: 'official', count: 12 },
        { author: 'community', count: 156 }
      ]
    };
  }

  private applyCustomizations(
    baseConfig: TemplateConfiguration,
    options: CustomizationOption[],
    customizations: Record<string, any>
  ): TemplateConfiguration {
    const config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    options.forEach(option => {
      if (customizations.hasOwnProperty(option.field)) {
        const value = customizations[option.field];
        
        // Apply the customization to the configuration
        this.setNestedValue(config, option.field, value);
      }
    });

    return config;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  private async incrementUsageCount(templateId: string): Promise<void> {
    try {
      await supabase.rpc('increment_template_usage', { template_id: templateId });
    } catch (error) {
      console.error('Failed to increment usage count:', error);
    }
  }

  private async updateTemplateRating(templateId: string): Promise<void> {
    try {
      await supabase.rpc('update_template_rating', { template_id: templateId });
    } catch (error) {
      console.error('Failed to update template rating:', error);
    }
  }
}

// Export singleton instance
export const templateManager = TemplateManager.getInstance();