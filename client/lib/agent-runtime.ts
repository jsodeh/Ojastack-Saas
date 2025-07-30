import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description: string;
  type: 'chat' | 'voice' | 'multimodal';
  status: 'active' | 'inactive' | 'training';
  personality: string;
  instructions: string;
  settings: {
    model: string;
    temperature: number;
    max_tokens: number;
  };
  tools: string[];
  voice_settings: any;
  deployment_urls: {
    whatsapp: string;
    slack: string;
    web: string;
  };
  conversation_count: number;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  user_id: string;
  customer_id: string;
  channel: string;
  status: 'active' | 'completed' | 'escalated';
  customer_name?: string;
  customer_phone?: string;
  intent?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  escalation_requested: boolean;
  escalation_reason?: string;
  human_agent_id?: string;
  resolution_time?: number;
  satisfaction_score?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'agent' | 'system' | 'human';
  content: string;
  type: 'text' | 'audio' | 'image' | 'file';
  metadata: any;
  created_at: string;
}

export interface ConversationContext {
  conversation: Conversation;
  messages: Message[];
  agent: Agent;
  customer_info?: any;
  conversation_summary?: string;
}

/**
 * Agent Runtime Engine
 * Manages agent lifecycle, conversation state, and message processing
 */
export class AgentRuntimeEngine {
  private activeAgents: Map<string, Agent> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();
  private messageQueue: Map<string, any[]> = new Map();

  constructor() {
    this.initializeRuntime();
  }

  /**
   * Initialize the runtime engine
   */
  private async initializeRuntime() {
    console.log('🚀 Initializing Agent Runtime Engine...');
    
    // Load active agents from database
    await this.loadActiveAgents();
    
    // Set up real-time subscriptions
    this.setupRealtimeSubscriptions();
    
    console.log('✅ Agent Runtime Engine initialized');
  }

  /**
   * Load all active agents from the database
   */
  private async loadActiveAgents() {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error loading active agents:', error);
        return;
      }

      agents?.forEach(agent => {
        this.activeAgents.set(agent.id, agent);
        console.log(`📡 Loaded active agent: ${agent.name} (${agent.id})`);
      });

      console.log(`✅ Loaded ${agents?.length || 0} active agents`);
    } catch (error) {
      console.error('Failed to load active agents:', error);
    }
  }

  /**
   * Set up real-time subscriptions for agent and conversation updates
   */
  private setupRealtimeSubscriptions() {
    // Subscribe to agent changes
    supabase
      .channel('agents')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => this.handleAgentChange(payload)
      )
      .subscribe();

    // Subscribe to conversation changes
    supabase
      .channel('conversations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => this.handleConversationChange(payload)
      )
      .subscribe();

    // Subscribe to message changes
    supabase
      .channel('messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => this.handleNewMessage(payload)
      )
      .subscribe();

    console.log('📡 Real-time subscriptions established');
  }

  /**
   * Handle agent status changes
   */
  private handleAgentChange(payload: any) {
    const { eventType, new: newAgent, old: oldAgent } = payload;

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newAgent.status === 'active') {
          this.activeAgents.set(newAgent.id, newAgent);
          console.log(`🟢 Agent activated: ${newAgent.name}`);
        } else {
          this.activeAgents.delete(newAgent.id);
          console.log(`🔴 Agent deactivated: ${newAgent.name}`);
        }
        break;
      
      case 'DELETE':
        this.activeAgents.delete(oldAgent.id);
        console.log(`🗑️ Agent deleted: ${oldAgent.name}`);
        break;
    }
  }

  /**
   * Handle conversation changes
   */
  private handleConversationChange(payload: any) {
    const { eventType, new: newConversation } = payload;

    if (eventType === 'INSERT') {
      console.log(`💬 New conversation started: ${newConversation.id}`);
      this.initializeConversationContext(newConversation.id);
    }
  }

  /**
   * Handle new messages
   */
  private handleNewMessage(payload: any) {
    const { new: newMessage } = payload;
    
    if (newMessage.role === 'user') {
      console.log(`📨 New user message in conversation: ${newMessage.conversation_id}`);
      this.processUserMessage(newMessage);
    }
  }

  /**
   * Initialize conversation context
   */
  private async initializeConversationContext(conversationId: string) {
    try {
      // Get conversation details
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        console.error('Error loading conversation:', convError);
        return;
      }

      // Get agent details
      const agent = this.activeAgents.get(conversation.agent_id);
      if (!agent) {
        console.error('Agent not found or inactive:', conversation.agent_id);
        return;
      }

      // Get conversation messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Error loading messages:', msgError);
        return;
      }

      // Create conversation context
      const context: ConversationContext = {
        conversation,
        messages: messages || [],
        agent,
        customer_info: conversation.metadata?.customer_info,
        conversation_summary: '',
      };

      this.conversationContexts.set(conversationId, context);
      console.log(`📋 Conversation context initialized: ${conversationId}`);

    } catch (error) {
      console.error('Failed to initialize conversation context:', error);
    }
  }

  /**
   * Process incoming user message
   */
  private async processUserMessage(message: Message) {
    try {
      const conversationId = message.conversation_id;
      let context = this.conversationContexts.get(conversationId);

      // Initialize context if not exists
      if (!context) {
        await this.initializeConversationContext(conversationId);
        context = this.conversationContexts.get(conversationId);
      }

      if (!context) {
        console.error('Failed to get conversation context:', conversationId);
        return;
      }

      // Add message to context
      context.messages.push(message);

      // Generate agent response
      const response = await this.generateAgentResponse(context, message);

      if (response) {
        // Save agent response to database
        await this.saveAgentMessage(conversationId, response);
        
        // Update conversation context
        context.messages.push({
          id: `temp_${Date.now()}`,
          conversation_id: conversationId,
          role: 'agent',
          content: response,
          type: 'text',
          metadata: {},
          created_at: new Date().toISOString(),
        });

        // Update conversation status
        await this.updateConversationActivity(conversationId);
      }

    } catch (error) {
      console.error('Error processing user message:', error);
    }
  }

  /**
   * Generate agent response using AI
   */
  private async generateAgentResponse(context: ConversationContext, userMessage: Message): Promise<string | null> {
    try {
      const { agent, messages } = context;

      // Import AI service dynamically to avoid circular dependencies
      const { aiService } = await import('./ai-service');
      const { conversationContextManager } = await import('./conversation-context');

      // Get conversation context window
      const contextWindow = await conversationContextManager.getContextWindow(context.conversation.id);
      if (!contextWindow) {
        console.error('Failed to get context window');
        return 'I apologize, but I encountered an error processing your message. Please try again.';
      }

      // Prepare conversation history for AI
      const conversationHistory = contextWindow.messages.map(msg => ({
        role: msg.role === 'agent' ? 'assistant' as const : 'user' as const,
        content: msg.content,
      }));

      // Add system message with agent personality and instructions
      const systemMessage = {
        role: 'system' as const,
        content: `${agent.personality}\n\nInstructions: ${agent.instructions}`,
      };

      // Call AI service
      const aiResponse = await aiService.generateChatCompletion(
        [systemMessage, ...conversationHistory],
        {
          model: agent.settings.model,
          temperature: agent.settings.temperature,
          max_tokens: agent.settings.max_tokens,
        }
      );

      return aiResponse.content;

    } catch (error) {
      console.error('Error generating agent response:', error);
      return 'I apologize, but I encountered an error processing your message. Please try again.';
    }
  }

  /**
   * Save agent message to database
   */
  private async saveAgentMessage(conversationId: string, content: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'agent',
          content,
          type: 'text',
          metadata: {},
        });

      if (error) {
        console.error('Error saving agent message:', error);
      }
    } catch (error) {
      console.error('Failed to save agent message:', error);
    }
  }

  /**
   * Update conversation activity
   */
  private async updateConversationActivity(conversationId: string) {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating conversation activity:', error);
      }
    } catch (error) {
      console.error('Failed to update conversation activity:', error);
    }
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: string): Agent | undefined {
    return this.activeAgents.get(agentId);
  }

  /**
   * Get conversation context
   */
  public getConversationContext(conversationId: string): ConversationContext | undefined {
    return this.conversationContexts.get(conversationId);
  }

  /**
   * Get all active agents
   */
  public getActiveAgents(): Agent[] {
    return Array.from(this.activeAgents.values());
  }

  /**
   * Start agent (activate)
   */
  public async startAgent(agentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ 
          status: 'active',
          last_active: new Date().toISOString(),
        })
        .eq('id', agentId);

      if (error) {
        console.error('Error starting agent:', error);
        return false;
      }

      console.log(`🟢 Agent started: ${agentId}`);
      return true;
    } catch (error) {
      console.error('Failed to start agent:', error);
      return false;
    }
  }

  /**
   * Stop agent (deactivate)
   */
  public async stopAgent(agentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: 'inactive' })
        .eq('id', agentId);

      if (error) {
        console.error('Error stopping agent:', error);
        return false;
      }

      console.log(`🔴 Agent stopped: ${agentId}`);
      return true;
    } catch (error) {
      console.error('Failed to stop agent:', error);
      return false;
    }
  }

  /**
   * Health check for agent
   */
  public checkAgentHealth(agentId: string): { status: string; lastActive: string | null } {
    const agent = this.activeAgents.get(agentId);
    
    return {
      status: agent ? agent.status : 'not_found',
      lastActive: agent ? agent.last_active : null,
    };
  }

  /**
   * Get runtime statistics
   */
  public getRuntimeStats() {
    return {
      activeAgents: this.activeAgents.size,
      activeConversations: this.conversationContexts.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      uptime: Date.now(), // This would be calculated from startup time
    };
  }
}

// Create singleton instance
export const agentRuntime = new AgentRuntimeEngine();