/**
 * Agent Deployment Service
 * Handles deployment lifecycle, runtime management, and monitoring of AI agents
 */

import { supabase } from './supabase';
import { AgentPersona } from './persona-types';
import { AgentWorkflow } from './workflow-types';
import { workflowExecutor } from './workflow-executor';

export interface AgentDeployment {
  id: string;
  userId: string;
  agentId: string;
  workflowId?: string;
  personaId?: string;
  name: string;
  description: string;
  deploymentConfig: DeploymentConfiguration;
  channelConfigs: ChannelConfiguration[];
  integrationConfigs: IntegrationConfiguration[];
  endpoints: DeploymentEndpoints;
  status: DeploymentStatus;
  healthStatus: HealthStatus;
  metrics: DeploymentMetrics;
  errorDetails?: ErrorDetails;
  createdAt: string;
  deployedAt?: string;
  lastActive?: string;
  updatedAt: string;
}

export interface DeploymentConfiguration {
  environment: 'development' | 'staging' | 'production';
  region: string;
  scalingConfig: ScalingConfiguration;
  resourceLimits: ResourceLimits;
  securityConfig: SecurityConfiguration;
  monitoringConfig: MonitoringConfiguration;
  backupConfig: BackupConfiguration;
}

export interface ScalingConfiguration {
  minInstances: number;
  maxInstances: number;
  targetCPUUtilization: number;
  targetMemoryUtilization: number;
  scaleUpCooldown: number; // seconds
  scaleDownCooldown: number; // seconds
  autoScaling: boolean;
}

export interface ResourceLimits {
  cpu: string; // e.g., "500m"
  memory: string; // e.g., "1Gi"
  storage: string; // e.g., "10Gi"
  networkBandwidth: string; // e.g., "100Mbps"
  requestsPerMinute: number;
  concurrentConnections: number;
}

export interface SecurityConfiguration {
  enableHttps: boolean;
  enableCors: boolean;
  corsOrigins: string[];
  enableRateLimiting: boolean;
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  enableAuthentication: boolean;
  authenticationMethods: ('api_key' | 'jwt' | 'oauth')[];
  enableEncryption: boolean;
  encryptionAlgorithm: string;
}

export interface MonitoringConfiguration {
  enableMetrics: boolean;
  enableLogs: boolean;
  enableTracing: boolean;
  metricsRetention: number; // days
  logsRetention: number; // days
  alertingConfig: AlertingConfiguration;
}

export interface AlertingConfiguration {
  enableAlerts: boolean;
  alertChannels: ('email' | 'slack' | 'webhook')[];
  thresholds: {
    errorRate: number; // percentage
    responseTime: number; // milliseconds
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    diskUsage: number; // percentage
  };
}

export interface BackupConfiguration {
  enableBackups: boolean;
  backupFrequency: 'hourly' | 'daily' | 'weekly';
  backupRetention: number; // days
  backupLocation: string;
  enablePointInTimeRecovery: boolean;
}

export interface ChannelConfiguration {
  id: string;
  type: 'whatsapp' | 'slack' | 'webchat' | 'api' | 'webhook';
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  rateLimits?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  authentication?: {
    required: boolean;
    methods: string[];
    credentials: Record<string, any>;
  };
}

export interface IntegrationConfiguration {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  healthCheck?: {
    enabled: boolean;
    endpoint: string;
    interval: number; // seconds
    timeout: number; // seconds
    retries: number;
  };
}

export interface DeploymentEndpoints {
  primary: string;
  webhook?: string;
  api?: string;
  websocket?: string;
  health: string;
  metrics: string;
  logs: string;
}

export type DeploymentStatus = 
  | 'deploying' 
  | 'active' 
  | 'paused' 
  | 'updating' 
  | 'error' 
  | 'terminated';

export type HealthStatus = 
  | 'healthy' 
  | 'warning' 
  | 'error' 
  | 'unknown';

export interface DeploymentMetrics {
  uptime: number; // seconds
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number; // milliseconds
  p95ResponseTime: number; // milliseconds
  p99ResponseTime: number; // milliseconds
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  networkIn: number; // bytes
  networkOut: number; // bytes
  activeConnections: number;
  errorRate: number; // percentage
  lastUpdated: string;
}

export interface ErrorDetails {
  errorType: string;
  errorMessage: string;
  errorCode?: string;
  timestamp: string;
  stackTrace?: string;
  context?: Record<string, any>;
  resolution?: string;
}

export interface DeploymentLog {
  id: string;
  deploymentId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface DeploymentEvent {
  id: string;
  deploymentId: string;
  type: 'deployment_started' | 'deployment_completed' | 'deployment_failed' | 'scaling_event' | 'health_check' | 'error_occurred';
  timestamp: string;
  data: Record<string, any>;
}

export class AgentDeploymentService {
  private static instance: AgentDeploymentService;
  private deployments: Map<string, AgentDeployment> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): AgentDeploymentService {
    if (!AgentDeploymentService.instance) {
      AgentDeploymentService.instance = new AgentDeploymentService();
    }
    return AgentDeploymentService.instance;
  }

  /**
   * Deploy an agent with specified configuration
   */
  async deployAgent(
    userId: string,
    agentId: string,
    deploymentConfig: {
      name: string;
      description?: string;
      workflowId?: string;
      personaId?: string;
      configuration: DeploymentConfiguration;
      channels: ChannelConfiguration[];
      integrations: IntegrationConfiguration[];
    }
  ): Promise<AgentDeployment | null> {
    try {
      const deploymentId = crypto.randomUUID();
      
      // Generate endpoints
      const endpoints = this.generateEndpoints(deploymentId, deploymentConfig.configuration.environment);
      
      // Create deployment record
      const deployment: AgentDeployment = {
        id: deploymentId,
        userId,
        agentId,
        workflowId: deploymentConfig.workflowId,
        personaId: deploymentConfig.personaId,
        name: deploymentConfig.name,
        description: deploymentConfig.description || '',
        deploymentConfig: deploymentConfig.configuration,
        channelConfigs: deploymentConfig.channels,
        integrationConfigs: deploymentConfig.integrations,
        endpoints,
        status: 'deploying',
        healthStatus: 'unknown',
        metrics: this.initializeMetrics(),
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

      // Store in memory
      this.deployments.set(deploymentId, deployment);

      // Start deployment process
      this.startDeploymentProcess(deployment);

      return deployment;

    } catch (error) {
      console.error('Failed to deploy agent:', error);
      return null;
    }
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(deploymentId: string): Promise<AgentDeployment | null> {
    // Check memory first
    let deployment = this.deployments.get(deploymentId);
    
    if (!deployment) {
      // Load from database
      try {
        const { data, error } = await supabase
          .from('agent_deployments')
          .select('*')
          .eq('id', deploymentId)
          .single();

        if (error || !data) return null;

        deployment = this.transformDeploymentData(data);
        this.deployments.set(deploymentId, deployment);
      } catch (error) {
        console.error('Failed to get deployment:', error);
        return null;
      }
    }

    return deployment;
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
   * Update deployment configuration
   */
  async updateDeployment(
    deploymentId: string,
    updates: Partial<AgentDeployment>
  ): Promise<AgentDeployment | null> {
    try {
      const deployment = await this.getDeployment(deploymentId);
      if (!deployment) return null;

      // Update deployment
      const updatedDeployment = { ...deployment, ...updates, updatedAt: new Date().toISOString() };

      // Save to database
      const { error } = await supabase
        .from('agent_deployments')
        .update({
          deployment_config: updatedDeployment.deploymentConfig,
          channel_configs: updatedDeployment.channelConfigs,
          integration_configs: updatedDeployment.integrationConfigs,
          status: updatedDeployment.status,
          health_status: updatedDeployment.healthStatus,
          metrics: updatedDeployment.metrics,
          error_details: updatedDeployment.errorDetails,
          updated_at: updatedDeployment.updatedAt
        })
        .eq('id', deploymentId);

      if (error) throw error;

      // Update memory
      this.deployments.set(deploymentId, updatedDeployment);

      return updatedDeployment;

    } catch (error) {
      console.error('Failed to update deployment:', error);
      return null;
    }
  }

  /**
   * Pause deployment
   */
  async pauseDeployment(deploymentId: string): Promise<boolean> {
    try {
      const deployment = await this.getDeployment(deploymentId);
      if (!deployment || deployment.status === 'paused') return false;

      await this.updateDeployment(deploymentId, {
        status: 'paused',
        updatedAt: new Date().toISOString()
      });

      // Stop health checks
      this.stopHealthCheck(deploymentId);

      await this.logEvent(deploymentId, 'deployment_paused', { reason: 'User requested' });

      return true;
    } catch (error) {
      console.error('Failed to pause deployment:', error);
      return false;
    }
  }

  /**
   * Resume deployment
   */
  async resumeDeployment(deploymentId: string): Promise<boolean> {
    try {
      const deployment = await this.getDeployment(deploymentId);
      if (!deployment || deployment.status !== 'paused') return false;

      await this.updateDeployment(deploymentId, {
        status: 'active',
        updatedAt: new Date().toISOString()
      });

      // Restart health checks
      this.startHealthCheck(deployment);

      await this.logEvent(deploymentId, 'deployment_resumed', { reason: 'User requested' });

      return true;
    } catch (error) {
      console.error('Failed to resume deployment:', error);
      return false;
    }
  }

  /**
   * Terminate deployment
   */
  async terminateDeployment(deploymentId: string): Promise<boolean> {
    try {
      const deployment = await this.getDeployment(deploymentId);
      if (!deployment) return false;

      await this.updateDeployment(deploymentId, {
        status: 'terminated',
        updatedAt: new Date().toISOString()
      });

      // Stop health checks
      this.stopHealthCheck(deploymentId);

      // Remove from memory
      this.deployments.delete(deploymentId);

      await this.logEvent(deploymentId, 'deployment_terminated', { reason: 'User requested' });

      return true;
    } catch (error) {
      console.error('Failed to terminate deployment:', error);
      return false;
    }
  }

  /**
   * Get deployment metrics
   */
  async getDeploymentMetrics(
    deploymentId: string,
    timeRange?: { start: string; end: string }
  ): Promise<DeploymentMetrics | null> {
    const deployment = await this.getDeployment(deploymentId);
    if (!deployment) return null;

    // In a real implementation, this would fetch metrics from monitoring system
    return deployment.metrics;
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(
    deploymentId: string,
    options: {
      level?: 'info' | 'warn' | 'error' | 'debug';
      limit?: number;
      offset?: number;
      timeRange?: { start: string; end: string };
    } = {}
  ): Promise<DeploymentLog[]> {
    // Mock logs for now - in real implementation, this would fetch from logging system
    const mockLogs: DeploymentLog[] = [
      {
        id: crypto.randomUUID(),
        deploymentId,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Deployment started successfully',
        source: 'deployment-manager'
      },
      {
        id: crypto.randomUUID(),
        deploymentId,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: 'Health check passed',
        source: 'health-monitor'
      }
    ];

    return mockLogs.filter(log => !options.level || log.level === options.level)
                   .slice(options.offset || 0, (options.offset || 0) + (options.limit || 50));
  }

  /**
   * Execute workflow for deployment
   */
  async executeWorkflow(
    deploymentId: string,
    inputData: any,
    context: Record<string, any> = {}
  ): Promise<any> {
    const deployment = await this.getDeployment(deploymentId);
    if (!deployment || deployment.status !== 'active') {
      throw new Error('Deployment not active');
    }

    if (!deployment.workflowId) {
      throw new Error('No workflow configured for deployment');
    }

    try {
      // Load workflow
      const { data: workflowData, error } = await supabase
        .from('agent_workflows')
        .select('*')
        .eq('id', deployment.workflowId)
        .single();

      if (error || !workflowData) {
        throw new Error('Workflow not found');
      }

      const workflow: AgentWorkflow = {
        id: workflowData.id,
        name: workflowData.name,
        description: workflowData.description,
        version: workflowData.version,
        nodes: workflowData.workflow_data?.nodes || [],
        connections: workflowData.workflow_data?.connections || [],
        variables: workflowData.workflow_data?.variables || [],
        triggers: workflowData.workflow_data?.triggers || [],
        metadata: {
          created_at: workflowData.created_at,
          updated_at: workflowData.updated_at,
          created_by: workflowData.user_id,
          is_template: workflowData.is_template,
          tags: workflowData.tags || []
        }
      };

      // Execute workflow
      const execution = await workflowExecutor.executeWorkflow(workflow, inputData, {
        context: {
          ...context,
          deploymentId,
          agentId: deployment.agentId
        }
      });

      // Update metrics
      await this.updateMetrics(deploymentId, {
        totalRequests: deployment.metrics.totalRequests + 1,
        successfulRequests: execution.status === 'completed' 
          ? deployment.metrics.successfulRequests + 1 
          : deployment.metrics.successfulRequests,
        failedRequests: execution.status === 'failed'
          ? deployment.metrics.failedRequests + 1
          : deployment.metrics.failedRequests,
        lastUpdated: new Date().toISOString()
      });

      return execution.result;

    } catch (error) {
      // Update error metrics
      await this.updateMetrics(deploymentId, {
        totalRequests: deployment.metrics.totalRequests + 1,
        failedRequests: deployment.metrics.failedRequests + 1,
        lastUpdated: new Date().toISOString()
      });

      throw error;
    }
  }

  private async startDeploymentProcess(deployment: AgentDeployment): Promise<void> {
    try {
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update status to active
      await this.updateDeployment(deployment.id, {
        status: 'active',
        healthStatus: 'healthy',
        deployedAt: new Date().toISOString()
      });

      // Start health checks
      this.startHealthCheck(deployment);

      await this.logEvent(deployment.id, 'deployment_completed', {
        duration: 2000,
        endpoints: deployment.endpoints
      });

    } catch (error) {
      await this.updateDeployment(deployment.id, {
        status: 'error',
        healthStatus: 'error',
        errorDetails: {
          errorType: 'deployment_error',
          errorMessage: error.message,
          timestamp: new Date().toISOString()
        }
      });

      await this.logEvent(deployment.id, 'deployment_failed', {
        error: error.message
      });
    }
  }

  private startHealthCheck(deployment: AgentDeployment): void {
    if (this.healthCheckIntervals.has(deployment.id)) {
      return; // Already running
    }

    const interval = setInterval(async () => {
      await this.performHealthCheck(deployment.id);
    }, 30000); // Every 30 seconds

    this.healthCheckIntervals.set(deployment.id, interval);
  }

  private stopHealthCheck(deploymentId: string): void {
    const interval = this.healthCheckIntervals.get(deploymentId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(deploymentId);
    }
  }

  private async performHealthCheck(deploymentId: string): Promise<void> {
    const deployment = await this.getDeployment(deploymentId);
    if (!deployment || deployment.status !== 'active') {
      return;
    }

    try {
      // Simulate health check
      const isHealthy = Math.random() > 0.1; // 90% success rate
      
      const healthStatus: HealthStatus = isHealthy ? 'healthy' : 'warning';
      
      await this.updateDeployment(deploymentId, {
        healthStatus,
        lastActive: new Date().toISOString()
      });

      if (!isHealthy) {
        await this.logEvent(deploymentId, 'health_check', {
          status: 'warning',
          message: 'Health check failed'
        });
      }

    } catch (error) {
      await this.updateDeployment(deploymentId, {
        healthStatus: 'error',
        errorDetails: {
          errorType: 'health_check_error',
          errorMessage: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private async updateMetrics(
    deploymentId: string,
    updates: Partial<DeploymentMetrics>
  ): Promise<void> {
    const deployment = await this.getDeployment(deploymentId);
    if (!deployment) return;

    const updatedMetrics = { ...deployment.metrics, ...updates };
    
    // Calculate error rate
    if (updatedMetrics.totalRequests > 0) {
      updatedMetrics.errorRate = (updatedMetrics.failedRequests / updatedMetrics.totalRequests) * 100;
    }

    await this.updateDeployment(deploymentId, { metrics: updatedMetrics });
  }

  private generateEndpoints(deploymentId: string, environment: string): DeploymentEndpoints {
    const baseUrl = environment === 'production' 
      ? `https://api.ojastack.com/agents/${deploymentId}`
      : `https://${environment}-api.ojastack.com/agents/${deploymentId}`;

    return {
      primary: `${baseUrl}/chat`,
      webhook: `${baseUrl}/webhook`,
      api: `${baseUrl}/api`,
      websocket: `${baseUrl}/ws`,
      health: `${baseUrl}/health`,
      metrics: `${baseUrl}/metrics`,
      logs: `${baseUrl}/logs`
    };
  }

  private initializeMetrics(): DeploymentMetrics {
    return {
      uptime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkIn: 0,
      networkOut: 0,
      activeConnections: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  private async logEvent(
    deploymentId: string,
    type: DeploymentEvent['type'],
    data: Record<string, any>
  ): Promise<void> {
    const event: DeploymentEvent = {
      id: crypto.randomUUID(),
      deploymentId,
      type,
      timestamp: new Date().toISOString(),
      data
    };

    // In a real implementation, this would be stored in a separate events table
    console.log('Deployment event:', event);
  }

  private transformDeploymentData(data: any): AgentDeployment {
    return {
      id: data.id,
      userId: data.user_id,
      agentId: data.agent_id,
      workflowId: data.workflow_id,
      personaId: data.persona_id,
      name: data.name || 'Unnamed Deployment',
      description: data.description || '',
      deploymentConfig: data.deployment_config || {},
      channelConfigs: data.channel_configs || [],
      integrationConfigs: data.integration_configs || [],
      endpoints: data.endpoints || {},
      status: data.status,
      healthStatus: data.health_status,
      metrics: data.metrics || this.initializeMetrics(),
      errorDetails: data.error_details,
      createdAt: data.created_at,
      deployedAt: data.deployed_at,
      lastActive: data.last_active,
      updatedAt: data.updated_at
    };
  }
}

// Export singleton instance
export const agentDeploymentService = AgentDeploymentService.getInstance();