/**
 * Workflow Debugger
 * Visual debugging interface for workflow execution
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
  StepForward, 
  RotateCcw, 
  Bug,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Settings,
  Zap
} from 'lucide-react';
import { AgentWorkflow, WorkflowNode } from '../../lib/workflow-types';

interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  logs: LogEntry[];
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  data?: any;
}

interface DebugSession {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  currentStepIndex: number;
  steps: ExecutionStep[];
  variables: Record<string, any>;
  breakpoints: Set<string>;
}

interface WorkflowDebuggerProps {
  workflow: AgentWorkflow;
  onClose?: () => void;
  className?: string;
}

export const WorkflowDebugger: React.FC<WorkflowDebuggerProps> = ({
  workflow,
  onClose,
  className = ''
}) => {
  const [session, setSession] = useState<DebugSession | null>(null);
  const [selectedStep, setSelectedStep] = useState<ExecutionStep | null>(null);
  const [debugInput, setDebugInput] = useState('{}');
  const [autoStep, setAutoStep] = useState(false);

  useEffect(() => {
    initializeSession();
  }, [workflow]);

  const initializeSession = () => {
    const steps: ExecutionStep[] = workflow.nodes.map(node => ({
      id: crypto.randomUUID(),
      nodeId: node.id,
      nodeName: node.name || `${node.type} Node`,
      nodeType: node.type,
      status: 'pending',
      logs: []
    }));

    const newSession: DebugSession = {
      id: crypto.randomUUID(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'idle',
      currentStepIndex: -1,
      steps,
      variables: {},
      breakpoints: new Set()
    };

    setSession(newSession);
    setSelectedStep(steps[0] || null);
  };

  const startExecution = async () => {
    if (!session) return;

    try {
      const input = JSON.parse(debugInput);
      
      setSession(prev => prev ? {
        ...prev,
        status: 'running',
        startedAt: new Date().toISOString(),
        variables: { ...prev.variables, input }
      } : null);

      addLog('info', 'Workflow execution started', undefined, { input });

      if (autoStep) {
        await executeAllSteps();
      } else {
        await executeNextStep();
      }
    } catch (error) {
      addLog('error', `Failed to start execution: ${error.message}`);
    }
  };

  const executeAllSteps = async () => {
    if (!session) return;

    for (let i = 0; i < session.steps.length; i++) {
      if (session.status === 'paused') break;
      
      await executeStepAtIndex(i);
      
      // Check for breakpoints
      const step = session.steps[i];
      if (session.breakpoints.has(step.nodeId)) {
        pauseExecution();
        break;
      }
      
      // Small delay for visualization
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (session.status === 'running') {
      completeExecution();
    }
  };

  const executeNextStep = async () => {
    if (!session) return;

    const nextIndex = session.currentStepIndex + 1;
    if (nextIndex >= session.steps.length) {
      completeExecution();
      return;
    }

    await executeStepAtIndex(nextIndex);
  };

  const executeStepAtIndex = async (index: number) => {
    if (!session) return;

    const step = session.steps[index];
    
    setSession(prev => prev ? {
      ...prev,
      currentStepIndex: index,
      steps: prev.steps.map((s, i) => 
        i === index 
          ? { ...s, status: 'running', startTime: new Date().toISOString() }
          : s
      )
    } : null);

    setSelectedStep(step);
    addLog('info', `Executing step: ${step.nodeName}`, step.nodeId);

    try {
      // Simulate step execution
      const result = await simulateStepExecution(step);
      
      setSession(prev => prev ? {
        ...prev,
        steps: prev.steps.map((s, i) => 
          i === index 
            ? { 
                ...s, 
                status: 'completed', 
                endTime: new Date().toISOString(),
                duration: Date.now() - new Date(s.startTime!).getTime(),
                output: result.output
              }
            : s
        ),
        variables: { ...prev.variables, ...result.variables }
      } : null);

      addLog('info', `Step completed successfully`, step.nodeId, result.output);
    } catch (error) {
      setSession(prev => prev ? {
        ...prev,
        steps: prev.steps.map((s, i) => 
          i === index 
            ? { 
                ...s, 
                status: 'failed', 
                endTime: new Date().toISOString(),
                duration: Date.now() - new Date(s.startTime!).getTime(),
                error: error.message
              }
            : s
        )
      } : null);

      addLog('error', `Step failed: ${error.message}`, step.nodeId);
      
      setSession(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  const simulateStepExecution = async (step: ExecutionStep) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Mock execution based on node type
    switch (step.nodeType) {
      case 'trigger':
        return {
          output: { triggered: true, timestamp: new Date().toISOString() },
          variables: { triggerData: 'sample trigger data' }
        };
      
      case 'condition':
        const conditionResult = Math.random() > 0.5;
        return {
          output: { condition: conditionResult, path: conditionResult ? 'true' : 'false' },
          variables: { conditionResult }
        };
      
      case 'action':
        return {
          output: { actionCompleted: true, result: 'Action executed successfully' },
          variables: { actionResult: 'success' }
        };
      
      case 'integration':
        return {
          output: { 
            integrationResponse: { status: 'success', data: 'Integration data' },
            statusCode: 200
          },
          variables: { integrationData: 'sample data' }
        };
      
      case 'response':
        return {
          output: { 
            response: 'This is the final response from the workflow',
            formatted: true
          },
          variables: { finalResponse: 'workflow complete' }
        };
      
      default:
        return {
          output: { processed: true },
          variables: {}
        };
    }
  };

  const pauseExecution = () => {
    setSession(prev => prev ? { ...prev, status: 'paused' } : null);
    addLog('info', 'Execution paused');
  };

  const resumeExecution = async () => {
    if (!session) return;
    
    setSession(prev => prev ? { ...prev, status: 'running' } : null);
    addLog('info', 'Execution resumed');
    
    if (autoStep) {
      await executeAllSteps();
    }
  };

  const stopExecution = () => {
    setSession(prev => prev ? { 
      ...prev, 
      status: 'idle',
      currentStepIndex: -1,
      steps: prev.steps.map(s => ({ ...s, status: 'pending' }))
    } : null);
    addLog('info', 'Execution stopped');
  };

  const completeExecution = () => {
    setSession(prev => prev ? {
      ...prev,
      status: 'completed',
      completedAt: new Date().toISOString()
    } : null);
    addLog('info', 'Workflow execution completed');
  };

  const toggleBreakpoint = (nodeId: string) => {
    setSession(prev => {
      if (!prev) return null;
      
      const newBreakpoints = new Set(prev.breakpoints);
      if (newBreakpoints.has(nodeId)) {
        newBreakpoints.delete(nodeId);
      } else {
        newBreakpoints.add(nodeId);
      }
      
      return { ...prev, breakpoints: newBreakpoints };
    });
  };

  const addLog = (level: LogEntry['level'], message: string, nodeId?: string, data?: any) => {
    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId,
      data
    };

    if (selectedStep && nodeId === selectedStep.nodeId) {
      setSelectedStep(prev => prev ? {
        ...prev,
        logs: [...prev.logs, logEntry]
      } : null);
    }
  };

  const getStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!session) {
    return <div>Loading debugger...</div>;
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Bug className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold">Workflow Debugger</h3>
            <p className="text-sm text-gray-600">{workflow.name}</p>
          </div>
          <Badge className={getStatusColor(session.status as any)}>
            {session.status}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {session.status === 'idle' && (
            <Button size="sm" onClick={startExecution}>
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          
          {session.status === 'running' && (
            <>
              <Button variant="outline" size="sm" onClick={pauseExecution}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
              <Button variant="outline" size="sm" onClick={executeNextStep} disabled={autoStep}>
                <StepForward className="h-4 w-4 mr-1" />
                Step
              </Button>
            </>
          )}
          
          {session.status === 'paused' && (
            <Button size="sm" onClick={resumeExecution}>
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={stopExecution}>
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
          
          <Button variant="outline" size="sm" onClick={initializeSession}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Execution Steps */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <h4 className="font-medium mb-4">Execution Steps</h4>
            
            <div className="space-y-2">
              {session.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedStep?.id === step.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  } ${
                    index === session.currentStepIndex ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedStep(step)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(step.status)}
                      <span className="font-medium text-sm">{step.nodeName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {session.breakpoints.has(step.nodeId) && (
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBreakpoint(step.nodeId);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <div className={`w-2 h-2 rounded-full border ${
                          session.breakpoints.has(step.nodeId) 
                            ? 'bg-red-500 border-red-500' 
                            : 'border-gray-400'
                        }`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 capitalize mb-1">
                    {step.nodeType}
                  </div>
                  
                  <Badge variant="outline" className={`text-xs ${getStatusColor(step.status)}`}>
                    {step.status}
                  </Badge>
                  
                  {step.duration && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDuration(step.duration)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Details */}
        <div className="flex-1 flex flex-col">
          {selectedStep ? (
            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="input">Input</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 p-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {getStatusIcon(selectedStep.status)}
                      <span>{selectedStep.nodeName}</span>
                    </CardTitle>
                    <CardDescription>
                      {selectedStep.nodeType} node execution details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Status</div>
                        <Badge className={getStatusColor(selectedStep.status)}>
                          {selectedStep.status}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">Node Type</div>
                        <div className="font-medium capitalize">{selectedStep.nodeType}</div>
                      </div>
                      
                      {selectedStep.startTime && (
                        <div>
                          <div className="text-sm text-gray-600">Started At</div>
                          <div className="font-medium">
                            {new Date(selectedStep.startTime).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                      
                      {selectedStep.duration && (
                        <div>
                          <div className="text-sm text-gray-600">Duration</div>
                          <div className="font-medium">{formatDuration(selectedStep.duration)}</div>
                        </div>
                      )}
                    </div>
                    
                    {selectedStep.error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-sm font-medium text-red-800">Error</div>
                        <div className="text-sm text-red-700 mt-1">{selectedStep.error}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="input" className="flex-1 p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Input Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto">
                      {JSON.stringify(selectedStep.input || {}, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="output" className="flex-1 p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Output Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto">
                      {JSON.stringify(selectedStep.output || {}, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logs" className="flex-1 p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Execution Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedStep.logs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-2 rounded text-sm ${
                            log.level === 'error' ? 'bg-red-50 text-red-800' :
                            log.level === 'warn' ? 'bg-yellow-50 text-yellow-800' :
                            log.level === 'info' ? 'bg-blue-50 text-blue-800' :
                            'bg-gray-50 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium uppercase">{log.level}</span>
                            <span className="text-xs opacity-75">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="mt-1">{log.message}</div>
                          {log.data && (
                            <pre className="mt-2 text-xs opacity-75">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                      
                      {selectedStep.logs.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No logs available for this step
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Step
                </h3>
                <p className="text-gray-600">
                  Choose a step from the execution timeline to view its details
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Variables & Settings */}
        <div className="w-80 border-l bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <Tabs defaultValue="variables">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="variables" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Workflow Variables</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(session.variables, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Debug Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={autoStep}
                        onChange={(e) => setAutoStep(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Auto-step execution</span>
                    </label>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Test Input</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <textarea
                      value={debugInput}
                      onChange={(e) => setDebugInput(e.target.value)}
                      placeholder='{"message": "test input"}'
                      className="w-full h-32 p-2 border rounded text-sm font-mono"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDebugger;