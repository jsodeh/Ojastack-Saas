/**
 * Template Recommendation Engine
 * Provides personalized template recommendations based on user behavior and preferences
 */

import { supabase } from './supabase';
import { templateManager, type AgentTemplate, type TemplateCategory } from './template-manager';

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
  private templateSimilarity: Map<string, Map<string, number>> = new Map();

  static getInstance(): TemplateRecommendationEngine {
    if (!TemplateRecommendationEngine.instance) {
      TemplateRecommendationEngine.instance = new TemplateRecommendationEngine();
    }
    return TemplateRecommendationEngine.instance;
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

      // Get templates with recent activity
      const { data, error } = await supabase
        .from('template_usage_analytics')
        .select(`
          template_id,
          usage_count,
          rating_count,
          average_rating,
          agent_templates(*)
        `)
        .gte('date', since.toISOString().split('T')[0])
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || [])
        .map(item => item.agent_templates)
        .filter(Boolean)
        .map(templateManager.prototype.transformTemplateData);

    } catch (error) {
      console.error('Failed to get trending templates:', error);
      return [];
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
        preferences.usageHistory.push({
          templateId,
          usedAt: new Date().toISOString(),
          completed: false,
          customizations: {},
          ...usage
        });

        // Keep only last 50 usage records
        if (preferences.usageHistory.length > 50) {
          preferences.usageHistory = preferences.usageHistory.slice(-50);
        }

        await this.saveUserPreferences(preferences);
      }

      // Record in analytics table
      await supabase
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
            description: 'Similar to templates you\'ve used before',
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

    // Check if user has used similar templates
    const similarUsage = preferences.usageHistory.filter(usage => {
      // This would ideally check template similarity
      // For now, just check category match
      return true; // Simplified
    });

    if (similarUsage.length > 0) {
      score += Math.min(similarUsage.length * 0.2, 1.0);
    }

    return score;
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