import { agentRuntime } from './agent-runtime';
import { agentService } from './agent-service';
import { messageRouter } from './message-router';
import { agentMonitor } from './agent-monitor';

/**
 * Agent Platform
 * Main orchestrator for the agent platform system
 */
export class AgentPlatform {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the agent platform
   */
  private async initialize() {
    if (this.initialized) return;

    console.log('🚀 Initializing Agent Platform...');

    try {
      // Initialize core components
      console.log('📡 Runtime engine initialized');
      console.log('🔀 Message router initialized');
      console.log('🔍 Agent monitor initialized');
      console.log('⚙️ Agent service initialized');

      this.initialized = true;
      console.log('✅ Agent Platform initialized successfully');

      // Log system status
      this.logSystemStatus();

    } catch (error) {
      console.error('❌ Failed to initialize Agent Platform:', error);
      throw error;
    }
  }

  /**
   * Log current system status
   */
  private logSystemStatus() {
    const stats = agentMonitor.getMonitoringStats();
    
    console.log('📊 System Status:');
    console.log(`  - Active Agents: ${stats.runtime.activeAgents}`);
    console.log(`  - Active Conversations: ${stats.runtime.activeConversations}`);
    console.log(`  - Registered Channels: ${stats.router.registeredChannels.join(', ')}`);
    console.log(`  - System Health: ${stats.system.overall_status}`);
  }

  /**
   * Get platform status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      timestamp: new Date().toISOString(),
      components: {
        runtime: 'active',
        service: 'active',
        router: 'active',
        monitor: 'active',
      },
      stats: agentMonitor.getMonitoringStats(),
    };
  }

  /**
   * Shutdown the platform gracefully
   */
  async shutdown() {
    console.log('🛑 Shutting down Agent Platform...');

    try {
      // Stop monitoring
      agentMonitor.stopMonitoring();

      // Stop all active agents
      const activeAgents = agentRuntime.getActiveAgents();
      for (const agent of activeAgents) {
        await agentRuntime.stopAgent(agent.id);
      }

      this.initialized = false;
      console.log('✅ Agent Platform shutdown complete');

    } catch (error) {
      console.error('❌ Error during platform shutdown:', error);
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck() {
    if (!this.initialized) {
      return {
        status: 'down',
        message: 'Platform not initialized',
      };
    }

    const systemHealth = agentMonitor.getSystemHealth();
    
    return {
      status: systemHealth.overall_status,
      timestamp: new Date().toISOString(),
      details: {
        active_agents: systemHealth.active_agents,
        total_conversations: systemHealth.total_conversations,
        average_response_time: systemHealth.average_response_time,
        error_rate: systemHealth.error_rate,
        uptime: systemHealth.uptime,
      },
    };
  }

  /**
   * Process incoming webhook message
   */
  async processWebhookMessage(agentId: string, message: any, channel: string) {
    try {
      console.log(`📨 Processing webhook message for agent ${agentId} from ${channel}`);

      // Route the message through the message router
      const success = await messageRouter.routeIncomingMessage({
        agent_id: agentId,
        customer_id: message.customer_id || message.from || 'unknown',
        channel: channel as any,
        content: message.content || message.text || message.body,
        type: message.type || 'text',
        metadata: message.metadata || {},
        customer_name: message.customer_name || message.profile?.name,
        customer_phone: message.customer_phone || message.from,
      });

      return {
        success,
        message: success ? 'Message processed successfully' : 'Failed to process message',
      };

    } catch (error) {
      console.error('Error processing webhook message:', error);
      return {
        success: false,
        message: 'Internal error processing message',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get agent by ID with full context
   */
  async getAgentWithContext(agentId: string, userId: string) {
    try {
      // Get agent details
      const agent = await agentService.getAgent(agentId, userId);
      if (!agent) return null;

      // Get health status
      const health = agentMonitor.getAgentHealth(agentId);

      // Get recent analytics
      const analytics = await agentService.getAgentAnalytics(agentId, 7);

      return {
        agent,
        health,
        analytics,
        runtime_status: agentRuntime.checkAgentHealth(agentId),
      };

    } catch (error) {
      console.error('Error getting agent with context:', error);
      return null;
    }
  }

  /**
   * Create and deploy agent
   */
  async createAndDeployAgent(config: any, userId: string, channels: string[] = []) {
    try {
      // Create agent
      const agent = await agentService.createAgent(config, userId);
      if (!agent) {
        throw new Error('Failed to create agent');
      }

      // Deploy to specified channels
      if (channels.length > 0) {
        const deployed = await agentService.deployAgent(agent.id, userId, channels);
        if (!deployed) {
          console.warn('Agent created but deployment failed');
        }
      }

      return agent;

    } catch (error) {
      console.error('Error creating and deploying agent:', error);
      throw error;
    }
  }

  /**
   * Test agent functionality
   */
  async testAgent(agentId: string, testMessage: string = 'Hello, this is a test message.') {
    try {
      const agent = agentRuntime.getAgent(agentId);
      if (!agent) {
        return {
          success: false,
          message: 'Agent not found or not active',
        };
      }

      // Simulate a test conversation
      const testResult = await agentService.testAgent(agentId, testMessage);

      return {
        success: !!testResult,
        message: testResult || 'Test failed',
        agent_status: agent.status,
        response_time: Date.now(), // This would be calculated properly
      };

    } catch (error) {
      console.error('Error testing agent:', error);
      return {
        success: false,
        message: 'Test failed with error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create singleton instance
export const agentPlatform = new AgentPlatform();

// Export all components for direct access if needed
export {
  agentRuntime,
  agentService,
  messageRouter,
  agentMonitor,
};