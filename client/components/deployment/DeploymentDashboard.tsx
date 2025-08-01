/**
 * Deployment Dashboard
 * Main dashboard for managing agent deployments
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  BarChart3, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Users,
  Globe
} from 'lucide-react';
import DeploymentManager, { AgentDeployment, DeploymentStatus, HealthStatus } from '../../lib/deployment-manager';
import { useAuth } from '../../hooks/useAuth';

interface DeploymentDashboardProps {
  className?: string;
}

export const DeploymentDashboard: React.FC<DeploymentDashboardProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [deployments, setDeployments] = useState<AgentDeployment[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<AgentDeployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const deploymentManager = DeploymentManager.getInstance();

  useEffect(() => {
    if (user) {
      loadDeployments();
    }
  }, [user]);

  const loadDeployments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userDeployments = await deploymentManager.getUserDeployments(user.id);
      setDeployments(userDeployments);
      
      if (userDeployments.length > 0 && !selectedDeployment) {
        setSelectedDeployment(userDeployments[0]);
      }
    } catch (error) {
      console.error('Failed to load deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshDeployments = async () => {
    setRefreshing(true);
    await loadDeployments();
    setRefreshing(false);
  };

  const handleDeploymentAction = async (deploymentId: string, action: 'start' | 'stop' | 'terminate') => {
    try {
      let success = false;
      
      switch (action) {
        case 'start':
          success = await deploymentManager.startDeployment(deploymentId);
          break;
        case 'stop':
          success = await deploymentManager.stopDeployment(deploymentId);
          break;
        case 'terminate':
          success = await deploymentManager.terminateDeployment(deploymentId);
          break;
      }

      if (success) {
        await refreshDeployments();
      }
    } catch (error) {
      console.error(`Failed to ${action} deployment:`, error);
    }
  };

  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'deploying':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'terminated':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthIcon = (health: HealthStatus) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'deploying':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'terminated':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const formatResponseTime = (time: number) => {
    return `${Math.round(time)}ms`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="text-gray-600">Manage and monitor your agent deployments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={refreshDeployments}
            disabled={refreshing}
          >
            <Activity className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        </div>
      </div>

      {deployments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deployments yet</h3>
            <p className="text-gray-600 text-center mb-6">
              Create your first deployment to start serving your agents to users.
            </p>
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              Create Deployment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deployments List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Your Deployments</CardTitle>
                <CardDescription>
                  {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {deployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className={`p-4 cursor-pointer border-l-4 hover:bg-gray-50 ${
                        selectedDeployment?.id === deployment.id
                          ? 'bg-blue-50 border-l-blue-500'
                          : 'border-l-transparent'
                      }`}
                      onClick={() => setSelectedDeployment(deployment)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{deployment.name}</h4>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(deployment.status)}
                          {getHealthIcon(deployment.healthStatus)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={getStatusColor(deployment.status)}>
                          {deployment.status}
                        </Badge>
                        <span className="text-gray-500">
                          {formatUptime(deployment.metrics.uptime)}
                        </span>
                      </div>
                      {deployment.description && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {deployment.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deployment Details */}
          <div className="lg:col-span-2">
            {selectedDeployment ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* Status Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{selectedDeployment.name}</span>
                            {getStatusIcon(selectedDeployment.status)}
                          </CardTitle>
                          <CardDescription>
                            {selectedDeployment.description || 'No description'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          {selectedDeployment.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeploymentAction(selectedDeployment.id, 'stop')}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                          )}
                          {selectedDeployment.status === 'paused' && (
                            <Button
                              size="sm"
                              onClick={() => handleDeploymentAction(selectedDeployment.id, 'start')}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Resume
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatUptime(selectedDeployment.metrics.uptime)}
                          </div>
                          <div className="text-sm text-gray-600">Uptime</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {formatResponseTime(selectedDeployment.metrics.responseTime)}
                          </div>
                          <div className="text-sm text-gray-600">Response Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedDeployment.metrics.requestCount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">Requests</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {selectedDeployment.metrics.activeConnections}
                          </div>
                          <div className="text-sm text-gray-600">Active Users</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Endpoints Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Endpoints</CardTitle>
                      <CardDescription>
                        Available endpoints for this deployment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedDeployment.endpoints.map((endpoint, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {endpoint.type.toUpperCase()} {endpoint.method || ''}
                              </div>
                              <div className="text-sm text-gray-600 font-mono">
                                {endpoint.url}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {endpoint.authentication || 'none'}
                              </Badge>
                              <Button variant="outline" size="sm">
                                Copy
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Channels Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Channels</CardTitle>
                      <CardDescription>
                        Communication channels configured for this deployment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedDeployment.channelConfigs.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          No channels configured
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedDeployment.channelConfigs.map((channel, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  channel.enabled ? 'bg-green-500' : 'bg-gray-300'
                                }`} />
                                <div>
                                  <div className="font-medium">{channel.name}</div>
                                  <div className="text-sm text-gray-600 capitalize">
                                    {channel.type}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={channel.enabled ? 'default' : 'secondary'}>
                                {channel.enabled ? 'Active' : 'Disabled'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                      <CardDescription>
                        Real-time performance data for your deployment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">CPU Usage</span>
                              <span className="text-sm text-gray-600">
                                {selectedDeployment.metrics.cpuUsage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${selectedDeployment.metrics.cpuUsage}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Memory Usage</span>
                              <span className="text-sm text-gray-600">
                                {selectedDeployment.metrics.memoryUsage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${selectedDeployment.metrics.memoryUsage}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Error Rate</span>
                              <span className="text-sm text-gray-600">
                                {selectedDeployment.metrics.errorRate.toFixed(2)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-red-600 h-2 rounded-full"
                                style={{ width: `${Math.min(selectedDeployment.metrics.errorRate, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {selectedDeployment.metrics.requestCount.toLocaleString()}
                            </div>
                            <div className="text-sm text-blue-600">Total Requests</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {formatResponseTime(selectedDeployment.metrics.responseTime)}
                            </div>
                            <div className="text-sm text-green-600">Avg Response Time</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {selectedDeployment.metrics.activeConnections}
                            </div>
                            <div className="text-sm text-purple-600">Active Connections</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Logs</CardTitle>
                      <CardDescription>
                        Latest log entries from your deployment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="flex items-start space-x-3 p-2 bg-green-50 rounded">
                          <span className="text-green-600 font-medium">INFO</span>
                          <span className="text-gray-500">2024-01-31 10:30:15</span>
                          <span>Deployment health check passed</span>
                        </div>
                        <div className="flex items-start space-x-3 p-2 bg-blue-50 rounded">
                          <span className="text-blue-600 font-medium">INFO</span>
                          <span className="text-gray-500">2024-01-31 10:29:45</span>
                          <span>Processing user request: chat message</span>
                        </div>
                        <div className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                          <span className="text-gray-600 font-medium">DEBUG</span>
                          <span className="text-gray-500">2024-01-31 10:29:30</span>
                          <span>Agent response generated in 245ms</span>
                        </div>
                        <div className="flex items-start space-x-3 p-2 bg-green-50 rounded">
                          <span className="text-green-600 font-medium">INFO</span>
                          <span className="text-gray-500">2024-01-31 10:28:12</span>
                          <span>New user connection established</span>
                        </div>
                      </div>
                      <div className="mt-4 text-center">
                        <Button variant="outline">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View All Logs
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Deployment Settings</CardTitle>
                      <CardDescription>
                        Configure your deployment settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium mb-2">Environment</h4>
                          <Badge>{selectedDeployment.deploymentConfig.environment}</Badge>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Scaling Configuration</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Min Instances:</span>
                              <span className="ml-2 font-medium">
                                {selectedDeployment.deploymentConfig.scaling?.minInstances || 1}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Max Instances:</span>
                              <span className="ml-2 font-medium">
                                {selectedDeployment.deploymentConfig.scaling?.maxInstances || 3}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Auto Scale:</span>
                              <span className="ml-2 font-medium">
                                {selectedDeployment.deploymentConfig.scaling?.autoScale ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Target CPU:</span>
                              <span className="ml-2 font-medium">
                                {selectedDeployment.deploymentConfig.scaling?.targetCPU || 70}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <Button>
                            <Settings className="h-4 w-4 mr-2" />
                            Edit Settings
                          </Button>
                          <Button variant="outline">
                            Export Config
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a deployment
                    </h3>
                    <p className="text-gray-600">
                      Choose a deployment from the list to view its details
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentDashboard;