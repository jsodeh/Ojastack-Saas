import { supabase } from './agent-runtime';
import { conversationContextManager } from './conversation-context';
import type { Conversation, Message, Agent } from './agent-runtime';

export interface ConversationFilter {
  agent_id?: string;
  user_id?: string;
  status?: 'active' | 'completed' | 'escalated';
  channel?: string;
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  search_query?: string;
}

export interface ConversationStats {
  total_conversations: number;
  active_conversations: number;
  completed_conversations: number;
  escalated_conversations: number;
  average_duration: number;
  total_messages: number;
  satisfaction_average: number;
}

export interface ConversationWithDetails extends Conversation {
  agent?: Agent;
  message_count: number;
  last_message?: Message;
  duration_minutes?: number;
}

/**
 * Conversation Manager
 * Handles conversation lifecycle, storage, retrieval, and management
 */
export class ConversationManager {
  
  /**
   * Create a new conversation
   */
  async createConversation(params: {
    agent_id: string;
    user_id: string;
    customer_id: string;
    channel: string;
    customer_name?: string;
    customer_phone?: string;
    metadata?: any;
  }): Promise<Conversation | null> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: params.agent_id,
          user_id: params.user_id,
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
        console.error('Error creating conversation:', error);
        return null;
      }

      console.log(`💬 Conversation created: ${conversation.id}`);
      return conversation;

    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<ConversationWithDetails | null> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          *,
          agents (
            id,
            name,
            type,
            status
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error getting conversation:', error);
        return null;
      }

      // Get message count and last message
      const { data: messageStats } = await supabase
        .from('messages')
        .select('id, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1);

      const messageCount = await this.getMessageCount(conversationId);
      const duration = this.calculateDuration(conversation.created_at, conversation.updated_at);

      return {
        ...conversation,
        agent: conversation.agents,
        message_count: messageCount,
        last_message: messageStats?.[0],
        duration_minutes: duration,
      };

    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }

  /**
   * List conversations with filtering and pagination
   */
  async listConversations(
    filter: ConversationFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ conversations: ConversationWithDetails[]; total: number; hasMore: boolean }> {
    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          agents (
            id,
            name,
            type,
            status
          )
        `, { count: 'exact' });

      // Apply filters
      if (filter.agent_id) {
        query = query.eq('agent_id', filter.agent_id);
      }
      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id);
      }
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      if (filter.channel) {
        query = query.eq('channel', filter.channel);
      }
      if (filter.customer_id) {
        query = query.eq('customer_id', filter.customer_id);
      }
      if (filter.date_from) {
        query = query.gte('created_at', filter.date_from);
      }
      if (filter.date_to) {
        query = query.lte('created_at', filter.date_to);
      }
      if (filter.search_query) {
        query = query.or(`customer_name.ilike.%${filter.search_query}%,customer_phone.ilike.%${filter.search_query}%`);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: conversations, error, count } = await query;

      if (error) {
        console.error('Error listing conversations:', error);
        return { conversations: [], total: 0, hasMore: false };
      }

      // Enhance conversations with additional data
      const enhancedConversations = await Promise.all(
        (conversations || []).map(async (conv) => {
          const messageCount = await this.getMessageCount(conv.id);
          const duration = this.calculateDuration(conv.created_at, conv.updated_at);

          return {
            ...conv,
            agent: conv.agents,
            message_count: messageCount,
            duration_minutes: duration,
          };
        })
      );

      return {
        conversations: enhancedConversations,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };

    } catch (error) {
      console.error('Error listing conversations:', error);
      return { conversations: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    try {
      const offset = (page - 1) * limit;

      const { data: messages, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting conversation messages:', error);
        return { messages: [], total: 0, hasMore: false };
      }

      return {
        messages: messages || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };

    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return { messages: [], total: 0, hasMore: false };
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'agent' | 'system' | 'human',
    content: string,
    type: 'text' | 'audio' | 'image' | 'file' = 'text',
    metadata: any = {}
  ): Promise<Message | null> {
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
        console.error('Error adding message:', error);
        return null;
      }

      // Update conversation activity
      await this.updateConversationActivity(conversationId);

      // Update conversation context
      await conversationContextManager.updateContext(conversationId, message);

      return message;

    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    conversationId: string,
    status: 'active' | 'completed' | 'escalated',
    metadata?: any
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.resolution_time = await this.calculateResolutionTime(conversationId);
      }

      if (metadata) {
        updateData.metadata = metadata;
      }

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating conversation status:', error);
        return false;
      }

      console.log(`📝 Conversation ${conversationId} status updated to: ${status}`);
      return true;

    } catch (error) {
      console.error('Error updating conversation status:', error);
      return false;
    }
  }

  /**
   * Escalate conversation to human agent
   */
  async escalateConversation(
    conversationId: string,
    reason: string,
    humanAgentId?: string
  ): Promise<boolean> {
    try {
      // Update conversation status
      const updated = await this.updateConversationStatus(conversationId, 'escalated', {
        escalation_reason: reason,
        escalated_at: new Date().toISOString(),
      });

      if (!updated) {
        return false;
      }

      // Create escalation record
      const { error: escalationError } = await supabase
        .from('escalations')
        .insert({
          conversation_id: conversationId,
          agent_id: (await this.getConversation(conversationId))?.agent_id,
          human_agent_id: humanAgentId,
          reason,
          status: humanAgentId ? 'assigned' : 'pending',
          assigned_at: humanAgentId ? new Date().toISOString() : null,
        });

      if (escalationError) {
        console.error('Error creating escalation record:', escalationError);
        return false;
      }

      // Add system message about escalation
      await this.addMessage(
        conversationId,
        'system',
        `Conversation escalated to human agent. Reason: ${reason}`,
        'text',
        { escalation: true }
      );

      console.log(`🚨 Conversation ${conversationId} escalated: ${reason}`);
      return true;

    } catch (error) {
      console.error('Error escalating conversation:', error);
      return false;
    }
  }

  /**
   * Archive conversation
   */
  async archiveConversation(conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
          metadata: supabase.raw(`metadata || '{"archived": true}'::jsonb`),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error archiving conversation:', error);
        return false;
      }

      // Clear from context manager
      conversationContextManager.clearContext(conversationId);

      console.log(`📦 Conversation ${conversationId} archived`);
      return true;

    } catch (error) {
      console.error('Error archiving conversation:', error);
      return false;
    }
  }

  /**
   * Delete conversation (soft delete)
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      // In production, you might want to soft delete instead of hard delete
      const { error } = await supabase
        .from('conversations')
        .update({
          metadata: supabase.raw(`metadata || '{"deleted": true, "deleted_at": "${new Date().toISOString()}"}'::jsonb`),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error deleting conversation:', error);
        return false;
      }

      // Clear from context manager
      conversationContextManager.clearContext(conversationId);

      console.log(`🗑️ Conversation ${conversationId} deleted`);
      return true;

    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(filter: ConversationFilter = {}): Promise<ConversationStats> {
    try {
      let query = supabase.from('conversations').select('*');

      // Apply filters
      if (filter.agent_id) query = query.eq('agent_id', filter.agent_id);
      if (filter.user_id) query = query.eq('user_id', filter.user_id);
      if (filter.date_from) query = query.gte('created_at', filter.date_from);
      if (filter.date_to) query = query.lte('created_at', filter.date_to);

      const { data: conversations, error } = await query;

      if (error) {
        console.error('Error getting conversation stats:', error);
        return this.getEmptyStats();
      }

      const total = conversations?.length || 0;
      const active = conversations?.filter(c => c.status === 'active').length || 0;
      const completed = conversations?.filter(c => c.status === 'completed').length || 0;
      const escalated = conversations?.filter(c => c.status === 'escalated').length || 0;

      // Calculate average duration
      const completedConversations = conversations?.filter(c => c.status === 'completed') || [];
      const totalDuration = completedConversations.reduce((sum, conv) => {
        return sum + this.calculateDuration(conv.created_at, conv.updated_at);
      }, 0);
      const averageDuration = completedConversations.length > 0 
        ? totalDuration / completedConversations.length 
        : 0;

      // Get message count
      const conversationIds = conversations?.map(c => c.id) || [];
      const messageCount = conversationIds.length > 0 
        ? await this.getTotalMessageCount(conversationIds)
        : 0;

      // Calculate satisfaction average
      const satisfactionScores = conversations
        ?.filter(c => c.satisfaction_score)
        .map(c => c.satisfaction_score) || [];
      const satisfactionAverage = satisfactionScores.length > 0
        ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length
        : 0;

      return {
        total_conversations: total,
        active_conversations: active,
        completed_conversations: completed,
        escalated_conversations: escalated,
        average_duration: averageDuration,
        total_messages: messageCount,
        satisfaction_average: satisfactionAverage,
      };

    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Search conversations
   */
  async searchConversations(
    query: string,
    filter: ConversationFilter = {},
    limit: number = 20
  ): Promise<ConversationWithDetails[]> {
    try {
      let searchQuery = supabase
        .from('conversations')
        .select(`
          *,
          agents (
            id,
            name,
            type,
            status
          )
        `)
        .or(`customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%`)
        .limit(limit);

      // Apply additional filters
      if (filter.agent_id) searchQuery = searchQuery.eq('agent_id', filter.agent_id);
      if (filter.user_id) searchQuery = searchQuery.eq('user_id', filter.user_id);
      if (filter.status) searchQuery = searchQuery.eq('status', filter.status);
      if (filter.channel) searchQuery = searchQuery.eq('channel', filter.channel);

      const { data: conversations, error } = await searchQuery;

      if (error) {
        console.error('Error searching conversations:', error);
        return [];
      }

      // Enhance with additional data
      const enhancedConversations = await Promise.all(
        (conversations || []).map(async (conv) => {
          const messageCount = await this.getMessageCount(conv.id);
          const duration = this.calculateDuration(conv.created_at, conv.updated_at);

          return {
            ...conv,
            agent: conv.agents,
            message_count: messageCount,
            duration_minutes: duration,
          };
        })
      );

      return enhancedConversations;

    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }

  /**
   * Get recent conversations for an agent
   */
  async getRecentConversations(agentId: string, limit: number = 10): Promise<ConversationWithDetails[]> {
    return (await this.listConversations({ agent_id: agentId }, 1, limit)).conversations;
  }

  /**
   * Get active conversations for a user
   */
  async getActiveConversations(userId: string): Promise<ConversationWithDetails[]> {
    return (await this.listConversations({ user_id: userId, status: 'active' })).conversations;
  }

  // Private helper methods

  private async getMessageCount(conversationId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error getting message count:', error);
      return 0;
    }

    return count || 0;
  }

  private async getTotalMessageCount(conversationIds: string[]): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds);

    if (error) {
      console.error('Error getting total message count:', error);
      return 0;
    }

    return count || 0;
  }

  private calculateDuration(createdAt: string, updatedAt: string): number {
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    return Math.round((updated - created) / (1000 * 60)); // Duration in minutes
  }

  private async calculateResolutionTime(conversationId: string): Promise<number> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return 0;

    return this.calculateDuration(conversation.created_at, new Date().toISOString());
  }

  private async updateConversationActivity(conversationId: string): Promise<void> {
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  private getEmptyStats(): ConversationStats {
    return {
      total_conversations: 0,
      active_conversations: 0,
      completed_conversations: 0,
      escalated_conversations: 0,
      average_duration: 0,
      total_messages: 0,
      satisfaction_average: 0,
    };
  }
}

// Create singleton instance
export const conversationManager = new ConversationManager();