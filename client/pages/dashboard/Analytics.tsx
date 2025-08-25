import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Activity,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Bot,
  Zap,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Calendar
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { 
  analyticsService,
  type ConversationMetrics,
  type AgentPerformance,
  type RealTimeMetrics,
  type ChannelAnalytics,
  type TimeSeriesData
} from '@/lib/analytics-service';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  // Analytics data state
  const [conversationMetrics, setConversationMetrics] = useState<ConversationMetrics | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [realtimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [channelAnalytics, setChannelAnalytics] = useState<ChannelAnalytics[]>([]);
  const [conversationTrends, setConversationTrends] = useState<TimeSeriesData[]>([]);
  const [responseTimeTrends, setResponseTimeTrends] = useState<TimeSeriesData[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
      // Subscribe to real-time updates
      const unsubscribe = analyticsService.subscribeToRealTimeMetrics(
        user.id,
        setRealTimeMetrics
      );
      return unsubscribe;
    }
  }, [user?.id, timeRange, selectedAgent]);

  const loadAnalytics = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const period = {
        start: new Date(Date.now() - getPeriodMs(timeRange)).toISOString(),
        end: new Date().toISOString(),
        period: timeRange as any
      };

      const [
        conversations,
        agents,
        channels,
        convTrends,
        responseTrends
      ] = await Promise.all([
        analyticsService.getConversationMetrics(user.id, { dateRange: period }),
        analyticsService.getAgentPerformance(user.id, selectedAgent === 'all' ? undefined : selectedAgent),
        analyticsService.getChannelAnalytics(user.id),
        analyticsService.getTimeSeriesData(user.id, 'conversations', period),
        analyticsService.getTimeSeriesData(user.id, 'response_time', period)
      ]);

      setConversationMetrics(conversations);
      setAgentPerformance(agents);
      setChannelAnalytics(channels);
      setConversationTrends(convTrends);
      setResponseTimeTrends(responseTrends);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodMs = (period: string): number => {
    switch (period) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const exportData = async (format: 'csv' | 'json') => {
    if (!user?.id) return;
    try {
      const blob = await analyticsService.exportAnalytics(user.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your AI agent performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      {realtimeMetrics && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>Real-time Metrics</span>
              <Badge variant="outline" className="ml-auto">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {realtimeMetrics.activeConversations}
                </div>
                <p className="text-xs text-muted-foreground">Active Chats</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {realtimeMetrics.activeUsers}
                </div>
                <p className="text-xs text-muted-foreground">Online Users</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {realtimeMetrics.responseTime}ms
                </div>
                <p className="text-xs text-muted-foreground">Response Time</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(realtimeMetrics.systemLoad * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">System Load</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {(realtimeMetrics.errorRate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Error Rate</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-600">
                  {realtimeMetrics.throughput}
                </div>
                <p className="text-xs text-muted-foreground">Throughput/min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {conversationMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(conversationMetrics.total)}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>{conversationMetrics.active} active</span>
                <span>•</span>
                <span>{conversationMetrics.completed} completed</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversationMetrics.avgResponseTime}ms</div>
              <p className="text-xs text-muted-foreground">
                {conversationMetrics.avgResponseTime < 2000 ? 'Excellent' : 'Good'} performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversationMetrics.satisfactionScore}/5</div>
              <Progress 
                value={conversationMetrics.satisfactionScore * 20} 
                className="h-2 mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(conversationMetrics.resolutionRate * 100)}%</div>
              <p className="text-xs text-muted-foreground">
                {conversationMetrics.escalated} escalations
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="channels">Channel Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversation Volume</CardTitle>
                <CardDescription>Daily conversation trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={conversationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={CHART_COLORS[0]}
                      fill={CHART_COLORS[0]}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
                <CardDescription>Average response time over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={responseTimeTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={CHART_COLORS[1]}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS[1] }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {channelAnalytics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Message volume by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalMessages" fill={CHART_COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          {agentPerformance.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agentPerformance.map((agent, index) => (
                <Card key={agent.agentId}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bot className="h-5 w-5" />
                      <span>{agent.agentName}</span>
                      <Badge variant="outline">
                        {Math.round(agent.uptime * 100)}% uptime
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Conversations</p>
                        <p className="text-2xl font-bold">{agent.totalConversations}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">{Math.round(agent.successRate * 100)}%</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Top Intents</p>
                      <div className="space-y-2">
                        {agent.topIntents.slice(0, 3).map((intent, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm">{intent.intent.replace('_', ' ')}</span>
                            <Badge variant="secondary">{intent.percentage}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channelAnalytics.map((channel, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="capitalize">{channel.channel}</CardTitle>
                  <CardDescription>
                    {formatNumber(channel.totalMessages)} messages from {formatNumber(channel.uniqueUsers)} users
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uptime</span>
                    <Badge variant={channel.uptime > 0.95 ? 'default' : 'secondary'}>
                      {Math.round(channel.uptime * 100)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Response</span>
                    <span className="text-sm font-medium">{channel.avgResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Error Rate</span>
                    <span className="text-sm font-medium text-red-600">{channel.errorRate}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Summary</CardTitle>
              <CardDescription>
                Key insights and trends from your agent performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800">🎉 Great Performance</h4>
                  <p className="text-sm text-green-700">
                    Your agents are performing well with high satisfaction scores and fast response times.
                  </p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800">📈 Growing Usage</h4>
                  <p className="text-sm text-blue-700">
                    Conversation volume has increased by 23% over the last 7 days.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-800">⚡ Optimization Opportunity</h4>
                  <p className="text-sm text-orange-700">
                    Consider enabling voice capabilities to improve user engagement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}