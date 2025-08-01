/**
 * Template Recommendation Engine
 * Provides personalized template recommendations based on user behavior and preferences
 */

import { supabase } from './supabase';
import { templateManager, type AgentTemplate, type TemplateCategory, type TemplateMetadata, type TemplatePreviewData } from './template-manager';

// Database response types - using a different name to avoid conflict
interface DatabaseTemplateMetadata {
  features?: string[];
  use_cases?: string[];
  screenshots?: string[];
  integrations?: string[];
  demo_conversation?: any[];
  difficulty?: string;
  setup_time?: string;
  version?: string;
  author?: string;
  license?: string;
  compatibility?: any;
  [key: string]: any;
}

interface DatabaseTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[] | null;
  configuration: Record<string, any> | null;
  customization_options: any[] | null;
  setup_instructions: any[] | null;
  metadata: DatabaseTemplateMetadata | null;
  is_official: boolean | null;
  is_public: boolean | null;
  usage_count: number | null;
  rating: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateAnalytics {
  template_id: string;
  usage_count: number;
  rating_count?: number;
  average_rating?: number;
}

export interface UserPreferences {
  userId: string;
  preferredCategories: TemplateCategory[];
  preferredTags: string[];
  usageHistory: TemplateUsage[];
  ratings: TemplateRating[];
  searchHistory: string[];
  lastUpdated: string;
}

export interface TemplateUsage {
  templateId: string;
  usedAt: string;
  duration?: number; // How long they used it
  completed: boolean; // Did they complete setup
  customizations: Record<string, any>;
}

export interface TemplateRating {
  templateId: string;
  rating: number;
  ratedAt: string;
}

export interface RecommendationScore {
  templateId: string;
  score: number;
  reasons: RecommendationReason[];
  confidence: number;
}

export interface RecommendationReason {
  type: 'category_match' | 'tag_match' | 'similar_users' | 'trending' | 'rating' | 'usage_pattern';
  description: string;
  weight: number;
}

export interface RecommendationOptions {
  limit?: number;
  excludeUsed?: boolean;
  categories?: TemplateCategory[];
  minRating?: number;
  includeReasons?: boolean;
}

export class TemplateRecommendationEngine {
  private static instance: TemplateRecommendationEngine;
  private userPreferences: Map<string, UserPreferences> = new Map();
  // Note: templateSimilarity cache could be used for performance optimization in the future
  // private templateSimilarity: Map<string, Map<string, number>> = new Map();

  static getInstance(): TemplateRecommendationEngine {
    if (!TemplateRecommendationEngine.instance) {
      TemplateRecommendationEngine.instance = new TemplateRecommendationEngine();
    }
    return TemplateRecommendationEngine.instance;
  }

  /**
   * Convert database template to AgentTemplate format
   */
  private convertDatabaseTemplate(dbTemplate: DatabaseTemplate): AgentTemplate {
    // Create proper TemplateMetadata structure
    const metadata: TemplateMetadata = {
      version: dbTemplate.metadata?.version || '1.0.0',
      author: dbTemplate.metadata?.author || 'Unknown',
      license: dbTemplate.metadata?.license || 'MIT',
      supportUrl: dbTemplate.metadata?.supportUrl,
      documentationUrl: dbTemplate.metadata?.documentationUrl,
      changeLog: dbTemplate.metadata?.changeLog || [],
      compatibility: dbTemplate.metadata?.compatibility || {
        minVersion: '1.0.0',
        requiredFeatures: []
      }
    };

    // Create proper TemplatePreviewData structure
    const previewData: TemplatePreviewData = {
      screenshots: dbTemplate.metadata?.screenshots || [],
      features: dbTemplate.metadata?.features || [],
      useCases: dbTemplate.metadata?.use_cases || [],
      integrations: dbTemplate.metadata?.integrations || [],
      demoConversation: dbTemplate.metadata?.demo_conversation?.map((item: any) => ({
        role: item.role || 'user',
        message: item.message || '',
        timestamp: item.timestamp
      }))
    };

    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      category: dbTemplate.category as TemplateCategory,
      tags: dbTemplate.tags || [],
      configuration: dbTemplate.configuration || {},
      customizationOptions: dbTemplate.customization_options || [],
      setupInstructions: dbTemplate.setup_instructions || [],
      metadata,
      previewData,
      isOfficial: dbTemplate.is_official || false,
      isPublic: dbTemplate.is_public || false,
      usageCount: dbTemplate.usage_count || 0,
      rating: dbTemplate.rating || 0,
      createdBy: dbTemplate.created_by,
      createdAt: dbTemplate.created_at,
      updatedAt: dbTemplate.updated_at
    };
  }

  /**
   * Get personalized template recommendations for a user
   */
  async getRecommendations(
    userId: string,
    options: RecommendationOptions = {}
  ): Promise<{ templates: AgentTemplate[]; scores: RecommendationScore[] }> {
    try {
      // Load user preferences
      const preferences = await this.getUserPreferences(userId);

      // Get all available templates
      const { templates: allTemplates } = await templateManager.searchTemplates({
        isPublic: true,
        rating: options.minRating
      }, 1, 100);

      // Filter out used templates if requested
      let candidateTemplates = allTemplates;
      if (options.excludeUsed && preferences) {
        const usedTemplateIds = new Set(preferences.usageHistory.map(u => u.templateId));
        candidateTemplates = allTemplates.filter(t => !usedTemplateIds.has(t.id));
      }

      // Filter by categories if specified
      if (options.categories && options.categories.length > 0) {
        candidateTemplates = candidateTemplates.filter(t =>
          options.categories!.includes(t.category)
        );
      }

      // Calculate recommendation scores
      const scores = await this.calculateRecommendationScores(
        userId,
        candidateTemplates,
        preferences,
        options.includeReasons || false
      );

      // Sort by score and limit results
      const sortedScores = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit || 10);

      // Get corresponding templates
      const recommendedTemplates = sortedScores
        .map(score => candidateTemplates.find(t => t.id === score.templateId))
        .filter(Boolean) as AgentTemplate[];

      return {
        templates: recommendedTemplates,
        scores: sortedScores
      };

    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return { templates: [], scores: [] };
    }
  }

  /**
   * Get similar templates based on content and usage patterns
   */
  async getSimilarTemplates(
    templateId: string,
    limit: number = 5
  ): Promise<AgentTemplate[]> {
    try {
      const template = await templateManager.getTemplate(templateId);
      if (!template) return [];

      // Get templates in the same category
      const { templates: categoryTemplates } = await templateManager.searchTemplates({
        category: template.category,
        isPublic: true
      });

      // Calculate similarity scores
      const similarities = categoryTemplates
        .filter(t => t.id !== templateId)
        .map(t => ({
          template: t,
          similarity: this.calculateTemplateSimilarity(template, t)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similarities.map(s => s.template);

    } catch (error) {
      console.error('Failed to get similar templates:', error);
      return [];
    }
  }

  /**
   * Get trending templates based on recent usage and ratings
   */
  async getTrendingTemplates(
    timeframe: 'day' | 'week' | 'month' = 'week',
    limit: number = 10
  ): Promise<AgentTemplate[]> {
    try {
      const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      // First, get trending template IDs from analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('template_usage_analytics')
        .select('template_id, usage_count')
        .gte('date', since.toISOString().split('T')[0])
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (analyticsError) throw analyticsError;

      if (!analyticsData || analyticsData.length === 0) {
        // Fallback to most popular templates overall
        const { templates } = await templateManager.searchTemplates({
          isPublic: true
        }, 1, limit);
        return templates;
      }

      // Get the actual template data
      const templateIds = analyticsData.map(item => item.template_id);
      const { data: templatesData, error: templatesError } = await supabase
        .from('agent_templates')
        .select(`
          id,
          name,
          description,
          category,
          tags,
          configuration,
          customization_options,
          setup_instructions,
          metadata,
          is_official,
          is_public,
          usage_count,
          rating,
          created_by,
          created_at,
          updated_at
        `)
        .in('id', templateIds)
        .eq('is_public', true);

      if (templatesError) throw templatesError;

      // Map to AgentTemplate format with all required properties
      const templates: AgentTemplate[] = (templatesData as DatabaseTemplate[] || [])
        .map(template => this.convertDatabaseTemplate(template));

      // Sort by analytics usage count to maintain trending order
      const sortedTemplates = templates.sort((a, b) => {
        const aUsage = analyticsData.find(item => item.template_id === a.id)?.usage_count || 0;
        const bUsage = analyticsData.find(item => item.template_id === b.id)?.usage_count || 0;
        return bUsage - aUsage;
      });

      return sortedTemplates;

    } catch (error) {
      console.error('Failed to get trending templates:', error);
      // Fallback to template manager search
      try {
        const { templates } = await templateManager.searchTemplates({
          isPublic: true
        }, 1, limit);
        return templates;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Record template usage for recommendation learning
   */
  async recordTemplateUsage(
    userId: string,
    templateId: string,
    usage: Partial<TemplateUsage>
  ): Promise<void> {
    try {
      // Update user preferences
      const preferences = await this.getUserPreferences(userId);
      if (preferences) {
        const newUsage: TemplateUsage = {
          templateId,
          usedAt: new Date().toISOString(),
          completed: usage.completed || false,
          customizations: usage.customizations || {},
          duration: usage.duration
        };

        preferences.usageHistory.push(newUsage);

        // Keep only last 50 usage records
        if (preferences.usageHistory.length > 50) {
          preferences.usageHistory = preferences.usageHistory.slice(-50);
        }

        await this.saveUserPreferences(preferences);
      }

      // Record in analytics table
      const { error: analyticsError } = await supabase
        .from('template_usage_analytics')
        .upsert({
          template_id: templateId,
          user_id: userId,
          date: new Date().toISOString().split('T')[0],
          usage_count: 1
        }, {
          onConflict: 'template_id,user_id,date',
          ignoreDuplicates: false
        });

      if (analyticsError) {
        console.warn('Failed to record analytics:', analyticsError);
        // Don't throw here as user preferences were saved successfully
      }

    } catch (error) {
      console.error('Failed to record template usage:', error);
    }
  }

  /**
   * Update user preferences based on search behavior
   */
  async updateSearchPreferences(
    userId: string,
    searchTerm: string,
    selectedTemplates: string[]
  ): Promise<void> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (preferences) {
        // Add to search history
        preferences.searchHistory.push(searchTerm);
        if (preferences.searchHistory.length > 20) {
          preferences.searchHistory = preferences.searchHistory.slice(-20);
        }

        // Extract tags from search terms
        const searchTags = this.extractTagsFromSearch(searchTerm);
        searchTags.forEach(tag => {
          if (!preferences.preferredTags.includes(tag)) {
            preferences.preferredTags.push(tag);
          }
        });

        // Update based on selected templates
        for (const templateId of selectedTemplates) {
          const template = await templateManager.getTemplate(templateId);
          if (template) {
            // Update preferred categories
            if (!preferences.preferredCategories.includes(template.category)) {
              preferences.preferredCategories.push(template.category);
            }

            // Update preferred tags
            template.tags.forEach(tag => {
              if (!preferences.preferredTags.includes(tag)) {
                preferences.preferredTags.push(tag);
              }
            });
          }
        }

        await this.saveUserPreferences(preferences);
      }
    } catch (error) {
      console.error('Failed to update search preferences:', error);
    }
  }

  /**
   * Get user preferences, creating default if not exists
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      // Check cache first
      if (this.userPreferences.has(userId)) {
        return this.userPreferences.get(userId)!;
      }

      // Load from database
      const { data, error } = await supabase
        .from('user_template_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      let preferences: UserPreferences;

      if (error || !data) {
        // Create default preferences
        preferences = {
          userId,
          preferredCategories: [],
          preferredTags: [],
          usageHistory: [],
          ratings: [],
          searchHistory: [],
          lastUpdated: new Date().toISOString()
        };

        await this.saveUserPreferences(preferences);
      } else {
        preferences = {
          userId: data.user_id,
          preferredCategories: data.preferred_categories || [],
          preferredTags: data.preferred_tags || [],
          usageHistory: data.usage_history || [],
          ratings: data.ratings || [],
          searchHistory: data.search_history || [],
          lastUpdated: data.updated_at
        };
      }

      // Cache preferences
      this.userPreferences.set(userId, preferences);
      return preferences;

    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Save user preferences to database
   */
  private async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      preferences.lastUpdated = new Date().toISOString();

      await supabase
        .from('user_template_preferences')
        .upsert({
          user_id: preferences.userId,
          preferred_categories: preferences.preferredCategories,
          preferred_tags: preferences.preferredTags,
          usage_history: preferences.usageHistory,
          ratings: preferences.ratings,
          search_history: preferences.searchHistory,
          updated_at: preferences.lastUpdated
        });

      // Update cache
      this.userPreferences.set(preferences.userId, preferences);

    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  /**
   * Calculate recommendation scores for templates
   */
  private async calculateRecommendationScores(
    userId: string,
    templates: AgentTemplate[],
    preferences: UserPreferences | null,
    includeReasons: boolean
  ): Promise<RecommendationScore[]> {
    const scores: RecommendationScore[] = [];

    for (const template of templates) {
      let score = 0;
      const reasons: RecommendationReason[] = [];

      // Base score from template rating and usage
      const baseScore = (template.rating * 0.3) + (Math.log(template.usageCount + 1) * 0.2);
      score += baseScore;

      if (preferences) {
        // Category preference match
        if (preferences.preferredCategories.includes(template.category)) {
          const categoryScore = 2.0;
          score += categoryScore;
          if (includeReasons) {
            reasons.push({
              type: 'category_match',
              description: `Matches your preferred category: ${template.category}`,
              weight: categoryScore
            });
          }
        }

        // Tag preference match
        const matchingTags = template.tags.filter(tag =>
          preferences.preferredTags.includes(tag)
        );
        if (matchingTags.length > 0) {
          const tagScore = matchingTags.length * 0.5;
          score += tagScore;
          if (includeReasons) {
            reasons.push({
              type: 'tag_match',
              description: `Matches your interests: ${matchingTags.join(', ')}`,
              weight: tagScore
            });
          }
        }

        // Usage pattern similarity
        const usageScore = this.calculateUsagePatternScore(template, preferences);
        score += usageScore;
        if (usageScore > 0 && includeReasons) {
          reasons.push({
            type: 'usage_pattern',
            description: 'Based on your usage patterns and preferences',
            weight: usageScore
          });
        }
      }

      // Trending bonus
      if (template.usageCount > 10) {
        const trendingScore = 0.5;
        score += trendingScore;
        if (includeReasons) {
          reasons.push({
            type: 'trending',
            description: 'Popular with other users',
            weight: trendingScore
          });
        }
      }

      // High rating bonus
      if (template.rating >= 4.0) {
        const ratingScore = 0.8;
        score += ratingScore;
        if (includeReasons) {
          reasons.push({
            type: 'rating',
            description: `Highly rated (${template.rating.toFixed(1)}/5.0)`,
            weight: ratingScore
          });
        }
      }

      // Calculate confidence based on available data
      const confidence = this.calculateConfidence(template, preferences);

      scores.push({
        templateId: template.id,
        score,
        reasons,
        confidence
      });
    }

    return scores;
  }

  /**
   * Calculate template similarity based on content and metadata
   */
  private calculateTemplateSimilarity(template1: AgentTemplate, template2: AgentTemplate): number {
    let similarity = 0;

    // Category match
    if (template1.category === template2.category) {
      similarity += 0.3;
    }

    // Tag overlap
    const commonTags = template1.tags.filter(tag => template2.tags.includes(tag));
    similarity += (commonTags.length / Math.max(template1.tags.length, template2.tags.length)) * 0.4;

    // Description similarity (simplified)
    const desc1Words = template1.description.toLowerCase().split(/\s+/);
    const desc2Words = template2.description.toLowerCase().split(/\s+/);
    const commonWords = desc1Words.filter(word => desc2Words.includes(word) && word.length > 3);
    similarity += (commonWords.length / Math.max(desc1Words.length, desc2Words.length)) * 0.3;

    return similarity;
  }

  /**
   * Calculate usage pattern score
   */
  private calculateUsagePatternScore(template: AgentTemplate, preferences: UserPreferences): number {
    let score = 0;

    // Simple scoring based on usage history length and completion rate
    const totalUsage = preferences.usageHistory.length;
    if (totalUsage > 0) {
      score += Math.min(totalUsage * 0.1, 0.5);
    }

    // Bonus for completed usage patterns
    const completedUsage = preferences.usageHistory.filter(usage => usage.completed);
    if (completedUsage.length > 0) {
      const completionRate = completedUsage.length / totalUsage;
      score += completionRate * 0.3;
    }

    // Check if user has preferred tags that match this template
    const matchingPreferredTags = template.tags.filter(tag =>
      preferences.preferredTags.includes(tag)
    );
    if (matchingPreferredTags.length > 0) {
      score += Math.min(matchingPreferredTags.length * 0.2, 0.6);
    }

    // Check if user has preferred categories that match
    if (preferences.preferredCategories.includes(template.category)) {
      score += 0.4;
    }

    return Math.min(score, 2.0); // Cap the score
  }

  /**
   * Calculate confidence score for recommendation
   */
  private calculateConfidence(template: AgentTemplate, preferences: UserPreferences | null): number {
    let confidence = 0.5; // Base confidence

    // More reviews = higher confidence
    if (template.usageCount > 5) confidence += 0.2;
    if (template.usageCount > 20) confidence += 0.1;

    // User data availability
    if (preferences) {
      if (preferences.usageHistory.length > 3) confidence += 0.1;
      if (preferences.preferredTags.length > 5) confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Extract potential tags from search terms
   */
  private extractTagsFromSearch(searchTerm: string): string[] {
    const commonTags = [
      'chatbot', 'automation', 'ai-assistant', 'customer-service', 'sales',
      'support', 'education', 'healthcare', 'finance', 'marketing',
      'lead-generation', 'appointment', 'booking', 'crm', 'integration'
    ];

    const searchLower = searchTerm.toLowerCase();
    return commonTags.filter(tag =>
      searchLower.includes(tag.replace('-', ' ')) || searchLower.includes(tag)
    );
  }
}

// Export singleton instance
export const templateRecommendationEngine = TemplateRecommendationEngine.getInstance();
export default templateRecommendationEngine;