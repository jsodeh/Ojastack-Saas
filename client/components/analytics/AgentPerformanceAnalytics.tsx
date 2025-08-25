import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot,
  Clock,
  MessageSquare,
  TrendingUp,
  Target,
  Users,
  Activity,
  Star,
  AlertCircle,
  CheckCircle,
  Timer,
  BarChart3,
  Trophy,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface AgentPerformance {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  metrics: {
    totalConversations: number;
    avgResponseTime: number;
    satisfactionScore: number;
    resolutionRate: number;
    activeConversations: number;
    hoursWorked: number;
  };
  trends: {
    conversationsToday: number;
    conversationsYesterday: number;
    responseTimeTrend: number;
    satisfactionTrend: number;
  };
  skills: Array<{
    name: string;
    level: number;
    confidence: number;
  }>;
  performance: {
    rank: number;
    score: number;
    strengths: string[];
    improvements: string[];
  };
}

interface PerformanceOverview {
  totalAgents: number;
  activeAgents: number;
  topPerformer: string;
  averageScore: number;
  totalConversations: number;
  avgResponseTime: number;
  satisfactionScore: number;
}

const StatusIndicator = ({ status }: { status: AgentPerformance['status'] }) => {
  const colors = {
    online: 'bg-green-500',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500'
  };
  
  return (
    <div className={cn("w-3 h-3 rounded-full", colors[status])} />
  );
};

const ScoreCard = ({ 
  label, 
  value, 
  trend, 
  icon, 
  color = "blue" 
}: {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color?: string;
}) => (
  <div className="flex items-center justify-between p-4 border rounded-lg">
    <div className="flex items-center space-x-3">
      <div className={cn(
        "p-2 rounded-full",
        color === "blue" && "bg-blue-100 text-blue-600",
        color === "green" && "bg-green-100 text-green-600",
        color === "orange" && "bg-orange-100 text-orange-600",
        color === "purple" && "bg-purple-100 text-purple-600"
      )}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
    {trend !== undefined && (
      <div className={cn(
        "text-sm font-medium",
        trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-600"
      )}>
        {trend > 0 && "+"}{trend}%
      </div>
    )}
  </div>
);

export default function AgentPerformanceAnalytics() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'conversations' | 'satisfaction'>('score');

  // Fetch agent performance data
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agent-performance', selectedTimeRange],
    queryFn: async (): Promise<AgentPerformance[]> => {
      // Mock data - replace with actual API call
      return [
        {
          id: '1',
          name: 'Sarah Wilson',
          avatar: undefined,
          status: 'online',
          metrics: {
            totalConversations: 234,
            avgResponseTime: 1.8,
            satisfactionScore: 4.8,
            resolutionRate: 96.2,
            activeConversations: 3,
            hoursWorked: 32.5
          },
          trends: {
            conversationsToday: 18,
            conversationsYesterday: 15,
            responseTimeTrend: -12,
            satisfactionTrend: 8
          },
          skills: [
            { name: 'Customer Service', level: 95, confidence: 0.92 },
            { name: 'Technical Support', level: 88, confidence: 0.87 },
            { name: 'Sales', level: 76, confidence: 0.73 }
          ],
          performance: {
            rank: 1,
            score: 94,
            strengths: ['Fast response times', 'High customer satisfaction', 'Problem solving'],
            improvements: ['Product knowledge', 'Cross-selling techniques']
          }
        },
        {
          id: '2',
          name: 'Mike Johnson',
          avatar: undefined,
          status: 'busy',
          metrics: {
            totalConversations: 198,
            avgResponseTime: 2.3,
            satisfactionScore: 4.5,
            resolutionRate: 91.8,
            activeConversations: 5,
            hoursWorked: 28.0
          },
          trends: {
            conversationsToday: 22,
            conversationsYesterday: 19,
            responseTimeTrend: 5,
            satisfactionTrend: -2
          },
          skills: [
            { name: 'Technical Support', level: 92, confidence: 0.89 },
            { name: 'Customer Service', level: 84, confidence: 0.81 },
            { name: 'Training', level: 79, confidence: 0.75 }
          ],
          performance: {
            rank: 2,
            score: 87,
            strengths: ['Technical expertise', 'Complex problem resolution'],
            improvements: ['Response time', 'Communication clarity']
          }
        },
        {
          id: '3',
          name: 'Emily Chen',
          avatar: undefined,
          status: 'online',
          metrics: {
            totalConversations: 167,
            avgResponseTime: 2.1,
            satisfactionScore: 4.6,
            resolutionRate: 93.4,
            activeConversations: 2,
            hoursWorked: 24.5
          },
          trends: {
            conversationsToday: 14,
            conversationsYesterday: 12,
            responseTimeTrend: -8,
            satisfactionTrend: 12
          },
          skills: [
            { name: 'Sales', level: 89, confidence: 0.86 },
            { name: 'Customer Service', level: 82, confidence: 0.79 },
            { name: 'Lead Generation', level: 85, confidence: 0.83 }
          ],
          performance: {
            rank: 3,
            score: 85,
            strengths: ['Sales conversion', 'Customer relationship building'],
            improvements: ['Technical knowledge', 'Multi-tasking']
          }
        }
      ];
    }
  });

  // Fetch performance overview
  const { data: overview } = useQuery({
    queryKey: ['performance-overview', selectedTimeRange],
    queryFn: async (): Promise<PerformanceOverview> => {
      return {
        totalAgents: agents?.length || 0,
        activeAgents: agents?.filter(a => a.status === 'online' || a.status === 'busy').length || 0,
        topPerformer: agents?.find(a => a.performance.rank === 1)?.name || 'N/A',
        averageScore: agents?.reduce((acc, a) => acc + a.performance.score, 0) / (agents?.length || 1) || 0,
        totalConversations: agents?.reduce((acc, a) => acc + a.metrics.totalConversations, 0) || 0,
        avgResponseTime: agents?.reduce((acc, a) => acc + a.metrics.avgResponseTime, 0) / (agents?.length || 1) || 0,
        satisfactionScore: agents?.reduce((acc, a) => acc + a.metrics.satisfactionScore, 0) / (agents?.length || 1) || 0
      };
    },
    enabled: !!agents
  });

  const sortedAgents = agents?.sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.performance.score - a.performance.score;
      case 'conversations':
        return b.metrics.totalConversations - a.metrics.totalConversations;
      case 'satisfaction':
        return b.metrics.satisfactionScore - a.metrics.satisfactionScore;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Agent Performance</h3>
          <p className="text-muted-foreground">
            Track and analyze individual agent performance and team metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy as any}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Performance Score</SelectItem>
              <SelectItem value="conversations">Conversations</SelectItem>
              <SelectItem value="satisfaction">Satisfaction</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard
            label="Total Agents"
            value={overview.totalAgents}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <ScoreCard
            label="Active Now"
            value={overview.activeAgents}
            icon={<Activity className="w-5 h-5" />}
            color="green"
          />
          <ScoreCard
            label="Top Performer"
            value={overview.topPerformer}
            icon={<Trophy className="w-5 h-5" />}
            color="orange"
          />
          <ScoreCard
            label="Avg Performance"
            value={`${overview.averageScore.toFixed(1)}%`}
            icon={<Target className="w-5 h-5" />}
            color="purple"
          />
        </div>
      )}

      {/* Agent Performance List */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Ranking</CardTitle>
          <CardDescription>
            Individual agent metrics and performance scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedAgents && sortedAgents.length > 0 ? (
            <div className="space-y-4">
              {sortedAgents.map((agent) => (
                <Card key={agent.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback>
                            {agent.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          <StatusIndicator status={agent.status} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{agent.name}</h4>
                          <Badge variant="outline">#{agent.performance.rank}</Badge>
                          {agent.performance.rank === 1 && (
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{agent.status}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {agent.performance.score}%
                      </div>
                      <p className="text-sm text-muted-foreground">Performance Score</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{agent.metrics.totalConversations}</div>
                      <div className="text-xs text-muted-foreground">Conversations</div>
                      <div className={cn(
                        "text-xs font-medium",
                        agent.trends.conversationsToday > agent.trends.conversationsYesterday ? "text-green-600" : "text-red-600"
                      )}>
                        {agent.trends.conversationsToday > agent.trends.conversationsYesterday ? "+" : ""}
                        {((agent.trends.conversationsToday - agent.trends.conversationsYesterday) / agent.trends.conversationsYesterday * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-semibold">{agent.metrics.avgResponseTime}min</div>
                      <div className="text-xs text-muted-foreground">Avg Response</div>
                      <div className={cn(
                        "text-xs font-medium",
                        agent.trends.responseTimeTrend < 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {agent.trends.responseTimeTrend > 0 ? "+" : ""}{agent.trends.responseTimeTrend}%
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-semibold">{agent.metrics.satisfactionScore}</div>
                      <div className="text-xs text-muted-foreground">CSAT Score</div>
                      <div className={cn(
                        "text-xs font-medium",
                        agent.trends.satisfactionTrend > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {agent.trends.satisfactionTrend > 0 ? "+" : ""}{agent.trends.satisfactionTrend}%
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-semibold">{agent.metrics.resolutionRate}%</div>
                      <div className="text-xs text-muted-foreground">Resolution Rate</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm mb-2">Top Skills</h5>
                        <div className="space-y-1">
                          {agent.skills.slice(0, 2).map((skill) => (
                            <div key={skill.name} className="flex items-center justify-between text-sm">
                              <span>{skill.name}</span>
                              <div className="flex items-center gap-2">
                                <Progress value={skill.level} className="w-16 h-2" />
                                <span className="text-xs w-8">{skill.level}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex-1 ml-6">
                        <h5 className="font-medium text-sm mb-2">Strengths</h5>
                        <div className="flex flex-wrap gap-1">
                          {agent.performance.strengths.slice(0, 2).map((strength, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No agent data available</h3>
              <p className="text-muted-foreground">
                Agent performance data will appear here once agents start handling conversations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}