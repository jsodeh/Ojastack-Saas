import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown,
  MessageSquare, 
  Users, 
  Clock,
  Activity,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Target,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  conversations: {
    total: number;
    today: number;
    active: number;
    resolved: number;
    averageResponseTime: number;
    satisfactionScore: number;
  };
  agents: {
    totalAgents: number;
    activeAgents: number;
    averageHandleTime: number;
    busyAgents: number;
  };
  trends: {
    conversationTrend: Array<{ date: string; count: number; }>;
    responseTrend: Array<{ date: string; time: number; }>;
    satisfactionTrend: Array<{ date: string; score: number; }>;
  };
  channels: Array<{
    name: string;
    conversations: number;
    percentage: number;
    color: string;
  }>;
  performance: {
    resolutionRate: number;
    firstResponseTime: number;
    escalationRate: number;
    customerSatisfaction: number;
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  trend,
  description
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center text-xs",
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
        )}>
          {trend === 'up' ? <ArrowUp className="w-3 h-3 mr-1" /> : 
           trend === 'down' ? <ArrowDown className="w-3 h-3 mr-1" /> : null}
          {Math.abs(change)}% from last period
        </div>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

export default function RealTimeDashboardAnalytics() {
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', timeRange, selectedAgent],
    queryFn: async (): Promise<AnalyticsData> => {
      // Mock analytics data - in real app, this would fetch from API
      return {
        conversations: {
          total: 1247,
          today: 89,
          active: 23,
          resolved: 66,
          averageResponseTime: 2.3,
          satisfactionScore: 4.6
        },
        agents: {
          totalAgents: 5,
          activeAgents: 3,
          averageHandleTime: 8.5,
          busyAgents: 1
        },
        trends: {
          conversationTrend: Array.from({ length: 24 }, (_, i) => ({
            date: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
            count: Math.floor(Math.random() * 20) + 5
          })),
          responseTrend: Array.from({ length: 24 }, (_, i) => ({
            date: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
            time: Math.random() * 5 + 1
          })),
          satisfactionTrend: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
            score: Math.random() * 1 + 4
          }))
        },
        channels: [
          { name: 'Web Chat', conversations: 456, percentage: 36.5, color: '#3b82f6' },
          { name: 'WhatsApp', conversations: 387, percentage: 31.0, color: '#25d366' },
          { name: 'Slack', conversations: 234, percentage: 18.8, color: '#4a154b' },
          { name: 'API', conversations: 170, percentage: 13.6, color: '#f59e0b' }
        ],
        performance: {
          resolutionRate: 94.2,
          firstResponseTime: 1.8,
          escalationRate: 5.8,
          customerSatisfaction: 4.6
        }
      };
    },
    refetchInterval: autoRefresh ? 30000 : false
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Real-time Analytics</h3>
          <p className="text-muted-foreground">
            Monitor your agent performance and conversation metrics in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", autoRefresh && "animate-spin")} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Conversations"
              value={analytics.conversations.total.toLocaleString()}
              change={12.5}
              trend="up"
              icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
              description={`${analytics.conversations.today} today`}
            />
            <MetricCard
              title="Active Conversations"
              value={analytics.conversations.active}
              change={-3.2}
              trend="down"
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              description={`${analytics.conversations.resolved} resolved today`}
            />
            <MetricCard
              title="Avg Response Time"
              value={`${analytics.conversations.averageResponseTime}min`}
              change={-8.4}
              trend="up"
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              description="Within SLA target"
            />
            <MetricCard
              title="Satisfaction Score"
              value={analytics.conversations.satisfactionScore.toFixed(1)}
              change={5.7}
              trend="up"
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
              description="Out of 5.0"
            />
          </div>

          {/* Charts and Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversation Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Conversation Volume
                </CardTitle>
                <CardDescription>Conversations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Chart visualization would be rendered here</p>
                    <p className="text-sm">Using libraries like Recharts or Chart.js</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Channel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Channel Distribution
                </CardTitle>
                <CardDescription>Conversations by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.channels.map((channel, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: channel.color }}
                        />
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{channel.conversations}</div>
                        <div className="text-sm text-muted-foreground">{channel.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {analytics.performance.resolutionRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Resolution Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {analytics.performance.firstResponseTime}min
                  </div>
                  <div className="text-sm text-muted-foreground">First Response</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {analytics.performance.escalationRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Escalation Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {analytics.performance.customerSatisfaction}
                  </div>
                  <div className="text-sm text-muted-foreground">CSAT Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}