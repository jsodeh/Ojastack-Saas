import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { ConversationalAI, ConversationContext } from "../../client/lib/conversational-ai";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY!;

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Conversational AI
const conversationalAI = new ConversationalAI(openaiApiKey, elevenLabsApiKey);

interface ProcessMessageRequest {
  agentId: string;
  message: string;
  customerId: string;
  channel: 'web' | 'whatsapp' | 'slack' | 'email';
  messageType?: 'text' | 'audio';
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const method = event.httpMethod;
    const path = event.path;

    switch (method) {
      case 'POST':
        if (path.includes('/process')) {
          // Process incoming message
          const request: ProcessMessageRequest = JSON.parse(event.body || '{}');
          return await processMessage(request, headers);
        } else {
          // Create new conversation
          const conversationData = JSON.parse(event.body || '{}');
          return await createConversation(conversationData, headers);
        }

      case 'GET':
        if (path.includes('/conversations/')) {
          // Get specific conversation
          const conversationId = path.split('/').pop();
          return await getConversation(conversationId!, headers);
        } else {
          // List conversations
          const agentId = event.queryStringParameters?.agentId;
          const userId = event.queryStringParameters?.userId;
          return await listConversations(agentId, userId, headers);
        }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  } catch (error) {
    console.error("Error in conversations function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

// Process incoming message with AI
async function processMessage(request: ProcessMessageRequest, headers: any) {
  try {
    const { agentId, message, customerId, channel, messageType = 'text', customerInfo } = request;

    // Get agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        knowledge_bases (
          id,
          name
        )
      `)
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Agent not found" }),
      };
    }

    // Get or create conversation
    let conversation = await getOrCreateConversation(agentId, customerId, channel, customerInfo);

    // Load conversation context
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    const context: ConversationContext = {
      conversationId: conversation.id,
      agentId: agentId,
      customerId: customerId,
      history: (messages || []).map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        type: msg.type,
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata
      })),
      metadata: {
        customerName: customerInfo?.name || conversation.customer_name,
        customerInfo: customerInfo,
        intent: conversation.intent,
        sentiment: conversation.sentiment,
        escalationRequested: conversation.escalation_requested
      }
    };

    // Process message with AI
    let aiResponse;
    if (messageType === 'text') {
      aiResponse = await conversationalAI.processTextMessage(message, context, {
        name: agent.name,
        personality: agent.personality,
        instructions: agent.instructions,
        model: agent.settings?.model || 'gpt-4',
        temperature: agent.settings?.temperature || 0.7,
        max_tokens: agent.settings?.max_tokens || 500,
        tools: agent.tools || [],
        voice_settings: agent.voice_settings
      });
    } else {
      // Handle audio message (would need audio blob)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Audio processing not implemented in this endpoint" }),
      };
    }

    // Save user message
    const { data: userMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
        type: messageType,
        metadata: { customerInfo }
      })
      .select()
      .single();

    // Save agent response
    const { data: agentMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'agent',
        content: aiResponse.response,
        type: 'text',
        metadata: {
          toolCalls: aiResponse.toolCalls,
          confidence: aiResponse.confidence,
          needsEscalation: aiResponse.needsEscalation
        }
      })
      .select()
      .single();

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        intent: aiResponse.context.metadata.intent,
        sentiment: aiResponse.context.metadata.sentiment,
        escalation_requested: aiResponse.needsEscalation,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);

    // Save tool calls if any
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const toolCallsData = aiResponse.toolCalls.map(tool => ({
        conversation_id: conversation.id,
        message_id: agentMessage.id,
        tool_name: tool.name,
        parameters: tool.parameters,
        result: tool.result,
        status: tool.status,
        execution_time: 0, // Would be calculated in real implementation
        completed_at: tool.status === 'completed' ? new Date().toISOString() : null
      }));

      await supabase
        .from('tool_calls')
        .insert(toolCallsData);
    }

    // Handle escalation if needed
    if (aiResponse.needsEscalation) {
      await handleEscalation(conversation.id, agentId, "AI detected escalation need");
    }

    // Update agent analytics
    await updateAgentAnalytics(agentId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: aiResponse.response,
        conversationId: conversation.id,
        needsEscalation: aiResponse.needsEscalation,
        confidence: aiResponse.confidence,
        toolCalls: aiResponse.toolCalls,
        userMessage,
        agentMessage
      }),
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to process message" }),
    };
  }
}

// Get or create conversation
async function getOrCreateConversation(agentId: string, customerId: string, channel: string, customerInfo?: any) {
  // Try to find existing active conversation
  const { data: existingConversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('agent_id', agentId)
    .eq('customer_id', customerId)
    .eq('channel', channel)
    .eq('status', 'active')
    .single();

  if (existingConversation) {
    return existingConversation;
  }

  // Create new conversation
  const { data: newConversation, error } = await supabase
    .from('conversations')
    .insert({
      agent_id: agentId,
      user_id: (await supabase.from('agents').select('user_id').eq('id', agentId).single()).data?.user_id,
      customer_id: customerId,
      channel: channel,
      status: 'active',
      customer_name: customerInfo?.name,
      customer_phone: customerInfo?.phone,
      messages: [],
      metadata: { customerInfo }
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return newConversation;
}

// Handle escalation
async function handleEscalation(conversationId: string, agentId: string, reason: string) {
  try {
    // Create escalation record
    await supabase
      .from('escalations')
      .insert({
        conversation_id: conversationId,
        agent_id: agentId,
        reason: reason,
        status: 'pending'
      });

    // Update conversation status
    await supabase
      .from('conversations')
      .update({
        status: 'escalated',
        escalation_requested: true,
        escalation_reason: reason
      })
      .eq('id', conversationId);

    console.log(`Escalation created for conversation ${conversationId}`);
  } catch (error) {
    console.error('Error handling escalation:', error);
  }
}

// Update agent analytics
async function updateAgentAnalytics(agentId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Upsert analytics record for today
    await supabase
      .from('agent_analytics')
      .upsert({
        agent_id: agentId,
        date: today,
        messages_count: 1
      }, {
        onConflict: 'agent_id,date',
        ignoreDuplicates: false
      });

    // Update agent last_active
    await supabase
      .from('agents')
      .update({
        last_active: new Date().toISOString(),
        conversation_count: supabase.raw('conversation_count + 1')
      })
      .eq('id', agentId);
  } catch (error) {
    console.error('Error updating analytics:', error);
  }
}

// Create new conversation
async function createConversation(data: any, headers: any) {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert(data)
      .select()
      .single();

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to create conversation" }),
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ conversation }),
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create conversation" }),
    };
  }
}

// Get specific conversation
async function getConversation(conversationId: string, headers: any) {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (*),
        tool_calls (*),
        escalations (*)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Conversation not found" }),
        };
      }
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to fetch conversation" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ conversation }),
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to get conversation" }),
    };
  }
}

// List conversations with enhanced filtering
async function listConversations(agentId?: string, userId?: string, headers?: any) {
  try {
    const queryParams = new URLSearchParams(headers?.queryStringParameters || '');
    const page = parseInt(queryParams.get('page') || '1');
    const limit = parseInt(queryParams.get('limit') || '20');
    const status = queryParams.get('status');
    const channel = queryParams.get('channel');
    const search = queryParams.get('search');
    const dateFrom = queryParams.get('date_from');
    const dateTo = queryParams.get('date_to');

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
    if (agentId) query = query.eq('agent_id', agentId);
    if (userId) query = query.eq('user_id', userId);
    if (status) query = query.eq('status', status);
    if (channel) query = query.eq('channel', channel);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: conversations, error, count } = await query;

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to fetch conversations" }),
      };
    }

    // Enhance conversations with message counts
    const enhancedConversations = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { count: messageCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        const duration = calculateDuration(conv.created_at, conv.updated_at);

        return {
          ...conv,
          message_count: messageCount || 0,
          duration_minutes: duration,
        };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conversations: enhancedConversations,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (count || 0) > offset + limit,
        },
      }),
    };
  } catch (error) {
    console.error('Error listing conversations:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to list conversations" }),
    };
  }
}

// Helper function to calculate duration
function calculateDuration(createdAt: string, updatedAt: string): number {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  return Math.round((updated - created) / (1000 * 60)); // Duration in minutes
}

export { handler };