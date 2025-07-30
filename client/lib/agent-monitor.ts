import { agentRuntime, type Agent } from './agent-runtime';
import { messageRouter } from './message-router';

export interface AgentHealthStatus {
  agent_id: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  last_active: string | null;
  response_time: number;
  error_rate: number;
  conversation_count: number;
  uptime: number;
  last_check: string;
}

export interface SystemHealthStatus {
  overall_status: 'healthy' | 'degraded' | 'down';
  active_agents: number;
  total_conversations: number;
  average_response_time: number;
  error_rate: number;
  uptime: number;
  last_check: string;
}

/**
 * Agent Monitor
 * Monitors agent health, performance, and system status
 */
export class AgentMonitor {
  private healthChecks: Map<string, AgentHealthStatus> = new Map();
  private systemMetrics: SystemHealthStatus;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    responseTime: 5000, // 5 seconds
    errorRate: 0.1, // 10%
    uptimeMin: 0.95, // 95%
  };

  constructor() {
    this.systemMetrics = {
      overall_status: 'healthy',
      active_agents: 0,
      total_conversations: 0,
      average_response_time: 0,
      error_rate: 0,
      uptime: 0,
      last_check: new Date().toISOString(),
    };

    this.startMonitoring();
  }

  /**
   * Start monitoring agents and system health
   */
  startMonitoring() {
    console.log('🔍 Starting Agent Monitor...');

    // Run health checks every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    // Initial health check
    this.performHealthChecks();

    console.log('✅ Agent Monitor started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('⏹️ Agent Monitor stopped');
  }

  /**
   * Perform health checks on all active agents
   */
  private async performHealthChecks() {
    try {
      const activeAgents = agentRuntime.getActiveAgents();
      const healthStatuses: AgentHealthStatus[] = [];

      for (const agent of activeAgents) {
        const health = await this.checkAgentHealth(agent);
        this.healthChecks.set(agent.id, health);
        healthStatuses.push(health);
      }

      // Update system metrics
      this.updateSystemMetrics(healthStatuses);

      // Check for alerts
      this.checkAlerts(healthStatuses);

      console.log(`🔍 Health check completed for ${activeAgents.length} agents`);

    } catch (error) {
      console.error('Error performing health checks:', error);
    }
  }

  /**
   * Check individual agent health
   */
  private async checkAgentHealth(agent: Agent): Promise<AgentHealthStatus> {
    const startTime = Date.now();

    try {
      // Get agent runtime health
      const runtimeHealth = agentRuntime.checkAgentHealth(agent.id);
      
      // Calculate response time (simulate)
      const responseTime = Date.now() - startTime;

      // Get recent conversation metrics
      const conversationMetrics = await this.getAgentConversationMetrics(agent.id);

      const health: AgentHealthStatus = {
        agent_id: agent.id,
        status: this.determineHealthStatus(agent, responseTime, conversationMetrics.errorRate),
        last_active: runtimeHealth.lastActive,
        response_time: responseTime,
        error_rate: conversationMetrics.errorRate,
        conversation_count: conversationMetrics.count,
        uptime: this.calculateUptime(agent),
        last_check: new Date().toISOString(),
      };

      return health;

    } catch (error) {
      console.error(`Error checking health for agent ${agent.id}:`, error);
      
      return {
        agent_id: agent.id,
        status: 'error',
        last_active: null,
        response_time: -1,
        error_rate: 1.0,
        conversation_count: 0,
        uptime: 0,
        last_check: new Date().toISOString(),
      };
    }
  }

  /**
   * Determine agent health status based on metrics
   */
  private determineHealthStatus(agent: Agent, responseTime: number, errorRate: number): 'healthy' | 'warning' | 'error' | 'offline' {
    if (agent.status !== 'active') {
      return 'offline';
    }

    if (errorRate > this.alertThresholds.errorRate) {
      return 'error';
    }

    if (responseTime > this.alertThresholds.responseTime) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Get conversation metrics for an agent
   */
  private async getAgentConversationMetrics(agentId: string): Promise<{ count: number; errorRate: number }> {
    try {
      // Get recent conversations (last 24 hours)
      const { data: conversations, error } = await agentRuntime.supabase
        .from('conversations')
        .select('id, status')
        .eq('agent_id', agentId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error getting conversation metrics:', error);
        return { count: 0, errorRate: 0 };
      }

      const totalConversations = conversations?.length || 0;
      const errorConversations = conversations?.filter(c => c.status === 'escalated').length || 0;
      const errorRate = totalConversations > 0 ? errorConversations / totalConversations : 0;

      return {
        count: totalConversations,
        errorRate,
      };

    } catch (error) {
      console.error('Error calculating conversation metrics:', error);
      return { count: 0, errorRate: 0 };
    }
  }

  /**
   * Calculate agent uptime
   */
  private calculateUptime(agent: Agent): number {
    if (!agent.created_at) return 0;

    const createdTime = new Date(agent.created_at).getTime();
    const currentTime = Date.now();
    const totalTime = currentTime - createdTime;

    // For now, assume 100% uptime if agent is active
    // In production, this would track actual downtime
    return agent.status === 'active' ? 1.0 : 0.0;
  }

  /**
   * Update system-wide metrics
   */
  private updateSystemMetrics(healthStatuses: AgentHealthStatus[]) {
    const totalAgents = healthStatuses.length;
    const healthyAgents = healthStatuses.filter(h => h.status === 'healthy').length;
    const totalConversations = healthStatuses.reduce((sum, h) => sum + h.conversation_count, 0);
    const averageResponseTime = totalAgents > 0 
      ? healthStatuses.reduce((sum, h) => sum + h.response_time, 0) / totalAgents 
      : 0;
    const averageErrorRate = totalAgents > 0
      ? healthStatuses.reduce((sum, h) => sum + h.error_rate, 0) / totalAgents
      : 0;

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (totalAgents === 0) {
      overallStatus = 'down';
    } else if (healthyAgents / totalAgents < 0.8) {
      overallStatus = 'degraded';
    }

    this.systemMetrics = {
      overall_status: overallStatus,
      active_agents: totalAgents,
      total_conversations: totalConversations,
      average_response_time: averageResponseTime,
      error_rate: averageErrorRate,
      uptime: totalAgents > 0 ? healthyAgents / totalAgents : 0,
      last_check: new Date().toISOString(),
    };
  }

  /**
   * Check for alerts and trigger notifications
   */
  private checkAlerts(healthStatuses: AgentHealthStatus[]) {
    for (const health of healthStatuses) {
      // High response time alert
      if (health.response_time > this.alertThresholds.responseTime) {
        this.triggerAlert('high_response_time', {
          agent_id: health.agent_id,
          response_time: health.response_time,
          threshold: this.alertThresholds.responseTime,
        });
      }

      // High error rate alert
      if (health.error_rate > this.alertThresholds.errorRate) {
        this.triggerAlert('high_error_rate', {
          agent_id: health.agent_id,
          error_rate: health.error_rate,
          threshold: this.alertThresholds.errorRate,
        });
      }

      // Agent offline alert
      if (health.status === 'offline' || health.status === 'error') {
        this.triggerAlert('agent_offline', {
          agent_id: health.agent_id,
          status: health.status,
        });
      }
    }
  }

  /**
   * Trigger alert (placeholder for notification system)
   */
  private triggerAlert(type: string, data: any) {
    console.warn(`🚨 ALERT [${type}]:`, data);
    
    // In production, this would:
    // - Send email notifications
    // - Post to Slack/Discord
    // - Create incident tickets
    // - Log to monitoring service
  }

  /**
   * Get agent health status
   */
  getAgentHealth(agentId: string): AgentHealthStatus | null {
    return this.healthChecks.get(agentId) || null;
  }

  /**
   * Get all agent health statuses
   */
  getAllAgentHealth(): AgentHealthStatus[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealthStatus {
    return this.systemMetrics;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    const routerStats = messageRouter.getRouterStats();
    const runtimeStats = agentRuntime.getRuntimeStats();

    return {
      monitor: {
        monitored_agents: this.healthChecks.size,
        last_check: this.systemMetrics.last_check,
        alert_thresholds: this.alertThresholds,
      },
      runtime: runtimeStats,
      router: routerStats,
      system: this.systemMetrics,
    };
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds: Partial<typeof this.alertThresholds>) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    console.log('📊 Alert thresholds updated:', this.alertThresholds);
  }

  /**
   * Force health check for specific agent
   */
  async forceHealthCheck(agentId: string): Promise<AgentHealthStatus | null> {
    const agent = agentRuntime.getAgent(agentId);
    if (!agent) {
      console.error('Agent not found for health check:', agentId);
      return null;
    }

    const health = await this.checkAgentHealth(agent);
    this.healthChecks.set(agentId, health);
    
    console.log(`🔍 Forced health check completed for agent: ${agentId}`);
    return health;
  }

  /**
   * Get health history (placeholder for time-series data)
   */
  getHealthHistory(agentId: string, hours: number = 24): any[] {
    // In production, this would return historical health data
    // For now, return mock data
    const history = [];
    const now = Date.now();
    
    for (let i = hours; i >= 0; i--) {
      history.push({
        timestamp: new Date(now - i * 60 * 60 * 1000).toISOString(),
        status: 'healthy',
        response_time: Math.random() * 1000 + 500,
        error_rate: Math.random() * 0.05,
      });
    }
    
    return history;
  }
}

// Create singleton instance
export const agentMonitor = new AgentMonitor();