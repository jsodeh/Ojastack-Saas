import { supabase } from './supabase';

export interface DashboardStats {
  totalAgents: number;
  activeConversations: number;
  totalConversations: number;
  avgResponseTime: string;
  satisfactionScore: number;
  usageThisMonth: number;
  usageLimit: number;
}

export interface ConversationVolumeData {
  date: string;
  conversations: number;
  resolved: number;
}

export interface AgentTypeData {
  name: string;
  value: number;
  color: string;
}

export interface ResponseTimeData {
  hour: string;
  time: number;
}

export interface RecentAgent {
  id: string;
  name: string;
  type: 'chat' | 'voice' | 'multimodal';
  status: 'active' | 'inactive' | 'training';
  conversations: number;
  lastActive: string;
}

export interface DashboardData {
  stats: DashboardStats;
  conversationVolume: ConversationVolumeData[];
  agentTypes: AgentTypeData[];
  responseTimeTrends: ResponseTimeData[];
  recentAgents: RecentAgent[];
}

/**
 * Fetch dashboard statistics from the database
 */
export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  try {
    // Fetch agents count
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, status')
      .eq('user_id', userId);

    if (agentsError) throw agentsError;

    // Fetch conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, status, created_at, response_time')
      .eq('user_id', userId);

    if (conversationsError) throw conversationsError;

    // Calculate stats
    const totalAgents = agents?.length || 0;
    const totalConversations = conversations?.length || 0;
    const activeConversations = conversations?.filter(c => c.status === 'active').length || 0;
    
    // Calculate average response time
    const responseTimes = conversations?.filter(c => c.response_time).map(c => c.response_time) || [];
    const avgResponseTimeMs = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    const avgResponseTime = avgResponseTimeMs > 0 ? `${(avgResponseTimeMs / 1000).toFixed(1)}s` : '0s';

    // Get current month usage from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_usage, usage_limit')
      .eq('id', userId)
      .single();

    return {
      totalAgents,
      activeConversations,
      totalConversations,
      avgResponseTime,
      satisfactionScore: 0, // TODO: Implement satisfaction scoring
      usageThisMonth: profile?.current_usage || 0,
      usageLimit: profile?.usage_limit || 1000,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalAgents: 0,
      activeConversations: 0,
      totalConversations: 0,
      avgResponseTime: '0s',
      satisfactionScore: 0,
      usageThisMonth: 0,
      usageLimit: 1000,
    };
  }
}

/**
 * Fetch conversation volume data for the last 7 days
 */
export async function fetchConversationVolume(userId: string): Promise<ConversationVolumeData[]> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('created_at, status')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Group conversations by date
    const volumeMap = new Map<string, { conversations: number; resolved: number }>();
    
    conversations.forEach(conv => {
      const date = new Date(conv.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!volumeMap.has(date)) {
        volumeMap.set(date, { conversations: 0, resolved: 0 });
      }
      
      const data = volumeMap.get(date)!;
      data.conversations++;
      if (conv.status === 'resolved' || conv.status === 'completed') {
        data.resolved++;
      }
    });

    return Array.from(volumeMap.entries()).map(([date, data]) => ({
      date,
      conversations: data.conversations,
      resolved: data.resolved,
    }));
  } catch (error) {
    console.error('Error fetching conversation volume:', error);
    return [];
  }
}

/**
 * Fetch agent type distribution
 */
export async function fetchAgentTypeDistribution(userId: string): Promise<AgentTypeData[]> {
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('type')
      .eq('user_id', userId);

    if (error) throw error;

    if (!agents || agents.length === 0) {
      return [];
    }

    // Count agents by type
    const typeCounts = agents.reduce((acc, agent) => {
      const type = agent.type || 'chat';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      chat: '#8884d8',
      voice: '#82ca9d',
      multimodal: '#ffc658',
    };

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: colors[type as keyof typeof colors] || '#8884d8',
    }));
  } catch (error) {
    console.error('Error fetching agent type distribution:', error);
    return [];
  }
}

/**
 * Fetch response time trends by hour
 */
export async function fetchResponseTimeTrends(userId: string): Promise<ResponseTimeData[]> {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('created_at, response_time')
      .eq('user_id', userId)
      .gte('created_at', oneDayAgo.toISOString())
      .not('response_time', 'is', null);

    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Group by hour and calculate average response time
    const hourlyData = new Map<string, { times: number[]; count: number }>();

    conversations.forEach(conv => {
      const hour = new Date(conv.created_at).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, { times: [], count: 0 });
      }
      
      const data = hourlyData.get(hourKey)!;
      data.times.push(conv.response_time);
      data.count++;
    });

    return Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      time: data.times.reduce((sum, time) => sum + time, 0) / data.times.length / 1000, // Convert to seconds
    })).sort((a, b) => a.hour.localeCompare(b.hour));
  } catch (error) {
    console.error('Error fetching response time trends:', error);
    return [];
  }
}

/**
 * Fetch recent agents
 */
export async function fetchRecentAgents(userId: string, limit: number = 5): Promise<RecentAgent[]> {
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        type,
        status,
        updated_at,
        conversations!inner(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!agents || agents.length === 0) {
      return [];
    }

    return agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type || 'chat',
      status: agent.status || 'inactive',
      conversations: Array.isArray(agent.conversations) ? agent.conversations.length : 0,
      lastActive: formatLastActive(agent.updated_at),
    }));
  } catch (error) {
    console.error('Error fetching recent agents:', error);
    return [];
  }
}

/**
 * Format last active time
 */
function formatLastActive(timestamp: string): string {
  const now = new Date();
  const lastActive = new Date(timestamp);
  const diffMs = now.getTime() - lastActive.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Fetch all dashboard data
 */
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const [stats, conversationVolume, agentTypes, responseTimeTrends, recentAgents] = await Promise.all([
    fetchDashboardStats(userId),
    fetchConversationVolume(userId),
    fetchAgentTypeDistribution(userId),
    fetchResponseTimeTrends(userId),
    fetchRecentAgents(userId),
  ]);

  return {
    stats,
    conversationVolume,
    agentTypes,
    responseTimeTrends,
    recentAgents,
  };
}