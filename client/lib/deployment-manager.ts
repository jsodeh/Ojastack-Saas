/**
 * Deployment Manager
 * Handles agent deployment, scaling, and lifecycle management
 */

import { supabase } from './supabase';
import { AgentWorkflow } from './workflow-types';
import { AgentPersona } from './persona-types';

export interface AgentDeployment {
  id: string;
  userId: string;
  agentId: string;
  workflowId?: string;
  personaId?: string;
  name: string;
  description?: string;
  deploymentConfig: DeploymentConfig;
  channelConfigs: ChannelConfig[];
  integrationConfigs: IntegrationConfig[];
  endpoints: DeploymentEndpoint[];
  status: DeploymentStatus;
  healthStatus: HealthStatus;
  metrics: DeploymentMetrics;
  errorDetails?: ErrorDetails;
  createdAt: string;
  deployedAt?: string;
  lastActive?: string;
  updatedAt: string;
}

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  scaling: ScalingConfig;
  resources: ResourceConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  backup: BackupConfig;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCPU: number;
  targetMemory: number;
  autoScale: boolean;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
}

export interface ResourceConfig {
  cpu: string; // e.g., '500m'
  memory: string; // e.g., '1Gi'
  storage: string; // e.g., '10Gi'
  timeout: number; // seconds
  concurrency: number;
}

export interface SecurityConfig {
  authentication: boolean;
  authorization: boolean;
  rateLimiting: RateLimitConfig;
  ipWhitelist?: string[];
  cors: CorsConfig;
  encryption: EncryptionConfig;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface CorsConfig {
  enabled: boolean;
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
}

export interface EncryptionConfig {
  inTransit: boolean;
  atRest: boolean;
  keyRotation: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsRetention: number; // days
  alerting: AlertConfig;
  logging: LoggingConfig;
}

export interface AlertConfig {
  enabled: boolean;
  errorThreshold: number;
  responseTimeThreshold: number;
  uptimeThreshold: number;
  notificationChannels: string[];
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  retention: number; // days
  structured: boolean;
  sampling: number; // percentage
}

export interface BackupConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  retention: number; // days
  encryption: boolean;
}

export interface ChannelConfig {
  type: 'whatsapp' | 'slack' | 'webchat' | 'api' | 'webhook';
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  authentication?: Record<string, any>;
}

export interface IntegrationConfig {
  type: string;
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  credentials?: Record<string, any>;
}

export interface DeploymentEndpoint {
  type: 'http' | 'websocket' | 'webhook';
  url: string;
  method?: string;
  authentication?: string;
  documentation?: string;
}

export type DeploymentStatus = 
  | 'pending'
  | 'deploying'
  | 'active'
  | 'updating'
  | 'paused'
  | 'error'
  | 'terminated';

export type HealthStatus = 
  | 'healthy'
  | 'warning'
  | 'error'
  | 'unknown';

export interface DeploymentMetrics {
  uptime: number; // percentage
  responseTime: number; // ms
  requestCount: number;
  errorRate: number; // percentage
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  activeConnections: number;
  lastUpdated: string;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  resolved: boolean;
}

export interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: DeploymentConfig;
  channels: ChannelConfig[];
  integrations: IntegrationConfig[];
  isOfficial: boolean;
  usageCount: number;
}

export interface DeploymentPlan {
  id: string;
  name: string;
  description: string;
  limits: {
    maxDeployments: number;
    maxRequests: number;
    maxStorage: string;
    features: string[];
  };
  pricing: {
    basePrice: number;
    requestPrice: number;
    storagePrice: number;
  };
}

export class DeploymentManager {
  private static instance: DeploymentManager;
  private deployments: Map<string, AgentDeployment> = new Map();
  private templates: Map<string, DeploymentTemplate> = new Map();
  private plans: Map<string, DeploymentPlan> = new Map();

  static getInstance(): DeploymentManager {
    if (!DeploymentManager.instance) {
      DeploymentManager.instance = new DeploymentManager();
    }
    return DeploymentManager.instance;
  }

  constructor() {
    this.initializeTemplates();
    this.initializePlans();
    this.startHealthMonitoring();
  }

  /**
   * Create new deployment
   */
  async createDeployment(
    userId: string,
    agentId: string,
    deploymentData: {
      name: string;
      description?: string;
      workflowId?: string;
      personaId?: string;
      config: DeploymentConfig;
      channels: ChannelConfig[];
      integrations: IntegrationConfig[];
    }
  ): Promise<AgentDeployment | null> {
    try {
      const deployment: AgentDeployment = {
        id: crypto.randomUUID(),
        userId,
        agentId,
        workflowId: deploymentData.workflowId,
        personaId: deploymentData.personaId,
        name: deploymentData.name,
        description: deploymentData.description,
        deploymentConfig: deploymentData.config,
        channelConfigs: deploymentData.channels,
        integrationConfigs: deploymentData.integrations,
        endpoints: [],
        status: 'pending',
        healthStatus: 'unknown',
        metrics: {
          uptime: 0,
          responseTime: 0,
          requestCount: 0,
          errorRate: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          activeConnections: 0,
          lastUpdated: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to database
      const { data, error } = await supabase
        .from('agent_deployments')
        .insert({
          id: deployment.id,
          user_id: deployment.userId,
          agent_id: deployment.agentId,
          workflow_id: deployment.workflowId,
          persona_id: deployment.personaId,
          deployment_config: deployment.deploymentConfig,
          channel_configs: deployment.channelConfigs,
          integration_configs: deployment.integrationConfigs,
          endpoints: deployment.endpoints,
          status: deployment.status,
          health_status: deployment.healthStatus,
          metrics: deployment.metrics
        })
        .select()
        .single();

      if (error) throw error;

      this.deployments.set(deployment.id, deployment);
      
      // Start deployment process
      this.startDeployment(deployment.id);

      return deployment;
    } catch (error) {
      console.error('Failed to create deployment:', error);
      return null;
    }
  }

  /**
   * Start deployment process
   */
  async startDeployment(deploymentId: string): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return false;
    }

    try {
      deployment.status = 'deploying';
      await this.updateDeploymentStatus(deploymentId, 'deploying');

      // Simulate deployment steps
      await this.deployInfrastructure(deployment);
      await this.configureChannels(deployment);
      await this.setupIntegrations(deployment);
      await this.startServices(deployment);
      await this.runHealthChecks(deployment);

      // Mark as active
      deployment.status = 'active';
      deployment.healthStatus = 'healthy';
      deployment.deployedAt = new Date().toISOString();
      deployment.lastActive = new Date().toISOString();

      await this.updateDeploymentStatus(deploymentId, 'active');
      
      return true;
    } catch (error) {
      console.error('Deployment failed:', error);
      
      deployment.status = 'error';
      deployment.healthStatus = 'error';
      deployment.errorDetails = {
        code: 'DEPLOYMENT_FAILED',
        message: error.message,
        details: error,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await this.updateDeploymentStatus(deploymentId, 'error');
      return false;
    }
  }

  /**
   * Stop deployment
   */
  async stopDeployment(deploymentId: string): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return false;
    }

    try {
      deployment.status = 'paused';
      deployment.healthStatus = 'unknown';
      
      // Stop services
      await this.stopServices(deployment);
      
      await this.updateDeploymentStatus(deploymentId, 'paused');
      return true;
    } catch (error) {
      console.error('Failed to stop deployment:', error);
      return false;
    }
  }

  /**
   * Terminate deployment
   */
  async terminateDeployment(deploymentId: string): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return false;
    }

    try {
      deployment.status = 'terminated';
      deployment.healthStatus = 'unknown';
      
      // Clean up resources
      await this.cleanupResources(deployment);
      
      await this.updateDeploymentStatus(deploymentId, 'terminated');
      this.deployments.delete(deploymentId);
      
      return true;
    } catch (error) {
      console.error('Failed to terminate deployment:', error);
      return false;
    }
  }

  /**
   * Update deployment configuration
   */
  async updateDeployment(
    deploymentId: string,
    updates: Partial<AgentDeployment>
  ): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return false;
    }

    try {
      deployment.status = 'updating';
      await this.updateDeploymentStatus(deploymentId, 'updating');

      // Apply updates
      Object.assign(deployment, updates);
      deployment.updatedAt = new Date().toISOString();

      // Redeploy with new configuration
      await this.redeployWithNewConfig(deployment);

      deployment.status = 'active';
      await this.updateDeploymentStatus(deploymentId, 'active');

      return true;
    } catch (error) {
      console.error('Failed to update deployment:', error);
      deployment.status = 'error';
      await this.updateDeploymentStatus(deploymentId, 'error');
      return false;
    }
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(deploymentId: string): Promise<AgentDeployment | null> {
    // Check cache first
    let deployment = this.deployments.get(deploymentId);
    if (deployment) {
      return deployment;
    }

    // Load from database
    try {
      const { data, error } = await supabase
        .from('agent_deployments')
        .select('*')
        .eq('id', deploymentId)
        .single();

      if (error || !data) {
        return null;
      }

      deployment = this.transformDeploymentData(data);
      this.deployments.set(deploymentId, deployment);
      
      return deployment;
    } catch (error) {
      console.error('Failed to get deployment:', error);
      return null;
    }
  }

  /**
   * Get user deployments
   */
  async getUserDeployments(userId: string): Promise<AgentDeployment[]> {
    try {
      const { data, error } = await supabase
        .from('agent_deployments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformDeploymentData);
    } catch (error) {
      console.error('Failed to get user deployments:', error);
      return [];
    }
  }

  /**
   * Get deployment metrics
   */
  async getDeploymentMetrics(
    deploymentId: string,
    timeRange: { start: string; end: string }
  ): Promise<{
    metrics: Array<{ timestamp: string; [key: string]: any }>;
    summary: DeploymentMetrics;
  }> {
    // In a real implementation, this would query a time-series database
    const deployment = await this.getDeployment(deploymentId);
    if (!deployment) {
      return { metrics: [], summary: {} as DeploymentMetrics };
    }

    // Mock metrics data
    const metrics = this.generateMockMetrics(timeRange);
    
    return {
      metrics,
      summary: deployment.metrics
    };
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(
    deploymentId: string,
    options: {
      level?: string;
      limit?: number;
      since?: string;
    } = {}
  ): Promise<Array<{
    timestamp: string;
    level: string;
    message: string;
    metadata?: any;
  }>> {
    // Mock log data
    return [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Deployment started successfully',
        metadata: { deploymentId }
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: 'Health check passed',
        metadata: { deploymentId, status: 'healthy' }
      }
    ];
  }

  /**
   * Get deployment templates
   */
  getDeploymentTemplates(): DeploymentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get deployment plans
   */
  getDeploymentPlans(): DeploymentPlan[] {
    return Array.from(this.plans.values());
  }

  private async deployInfrastructure(deployment: AgentDeployment): Promise<void> {
    // Simulate infrastructure deployment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate endpoints
    deployment.endpoints = [
      {
        type: 'http',
        url: `https://api.ojastack.com/agents/${deployment.id}`,
        method: 'POST',
        authentication: 'bearer',
        documentation: `https://docs.ojastack.com/agents/${deployment.id}`
      },
      {
        type: 'websocket',
        url: `wss://ws.ojastack.com/agents/${deployment.id}`,
        authentication: 'bearer'
      }
    ];
  }

  private async configureChannels(deployment: AgentDeployment): Promise<void> {
    // Simulate channel configuration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (const channel of deployment.channelConfigs) {
      if (channel.enabled) {
        // Configure channel
        console.log(`Configuring ${channel.type} channel: ${channel.name}`);
      }
    }
  }

  private async setupIntegrations(deployment: AgentDeployment): Promise<void> {
    // Simulate integration setup
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    for (const integration of deployment.integrationConfigs) {
      if (integration.enabled) {
        // Setup integration
        console.log(`Setting up ${integration.type} integration: ${integration.name}`);
      }
    }
  }

  private async startServices(deployment: AgentDeployment): Promise<void> {
    // Simulate service startup
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Starting services for deployment ${deployment.id}`);
  }

  private async runHealthChecks(deployment: AgentDeployment): Promise<void> {
    // Simulate health checks
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Health checks passed for deployment ${deployment.id}`);
  }

  private async stopServices(deployment: AgentDeployment): Promise<void> {
    // Simulate service shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Stopped services for deployment ${deployment.id}`);
  }

  private async cleanupResources(deployment: AgentDeployment): Promise<void> {
    // Simulate resource cleanup
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`Cleaned up resources for deployment ${deployment.id}`);
  }

  private async redeployWithNewConfig(deployment: AgentDeployment): Promise<void> {
    // Simulate redeployment
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(`Redeployed ${deployment.id} with new configuration`);
  }

  private async updateDeploymentStatus(
    deploymentId: string,
    status: DeploymentStatus
  ): Promise<void> {
    try {
      await supabase
        .from('agent_deployments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', deploymentId);
    } catch (error) {
      console.error('Failed to update deployment status:', error);
    }
  }

  private transformDeploymentData(data: any): AgentDeployment {
    return {
      id: data.id,
      userId: data.user_id,
      agentId: data.agent_id,
      workflowId: data.workflow_id,
      personaId: data.persona_id,
      name: data.name || 'Unnamed Deployment',
      description: data.description,
      deploymentConfig: data.deployment_config || {},
      channelConfigs: data.channel_configs || [],
      integrationConfigs: data.integration_configs || [],
      endpoints: data.endpoints || [],
      status: data.status,
      healthStatus: data.health_status,
      metrics: data.metrics || {
        uptime: 0,
        responseTime: 0,
        requestCount: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0,
        lastUpdated: new Date().toISOString()
      },
      errorDetails: data.error_details,
      createdAt: data.created_at,
      deployedAt: data.deployed_at,
      lastActive: data.last_active,
      updatedAt: data.updated_at
    };
  }

  private generateMockMetrics(timeRange: { start: string; end: string }) {
    const metrics = [];
    const start = new Date(timeRange.start).getTime();
    const end = new Date(timeRange.end).getTime();
    const interval = (end - start) / 100; // 100 data points

    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(start + i * interval).toISOString();
      metrics.push({
        timestamp,
        responseTime: 100 + Math.random() * 200,
        requestCount: Math.floor(Math.random() * 100),
        errorRate: Math.random() * 5,
        cpuUsage: 20 + Math.random() * 60,
        memoryUsage: 30 + Math.random() * 50,
        activeConnections: Math.floor(Math.random() * 50)
      });
    }

    return metrics;
  }

  private initializeTemplates(): void {
    // Basic template
    this.templates.set('basic', {
      id: 'basic',
      name: 'Basic Deployment',
      description: 'Simple deployment with minimal configuration',
      category: 'basic',
      config: {
        environment: 'development',
        scaling: {
          minInstances: 1,
          maxInstances: 3,
          targetCPU: 70,
          targetMemory: 80,
          autoScale: false,
          scaleUpCooldown: 300,
          scaleDownCooldown: 600
        },
        resources: {
          cpu: '500m',
          memory: '1Gi',
          storage: '10Gi',
          timeout: 30,
          concurrency: 10
        },
        security: {
          authentication: true,
          authorization: false,
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            burstLimit: 10
          },
          cors: {
            enabled: true,
            allowedOrigins: ['*'],
            allowedMethods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization']
          },
          encryption: {
            inTransit: true,
            atRest: false,
            keyRotation: false
          }
        },
        monitoring: {
          enabled: true,
          metricsRetention: 7,
          alerting: {
            enabled: false,
            errorThreshold: 5,
            responseTimeThreshold: 1000,
            uptimeThreshold: 99,
            notificationChannels: []
          },
          logging: {
            level: 'info',
            retention: 7,
            structured: true,
            sampling: 100
          }
        },
        backup: {
          enabled: false,
          frequency: 'daily',
          retention: 7,
          encryption: false
        }
      },
      channels: [],
      integrations: [],
      isOfficial: true,
      usageCount: 0
    });

    // Production template
    this.templates.set('production', {
      id: 'production',
      name: 'Production Deployment',
      description: 'Production-ready deployment with full monitoring and security',
      category: 'production',
      config: {
        environment: 'production',
        scaling: {
          minInstances: 2,
          maxInstances: 10,
          targetCPU: 60,
          targetMemory: 70,
          autoScale: true,
          scaleUpCooldown: 180,
          scaleDownCooldown: 300
        },
        resources: {
          cpu: '1000m',
          memory: '2Gi',
          storage: '50Gi',
          timeout: 60,
          concurrency: 50
        },
        security: {
          authentication: true,
          authorization: true,
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 1000,
            requestsPerHour: 10000,
            burstLimit: 50
          },
          cors: {
            enabled: true,
            allowedOrigins: [],
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
          },
          encryption: {
            inTransit: true,
            atRest: true,
            keyRotation: true
          }
        },
        monitoring: {
          enabled: true,
          metricsRetention: 30,
          alerting: {
            enabled: true,
            errorThreshold: 1,
            responseTimeThreshold: 500,
            uptimeThreshold: 99.9,
            notificationChannels: ['email', 'slack']
          },
          logging: {
            level: 'warn',
            retention: 30,
            structured: true,
            sampling: 100
          }
        },
        backup: {
          enabled: true,
          frequency: 'daily',
          retention: 30,
          encryption: true
        }
      },
      channels: [],
      integrations: [],
      isOfficial: true,
      usageCount: 0
    });
  }

  private initializePlans(): void {
    // Free plan
    this.plans.set('free', {
      id: 'free',
      name: 'Free',
      description: 'Perfect for testing and small projects',
      limits: {
        maxDeployments: 1,
        maxRequests: 1000,
        maxStorage: '1GB',
        features: ['basic-monitoring', 'community-support']
      },
      pricing: {
        basePrice: 0,
        requestPrice: 0,
        storagePrice: 0
      }
    });

    // Pro plan
    this.plans.set('pro', {
      id: 'pro',
      name: 'Pro',
      description: 'For growing businesses and teams',
      limits: {
        maxDeployments: 10,
        maxRequests: 100000,
        maxStorage: '100GB',
        features: ['advanced-monitoring', 'priority-support', 'custom-domains']
      },
      pricing: {
        basePrice: 29,
        requestPrice: 0.001,
        storagePrice: 0.1
      }
    });

    // Enterprise plan
    this.plans.set('enterprise', {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations with advanced needs',
      limits: {
        maxDeployments: -1, // unlimited
        maxRequests: -1, // unlimited
        maxStorage: 'unlimited',
        features: ['full-monitoring', 'dedicated-support', 'sla', 'custom-integrations']
      },
      pricing: {
        basePrice: 299,
        requestPrice: 0.0005,
        storagePrice: 0.05
      }
    });
  }

  private startHealthMonitoring(): void {
    // Monitor deployment health every 30 seconds
    setInterval(async () => {
      for (const [deploymentId, deployment] of this.deployments) {
        if (deployment.status === 'active') {
          await this.updateDeploymentMetrics(deploymentId);
        }
      }
    }, 30000);
  }

  private async updateDeploymentMetrics(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    // Simulate metrics update
    deployment.metrics = {
      uptime: 99.5 + Math.random() * 0.5,
      responseTime: 100 + Math.random() * 200,
      requestCount: deployment.metrics.requestCount + Math.floor(Math.random() * 10),
      errorRate: Math.random() * 2,
      cpuUsage: 20 + Math.random() * 60,
      memoryUsage: 30 + Math.random() * 50,
      activeConnections: Math.floor(Math.random() * 50),
      lastUpdated: new Date().toISOString()
    };

    // Update database
    try {
      await supabase
        .from('agent_deployments')
        .update({ 
          metrics: deployment.metrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', deploymentId);
    } catch (error) {
      console.error('Failed to update deployment metrics:', error);
    }
  }
}

export default DeploymentManager;