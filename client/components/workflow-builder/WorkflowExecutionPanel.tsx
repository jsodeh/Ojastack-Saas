import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play,
  Square,
  RotateCcw,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Eye,
  Terminal,
  Activity
} from 'lucide-react';
import { 
  Workflow,
  WorkflowExecution,
  WorkflowExecutionLog
} from '@/lib/workflow-types';

interface WorkflowExecutionPanelProps {
  workflow: Workflow;
  execution: WorkflowExecution | null;
  onExecute: (input?: Record<string, any>) => void;
  isExecuting: boolean;
}

export default function WorkflowExecutionPanel({
  workflow,
  execution,
  onExecute,
  isExecuting
}: WorkflowExecutionPanelProps) {
  const [testInput, setTestInput] = useState({
    userMessage: 'Hello, I need help with my account',
    userId: 'test_user_123',
    sessionId: 'test_session_456'
  });
  const [showLogs, setShowLogs] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [executionProgress, setExecutionProgress] = useState(0);

  // Simulate execution progress
  useEffect(() => {
    if (isExecuting) {
      setExecutionProgress(0);
      const interval = setInterval(() => {
        setExecutionProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isExecuting]);

  const handleExecute = () => {
    onExecute(testInput);
  };

  const handleInputChange = (key: string, value: string) => {
    setTestInput(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'info':
        return <Info className="h-3 w-3 text-blue-500" />;
      case 'debug':
        return <Terminal className="h-3 w-3 text-gray-500" />;
      default:
        return <Info className="h-3 w-3 text-gray-500" />;
    }
  };

  const filteredLogs = execution?.logs.filter(log => 
    logFilter === 'all' || log.level === logFilter
  ) || [];

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  const exportLogs = () => {
    if (!execution) return;
    
    const logsData = execution.logs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      nodeId: log.nodeId,
      message: log.message,
      data: log.data
    }));
    
    const blob = new Blob([JSON.stringify(logsData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-execution-${execution.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-4">
      {/* Test Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Test Workflow
          </CardTitle>
          <CardDescription>
            Provide test input and run your workflow to verify it works correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="userMessage">User Message</Label>
              <Textarea
                id="userMessage"
                value={testInput.userMessage}
                onChange={(e) => handleInputChange('userMessage', e.target.value)}
                placeholder="Enter a test message"
                rows={3}
              />
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={testInput.userId}
                  onChange={(e) => handleInputChange('userId', e.target.value)}
                  placeholder="test_user_123"
                />
              </div>
              
              <div>
                <Label htmlFor="sessionId">Session ID</Label>
                <Input
                  id="sessionId"
                  value={testInput.sessionId}
                  onChange={(e) => handleInputChange('sessionId', e.target.value)}
                  placeholder="test_session_456"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleExecute}
                disabled={isExecuting || workflow.nodes.length === 0}
                className="flex items-center"
              >
                {isExecuting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Test
                  </>
                )}
              </Button>
              
              {execution && (
                <Button
                  variant="outline"
                  onClick={() => onExecute(testInput)}
                  disabled={isExecuting}
                  className="flex items-center"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Run Again
                </Button>
              )}
            </div>
            
            {workflow.nodes.length === 0 && (
              <Alert className="flex-1 ml-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Add nodes to your workflow before testing
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Execution Progress */}
          {isExecuting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Execution Progress</span>
                <span>{Math.round(executionProgress)}%</span>
              </div>
              <Progress value={executionProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Results */}
      {execution && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Execution Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Execution Result</CardTitle>
                <Badge className={getStatusColor(execution.status)}>
                  {execution.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {execution.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {execution.status === 'running' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
                  {execution.status}
                </Badge>
              </div>
              <CardDescription>
                Execution ID: {execution.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Started</p>
                  <p>{new Date(execution.startTime).toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground">Duration</p>
                  <p>{formatDuration(execution.startTime, execution.endTime)}</p>
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground">Workflow</p>
                  <p>{workflow.name}</p>
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground">Version</p>
                  <p>{workflow.version}</p>
                </div>
              </div>

              <Separator />

              {/* Variables */}
              <div>
                <p className="font-medium text-sm mb-2">Variables</p>
                <div className="bg-gray-50 rounded p-3 text-xs font-mono">
                  <pre>{JSON.stringify(execution.variables, null, 2)}</pre>
                </div>
              </div>

              {/* Error Details */}
              {execution.error && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Execution Error:</p>
                    <p className="text-sm mt-1">{execution.error}</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {execution.status === 'completed' && !execution.error && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Workflow executed successfully! Check the logs for detailed step-by-step execution.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Execution Logs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg">Execution Logs</CardTitle>
                  <Badge variant="outline">{execution.logs.length}</Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value as any)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="all">All Logs</option>
                    <option value="error">Errors</option>
                    <option value="warn">Warnings</option>
                    <option value="info">Info</option>
                  </select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportLogs}
                    className="h-6 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2" />
                    <p>No logs to display</p>
                    {logFilter !== 'all' && (
                      <p className="text-sm">Try changing the filter or run the workflow</p>
                    )}
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start space-x-3 p-2 rounded border bg-white text-sm"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getLogIcon(log.level)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{log.nodeId}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              log.level === 'error' ? 'border-red-200 text-red-600' :
                              log.level === 'warn' ? 'border-yellow-200 text-yellow-600' :
                              'border-blue-200 text-blue-600'
                            }`}
                          >
                            {log.level}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-gray-700 mb-1">{log.message}</p>
                        
                        {log.data && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View details
                            </summary>
                            <pre className="mt-1 p-2 bg-gray-50 rounded font-mono text-xs overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!execution && !isExecuting && (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-12">
            <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle className="mb-2">Ready to Test</CardTitle>
            <CardDescription className="mb-4">
              Run your workflow to see execution results and logs here
            </CardDescription>
            <Button
              onClick={handleExecute}
              disabled={workflow.nodes.length === 0}
              className="flex items-center mx-auto"
            >
              <Play className="h-4 w-4 mr-2" />
              Run First Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}