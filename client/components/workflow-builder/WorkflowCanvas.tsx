import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeTemplate
} from '@/lib/workflow-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trash2,
  Settings,
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Link
} from 'lucide-react';

interface WorkflowCanvasProps {
  workflow: Workflow;
  selectedNodeId: string | null;
  showGrid: boolean;
  zoom: number;
  dragMode: 'select' | 'pan';
  onNodeSelect: (nodeId: string | null) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onEdgeAdd: (edge: Omit<WorkflowEdge, 'id'>) => void;
  onEdgeDelete: (edgeId: string) => void;
  onZoomChange: (zoom: number) => void;
}

interface CanvasHandle {
  centerOnNode: (nodeId: string) => void;
  fitToView: () => void;
}

const WorkflowCanvas = forwardRef<CanvasHandle, WorkflowCanvasProps>(({
  workflow,
  selectedNodeId,
  showGrid,
  zoom,
  dragMode,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete,
  onEdgeAdd,
  onEdgeDelete,
  onZoomChange
}, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Canvas state
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [draggedNodeOffset, setDraggedNodeOffset] = useState({ x: 0, y: 0 });
  
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{
    nodeId: string;
    portId: string;
    type: 'input' | 'output';
    position: { x: number; y: number };
  } | null>(null);
  const [connectionEnd, setConnectionEnd] = useState<{ x: number; y: number } | null>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    centerOnNode: (nodeId: string) => {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (node && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        setCanvasOffset({
          x: centerX - node.position.x * zoom,
          y: centerY - node.position.y * zoom
        });
      }
    },
    fitToView: () => {
      if (workflow.nodes.length === 0) return;
      
      const padding = 50;
      const minX = Math.min(...workflow.nodes.map(n => n.position.x)) - padding;
      const minY = Math.min(...workflow.nodes.map(n => n.position.y)) - padding;
      const maxX = Math.max(...workflow.nodes.map(n => n.position.x)) + 200 + padding;
      const maxY = Math.max(...workflow.nodes.map(n => n.position.y)) + 100 + padding;
      
      const width = maxX - minX;
      const height = maxY - minY;
      
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = rect.width / width;
        const scaleY = rect.height / height;
        const newZoom = Math.min(scaleX, scaleY, 1);
        
        setCanvasOffset({
          x: (rect.width - width * newZoom) / 2 - minX * newZoom,
          y: (rect.height - height * newZoom) / 2 - minY * newZoom
        });
        
        onZoomChange(newZoom);
      }
    }
  }));

  // Handle canvas drag (panning)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (dragMode === 'pan' && e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
      e.preventDefault();
    }
  }, [dragMode, canvasOffset]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragMode === 'pan') {
      setCanvasOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (isConnecting && connectionStart) {
      setConnectionEnd({
        x: (e.nativeEvent.offsetX - canvasOffset.x) / zoom,
        y: (e.nativeEvent.offsetY - canvasOffset.y) / zoom
      });
    }
  }, [isDragging, dragMode, dragStart, isConnecting, connectionStart, canvasOffset, zoom]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStart(null);
      setConnectionEnd(null);
    }
  }, [isConnecting]);

  // Handle drop from node palette
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const templateData = e.dataTransfer.getData('application/json');
    
    if (templateData) {
      try {
        const template: NodeTemplate = JSON.parse(templateData);
        const rect = canvasRef.current?.getBoundingClientRect();
        
        if (rect) {
          const position = {
            x: (e.clientX - rect.left - canvasOffset.x) / zoom,
            y: (e.clientY - rect.top - canvasOffset.y) / zoom
          };
          
          // This would be handled by the parent component
          console.log('Drop template at position:', template, position);
        }
      } catch (error) {
        console.error('Failed to parse dropped template:', error);
      }
    }
  }, [canvasOffset, zoom]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Node event handlers
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (dragMode === 'select') {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (node) {
        setDraggedNodeId(nodeId);
        setDraggedNodeOffset({
          x: e.nativeEvent.offsetX,
          y: e.nativeEvent.offsetY
        });
        onNodeSelect(nodeId);
      }
      e.stopPropagation();
    }
  }, [dragMode, workflow.nodes, onNodeSelect]);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNodeId && dragMode === 'select') {
      const node = workflow.nodes.find(n => n.id === draggedNodeId);
      if (node) {
        const newPosition = {
          x: (e.nativeEvent.offsetX - canvasOffset.x) / zoom - draggedNodeOffset.x,
          y: (e.nativeEvent.offsetY - canvasOffset.y) / zoom - draggedNodeOffset.y
        };
        
        onNodeUpdate(draggedNodeId, { position: newPosition });
      }
    }
  }, [draggedNodeId, dragMode, workflow.nodes, canvasOffset, zoom, draggedNodeOffset, onNodeUpdate]);

  const handleNodeMouseUp = useCallback(() => {
    setDraggedNodeId(null);
    setDraggedNodeOffset({ x: 0, y: 0 });
  }, []);

  // Port connection handlers
  const handlePortMouseDown = useCallback((
    e: React.MouseEvent,
    nodeId: string,
    portId: string,
    type: 'input' | 'output'
  ) => {
    e.stopPropagation();
    
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (node && type === 'output') {
      setIsConnecting(true);
      setConnectionStart({
        nodeId,
        portId,
        type,
        position: { x: node.position.x + 200, y: node.position.y + 50 }
      });
    }
  }, [workflow.nodes]);

  const handlePortMouseUp = useCallback((
    e: React.MouseEvent,
    nodeId: string,
    portId: string,
    type: 'input' | 'output'
  ) => {
    e.stopPropagation();
    
    if (isConnecting && connectionStart && type === 'input' && nodeId !== connectionStart.nodeId) {
      onEdgeAdd({
        sourceNodeId: connectionStart.nodeId,
        sourcePortId: connectionStart.portId,
        targetNodeId: nodeId,
        targetPortId: portId
      });
    }
    
    setIsConnecting(false);
    setConnectionStart(null);
    setConnectionEnd(null);
  }, [isConnecting, connectionStart, onEdgeAdd]);

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(2, zoom * delta));
      onZoomChange(newZoom);
    }
  }, [zoom, onZoomChange]);

  // Get node icon based on type
  const getNodeIcon = (node: WorkflowNode) => {
    switch (node.type) {
      case 'trigger': return '🎯';
      case 'condition': return '🔀';
      case 'action': return '⚡';
      case 'ai_response': return '🤖';
      case 'human_handoff': return '👥';
      case 'integration': return '🔗';
      case 'wait': return '⏱️';
      case 'webhook': return '📡';
      case 'variable': return '📝';
      case 'loop': return '🔄';
      default: return '⚙️';
    }
  };

  // Get node color based on type
  const getNodeColor = (node: WorkflowNode) => {
    switch (node.type) {
      case 'trigger': return '#10b981';
      case 'condition': return '#f59e0b';
      case 'action': return '#3b82f6';
      case 'ai_response': return '#8b5cf6';
      case 'human_handoff': return '#f97316';
      case 'integration': return '#ec4899';
      case 'wait': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="relative h-full bg-gray-50 overflow-hidden">
      {/* Grid Background */}
      {showGrid && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`
          }}
        />
      )}

      {/* Main Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
        onWheel={handleWheel}
      >
        {/* SVG for connections */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#6b7280"
              />
            </marker>
          </defs>

          {/* Existing connections */}
          {workflow.edges.map((edge) => {
            const sourceNode = workflow.nodes.find(n => n.id === edge.sourceNodeId);
            const targetNode = workflow.nodes.find(n => n.id === edge.targetNodeId);
            
            if (!sourceNode || !targetNode) return null;

            const startX = (sourceNode.position.x + 200) * zoom + canvasOffset.x;
            const startY = (sourceNode.position.y + 50) * zoom + canvasOffset.y;
            const endX = targetNode.position.x * zoom + canvasOffset.x;
            const endY = (targetNode.position.y + 50) * zoom + canvasOffset.y;

            const midX = startX + (endX - startX) / 2;

            return (
              <g key={edge.id}>
                <path
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                  stroke="#6b7280"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className="pointer-events-auto cursor-pointer hover:stroke-blue-500"
                  onClick={() => onEdgeDelete(edge.id)}
                />
              </g>
            );
          })}

          {/* Active connection being drawn */}
          {isConnecting && connectionStart && connectionEnd && (
            <path
              d={`M ${(connectionStart.position.x) * zoom + canvasOffset.x} ${(connectionStart.position.y) * zoom + canvasOffset.y} L ${connectionEnd.x * zoom + canvasOffset.x} ${connectionEnd.y * zoom + canvasOffset.y}`}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />
          )}
        </svg>

        {/* Nodes */}
        {workflow.nodes.map((node) => (
          <div
            key={node.id}
            className={`absolute bg-white border-2 rounded-lg shadow-sm transition-all duration-200 ${
              selectedNodeId === node.id 
                ? 'border-blue-500 shadow-lg' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              left: node.position.x * zoom + canvasOffset.x,
              top: node.position.y * zoom + canvasOffset.y,
              width: 200 * zoom,
              minHeight: 100 * zoom,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              zIndex: selectedNodeId === node.id ? 10 : 2
            }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onMouseMove={handleNodeMouseMove}
            onMouseUp={handleNodeMouseUp}
          >
            {/* Node Header */}
            <div 
              className="p-3 border-b flex items-center justify-between"
              style={{ backgroundColor: `${getNodeColor(node)}15` }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getNodeIcon(node)}</span>
                <div>
                  <h4 className="font-medium text-sm truncate">{node.data.label}</h4>
                  <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {node.data.validation && !node.data.validation.isValid && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeDelete(node.id);
                  }}
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Node Content */}
            <div className="p-3">
              {node.data.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {node.data.description}
                </p>
              )}
              
              {/* Configuration preview */}
              {Object.keys(node.data.config).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <Settings className="h-3 w-3 inline mr-1" />
                  Configured
                </div>
              )}
            </div>

            {/* Input Ports */}
            {node.inputs.map((input, index) => (
              <div
                key={input.id}
                className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:bg-blue-600"
                style={{
                  left: -6,
                  top: 60 + index * 20
                }}
                onMouseDown={(e) => handlePortMouseDown(e, node.id, input.id, 'input')}
                onMouseUp={(e) => handlePortMouseUp(e, node.id, input.id, 'input')}
                title={input.label}
              />
            ))}

            {/* Output Ports */}
            {node.outputs.map((output, index) => (
              <div
                key={output.id}
                className="absolute w-3 h-3 bg-green-500 rounded-full border-2 border-white cursor-pointer hover:bg-green-600"
                style={{
                  right: -6,
                  top: 60 + index * 20
                }}
                onMouseDown={(e) => handlePortMouseDown(e, node.id, output.id, 'output')}
                onMouseUp={(e) => handlePortMouseUp(e, node.id, output.id, 'output')}
                title={output.label}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Canvas Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        <div className="bg-white border rounded-lg p-2 shadow-sm">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onZoomChange(Math.min(2, zoom * 1.2))}
              disabled={zoom >= 2}
            >
              +
            </Button>
            <span className="text-xs min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onZoomChange(Math.max(0.1, zoom * 0.8))}
              disabled={zoom <= 0.1}
            >
              -
            </Button>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="absolute top-4 left-4">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-white">
            {workflow.nodes.length} nodes
          </Badge>
          <Badge variant="outline" className="bg-white">
            {workflow.edges.length} connections
          </Badge>
          {isConnecting && (
            <Badge className="bg-blue-100 text-blue-800">
              <Link className="h-3 w-3 mr-1" />
              Connecting...
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

WorkflowCanvas.displayName = 'WorkflowCanvas';

export default WorkflowCanvas;