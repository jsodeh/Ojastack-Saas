import { supabase } from './supabase';

// Types for Agent System
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: AgentCapabilities;
  default_personality: PersonalityConfig;
  sample_conversations: Conversation[];
  rating: number;
  usage_count: number;
  featured: boolean;
  preview_image?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentCapabilities {
  text: {
    enabled: boolean;
    provider: 'openai' | 'anthropic';
    model: string;
  };
  voice: {
    enabled: boolean;
    provider: 'elevenlabs';
    voiceId: string;
  };
  image: {
    enabled: boolean;
    provider?: 'openai' | 'anthropic';
  };
  video: {
    enabled: boolean;
    provider?: 'livekit';
  };
  tools: string[];
}

export interface PersonalityConfig {
  tone: 'professional' | 'friendly' | 'casual' | 'formal' | 'enthusiastic' | 'encouraging';
  creativityLevel: number; // 0-100
  responseStyle: {
    length: 'concise' | 'detailed' | 'comprehensive';
    formality: 'casual' | 'professional' | 'formal';
    empathy: 'low' | 'medium' | 'high';
    proactivity: 'reactive' | 'balanced' | 'proactive';
  };
  systemPrompt: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface UserAgent {
  id: string;
  user_id: string;
  template_id?: string;
  name: string;
  description?: string;
  personality_config: PersonalityConfig;
  capabilities_config: AgentCapabilities;
  knowledge_bases: string[];
  deployment_channels: DeploymentChannel[];
  n8n_workflow_id?: string;
  status: 'draft' | 'testing' | 'active' | 'paused' | 'error';
  is_draft: boolean;
  draft_step: number;
  draft_data: any;
  created_at: string;
  updated_at: string;
}

export interface DeploymentChannel {
  type: 'webchat' | 'whatsapp' | 'email' | 'slack';
  enabled: boolean;
  config: Record<string, any>;
  status: 'pending' | 'active' | 'error';
}

export interface TemplateFilters {
  category?: string;
  capabilities?: string[];
  featured?: boolean;
  search?: string;
  sortBy?: 'rating' | 'usage' | 'name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface AgentAnalytics {
  id: string;
  agent_id: string;
  date: string;
  conversations_count: number;
  messages_count: number;
  response_time_avg?: number;
  satisfaction_score?: number;
  channel_breakdown: Record<string, number>;
  error_count: number;
  success_rate?: number;
}

// Error handling
export class AgentServiceError extends Error {
  public readonly type: 'network' | 'database' | 'permission' | 'validation' | 'unknown';
  public readonly code?: string;
  public readonly retryable: boolean;

  constructor(error: {
    type: AgentServiceError['type'];
    message: string;
    code?: string;
    retryable: boolean;
  }) {
    super(error.message);
    this.name = 'AgentServiceError';
    this.type = error.type;
    this.code = error.code;
    this.retryable = error.retryable;
  }
}

function handleSupabaseError(error: any, operation: string): AgentServiceError {
  console.error(`Error in ${operation}:`, error);

  // Network/connection errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return new AgentServiceError({
      type: 'network',
      message: 'Unable to connect to the server. Please check your internet connection.',
      retryable: true,
    });
  }

  // Permission errors
  if (error.code === 'PGRST301' || error.message?.includes('permission')) {
    return new AgentServiceError({
      type: 'permission',
      message: 'You do not have permission to access this data.',
      code: error.code,
      retryable: false,
    });
  }

  // Database errors
  if (error.code?.startsWith('PGRST') || error.code?.startsWith('23')) {
    return new AgentServiceError({
      type: 'database',
      message: 'Database error occurred. Please try again later.',
      code: error.code,
      retryable: true,
    });
  }

  // Validation errors
  if (error.code?.startsWith('22') || error.message?.includes('violates')) {
    return new AgentServiceError({
      type: 'validation',
      message: 'Invalid data provided. Please check your input.',
      code: error.code,
      retryable: false,
    });
  }

  // Unknown errors
  return new AgentServiceError({
    type: 'unknown',
    message: error.message || 'An unexpected error occurred.',
    code: error.code,
    retryable: true,
  });
}

// Agent Template Service Functions
export async function fetchAgentTemplates(filters: TemplateFilters = {}): Promise<AgentTemplate[]> {
  try {
    let query = supabase
      .from('agent_templates')
      .select('*');

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.featured !== undefined) {
      query = query.eq('featured', filters.featured);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tags.cs.{${filters.search}}`);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'rating';
    const sortOrder = filters.sortOrder || 'desc';
    
    if (sortBy === 'rating') {
      query = query.order('rating', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'usage') {
      query = query.order('usage_count', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'name') {
      query = query.order('name', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    }

    const { data, error } = await query;

    if (error) {
      throw handleSupabaseError(error, 'fetchAgentTemplates');
    }

    return data || [];
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchAgentTemplates');
  }
}

export async function fetchAgentTemplate(id: string): Promise<AgentTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw handleSupabaseError(error, 'fetchAgentTemplate');
    }

    return data;
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchAgentTemplate');
  }
}

export async function getTemplateCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('category')
      .order('category');

    if (error) {
      throw handleSupabaseError(error, 'getTemplateCategories');
    }

    const categories = [...new Set(data?.map(item => item.category) || [])];
    return categories;
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'getTemplateCategories');
  }
}

export async function incrementTemplateUsage(templateId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_uuid: templateId
    });

    if (error) {
      throw handleSupabaseError(error, 'incrementTemplateUsage');
    }
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'incrementTemplateUsage');
  }
}

// User Agent Service Functions
export async function fetchUserAgents(userId: string): Promise<UserAgent[]> {
  if (!userId) {
    throw new AgentServiceError({
      type: 'validation',
      message: 'User ID is required to fetch agents.',
      retryable: false,
    });
  }

  try {
    const { data, error } = await supabase
      .from('user_agents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw handleSupabaseError(error, 'fetchUserAgents');
    }

    return data || [];
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchUserAgents');
  }
}

export async function fetchUserAgent(id: string, userId: string): Promise<UserAgent | null> {
  if (!userId) {
    throw new AgentServiceError({
      type: 'validation',
      message: 'User ID is required to fetch agent.',
      retryable: false,
    });
  }

  try {
    const { data, error } = await supabase
      .from('user_agents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw handleSupabaseError(error, 'fetchUserAgent');
    }

    return data;
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchUserAgent');
  }
}

export async function createUserAgent(agent: Partial<UserAgent>): Promise<UserAgent> {
  if (!agent.user_id) {
    throw new AgentServiceError({
      type: 'validation',
      message: 'User ID is required to create agent.',
      retryable: false,
    });
  }

  if (!agent.name) {
    throw new AgentServiceError({
      type: 'validation',
      message: 'Agent name is required.',
      retryable: false,
    });
  }

  try {
    const { data, error } = await supabase
      .from('user_agents')
      .insert([agent])
      .select()
      .single();

    if (error) {
      throw handleSupabaseError(error, 'createUserAgent');
    }

    // Increment template usage if template was used
    if (agent.template_id) {
      await incrementTemplateUsage(agent.template_id);
    }

    return data;
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'createUserAgent');
  }
}

export async function updateUserAgent(id: string, updates: Partial<UserAgent>): Promise<UserAgent> {
  try {
    const { data, error } = await supabase
      .from('user_agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw handleSupabaseError(error, 'updateUserAgent');
    }

    return data;
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'updateUserAgent');
  }
}

export async function deleteUserAgent(id: string, userId: string): Promise<void> {
  if (!userId) {
    throw new AgentServiceError({
      type: 'validation',
      message: 'User ID is required to delete agent.',
      retryable: false,
    });
  }

  try {
    const { error } = await supabase
      .from('user_agents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw handleSupabaseError(error, 'deleteUserAgent');
    }
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'deleteUserAgent');
  }
}

// Agent Analytics Functions
export async function fetchAgentAnalytics(
  agentId: string, 
  startDate?: string, 
  endDate?: string
): Promise<AgentAnalytics[]> {
  try {
    let query = supabase
      .from('agent_analytics')
      .select('*')
      .eq('agent_id', agentId)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw handleSupabaseError(error, 'fetchAgentAnalytics');
    }

    return data || [];
  } catch (error) {
    if (error instanceof AgentServiceError) {
      throw error;
    }
    throw handleSupabaseError(error, 'fetchAgentAnalytics');
  }
}

// Utility functions
export function getCapabilityIcons(capabilities: AgentCapabilities): string[] {
  const icons: string[] = [];
  
  if (capabilities.text?.enabled) icons.push('💬');
  if (capabilities.voice?.enabled) icons.push('🎤');
  if (capabilities.image?.enabled) icons.push('🖼️');
  if (capabilities.video?.enabled) icons.push('📹');
  
  return icons;
}

export function getCapabilityLabels(capabilities: AgentCapabilities): string[] {
  const labels: string[] = [];
  
  if (capabilities.text?.enabled) labels.push('Text');
  if (capabilities.voice?.enabled) labels.push('Voice');
  if (capabilities.image?.enabled) labels.push('Image');
  if (capabilities.video?.enabled) labels.push('Video');
  
  return labels;
}

export function formatAgentStatus(status: UserAgent['status']): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'draft':
      return { label: 'Draft', color: 'gray', icon: '📝' };
    case 'testing':
      return { label: 'Testing', color: 'yellow', icon: '🧪' };
    case 'active':
      return { label: 'Active', color: 'green', icon: '✅' };
    case 'paused':
      return { label: 'Paused', color: 'orange', icon: '⏸️' };
    case 'error':
      return { label: 'Error', color: 'red', icon: '❌' };
    default:
      return { label: 'Unknown', color: 'gray', icon: '❓' };
  }
}