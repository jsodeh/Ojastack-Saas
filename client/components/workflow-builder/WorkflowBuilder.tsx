import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Play,
  Pause,
  Save,
  Download,
  Upload,
  Trash2,
  Plus,
  Settings,
  Eye,
  Grid,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  ArrowRight,
  ArrowDown,
  MousePointer,
  Move,
  RotateCcw
} from 'lucide-react';
import { 
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeTemplate,
  WORKFLOW_CATEGORIES,
  WorkflowExecution
} from '@/lib/workflow-types';
import { workflowService } from '@/lib/workflow-service';
import WorkflowCanvas from '@/components/workflow-builder/WorkflowCanvas';
import NodePalette from '@/components/workflow-builder/NodePalette';
import NodeConfigPanel from '@/components/workflow-builder/NodeConfigPanel';
import WorkflowExecutionPanel from '@/components/workflow-builder/WorkflowExecutionPanel';

interface WorkflowBuilderProps {
  workflowId?: string;
  onSave?: (workflow: Workflow) => void;
  onClose?: () => void;
}

export default function WorkflowBuilder({ workflowId, onSave, onClose }: WorkflowBuilderProps) {
  // Core state
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'design' | 'test' | 'history'>('design');
  const [dragMode, setDragMode] = useState<'select' | 'pan'>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);
  
  // Validation state
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const canvasRef = useRef<{ centerOnNode: (nodeId: string) => void; fitToView: () => void }>(null);

  // Load workflow on mount
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    } else {
      createNewWorkflow();
    }
  }, [workflowId]);

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && workflow) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [isDirty, workflow]);

  // Validation on workflow change
  useEffect(() => {
    if (workflow) {
      const result = workflowService.validateWorkflow(workflow);
      setValidationResult(result);
    }
  }, [workflow]);

  const loadWorkflow = async (id: string) => {
    setLoading(true);
    try {
      const loadedWorkflow = await workflowService.getWorkflow(id);
      if (loadedWorkflow) {
        setWorkflow(loadedWorkflow);
        
        // Load execution history
        const history = await workflowService.getExecutionHistory(id);
        setExecutionHistory(history);
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewWorkflow = () => {
    const newWorkflow: Workflow = {
      id: '',
      name: 'New Workflow',
      description: '',
      version: '1.0.0',
      status: 'draft',
      nodes: [],
      edges: [],
      variables: [],
      triggers: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user', // Replace with actual user ID
        tags: [],
        category: 'general'
      }
    };
    
    setWorkflow(newWorkflow);
  };

  const handleAutoSave = async () => {
    if (!workflow || !isDirty) return;
    
    try {
      if (workflow.id) {
        await workflowService.updateWorkflow(workflow.id, workflow);
      } else {
        const savedWorkflow = await workflowService.createWorkflow('current-user', workflow);
        setWorkflow(savedWorkflow);
      }
      setIsDirty(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    if (!workflow) return;
    
    setSaving(true);
    try {
      let savedWorkflow: Workflow;
      
      if (workflow.id) {
        savedWorkflow = await workflowService.updateWorkflow(workflow.id, workflow);
      } else {
        savedWorkflow = await workflowService.createWorkflow('current-user', workflow);
      }
      
      setWorkflow(savedWorkflow);
      setIsDirty(false);
      onSave?.(savedWorkflow);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!workflow || !validationResult?.isValid) return;
    
    setIsExecuting(true);
    try {
      const execution = await workflowService.executeWorkflow(workflow.id, {
        userMessage: 'Test message',
        userId: 'test_user'
      });
      
      setCurrentExecution(execution);
      setExecutionHistory(prev => [execution, ...prev]);
      setActiveTab('test');
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddNode = useCallback((template: NodeTemplate, position: { x: number; y: number }) => {
    if (!workflow) return;

    const newNode: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: template.type,
      position,
      data: {
        label: template.name,
        description: template.description,
        config: { ...template.defaultConfig, templateId: template.id }
      },
      inputs: template.inputs.map((input, index) => ({
        ...input,
        id: `${template.id}_in_${index}`
      })),
      outputs: template.outputs.map((output, index) => ({
        ...output,
        id: `${template.id}_out_${index}`
      }))
    };

    setWorkflow(prev => prev ? {
      ...prev,
      nodes: [...prev.nodes, newNode]
    } : null);
    
    setIsDirty(true);
    setSelectedNodeId(newNode.id);
  }, [workflow]);

  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    if (!workflow) return;

    setWorkflow(prev => prev ? {
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    } : null);
    
    setIsDirty(true);
  }, [workflow]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!workflow) return;

    setWorkflow(prev => prev ? {
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      edges: prev.edges.filter(edge => 
        edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId
      )
    } : null);
    
    setIsDirty(true);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [workflow, selectedNodeId]);

  const handleAddEdge = useCallback((edge: Omit<WorkflowEdge, 'id'>) => {
    if (!workflow) return;

    const newEdge: WorkflowEdge = {
      ...edge,
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };

    setWorkflow(prev => prev ? {
      ...prev,
      edges: [...prev.edges, newEdge]
    } : null);
    
    setIsDirty(true);
  }, [workflow]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    if (!workflow) return;

    setWorkflow(prev => prev ? {
      ...prev,
      edges: prev.edges.filter(edge => edge.id !== edgeId)
    } : null);
    
    setIsDirty(true);
  }, [workflow]);

  const selectedNode = workflow?.nodes.find(node => node.id === selectedNodeId) || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading workflow...</span>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Failed to load workflow</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-semibold">{workflow.name}</h1>
              <p className="text-sm text-muted-foreground">
                {workflow.description || 'No description'}
              </p>
            </div>
            
            {isDirty && (
              <Badge variant="outline" className="text-yellow-600">
                <Clock className="h-3 w-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
            
            {validationResult && (
              <Badge 
                variant={validationResult.isValid ? "default" : "destructive"}
                className={validationResult.isValid ? "bg-green-100 text-green-800" : ""}
              >
                {validationResult.isValid ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />Valid</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" />{validationResult.errors.length} errors</>
                )}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              className={showGrid ? "bg-blue-50 text-blue-600" : ""}
            >
              <Grid className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDragMode(dragMode === 'select' ? 'pan' : 'select')}
              className={dragMode === 'pan' ? "bg-blue-50 text-blue-600" : ""}
            >
              {dragMode === 'select' ? <MousePointer className="h-4 w-4" /> : <Move className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExecuteWorkflow}
              disabled={!validationResult?.isValid || isExecuting}
            >
              {isExecuting ? (
                <><Clock className="h-4 w-4 mr-2 animate-spin" />Running</>
              ) : (
                <><Play className="h-4 w-4 mr-2" />Test Run</>
              )}
            </Button>
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving ? (
                <><Clock className="h-4 w-4 mr-2 animate-spin" />Saving</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Save</>
              )}
            </Button>
            
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Validation Messages */}
        {validationResult && !validationResult.isValid && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600">• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Node Palette */}
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium mb-2">Node Library</h3>
            <p className="text-xs text-muted-foreground">
              Drag nodes onto the canvas to build your workflow
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NodePalette onNodeSelect={handleAddNode} />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
            <div className="bg-white border-b px-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="design" className="flex items-center">
                  <Layers className="h-4 w-4 mr-2" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="test" className="flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Test
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="design" className="flex-1 m-0">
              <WorkflowCanvas
                ref={canvasRef}
                workflow={workflow}
                selectedNodeId={selectedNodeId}
                showGrid={showGrid}
                zoom={zoom}
                dragMode={dragMode}
                onNodeSelect={setSelectedNodeId}
                onNodeUpdate={handleUpdateNode}
                onNodeDelete={handleDeleteNode}
                onEdgeAdd={handleAddEdge}
                onEdgeDelete={handleDeleteEdge}
                onZoomChange={setZoom}
              />
            </TabsContent>

            <TabsContent value="test" className="flex-1 m-0">
              <WorkflowExecutionPanel
                workflow={workflow}
                execution={currentExecution}
                onExecute={handleExecuteWorkflow}
                isExecuting={isExecuting}
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 m-0 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Execution History</CardTitle>
                  <CardDescription>
                    Recent workflow executions and their results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {executionHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>No executions yet</p>
                      <p className="text-sm">Run your workflow to see execution history</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {executionHistory.map((execution) => (
                        <div
                          key={execution.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <Badge
                              variant={
                                execution.status === 'completed' ? 'default' :
                                execution.status === 'failed' ? 'destructive' :
                                execution.status === 'running' ? 'secondary' : 'outline'
                              }
                            >
                              {execution.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {execution.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {execution.status === 'running' && <Clock className="h-3 w-3 mr-1" />}
                              {execution.status}
                            </Badge>
                            <div>
                              <p className="text-sm font-medium">{execution.id}</p>
                              <p className="text-xs text-muted-foreground">
                                Started {new Date(execution.startTime).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentExecution(execution)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium">Properties</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedNode ? (
              <NodeConfigPanel
                node={selectedNode}
                onChange={(updates) => handleUpdateNode(selectedNode.id, updates)}
              />
            ) : (
              <div className="p-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2" />
                  <p>No node selected</p>
                  <p className="text-sm">Select a node to edit its properties</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}