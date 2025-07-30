import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AgentConfig {
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
    // Get user from JWT token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid token" }),
      };
    }

    const method = event.httpMethod;
    const path = event.path;

    switch (method) {
      case 'GET':
        if (path.includes('/agents/')) {
          // Get specific agent
          const agentId = path.split('/').pop();
          return await getAgent(agentId!, user.id, headers);
        } else {
          // List all agents for user
          return await listAgents(user.id, headers);
        }

      case 'POST':
        // Create new agent
        const agentConfig: AgentConfig = JSON.parse(event.body || '{}');
        return await createAgent(agentConfig, user.id, headers);

      case 'PUT':
        // Update agent
        const agentId = path.split('/').pop();
        const updateConfig: Partial<AgentConfig> = JSON.parse(event.body || '{}');
        return await updateAgent(agentId!, updateConfig, user.id, headers);

      case 'DELETE':
        // Delete agent
        const deleteAgentId = path.split('/').pop();
        return await deleteAgent(deleteAgentId!, user.id, headers);

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  } catch (error) {
    console.error("Error in agents function:", error);
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

// Create new agent
async function createAgent(config: AgentConfig, userId: string, headers: any) {
  try {
    // Validate required fields
    if (!config.name || !config.type || !config.personality) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: "Missing required fields: name, type, personality" 
        }),
      };
    }

    // Generate unique agent ID and webhook URLs
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const webhookUrls = {
      whatsapp: `${process.env.SITE_URL}/.netlify/functions/whatsapp-webhook?agent_id=${agentId}`,
      slack: `${process.env.SITE_URL}/.netlify/functions/slack-webhook?agent_id=${agentId}`,
      web: `${process.env.SITE_URL}/.netlify/functions/web-webhook?agent_id=${agentId}`,
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
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to create agent" }),
      };
    }

    // Create default knowledge base for the agent
    const { data: knowledgeBase, error: kbError } = await supabase
      .from('knowledge_bases')
      .insert({
        user_id: userId,
        name: `${config.name} Knowledge Base`,
        description: `Default knowledge base for ${config.name}`,
        status: 'active',
      })
      .select()
      .single();

    if (kbError) {
      console.warn('Failed to create knowledge base:', kbError);
    } else {
      // Link knowledge base to agent
      await supabase
        .from('agents')
        .update({ knowledge_base_id: knowledgeBase.id })
        .eq('id', agentId);
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        agent,
        knowledgeBase,
        message: "Agent created successfully",
      }),
    };
  } catch (error) {
    console.error('Error creating agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to create agent" }),
    };
  }
}

// List all agents for user
async function listAgents(userId: string, headers: any) {
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
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to fetch agents" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ agents }),
    };
  } catch (error) {
    console.error('Error listing agents:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to list agents" }),
    };
  }
}

// Get specific agent
async function getAgent(agentId: string, userId: string, headers: any) {
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
        ),
        conversations (
          id,
          status,
          created_at
        )
      `)
      .eq('id', agentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Agent not found" }),
        };
      }
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to fetch agent" }),
      };
    }

    // Get recent conversations
    const { data: recentConversations } = await supabase
      .from('conversations')
      .select('id, status, created_at, customer_id, channel')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get agent analytics
    const { data: analytics } = await supabase
      .from('agent_analytics')
      .select('*')
      .eq('agent_id', agentId)
      .order('date', { ascending: false })
      .limit(30);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        agent,
        recentConversations: recentConversations || [],
        analytics: analytics || [],
      }),
    };
  } catch (error) {
    console.error('Error getting agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to get agent" }),
    };
  }
}

// Update agent
async function updateAgent(agentId: string, config: Partial<AgentConfig>, userId: string, headers: any) {
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
      if (error.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Agent not found" }),
        };
      }
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to update agent" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        agent,
        message: "Agent updated successfully",
      }),
    };
  } catch (error) {
    console.error('Error updating agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to update agent" }),
    };
  }
}

// Delete agent
async function deleteAgent(agentId: string, userId: string, headers: any) {
  try {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to delete agent" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Agent deleted successfully" }),
    };
  } catch (error) {
    console.error('Error deleting agent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete agent" }),
    };
  }
}

export { handler };