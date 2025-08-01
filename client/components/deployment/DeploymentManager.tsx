import React, { useState, useEffect } from 'react';
import { 
  AgentDeployment, 
  DeploymentConfiguration, 
  ChannelConfiguration,
  agentDeploymentService 
} from '@/lib/agent-deployment-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play,
  Pause,
  Square,
  Settings,
  Activity,
  Globe,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  Eye,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeploymentManagerProps {
  userId: string;
  onDeploymentSelect?: (deployment: AgentDeployment) => void;
  className?: string;
}

export default function DeploymentManager({
  userId,
  onDeploymentSelect,
  className
}: DeploymentManagerProps) {
  const [deployments, setDeployments] = useState<AgentDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState<AgentDeployment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDeployments();
    
    // Set up auto-refresh
    const interval = setInterval(loadDeployments, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [userId]);

  const loadDeployments = async () => {
    try {
      if (!isLoading) setIsRefreshing(true);
      
      const userDeployments = await agentDeploymentService.getUserDeployments(userId);
      setDeployments(userDeployments);
    } catch (error) {
      console.error('Failed to load deployments:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handlePauseDeployment = async (deploymentId: string) => {
    const success = await agentDeploymentService.pauseDeployment(deploymentId);
    if (success) {
      await loadDeployments();
    }
  };

  const handleResumeDeployment = async (deploymentId: string) => {
    const success = await agentDeploymentService.resumeDeployment(deploymentId);
    if (success) {
      await loadDeployments();
    }
  };

  const handleTerminateDeployment = async (deploymentId: string) => {
    if (confirm('Are you sure you want to terminate this deployment? This action cannot be undone.')) {
      const success = await agentDeploymentService.terminateDeployment(deploymentId);
      if (success) {
        await loadDeployments();
      }
    }
  };

  const getStatusColor = (status: AgentDeployment['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'deploying': return 'text-blue-600 bg-blue-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'updating': return 'text-purple-600 bg-purple-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'terminated': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatusIcon = (healthStatus: AgentDeployment['healthStatus']) => {
    switch (healthStatus) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'production': return 'text-red-700 bg-red-100';
      case 'staging': return 'text-yellow-700 bg-yellow-100';
      case 'development': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deployments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Deployments</h2>
          <p className="text-gray-600">
            Manage and monitor your deployed AI agents
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadDeployments}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          
          <Button>
            <Play className="w-4 h-4 mr-2" />
            New Deployment
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {deployments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deployments</p>
                <p className="text-2xl font-bold">{deployments.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">
                  {deployments.filter(d => d.status === 'active').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Issues</p>
                <p className="text-2xl font-bold">
                  {deployments.filter(d => d.healthStatus === 'warning' || d.healthStatus === 'error').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">
                  {deployments.reduce((sum, d) => sum + d.metrics.totalRequests, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Deployments List */}
      {deployments.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Globe className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deployments yet</h3>
          <p className="text-gray-600 mb-6">
            Deploy your first AI agent to start serving users
          </p>
          <Button>
            <Play className="w-4 h-4 mr-2" />
            Create First Deployment
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {deployments.map(deployment => (
            <Card key={deployment.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">
                        {deployment.name}
                      </h3>
                      {getHealthStatusIcon(deployment.healthStatus)}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {deployment.description || 'No description provided'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={cn('text-xs', getStatusColor(deployment.status))}>
                      {deployment.status}
                    </Badge>
                    <Badge className={cn('text-xs', getEnvironmentColor(deployment.deploymentConfig.environment))}>
                      {deployment.deploymentConfig.environment}
                    </Badge>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 py-3 border-y border-gray-100">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Uptime</p>
                    <p className="font-semibold">
                      {formatUptime(deployment.metrics.uptime)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Requests</p>
                    <p className="font-semibold">
                      {deployment.metrics.totalRequests.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Success Rate</p>
                    <p className="font-semibold">
                      {deployment.metrics.totalRequests > 0 
                        ? `${(100 - deployment.metrics.errorRate).toFixed(1)}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>

                {/* Channels */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Active Channels</p>
                  <div className="flex flex-wrap gap-1">
                    {deployment.channelConfigs.filter(c => c.enabled).map(channel => (
                      <Badge key={channel.id} variant="outline" className="text-xs">
                        {channel.name}
                      </Badge>
                    ))}
                    {deployment.channelConfigs.filter(c => c.enabled).length === 0 && (
                      <span className="text-xs text-gray-400">No active channels</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {deployment.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePauseDeployment(deployment.id)}
                      >
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    )}
                    
                    {deployment.status === 'paused' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeDeployment(deployment.id)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Resume
                      </Button>
                    )}
                    
                    {(deployment.status === 'active' || deployment.status === 'paused') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTerminateDeployment(deployment.id)}
                      >
                        <Square className="w-3 h-3 mr-1" />
                        Terminate
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDeployment(deployment);
                        onDeploymentSelect?.(deployment);
                      }}
                    >
                      <BarChart3 className="w-3 h-3 mr-1" />
                      Metrics
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDeployment(deployment);
                        onDeploymentSelect?.(deployment);
                      }}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Configure
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDeployment(deployment);
                        onDeploymentSelect?.(deployment);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>

                {/* Error Details */}
                {deployment.errorDetails && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          {deployment.errorDetails.errorType}
                        </p>
                        <p className="text-xs text-red-700">
                          {deployment.errorDetails.errorMessage}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {new Date(deployment.errorDetails.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Last Activity */}
                <div className="text-xs text-gray-500">
                  {deployment.lastActive ? (
                    <>Last active: {new Date(deployment.lastActive).toLocaleString()}</>
                  ) : deployment.deployedAt ? (
                    <>Deployed: {new Date(deployment.deployedAt).toLocaleString()}</>
                  ) : (
                    <>Created: {new Date(deployment.createdAt).toLocaleString()}</>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}