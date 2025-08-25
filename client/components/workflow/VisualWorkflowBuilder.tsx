import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Workflow, 
  Plus, 
  Play, 
  Pause,
  Save,
  Download,
  Upload,
  Settings,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Eye,
  MessageSquare,
  Bot,
  Database,
  Zap,
  GitBranch,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  MousePointer,
  Move,
  Maximize
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkflowNode {
  id: string;
  type: 'start' | 'message' | 'condition' | 'action' | 'api-call' | 'wait' | 'end';
  position: { x: number; y: number };
  data: {
    title: string;
    description?: string;
    config: Record<string, any>;
  };
  inputs: Array<{ id: string; type: string; required: boolean; }>;
  outputs: Array<{ id: string; type: string; condition?: string; }>;
}

interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourceOutputId: string;
  targetNodeId: string;
  targetInputId: string;
  condition?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: Array<{ name: string; type: string; defaultValue?: any; }>;
  triggers: Array<{ type: string; config: Record<string, any>; }>;
  metadata: {
    version: string;
    created: Date;
    modified: Date;
    tags: string[];
  };
}

interface VisualWorkflowBuilderProps {
  workflowId?: string;
  onSave: (workflow: Workflow) => void;
  onTest: (workflow: Workflow) => void;
  readOnly?: boolean;
}

const NODE_TYPES = {
  start: {
    title: 'Start',
    icon: <Play className="w-4 h-4" />,
    color: 'bg-green-500',
    description: 'Workflow entry point',
    inputs: [],
    outputs: [{ id: 'output', type: 'flow', required: true }]
  },
  message: {
    title: 'Send Message',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Send a message to user',
    inputs: [{ id: 'input', type: 'flow', required: true }],
    outputs: [{ id: 'output', type: 'flow', required: false }]
  },
  condition: {
    title: 'Condition',
    icon: <GitBranch className="w-4 h-4" />,
    color: 'bg-yellow-500',
    description: 'Branch based on condition',
    inputs: [{ id: 'input', type: 'flow', required: true }],
    outputs: [
      { id: 'true', type: 'flow', condition: 'true' },
      { id: 'false', type: 'flow', condition: 'false' }
    ]
  },
  action: {
    title: 'Action',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-purple-500',
    description: 'Perform an action',
    inputs: [{ id: 'input', type: 'flow', required: true }],
    outputs: [{ id: 'output', type: 'flow', required: false }]
  },
  'api-call': {
    title: 'API Call',
    icon: <Database className="w-4 h-4" />,
    color: 'bg-orange-500',
    description: 'Make external API call',
    inputs: [{ id: 'input', type: 'flow', required: true }],
    outputs: [
      { id: 'success', type: 'flow', condition: 'success' },
      { id: 'error', type: 'flow', condition: 'error' }
    ]
  },
  wait: {
    title: 'Wait',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-gray-500',
    description: 'Wait for specified time',
    inputs: [{ id: 'input', type: 'flow', required: true }],
    outputs: [{ id: 'output', type: 'flow', required: false }]
  },
  end: {
    title: 'End',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-red-500',
    description: 'Workflow end point',
    inputs: [{ id: 'input', type: 'flow', required: true }],
    outputs: []
  }
};

export default function VisualWorkflowBuilder({
  workflowId,
  onSave,
  onTest,
  readOnly = false
}: VisualWorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<Workflow>({
    id: workflowId || 'new',
    name: 'Untitled Workflow',
    description: '',
    nodes: [],
    connections: [],
    variables: [],
    triggers: [],
    metadata: {
      version: '1.0.0',
      created: new Date(),
      modified: new Date(),
      tags: []
    }
  });

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'select' | 'pan'>('select');
  const [zoom, setZoom] = useState(100);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [nodePropertiesOpen, setNodePropertiesOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load existing workflow
  const { data: loadedWorkflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async (): Promise<Workflow | null> => {
      if (!workflowId || workflowId === 'new') return null;
      
      // Mock workflow data for now - in real app, fetch from API
      return {
        id: workflowId,
        name: 'Sample Workflow',
        description: 'A sample workflow for testing',
        nodes: [],
        connections: [],
        variables: [],
        triggers: [],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          modified: new Date(),
          tags: []
        }
      };
    },
    enabled: !!workflowId && workflowId !== 'new'
  });

  useEffect(() => {
    if (loadedWorkflow) {
      setWorkflow(loadedWorkflow);
    }
  }, [loadedWorkflow]);

  // Save workflow mutation
  const saveWorkflowMutation = useMutation({
    mutationFn: async (workflowData: Workflow) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Use fetch API instead of supabase client for workflow operations
      const response = await fetch('/.netlify/functions/save-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workflowData,
          user_id: user.user.id,
          metadata: {
            ...workflowData.metadata,
            modified: new Date()
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to save workflow');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Workflow saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save workflow: ' + error.message);
    }
  });

  // Execute workflow mutation
  const executeWorkflowMutation = useMutation({
    mutationFn: async (workflowData: Workflow) => {
      const response = await fetch('/.netlify/functions/execute-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      
      if (!response.ok) {
        throw new Error('Workflow execution failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsExecuting(false);
      toast.success('Workflow executed successfully');
    },
    onError: (error) => {
      setIsExecuting(false);
      toast.error('Workflow execution failed: ' + error.message);
    }
  });

  const addNode = useCallback((type: keyof typeof NODE_TYPES, position: { x: number; y: number }) => {
    const nodeType = NODE_TYPES[type];
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      position,
      data: {
        title: nodeType.title,
        config: {}
      },
      inputs: nodeType.inputs,
      outputs: nodeType.outputs
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      connections: prev.connections.filter(c => 
        c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
      )
    }));
    setSelectedNode(null);
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => 
        n.id === nodeId ? { ...n, ...updates } : n
      )
    }));
  }, []);

  const addConnection = useCallback((
    sourceNodeId: string,
    sourceOutputId: string,
    targetNodeId: string,
    targetInputId: string
  ) => {
    const connectionExists = workflow.connections.some(c =>
      c.sourceNodeId === sourceNodeId &&
      c.sourceOutputId === sourceOutputId &&
      c.targetNodeId === targetNodeId &&
      c.targetInputId === targetInputId
    );

    if (connectionExists) return;

    const newConnection: WorkflowConnection = {
      id: `conn_${Date.now()}`,
      sourceNodeId,
      sourceOutputId,
      targetNodeId,
      targetInputId
    };

    setWorkflow(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection]
    }));
  }, [workflow.connections]);

  const deleteConnection = useCallback((connectionId: string) => {
    setWorkflow(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== connectionId)
    }));
    setSelectedConnection(null);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
      setSelectedConnection(null);
    }
  };

  const handleNodeDrag = useCallback((nodeId: string, newPosition: { x: number; y: number }) => {
    updateNode(nodeId, { position: newPosition });
  }, [updateNode]);

  const handleSave = () => {
    saveWorkflowMutation.mutate(workflow);
    onSave(workflow);
  };

  const handleTest = () => {
    setIsExecuting(true);
    executeWorkflowMutation.mutate(workflow);
    onTest(workflow);
  };

  const exportWorkflow = () => {
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedNodeData = selectedNode 
    ? workflow.nodes.find(n => n.id === selectedNode)
    : null;

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Node Palette */}
      <div className="w-64 border-r bg-muted/20 p-4">
        <div className="space-y-4">
          <h3 className="font-semibold">Node Library</h3>
          <div className="space-y-2">
            {Object.entries(NODE_TYPES).map(([type, config]) => (
              <div
                key={type}
                className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-background transition-colors"
                draggable
                onDragEnd={(e) => {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const position = {
                      x: e.clientX - rect.left - canvasOffset.x,
                      y: e.clientY - rect.top - canvasOffset.y
                    };
                    addNode(type as keyof typeof NODE_TYPES, position);
                  }
                }}
              >
                <div className={cn("p-1 rounded text-white mr-2", config.color)}>
                  {config.icon}
                </div>
                <div>
                  <div className="font-medium text-sm">{config.title}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Input
              value={workflow.name}
              onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
              className="font-semibold text-lg border-0 shadow-none p-0 h-auto"
              readOnly={readOnly}
            />
            <Badge variant="outline">{workflow.nodes.length} nodes</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(25, zoom - 25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <span className="text-sm">{zoom}%</span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportWorkflow}
            >
              <Download className="w-4 h-4" />
            </Button>
            
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={isExecuting || workflow.nodes.length === 0}
                >
                  {isExecuting ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveWorkflowMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className={cn(
              "w-full h-full relative",
              showGrid && "bg-grid-pattern",
              dragMode === 'pan' && "cursor-grab"
            )}
            style={{
              transform: `scale(${zoom / 100}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: '0 0'
            }}
            onClick={handleCanvasClick}
            onMouseDown={(e) => {
              if (dragMode === 'pan') {
                setIsDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && dragMode === 'pan') {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                setCanvasOffset(prev => ({
                  x: prev.x + dx,
                  y: prev.y + dy
                }));
                setDragStart({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
          >
            {/* Render Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {workflow.connections.map(connection => {
                const sourceNode = workflow.nodes.find(n => n.id === connection.sourceNodeId);
                const targetNode = workflow.nodes.find(n => n.id === connection.targetNodeId);
                
                if (!sourceNode || !targetNode) return null;
                
                const startX = sourceNode.position.x + 100;
                const startY = sourceNode.position.y + 25;
                const endX = targetNode.position.x;
                const endY = targetNode.position.y + 25;
                
                return (
                  <g key={connection.id}>
                    <path
                      d={`M ${startX} ${startY} C ${startX + 50} ${startY} ${endX - 50} ${endY} ${endX} ${endY}`}
                      stroke={selectedConnection === connection.id ? "#3b82f6" : "#94a3b8"}
                      strokeWidth="2"
                      fill="none"
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setSelectedConnection(connection.id)}
                    />
                    <circle cx={endX} cy={endY} r="4" fill="#94a3b8" />
                  </g>
                );
              })}
            </svg>

            {/* Render Nodes */}
            {workflow.nodes.map(node => (
              <WorkflowNodeComponent
                key={node.id}
                node={node}
                selected={selectedNode === node.id}
                onSelect={() => setSelectedNode(node.id)}
                onDrag={handleNodeDrag}
                onDelete={() => deleteNode(node.id)}
                readOnly={readOnly}
              />
            ))}

            {/* Empty State */}
            {workflow.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Workflow className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Start Building Your Workflow</h3>
                  <p className="text-muted-foreground">
                    Drag nodes from the palette to create your agent workflow
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      {selectedNodeData && (
        <div className="w-80 border-l bg-muted/20 p-4">
          <NodeProperties
            node={selectedNodeData}
            onChange={(updates) => updateNode(selectedNodeData.id, updates)}
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Selected Connection Properties */}
      {selectedConnection && (
        <Dialog open={true} onOpenChange={() => setSelectedConnection(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connection Properties</DialogTitle>
              <DialogDescription>
                Configure the connection between nodes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                variant="destructive"
                onClick={() => deleteConnection(selectedConnection)}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Workflow Node Component
const WorkflowNodeComponent = ({
  node,
  selected,
  onSelect,
  onDrag,
  onDelete,
  readOnly
}: {
  node: WorkflowNode;
  selected: boolean;
  onSelect: () => void;
  onDrag: (nodeId: string, position: { x: number; y: number }) => void;
  onDelete: () => void;
  readOnly: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const nodeConfig = NODE_TYPES[node.type];

  return (
    <div
      className={cn(
        "absolute w-24 h-12 border-2 rounded-lg bg-background shadow-sm cursor-pointer transition-all",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => {
        if (readOnly) return;
        setIsDragging(true);
        setDragOffset({
          x: e.clientX - node.position.x,
          y: e.clientY - node.position.y
        });
      }}
      onMouseMove={(e) => {
        if (isDragging && !readOnly) {
          onDrag(node.id, {
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y
          });
        }
      }}
      onMouseUp={() => setIsDragging(false)}
    >
      <div className="p-2 h-full flex flex-col items-center justify-center">
        <div className={cn("p-1 rounded text-white mb-1", nodeConfig.color)}>
          {nodeConfig.icon}
        </div>
        <div className="text-xs font-medium text-center line-clamp-1">
          {node.data.title}
        </div>
      </div>

      {selected && !readOnly && (
        <Button
          variant="destructive"
          size="sm"
          className="absolute -top-2 -right-2 w-6 h-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

// Node Properties Panel
const NodeProperties = ({
  node,
  onChange,
  readOnly
}: {
  node: WorkflowNode;
  onChange: (updates: Partial<WorkflowNode>) => void;
  readOnly: boolean;
}) => {
  const nodeConfig = NODE_TYPES[node.type];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className={cn("p-2 rounded text-white", nodeConfig.color)}>
          {nodeConfig.icon}
        </div>
        <div>
          <h3 className="font-semibold">{nodeConfig.title}</h3>
          <p className="text-sm text-muted-foreground">{nodeConfig.description}</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={node.data.title}
            onChange={(e) => onChange({
              data: { ...node.data, title: e.target.value }
            })}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={node.data.description || ''}
            onChange={(e) => onChange({
              data: { ...node.data, description: e.target.value }
            })}
            placeholder="Optional description..."
            readOnly={readOnly}
          />
        </div>

        {/* Node-specific configuration */}
        <NodeSpecificConfig
          node={node}
          onChange={onChange}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

// Node-specific configuration component
const NodeSpecificConfig = ({
  node,
  onChange,
  readOnly
}: {
  node: WorkflowNode;
  onChange: (updates: Partial<WorkflowNode>) => void;
  readOnly: boolean;
}) => {
  const updateConfig = (key: string, value: any) => {
    onChange({
      data: {
        ...node.data,
        config: {
          ...node.data.config,
          [key]: value
        }
      }
    });
  };

  switch (node.type) {
    case 'message':
      return (
        <div className="space-y-2">
          <Label>Message Text</Label>
          <textarea
            className="w-full p-2 border rounded-md resize-none"
            rows={3}
            value={node.data.config.message || ''}
            onChange={(e) => updateConfig('message', e.target.value)}
            placeholder="Enter message text..."
            readOnly={readOnly}
          />
        </div>
      );

    case 'condition':
      return (
        <div className="space-y-2">
          <Label>Condition Expression</Label>
          <Input
            value={node.data.config.expression || ''}
            onChange={(e) => updateConfig('expression', e.target.value)}
            placeholder="user.age > 18"
            readOnly={readOnly}
          />
        </div>
      );

    case 'api-call':
      return (
        <div className="space-y-2">
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={node.data.config.method || 'GET'}
              onValueChange={(value) => updateConfig('method', value)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={node.data.config.url || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
              placeholder="https://api.example.com/endpoint"
              readOnly={readOnly}
            />
          </div>
        </div>
      );

    case 'wait':
      return (
        <div className="space-y-2">
          <Label>Wait Duration (seconds)</Label>
          <Input
            type="number"
            value={node.data.config.duration || 1}
            onChange={(e) => updateConfig('duration', parseInt(e.target.value))}
            min="1"
            readOnly={readOnly}
          />
        </div>
      );

    default:
      return null;
  }
};