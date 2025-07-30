import { supabase } from './agent-runtime';
import type { Agent, Conversation, Message } from './agent-runtime';

export interface AgentConfig {
  name: string;
  description?: string;
  type: 'chat' | 'voice' | 'multimodal';
  personality: string;
  instructions: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: string[];
  voice_settings?: {
    voice_id: string;
    stability: number;
    similarity_boost: number;
    style: number;
  };
}

export interface ConversationCreateParams {
  agent_id: string;
  customer_id: string;
  channel: string;
  customer_name?: string;
  customer_phone?: string;
  metadata?: any;
}

/**
 * Agent Service
 * High-level service for agent lifecycle management
 */
export class AgentService {
  
  /**
   * Create a new agent
   */
  async createAgent(config: AgentConfig, userId: string): Promise<Agent | null> {
    try {
      // Generate unique agent ID and webhook URLs
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const webhookUrls = {
        whatsapp: `${window.location.origin}/.netlify/functions/whatsapp-webhook?agent_id=${agentId}`,
        slack: `${window.location.origin}/.netlify/functions/slack-webhook?agent_id=${agentId}`,
        web: `${window.location.origin}/.netlify/functions/web-webhook?agent_id=${agentId}`,
      };

      // Create agent in database
      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          id: agentId,
          user_id: userId,
          name: config.name,
          description: config.description || '',
          type: config.type,
          status: 'inactive',
          personality: config.personality,
          instructions: config.instructions,
          settings: {
            model: config.model || 'gpt-4',
            temperature: config.temperature || 0.7,
            max_tokens: config.max_tokens || 500,
          },
          tools: config.tools || [],
          voice_settings: config.voice_settings || {},
          deployment_urls: webhookUrls,
          conversation_count: 0,
          last_active: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating agent:', error);
        return null;
      }

      // Create default knowledge base for the agent
      await this.createDefaultKnowledgeBase(agentId, userId, config.name);

      console.log(`✅ Agent created: ${agent.name} (${agent.id})`);
      return agent;

    } catch (error) {
      console.error('Error creating agent:', error);
      return null;
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, config: Partial<AgentConfig>, userId: string): Promise<Agent | null> {
    try {
      const updateData: any = {};

      if (config.name) updateData.name = config.name;
      if (config.description !== undefined) updateData.description = config.description;
      if (config.type) updateData.type = config.type;
      if (config.personality) updateData.personality = config.personality;
      if (config.instructions) updateData.instructions = config.instructions;
      if (config.tools) updateData.tools = config.tools;
      if (config.voice_settings) updateData.voice_settings = config.voice_settings;

      if (config.model || config.temperature !== undefined || config.max_tokens) {
        // Get current settings
        const { data: currentAgent } = await supabase
          .from('agents')
          .select('settings')
          .eq('id', agentId)
          .eq('user_id', userId)
          .single();

        const currentSettings = currentAgent?.settings || {};
        updateData.settings = {
          ...currentSettings,
          ...(config.model && { model: config.model }),
          ...(config.temperature !== undefined && { temperature: config.temperature }),
          ...(config.max_tokens && { max_tokens: config.max_tokens }),
        };
      }

      updateData.updated_at = new Date().toISOString();

      const { data: agent, error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', agentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Database error updating agent:', error);
        return null;
      }

      console.log(`✅ Agent updated: ${agent.name} (${agent.id})`);
      return agent;

    } catch (error) {
      console.error('Error updating agent:', error);
      return null;
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId)
        .eq('user_id', userId);

      if (error) {
        console.error('Database error deleting agent:', error);
        return false;
      }

      console.log(`🗑️ Agent deleted: ${agentId}`);
      return true;

    } catch (error) {
      console.error('Error deleting agent:', error);
      return false;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string, userId: string): Promise<Agent | null> {
    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select(`
          *,
          knowledge_bases (
            id,
            name,
            description,
            documents_count,
            total_size_bytes
          )
        `)
        .eq('id', agentId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Database error getting agent:', error);
        return null;
      }

      return agent;

    } catch (error) {
      console.error('Error getting agent:', error);
      return null;
    }
  }

  /**
   * List all agents for a user
   */
  async listAgents(userId: string): Promise<Agent[]> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select(`
          *,
          knowledge_bases (
            id,
            name,
            documents_count
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error listing agents:', error);
        return [];
      }

      return agents || [];

    } catch (error) {
      console.error('Error listing agents:', error);
      return [];
    }
  }

  /**
   * Deploy agent (activate)
   */
  async deployAgent(agentId: string, userId: string, channels: string[] = []): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ 
          status: 'active',
          last_active: new Date().toISOString(),
          integrations: channels,
        })
        .eq('id', agentId)
        .eq('user_id', userId);

      if (error) {
        console.error('Database error deploying agent:', error);
        return false;
      }

      console.log(`🚀 Agent deployed: ${agentId} on channels: ${channels.join(', ')}`);
      return true;

    } catch (error) {
      console.error('Error deploying agent:', error);
      return false;
    }
  }

  /**
   * Stop agent deployment
   */
  async stopAgent(agentId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: 'inactive' })
        .eq('id', agentId)
        .eq('user_id', userId);

      if (error) {
        console.error('Database error stopping agent:', error);
        return false;
      }

      console.log(`⏹️ Agent stopped: ${agentId}`);
      return true;

    } catch (error) {
      console.error('Error stopping agent:', error);
      return false;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(params: ConversationCreateParams): Promise<Conversation | null> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: params.agent_id,
          user_id: params.customer_id, // This should be the agent owner's user_id
          customer_id: params.customer_id,
          channel: params.channel,
          status: 'active',
          customer_name: params.customer_name,
          customer_phone: params.customer_phone,
          metadata: params.metadata || {},
          escalation_requested: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating conversation:', error);
        return null;
      }

      // Update agent conversation count
      await this.incrementConversationCount(params.agent_id);

      console.log(`💬 Conversation created: ${conversation.id}`);
      return conversation;

    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(conversationId: string, role: 'user' | 'agent' | 'system', content: string, type: string = 'text', metadata: any = {}): Promise<Message | null> {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
          type,
          metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error adding message:', error);
        return null;
      }

      return message;

    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Database error getting messages:', error);
        return [];
      }

      return messages || [];

    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  /**
   * Get agent analytics
   */
  async getAgentAnalytics(agentId: string, days: number = 30): Promise<any[]> {
    try {
      const { data: analytics, error } = await supabase
        .from('agent_analytics')
        .select('*')
        .eq('agent_id', agentId)
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Database error getting analytics:', error);
        return [];
      }

      return analytics || [];

    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }

  /**
   * Create default knowledge base for agent
   */
  private async createDefaultKnowledgeBase(agentId: string, userId: string, agentName: string) {
    try {
      const { data: knowledgeBase, error } = await supabase
        .from('knowledge_bases')
        .insert({
          user_id: userId,
          name: `${agentName} Knowledge Base`,
          description: `Default knowledge base for ${agentName}`,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to create knowledge base:', error);
        return;
      }

      // Link knowledge base to agent
      await supabase
        .from('agents')
        .update({ knowledge_base_id: knowledgeBase.id })
        .eq('id', agentId);

      console.log(`📚 Knowledge base created for agent: ${agentName}`);

    } catch (error) {
      console.warn('Error creating default knowledge base:', error);
    }
  }

  /**
   * Increment agent conversation count
   */
  private async incrementConversationCount(agentId: string) {
    try {
      const { error } = await supabase.rpc('increment_conversation_count', {
        agent_id: agentId
      });

      if (error) {
        console.warn('Failed to increment conversation count:', error);
      }
    } catch (error) {
      console.warn('Error incrementing conversation count:', error);
    }
  }

  /**
   * Test agent configuration
   */
  async testAgent(agentId: string, testMessage: string): Promise<string | null> {
    try {
      // This would integrate with the AI service to test the agent
      // For now, return a mock response
      console.log(`🧪 Testing agent ${agentId} with message: "${testMessage}"`);
      
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return `Test response from agent ${agentId}: I received your message "${testMessage}" and I'm working correctly!`;

    } catch (error) {
      console.error('Error testing agent:', error);
      return null;
    }
  }
}

// Create singleton instance
export const agentService = new AgentService();