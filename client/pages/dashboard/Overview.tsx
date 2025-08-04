import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Bot,
  MessageSquare,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Zap,
  Phone,
  Eye,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth-context";
import { 
  fetchDashboardData, 
  type DashboardData,
  type ConversationVolumeData,
  type AgentTypeData,
  type ResponseTimeData,
  type RecentAgent 
} from "@/lib/dashboard-service";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { ChartErrorBoundary } from "@/components/ui/chart-error-boundary";

export default function DashboardOverview() {
  const [timeRange, setTimeRange] = useState("7d");
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardData(user.id);
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  // Use real data with fallbacks
  const stats = dashboardData?.stats || {
    totalAgents: 0,
    activeConversations: 0,
    totalConversations: 0,
    avgResponseTime: "0s",
    satisfactionScore: 0,
    usageThisMonth: profile?.current_usage || 0,
    usageLimit: profile?.usage_limit || 1000,
  };

  const conversationData = dashboardData?.conversationVolume || [];
  const agentTypeData = dashboardData?.agentTypes || [];
  const responseTimeData = dashboardData?.responseTimeTrends || [];
  const recentAgents = dashboardData?.recentAgents || [];

  const getAgentIcon = (type: string) => {
    switch (type) {
      case "voice":
        return <Phone className="h-4 w-4" />;
      case "vision":
        return <Eye className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "training":
        return "bg-yellow-100 text-yellow-700";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground">
            Monitor your AI agents and customer interactions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {error && (
            <Button 
              variant="outline" 
              onClick={loadDashboardData}
              disabled={loading}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              Retry
            </Button>
          )}
          <Button asChild>
            <Link to="/dashboard/agents">
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Failed to load dashboard data
                </p>
                <p className="text-sm text-red-600">
                  {error}. Please try refreshing the page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Agents
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
            ) : (
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
            )}
            <p className="text-xs text-muted-foreground">
              AI agents in your account
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
            ) : (
              <div className="text-2xl font-bold">
                {stats.activeConversations}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Currently ongoing conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
            ) : (
              <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Average agent response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
            ) : (
              <div className="text-2xl font-bold">
                {stats.totalConversations}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              All-time conversation count
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage</CardTitle>
          <CardDescription>
            {profileLoading ? (
              <div className="w-48 h-4 bg-muted animate-pulse rounded"></div>
            ) : (
              <>
                {stats.usageThisMonth.toLocaleString()} of{" "}
                {stats.usageLimit.toLocaleString()} conversations used
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="space-y-3">
              <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
              <div className="w-full h-2 bg-muted animate-pulse rounded"></div>
              <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Current usage</span>
                <span>
                  {Math.round((stats.usageThisMonth / stats.usageLimit) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${Math.min((stats.usageThisMonth / stats.usageLimit) * 100, 100)}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Plan: {profile?.plan || "starter"}</span>
                <Link
                  to="/dashboard/settings/billing"
                  className="text-primary hover:underline"
                >
                  Upgrade plan
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversation Volume</CardTitle>
            <CardDescription>
              Daily conversations over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState />
            ) : conversationData.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Start conversations with your agents to see volume trends here"
                actionText="Create Agent"
                actionHref="/dashboard/agents"
                actionIcon={Plus}
              />
            ) : (
              <ChartErrorBoundary onRetry={loadDashboardData}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={conversationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="conversations"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      stackId="2"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time Trends</CardTitle>
            <CardDescription>Average response time by hour</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState />
            ) : responseTimeData.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No response time data"
                description="Response time trends will appear here once your agents start handling conversations"
                actionText="View Agents"
                actionHref="/dashboard/agents"
                actionIcon={Bot}
              />
            ) : (
              <ChartErrorBoundary onRetry={loadDashboardData}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="time"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ fill: "#8884d8" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Distribution and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Distribution</CardTitle>
            <CardDescription>Breakdown by agent type</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState height="h-[200px]" />
            ) : agentTypeData.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No agents created"
                description="Create your first AI agent to see distribution data"
                actionText="Create Agent"
                actionHref="/dashboard/agents"
                actionIcon={Plus}
                height="h-[200px]"
              />
            ) : (
              <ChartErrorBoundary onRetry={loadDashboardData}>
                <>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={agentTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {agentTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center space-x-6 mt-4">
                    {agentTypeData.map((entry) => (
                      <div key={entry.name} className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        ></div>
                        <span className="text-sm">
                          {entry.name} ({entry.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              </ChartErrorBoundary>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Agents</CardTitle>
                <CardDescription>Your most active AI agents</CardDescription>
              </div>
              <Link to="/dashboard/agents">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState height="h-[200px]" />
            ) : recentAgents.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No agents yet"
                description="Create your first AI agent to get started"
                actionText="Create Agent"
                actionHref="/dashboard/agents"
                actionIcon={Plus}
                height="h-[200px]"
              />
            ) : (
              <div className="space-y-4">
                {recentAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        {getAgentIcon(agent.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={getStatusColor(agent.status)}
                          >
                            {agent.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {agent.conversations} conversations
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {agent.lastActive}
                      </p>
                      <div className="flex items-center space-x-1">
                        <Activity className={`h-3 w-3 ${agent.status === 'active' ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className={`text-xs ${agent.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                          {agent.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/dashboard/agents">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Create New Agent</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up a new AI agent
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link to="/dashboard/integrations">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Add Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect external platforms
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link to="/dashboard/team">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Invite Team</h3>
                    <p className="text-sm text-muted-foreground">
                      Add team members
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
