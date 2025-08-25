/**
 * Integration Service
 * Manages external service integrations, credentials, and configurations
 */

import { supabase } from './supabase';

// Core Integration Types
export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  version: string;
  status: 'connected' | 'available' | 'error' | 'pending';
  popularity: number;
  rating: number;
  downloads: number;
  icon: string;
  tags: string[];
  features: string[];
  requirements: string[];
  pricingModel: 'free' | 'freemium' | 'paid';
  documentationUrl?: string;
  setupComplexity: 'easy' | 'medium' | 'advanced';
  configSchema?: IntegrationConfigSchema;
  webhookSupport?: boolean;
  oauthSupport?: boolean;
}

export interface IntegrationInstance {
  id: string;
  userId: string;
  integrationId: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'configuring';
  configuration: Record<string, any>;
  credentials: IntegrationCredential[];
  createdAt: string;
  lastUsed?: string;
  metrics: IntegrationMetrics;
}

export interface IntegrationCredential {
  id: string;
  instanceId: string;
  name: string;
  type: 'api_key' | 'oauth' | 'webhook' | 'token' | 'certificate';
  status: 'active' | 'expired' | 'invalid' | 'revoked';
  value?: string; // Encrypted
  metadata: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
  lastUsed?: string;
}

export interface IntegrationConfigSchema {
  fields: IntegrationConfigField[];
  steps?: IntegrationSetupStep[];
  validation?: IntegrationValidation[];
}

export interface IntegrationConfigField {
  name: string;
  type: 'text' | 'password' | 'url' | 'select' | 'checkbox' | 'number';
  label: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: Array<{ value: any; label: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

export interface IntegrationSetupStep {
  id: string;
  title: string;
  description: string;
  type: 'config' | 'oauth' | 'test' | 'verify';
  fields?: string[];
  action?: IntegrationAction;
}

export interface IntegrationAction {
  type: 'oauth' | 'test_connection' | 'verify_webhook' | 'import_data';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  parameters?: Record<string, any>;
}

export interface IntegrationValidation {
  field: string;
  rule: 'required' | 'url' | 'email' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface IntegrationMetrics {
  apiCalls: number;
  errorCount: number;
  avgResponseTime: number;
  uptime: number;
  lastError?: string;
  lastErrorAt?: string;
}

export interface IntegrationUsage {
  integrationId: string;
  date: string;
  apiCalls: number;
  errors: number;
  responseTime: number;
  dataTransfer: number;
}

export class IntegrationService {
  private static instance: IntegrationService;

  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Get available integrations from marketplace
   */
  async getAvailableIntegrations(
    category?: string,
    search?: string
  ): Promise<Integration[]> {
    // Use mock data for demo - replace with actual database queries when tables exist
    return this.getMockIntegrations(category, search);
  }

  /**
   * Get user's connected integrations
   */
  async getUserIntegrations(userId: string): Promise<IntegrationInstance[]> {
    // Use mock data for demo - replace with actual database queries when tables exist
    return this.getMockUserIntegrations(userId);
  }

  /**
   * Connect a new integration
   */
  async connectIntegration(
    userId: string,
    integrationId: string,
    configuration: Record<string, any>
  ): Promise<IntegrationInstance> {
    // Mock implementation for demo
    const mockInstance: IntegrationInstance = {
      id: `instance_${Date.now()}`,
      userId,
      integrationId,
      name: configuration.name || `Integration ${Date.now()}`,
      status: 'active',
      configuration,
      credentials: [],
      createdAt: new Date().toISOString(),
      metrics: {
        apiCalls: 0,
        errorCount: 0,
        avgResponseTime: 0,
        uptime: 1.0
      }
    };

    return mockInstance;
  }

  /**
   * Disconnect an integration
   */
  async disconnectIntegration(instanceId: string): Promise<void> {
    // Mock implementation for demo
    console.log(`Disconnecting integration: ${instanceId}`);
  }

  /**
   * Test integration connection
   */
  async testConnection(instanceId: string): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
  }> {
    try {
      // Mock test - replace with actual API calls
      const responseTime = 100 + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, responseTime));

      const success = Math.random() > 0.1; // 90% success rate for demo

      return {
        success,
        message: success ? 'Connection successful' : 'Connection failed: Invalid credentials',
        responseTime: Math.round(responseTime)
      };
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get integration usage metrics
   */
  async getIntegrationMetrics(
    instanceId: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<IntegrationUsage[]> {
    // Use mock data for demo
    return this.getMockUsageData(period);
  }

  /**
   * Store encrypted credentials
   */
  async storeCredentials(
    instanceId: string,
    credentials: Array<{
      name: string;
      type: IntegrationCredential['type'];
      value: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<IntegrationCredential[]> {
    // Mock implementation for demo
    return credentials.map((cred, index) => ({
      id: `cred_${instanceId}_${index}`,
      instanceId,
      name: cred.name,
      type: cred.type,
      status: 'active' as const,
      value: this.encryptValue(cred.value),
      metadata: cred.metadata || {},
      createdAt: new Date().toISOString()
    }));
  }

  /**
   * Update integration configuration
   */
  async updateConfiguration(
    instanceId: string,
    configuration: Record<string, any>
  ): Promise<void> {
    // Mock implementation for demo
    console.log(`Updating configuration for ${instanceId}:`, configuration);
  }

  /**
   * Handle OAuth flow
   */
  async initiateOAuthFlow(
    integrationId: string,
    redirectUri: string
  ): Promise<{ authUrl: string; state: string }> {
    const state = this.generateState();
    
    // Mock OAuth URLs - replace with actual OAuth providers
    const authUrls: Record<string, string> = {
      'slack': `https://slack.com/oauth/v2/authorize?client_id=CLIENT_ID&scope=bot&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      'google': `https://accounts.google.com/oauth/authorize?client_id=CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email&state=${state}`,
      'github': `https://github.com/login/oauth/authorize?client_id=CLIENT_ID&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    };

    return {
      authUrl: authUrls[integrationId] || `https://example.com/oauth?state=${state}`,
      state
    };
  }

  /**
   * Complete OAuth flow
   */
  async completeOAuthFlow(
    integrationId: string,
    code: string,
    state: string
  ): Promise<IntegrationCredential> {
    try {
      // Mock OAuth token exchange - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockToken = `oauth_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        id: `cred_${Date.now()}`,
        instanceId: 'temp',
        name: 'OAuth Token',
        type: 'oauth',
        status: 'active',
        value: mockToken,
        metadata: {
          scope: 'read,write',
          tokenType: 'bearer'
        },
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error completing OAuth flow:', error);
      throw error;
    }
  }

  // Private helper methods

  private getMockUserIntegrations(userId: string): IntegrationInstance[] {
    return [
      {
        id: 'instance_1',
        userId,
        integrationId: 'openai',
        name: 'OpenAI Production',
        status: 'active',
        configuration: { apiKey: 'sk-***' },
        credentials: [
          {
            id: 'cred_1',
            instanceId: 'instance_1',
            name: 'API Key',
            type: 'api_key',
            status: 'active',
            metadata: {},
            createdAt: new Date().toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date().toISOString(),
        metrics: {
          apiCalls: 156,
          errorCount: 2,
          avgResponseTime: 450,
          uptime: 0.992
        }
      },
      {
        id: 'instance_2',
        userId,
        integrationId: 'slack',
        name: 'Team Workspace',
        status: 'active',
        configuration: { botToken: 'xoxb-***' },
        credentials: [
          {
            id: 'cred_2',
            instanceId: 'instance_2',
            name: 'Bot Token',
            type: 'oauth',
            status: 'active',
            metadata: { scope: 'bot,channels:read' },
            createdAt: new Date().toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        metrics: {
          apiCalls: 89,
          errorCount: 0,
          avgResponseTime: 230,
          uptime: 1.0
        }
      }
    ];
  }

  private getMockIntegrations(category?: string, search?: string): Integration[] {
    const mockData: Integration[] = [
      {
        id: 'openai',
        name: 'OpenAI GPT-4',
        description: 'Advanced AI language model for natural conversations',
        category: 'AI & ML',
        provider: 'OpenAI',
        version: '4.0.1',
        status: 'available',
        popularity: 98,
        rating: 4.9,
        downloads: 25000,
        icon: '🤖',
        tags: ['ai', 'nlp', 'gpt'],
        features: ['GPT-4 Turbo', 'Function calling', 'Vision capabilities'],
        requirements: ['OpenAI API key'],
        pricingModel: 'paid',
        setupComplexity: 'easy',
        webhookSupport: false,
        oauthSupport: false
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Team communication and collaboration platform',
        category: 'Communication',
        provider: 'Slack Technologies',
        version: '2.1.0',
        status: 'available',
        popularity: 95,
        rating: 4.8,
        downloads: 12500,
        icon: '💬',
        tags: ['messaging', 'team', 'notifications'],
        features: ['Real-time messaging', 'Channel integration', 'Bot commands'],
        requirements: ['Slack workspace admin access'],
        pricingModel: 'free',
        setupComplexity: 'easy',
        webhookSupport: true,
        oauthSupport: true
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Integrate WhatsApp Business API for customer communications',
        category: 'Communication',
        provider: 'Meta',
        version: '1.0.0',
        status: 'available',
        popularity: 88,
        rating: 4.6,
        downloads: 8900,
        icon: '📱',
        tags: ['messaging', 'customer service', 'mobile'],
        features: ['Message templates', 'Media support', 'Broadcast lists'],
        requirements: ['WhatsApp Business account', 'Phone verification'],
        pricingModel: 'paid',
        setupComplexity: 'medium',
        webhookSupport: true,
        oauthSupport: false
      },
      {
        id: 'zapier',
        name: 'Zapier',
        description: 'Automate workflows with thousands of app integrations',
        category: 'Automation',
        provider: 'Zapier Inc.',
        version: '1.2.3',
        status: 'available',
        popularity: 75,
        rating: 4.4,
        downloads: 5600,
        icon: '⚡',
        tags: ['automation', 'workflow', 'productivity'],
        features: ['Trigger automation', 'Multi-step zaps', 'Custom webhooks'],
        requirements: ['Zapier account'],
        pricingModel: 'freemium',
        setupComplexity: 'medium',
        webhookSupport: true,
        oauthSupport: true
      }
    ];

    let filtered = mockData;

    if (category && category !== 'all') {
      filtered = filtered.filter(int => int.category === category);
    }

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(int => 
        int.name.toLowerCase().includes(query) ||
        int.description.toLowerCase().includes(query) ||
        int.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }

  private getPeriodStart(period: string): string {
    const now = new Date();
    switch (period) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  private getMockUsageData(period: string): IntegrationUsage[] {
    const points = period === '1h' ? 60 : period === '24h' ? 24 : 7;
    const data: IntegrationUsage[] = [];

    for (let i = points - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * (period === '1h' ? 60000 : 3600000));
      data.push({
        integrationId: 'test',
        date: date.toISOString(),
        apiCalls: Math.floor(Math.random() * 50) + 10,
        errors: Math.floor(Math.random() * 3),
        responseTime: Math.floor(Math.random() * 200) + 300,
        dataTransfer: Math.floor(Math.random() * 1000) + 500
      });
    }

    return data;
  }

  private encryptValue(value: string): string {
    // Mock encryption - implement proper encryption in production
    return Buffer.from(value).toString('base64');
  }

  private generateState(): string {
    return Math.random().toString(36).substr(2, 16);
  }
}

export const integrationService = IntegrationService.getInstance();