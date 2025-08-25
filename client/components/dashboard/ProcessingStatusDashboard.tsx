import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  FileText,
  Upload,
  Zap,
  Database,
  Activity,
  TrendingUp,
  AlertTriangle,
  Pause,
  Play,
  Square,
  MoreHorizontal,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProcessingJob {
  id: string;
  type: 'document_upload' | 'knowledge_base_sync' | 'agent_training' | 'workflow_execution' | 'integration_sync';
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  currentStep?: string;
  totalSteps?: number;
  currentStepIndex?: number;
  metadata?: {
    fileSize?: number;
    fileName?: string;
    processingOptions?: any;
    errorMessage?: string;
    warnings?: string[];
    outputSize?: number;
    tokensProcessed?: number;
    chunksCreated?: number;
  };
  resourceUsage?: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'error';
  services: {
    database: 'healthy' | 'degraded' | 'down';
    fileStorage: 'healthy' | 'degraded' | 'down';
    aiProcessing: 'healthy' | 'degraded' | 'down';
    webhooks: 'healthy' | 'degraded' | 'down';
  };
  metrics: {
    activeJobs: number;
    queueLength: number;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  };
}

export default function ProcessingStatusDashboard() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(5000); // 5 seconds

  const queryClient = useQueryClient();

  // Fetch processing jobs
  const { data: processingJobs, isLoading } = useQuery({
    queryKey: ['processing-jobs', selectedFilter],
    queryFn: async () => {
      // This would typically fetch from your processing status API
      // For now, we'll simulate with static data
      const mockJobs: ProcessingJob[] = [
        {
          id: '1',
          type: 'document_upload',
          name: 'Processing product-manual.pdf',
          status: 'running',
          progress: 65,
          startedAt: new Date(Date.now() - 2 * 60 * 1000),
          currentStep: 'Generating embeddings',
          totalSteps: 5,
          currentStepIndex: 3,
          metadata: {
            fileName: 'product-manual.pdf',
            fileSize: 2.5 * 1024 * 1024,
            tokensProcessed: 15420,
            chunksCreated: 23
          },
          resourceUsage: {
            cpu: 45,
            memory: 67,
            storage: 12
          }
        },
        {
          id: '2',
          type: 'knowledge_base_sync',
          name: 'Syncing Customer Support KB',
          status: 'completed',
          progress: 100,
          startedAt: new Date(Date.now() - 10 * 60 * 1000),
          completedAt: new Date(Date.now() - 5 * 60 * 1000),
          metadata: {
            tokensProcessed: 45600,
            chunksCreated: 89,
            outputSize: 1.2 * 1024 * 1024
          }
        },
        {
          id: '3',
          type: 'agent_training',
          name: 'Training Sales Assistant Agent',
          status: 'failed',
          progress: 30,
          startedAt: new Date(Date.now() - 15 * 60 * 1000),
          metadata: {
            errorMessage: 'Insufficient training data provided',
            warnings: ['Low confidence scores detected', 'Missing persona configuration']
          }
        },
        {
          id: '4',
          type: 'workflow_execution',
          name: 'Customer Onboarding Workflow',
          status: 'pending',
          progress: 0,
          startedAt: new Date(),
          currentStep: 'Waiting for resources',
          metadata: {}
        }
      ];

      // Apply filter
      if (selectedFilter !== 'all') {
        return mockJobs.filter(job => job.status === selectedFilter);
      }
      
      return mockJobs;
    },
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch system status
  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async (): Promise<SystemStatus> => {
      // Mock system status
      return {
        overall: 'healthy',
        services: {
          database: 'healthy',
          fileStorage: 'healthy',
          aiProcessing: 'degraded',
          webhooks: 'healthy'
        },
        metrics: {
          activeJobs: processingJobs?.filter(j => j.status === 'running').length || 0,
          queueLength: processingJobs?.filter(j => j.status === 'pending').length || 0,
          averageProcessingTime: 4.2,
          successRate: 94.5,
          errorRate: 5.5
        }
      };
    },
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <Square className="w-4 h-4 text-gray-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: ProcessingJob['status']) => {
    const variants = {
      running: 'default',
      completed: 'default',
      failed: 'destructive',
      pending: 'secondary',
      cancelled: 'outline',
      paused: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const getTypeIcon = (type: ProcessingJob['type']) => {
    switch (type) {
      case 'document_upload': return <Upload className="w-4 h-4" />;
      case 'knowledge_base_sync': return <Database className="w-4 h-4" />;
      case 'agent_training': return <Zap className="w-4 h-4" />;
      case 'workflow_execution': return <Activity className="w-4 h-4" />;
      case 'integration_sync': return <RefreshCw className="w-4 h-4" />;
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Processing Status</h3>
          <p className="text-muted-foreground">
            Monitor real-time processing jobs and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause Auto-refresh
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Resume Auto-refresh
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['processing-jobs'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.metrics.activeJobs}</div>
              <p className="text-xs text-muted-foreground">Currently processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Length</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.metrics.queueLength}</div>
              <p className="text-xs text-muted-foreground">Jobs waiting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.metrics.successRate}%</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus.metrics.averageProcessingTime}m</div>
              <p className="text-xs text-muted-foreground">Processing time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Health Status */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(systemStatus.services).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{service.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <Badge 
                      variant={status === 'healthy' ? 'default' : status === 'degraded' ? 'secondary' : 'destructive'}
                      className="mt-1"
                    >
                      {status}
                    </Badge>
                  </div>
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    status === 'healthy' ? 'bg-green-500' : status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  )} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Processing Jobs</CardTitle>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : processingJobs && processingJobs.length > 0 ? (
            <div className="space-y-4">
              {processingJobs.map((job) => (
                <Card key={job.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(job.type)}
                        <div>
                          <h4 className="font-medium">{job.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Started {formatDuration(job.startedAt)} ago
                            {job.completedAt && ` • Completed in ${formatDuration(job.startedAt, job.completedAt)}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(job.status)}
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(job.status === 'running' || job.status === 'paused') && (
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span>{job.currentStep || 'Processing...'}</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="w-full" />
                        {job.totalSteps && job.currentStepIndex && (
                          <p className="text-xs text-muted-foreground">
                            Step {job.currentStepIndex} of {job.totalSteps}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Error Messages */}
                    {job.status === 'failed' && job.metadata?.errorMessage && (
                      <Alert variant="destructive" className="mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {job.metadata.errorMessage}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Warnings */}
                    {job.metadata?.warnings && job.metadata.warnings.length > 0 && (
                      <Alert className="mb-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside">
                            {job.metadata.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Job Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {job.metadata?.fileSize && (
                        <div>
                          <span className="text-muted-foreground">File Size:</span>
                          <div className="font-medium">{formatFileSize(job.metadata.fileSize)}</div>
                        </div>
                      )}
                      
                      {job.metadata?.tokensProcessed && (
                        <div>
                          <span className="text-muted-foreground">Tokens:</span>
                          <div className="font-medium">{job.metadata.tokensProcessed.toLocaleString()}</div>
                        </div>
                      )}
                      
                      {job.metadata?.chunksCreated && (
                        <div>
                          <span className="text-muted-foreground">Chunks:</span>
                          <div className="font-medium">{job.metadata.chunksCreated}</div>
                        </div>
                      )}

                      {job.metadata?.outputSize && (
                        <div>
                          <span className="text-muted-foreground">Output:</span>
                          <div className="font-medium">{formatFileSize(job.metadata.outputSize)}</div>
                        </div>
                      )}
                    </div>

                    {/* Resource Usage */}
                    {job.resourceUsage && job.status === 'running' && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Resource Usage</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>CPU</span>
                              <span>{job.resourceUsage.cpu}%</span>
                            </div>
                            <Progress value={job.resourceUsage.cpu} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Memory</span>
                              <span>{job.resourceUsage.memory}%</span>
                            </div>
                            <Progress value={job.resourceUsage.memory} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Storage</span>
                              <span>{job.resourceUsage.storage}%</span>
                            </div>
                            <Progress value={job.resourceUsage.storage} className="h-2" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t">
                      {job.status === 'running' && (
                        <Button size="sm" variant="outline">
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      
                      {job.status === 'paused' && (
                        <Button size="sm" variant="outline">
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </Button>
                      )}
                      
                      {(job.status === 'pending' || job.status === 'running' || job.status === 'paused') && (
                        <Button size="sm" variant="outline">
                          <Square className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      )}
                      
                      {job.status === 'completed' && (
                        <>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" />
                            View Results
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </>
                      )}
                      
                      {job.status === 'failed' && (
                        <Button size="sm" variant="outline">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No processing jobs</h3>
              <p className="text-muted-foreground">
                {selectedFilter === 'all' 
                  ? 'No jobs are currently running or queued'
                  : `No ${selectedFilter} jobs found`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}