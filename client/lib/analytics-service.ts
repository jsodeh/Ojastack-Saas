/**
 * Analytics Service
 * Comprehensive analytics and metrics collection for AI agents
 */

import { supabase } from './supabase';

// Core Analytics Types
export interface ConversationMetrics {
  total: number;
  active: number;
  completed: number;
  escalated: number;
  avgDuration: number;
  avgResponseTime: number;
  satisfactionScore: number;
  resolutionRate: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalConversations: number;
  avgResponseTime: number;
  successRate: number;
  satisfactionScore: number;
  uptime: number;
  errorRate: number;
  lastActive: string;
  topIntents: Array<{
    intent: string;
    count: number;
    percentage: number;
  }>;
  channelDistribution: Array<{
    channel: string;
    count: number;
    percentage: number;
  }>;
}

export interface ChannelAnalytics {
  channel: string;
  totalMessages: number;
  uniqueUsers: number;
  avgResponseTime: number;
  uptime: number;
  errorRate: number;
  messageTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface UserEngagement {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  avgSessionDuration: number;
  topPages: Array<{
    page: string;
    visits: number;
    conversions: number;
  }>;
  userJourney: Array<{
    step: string;
    users: number;
    dropoffRate: number;
  }>;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

export interface AnalyticsPeriod {
  start: string;
  end: string;
  period: '1h' | '24h' | '7d' | '30d' | '90d' | '1y';
}

export interface AnalyticsFilters {
  agentIds?: string[];
  channels?: string[];
  dateRange?: AnalyticsPeriod;
  userSegments?: string[];
  intents?: string[];
}

// Real-time Analytics
export interface RealTimeMetrics {
  activeConversations: number;
  activeUsers: number;
  responseTime: number;
  systemLoad: number;
  errorRate: number;
  throughput: number;
  lastUpdated: string;
}

// Advanced Analytics
export interface ConversationFlow {
  flowId: string;
  flowName: string;
  completionRate: number;
  avgSteps: number;
  dropoffPoints: Array<{
    step: string;
    dropoffRate: number;
    reason: string;
  }>;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;
  trends: TimeSeriesData[];
  topics: Array<{
    topic: string;
    sentiment: number;
    volume: number;
  }>;
}

export interface PredictiveInsights {
  demandForecast: TimeSeriesData[];
  churnRisk: Array<{
    userId: string;
    risk: number;
    factors: string[];
  }>;
  capacityPlanning: {
    recommendedAgents: number;
    peakLoadTime: string;
    scalingRecommendations: string[];
  };
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private realtimeSubscription: any = null;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get comprehensive conversation metrics
   */
  async getConversationMetrics(
    userId: string, 
    filters?: AnalyticsFilters
  ): Promise<ConversationMetrics> {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages(count),
          agent:agents(id, name)
        `)
        .eq('user_id', userId)
        .gte('created_at', filters?.dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const total = conversations?.length || 0;
      const active = conversations?.filter(c => c.status === 'active').length || 0;
      const completed = conversations?.filter(c => c.status === 'completed').length || 0;
      const escalated = conversations?.filter(c => c.escalation_requested).length || 0;

      // Calculate averages
      const durations = conversations?.map(c => {
        if (c.resolution_time) return c.resolution_time;
        return new Date().getTime() - new Date(c.created_at).getTime();
      }) || [];

      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;

      // Mock data for demo (replace with actual analytics)
      const avgResponseTime = 1500 + Math.random() * 1000; // 1.5-2.5s
      const satisfactionScore = 4.2 + Math.random() * 0.6; // 4.2-4.8
      const resolutionRate = 0.85 + Math.random() * 0.1; // 85-95%

      return {
        total,
        active,
        completed,
        escalated,
        avgDuration: Math.round(avgDuration / 1000), // Convert to seconds
        avgResponseTime: Math.round(avgResponseTime),
        satisfactionScore: Math.round(satisfactionScore * 10) / 10,
        resolutionRate: Math.round(resolutionRate * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching conversation metrics:', error);
      throw error;
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(
    userId: string, 
    agentId?: string,
    filters?: AnalyticsFilters
  ): Promise<AgentPerformance[]> {
    try {
      const query = supabase
        .from('agents')
        .select(`
          *,
          conversations(count),
          agent_analytics(*)
        `)
        .eq('user_id', userId);

      if (agentId) {
        query.eq('id', agentId);
      }

      const { data: agents, error } = await query;
      if (error) throw error;

      const performance = await Promise.all((agents || []).map(async (agent) => {
        // Get detailed conversation data for this agent
        const { data: conversations } = await supabase
          .from('conversations')
          .select('*, messages(count)')
          .eq('agent_id', agent.id);

        const totalConversations = conversations?.length || 0;
        
        // Mock performance data (replace with actual calculations)
        const avgResponseTime = 1200 + Math.random() * 800;
        const successRate = 0.88 + Math.random() * 0.1;
        const satisfactionScore = 4.1 + Math.random() * 0.7;
        const uptime = 0.95 + Math.random() * 0.04;
        const errorRate = Math.random() * 0.05;

        const topIntents = [
          { intent: 'product_inquiry', count: 45, percentage: 35 },
          { intent: 'support_request', count: 38, percentage: 30 },
          { intent: 'billing_question', count: 25, percentage: 20 },
          { intent: 'technical_issue', count: 19, percentage: 15 }
        ];

        const channelDistribution = [
          { channel: 'webchat', count: 67, percentage: 52 },
          { channel: 'whatsapp', count: 31, percentage: 24 },
          { channel: 'email', count: 19, percentage: 15 },
          { channel: 'slack', count: 12, percentage: 9 }
        ];

        return {
          agentId: agent.id,
          agentName: agent.name,
          totalConversations,
          avgResponseTime: Math.round(avgResponseTime),
          successRate: Math.round(successRate * 100) / 100,
          satisfactionScore: Math.round(satisfactionScore * 10) / 10,
          uptime: Math.round(uptime * 100) / 100,
          errorRate: Math.round(errorRate * 1000) / 10, // As percentage
          lastActive: agent.last_active || new Date().toISOString(),
          topIntents,
          channelDistribution
        };
      }));

      return performance;
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      throw error;
    }
  }

  /**
   * Get channel analytics
   */
  async getChannelAnalytics(
    userId: string,
    filters?: AnalyticsFilters
  ): Promise<ChannelAnalytics[]> {
    try {
      const { data: channels, error } = await supabase
        .from('channel_configs')
        .select(`
          *,
          channel_messages(count),
          channel_analytics(*)
        `)
        .eq('user_id', userId)
        .eq('enabled', true);

      if (error) throw error;

      const analytics = (channels || []).map(channel => {
        // Mock channel analytics (replace with actual data)
        const totalMessages = 100 + Math.floor(Math.random() * 500);
        const uniqueUsers = Math.floor(totalMessages * (0.3 + Math.random() * 0.4));
        const avgResponseTime = 800 + Math.random() * 1200;
        const uptime = 0.96 + Math.random() * 0.03;
        const errorRate = Math.random() * 0.03;

        const messageTypes = [
          { type: 'text', count: Math.floor(totalMessages * 0.7), percentage: 70 },
          { type: 'image', count: Math.floor(totalMessages * 0.15), percentage: 15 },
          { type: 'document', count: Math.floor(totalMessages * 0.1), percentage: 10 },
          { type: 'voice', count: Math.floor(totalMessages * 0.05), percentage: 5 }
        ];

        return {
          channel: channel.name,
          totalMessages,
          uniqueUsers,
          avgResponseTime: Math.round(avgResponseTime),
          uptime: Math.round(uptime * 100) / 100,
          errorRate: Math.round(errorRate * 1000) / 10,
          messageTypes
        };
      });

      return analytics;
    } catch (error) {
      console.error('Error fetching channel analytics:', error);
      throw error;
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(
    userId: string,
    filters?: AnalyticsFilters
  ): Promise<UserEngagement> {
    try {
      // Mock user engagement data (replace with actual analytics)
      const totalUsers = 1250 + Math.floor(Math.random() * 500);
      const activeUsers = Math.floor(totalUsers * (0.25 + Math.random() * 0.15));
      const newUsers = Math.floor(totalUsers * (0.08 + Math.random() * 0.05));
      const returningUsers = activeUsers - newUsers;
      const avgSessionDuration = 180 + Math.random() * 240; // 3-7 minutes

      const topPages = [
        { page: '/dashboard', visits: 450, conversions: 89 },
        { page: '/agents', visits: 320, conversions: 156 },
        { page: '/chat', visits: 280, conversions: 234 },
        { page: '/settings', visits: 180, conversions: 45 }
      ];

      const userJourney = [
        { step: 'landing', users: 1000, dropoffRate: 0.15 },
        { step: 'signup', users: 850, dropoffRate: 0.25 },
        { step: 'onboarding', users: 638, dropoffRate: 0.20 },
        { step: 'first_agent', users: 510, dropoffRate: 0.15 },
        { step: 'active_user', users: 434, dropoffRate: 0.05 }
      ];

      return {
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers,
        avgSessionDuration: Math.round(avgSessionDuration),
        topPages,
        userJourney
      };
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      throw error;
    }
  }

  /**
   * Get time series data for various metrics
   */
  async getTimeSeriesData(
    userId: string,
    metric: 'conversations' | 'response_time' | 'satisfaction' | 'users',
    period: AnalyticsPeriod
  ): Promise<TimeSeriesData[]> {
    const now = new Date();
    const data: TimeSeriesData[] = [];
    
    // Generate mock time series data
    let points = 24; // Default for 24 hours
    let interval = 60 * 60 * 1000; // 1 hour

    switch (period.period) {
      case '1h':
        points = 60;
        interval = 60 * 1000; // 1 minute
        break;
      case '7d':
        points = 7;
        interval = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '30d':
        points = 30;
        interval = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '90d':
        points = 90;
        interval = 24 * 60 * 60 * 1000; // 1 day
        break;
    }

    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * interval));
      let value = 0;

      switch (metric) {
        case 'conversations':
          value = Math.floor(10 + Math.random() * 50);
          break;
        case 'response_time':
          value = Math.floor(1000 + Math.random() * 1000);
          break;
        case 'satisfaction':
          value = 3.5 + Math.random() * 1.5;
          break;
        case 'users':
          value = Math.floor(50 + Math.random() * 200);
          break;
      }

      data.push({
        timestamp: timestamp.toISOString(),
        value,
        label: this.formatTimestamp(timestamp, period.period)
      });
    }

    return data;
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(userId: string): Promise<RealTimeMetrics> {
    // Mock real-time data (replace with actual real-time analytics)
    return {
      activeConversations: Math.floor(15 + Math.random() * 25),
      activeUsers: Math.floor(45 + Math.random() * 55),
      responseTime: Math.floor(1200 + Math.random() * 800),
      systemLoad: Math.random() * 0.8,
      errorRate: Math.random() * 0.02,
      throughput: Math.floor(50 + Math.random() * 100),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Subscribe to real-time metrics updates
   */
  subscribeToRealTimeMetrics(
    userId: string,
    callback: (metrics: RealTimeMetrics) => void
  ): () => void {
    // Set up real-time subscription
    const updateMetrics = async () => {
      const metrics = await this.getRealTimeMetrics(userId);
      callback(metrics);
    };

    // Update immediately
    updateMetrics();

    // Set up interval for demo (replace with actual real-time subscription)
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    // Return unsubscribe function
    return () => {
      clearInterval(interval);
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe();
      }
    };
  }

  /**
   * Get conversation flow analytics
   */
  async getConversationFlows(
    userId: string,
    filters?: AnalyticsFilters
  ): Promise<ConversationFlow[]> {
    // Mock conversation flow data
    return [
      {
        flowId: 'customer_support',
        flowName: 'Customer Support',
        completionRate: 0.78,
        avgSteps: 4.2,
        dropoffPoints: [
          { step: 'initial_greeting', dropoffRate: 0.05, reason: 'User disconnected' },
          { step: 'problem_identification', dropoffRate: 0.12, reason: 'Complex issue' },
          { step: 'solution_provided', dropoffRate: 0.05, reason: 'Escalation needed' }
        ]
      },
      {
        flowId: 'sales_inquiry',
        flowName: 'Sales Inquiry',
        completionRate: 0.65,
        avgSteps: 6.1,
        dropoffPoints: [
          { step: 'product_interest', dropoffRate: 0.15, reason: 'Price concerns' },
          { step: 'demo_scheduling', dropoffRate: 0.20, reason: 'Not ready to buy' }
        ]
      }
    ];
  }

  /**
   * Get sentiment analysis
   */
  async getSentimentAnalysis(
    userId: string,
    filters?: AnalyticsFilters
  ): Promise<SentimentAnalysis> {
    // Mock sentiment analysis
    const score = 0.2 + Math.random() * 0.6; // -0.3 to 0.3
    const overall = score > 0.1 ? 'positive' : score > -0.1 ? 'neutral' : 'negative';

    const trends = await this.getTimeSeriesData(userId, 'satisfaction', {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      period: '7d'
    });

    const topics = [
      { topic: 'product_quality', sentiment: 0.3, volume: 45 },
      { topic: 'customer_service', sentiment: 0.6, volume: 38 },
      { topic: 'pricing', sentiment: -0.1, volume: 25 },
      { topic: 'features', sentiment: 0.4, volume: 32 }
    ];

    return {
      overall,
      score,
      trends,
      topics
    };
  }

  /**
   * Get predictive insights
   */
  async getPredictiveInsights(
    userId: string,
    filters?: AnalyticsFilters
  ): Promise<PredictiveInsights> {
    const demandForecast = await this.getTimeSeriesData(userId, 'conversations', {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      period: '7d'
    });

    const churnRisk = [
      { userId: 'user_1', risk: 0.75, factors: ['Low engagement', 'Billing issues'] },
      { userId: 'user_2', risk: 0.60, factors: ['Support tickets', 'Feature requests'] },
      { userId: 'user_3', risk: 0.45, factors: ['Usage decline'] }
    ];

    const capacityPlanning = {
      recommendedAgents: 3,
      peakLoadTime: '14:00-16:00',
      scalingRecommendations: [
        'Add 1 more agent for peak hours',
        'Consider auto-scaling for weekend traffic',
        'Optimize response time during lunch hours'
      ]
    };

    return {
      demandForecast,
      churnRisk,
      capacityPlanning
    };
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    userId: string,
    format: 'csv' | 'json' | 'pdf',
    filters?: AnalyticsFilters
  ): Promise<Blob> {
    const [conversations, agents, channels] = await Promise.all([
      this.getConversationMetrics(userId, filters),
      this.getAgentPerformance(userId, undefined, filters),
      this.getChannelAnalytics(userId, filters)
    ]);

    const data = {
      conversations,
      agents,
      channels,
      exportedAt: new Date().toISOString(),
      filters
    };

    if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = this.convertToCSV(data);
      return new Blob([csv], { type: 'text/csv' });
    }

    // For PDF, you'd integrate with a PDF generation library
    throw new Error('PDF export not implemented yet');
  }

  private formatTimestamp(date: Date, period: string): string {
    switch (period) {
      case '1h':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case '24h':
        return date.toLocaleTimeString('en-US', { hour: '2-digit' });
      case '7d':
      case '30d':
      case '90d':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleDateString();
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion (implement based on your needs)
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).map(v => 
      typeof v === 'object' ? JSON.stringify(v) : v
    ).join(',');
    return `${headers}\n${values}`;
  }
}

export const analyticsService = AnalyticsService.getInstance();