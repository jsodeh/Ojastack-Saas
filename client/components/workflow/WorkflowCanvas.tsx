import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WorkflowNode, WorkflowConnection, CanvasPosition, ViewportState, DragState } from '@/lib/workflow-types';
import WorkflowNodeComponent from './WorkflowNodeComponent';
import WorkflowConnection as ConnectionComponent from './WorkflowConnectionComponent';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  onNodeMove: (nodeId: string, position: CanvasPosition) => void;
  onNodeSelect: (nodeId: string, multiSelect?: boolean) => void;
  onConnectionCreate: (connection: Omit<WorkflowConnection, 'id'>) => void;
  onConnectionSelect: (connectionId: string) => void;
  onCanvasClick: (position: CanvasPosition) => void;
  selectedNodes: string[];
  selectedConnections: string[];
  isExecuting?: boolean;
  executionResults?: Record<string, any>;
}

export default function WorkflowCanvas({
  nodes,
  connections,
  onNodeMove,
  onNodeSelect,
  onConnectionCreate,
  onConnectionSelect,
  onCanvasClick,
  selectedNodes,
  selectedConnections,
  isExecuting = false,
  executionResults = {}
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    bounds: { minX: 0, minY: 0, maxX: 2000, maxY: 2000 }
  });
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: 'node',
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 }
  });
  
  const [connectionDrag, setConnectionDrag] = useState<{
    isActive: boolean;
    sourceNodeId?: string;
    sourcePortId?: string;
    currentPosition?: CanvasPosition;
  }>({ isActive: false });

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): CanvasPosition => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - viewport.pan.x) / viewport.zoom,
      y: (screenY - rect.top - viewport.pan.y) / viewport.zoom
    };
  }, [viewport]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): CanvasPosition => {
    return {
      x: canvasX * viewport.zoom + viewport.pan.x,
      y: canvasY * viewport.zoom + viewport.pan.y
    };
  }, [viewport]);

  // Handle mouse down on canvas
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle mouse or Alt+click for panning
        setDragState({
          isDragging: true,
          dragType: 'pan',
          startPosition: { x: e.clientX, y: e.clientY },
          currentPosition: { x: e.clientX, y: e.clientY }
        });
      } else {
        onCanvasClick(canvasPos);
      }
    }
  }, [screenToCanvas, onCanvasClick]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.isDragging) {
      const currentPos = { x: e.clientX, y: e.clientY };
      
      if (dragState.dragType === 'pan') {
        const deltaX = currentPos.x - dragState.currentPosition.x;
        const deltaY = currentPos.y - dragState.currentPosition.y;
        
        setViewport(prev => ({
          ...prev,
          pan: {
            x: prev.pan.x + deltaX,
            y: prev.pan.y + deltaY
          }
        }));
      }
      
      setDragState(prev => ({ ...prev, currentPosition: currentPos }));
    }
    
    if (connectionDrag.isActive) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setConnectionDrag(prev => ({ ...prev, currentPosition: canvasPos }));
    }
  }, [dragState, connectionDrag, screenToCanvas]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: 'node',
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    });
    
    if (connectionDrag.isActive) {
      setConnectionDrag({ isActive: false });
    }
  }, [connectionDrag]);

  // Handle wheel for zooming
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, viewport.zoom * zoomFactor));
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Zoom towards mouse position
    const zoomRatio = newZoom / viewport.zoom;
    const newPanX = mouseX - (mouseX - viewport.pan.x) * zoomRatio;
    const newPanY = mouseY - (mouseY - viewport.pan.y) * zoomRatio;
    
    setViewport({
      ...viewport,
      zoom: newZoom,
      pan: { x: newPanX, y: newPanY }
    });
  }, [viewport]);

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseMove, handleMouseUp, handleWheel]);

  // Handle node drag start
  const handleNodeDragStart = useCallback((nodeId: string, startPos: CanvasPosition) => {
    setDragState({
      isDragging: true,
      dragType: 'node',
      startPosition: startPos,
      currentPosition: startPos,
      draggedItem: nodeId
    });
  }, []);

  // Handle node drag
  const handleNodeDrag = useCallback((nodeId: string, position: CanvasPosition) => {
    onNodeMove(nodeId, position);
  }, [onNodeMove]);

  // Handle connection port drag start
  const handleConnectionStart = useCallback((nodeId: string, portId: string, position: CanvasPosition) => {
    setConnectionDrag({
      isActive: true,
      sourceNodeId: nodeId,
      sourcePortId: portId,
      currentPosition: position
    });
  }, []);

  // Handle connection port drop
  const handleConnectionEnd = useCallback((targetNodeId: string, targetPortId: string) => {
    if (connectionDrag.isActive && connectionDrag.sourceNodeId && connectionDrag.sourcePortId) {
      onConnectionCreate({
        sourceNodeId: connectionDrag.sourceNodeId,
        sourcePortId: connectionDrag.sourcePortId,
        targetNodeId,
        targetPortId
      });
    }
    setConnectionDrag({ isActive: false });
  }, [connectionDrag, onConnectionCreate]);

  // Zoom controls
  const handleZoomIn = () => {
    setViewport(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }));
  };

  const handleZoomOut = () => {
    setViewport(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  };

  const handleFitToView = () => {
    if (nodes.length === 0) return;

    const padding = 50;
    const minX = Math.min(...nodes.map(n => n.position.x)) - padding;
    const minY = Math.min(...nodes.map(n => n.position.y)) - padding;
    const maxX = Math.max(...nodes.map(n => n.position.x + 200)) + padding; // Assuming node width ~200
    const maxY = Math.max(...nodes.map(n => n.position.y + 100)) + padding; // Assuming node height ~100

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    setViewport({
      zoom: scale,
      pan: {
        x: (rect.width - contentWidth * scale) / 2 - minX * scale,
        y: (rect.height - contentHeight * scale) / 2 - minY * scale
      },
      bounds: viewport.bounds
    });
  };

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        style={{
          backgroundImage: `
            radial-gradient(circle, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
          backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`
        }}
      >
        {/* SVG for connections */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          {/* Render connections */}
          {connections.map(connection => {
            const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
            const targetNode = nodes.find(n => n.id === connection.targetNodeId);
            
            if (!sourceNode || !targetNode) return null;

            const sourcePos = canvasToScreen(
              sourceNode.position.x + 200, // Right side of source node
              sourceNode.position.y + 50   // Middle of source node
            );
            const targetPos = canvasToScreen(
              targetNode.position.x,       // Left side of target node
              targetNode.position.y + 50   // Middle of target node
            );

            return (
              <ConnectionComponent
                key={connection.id}
                connection={connection}
                sourcePosition={sourcePos}
                targetPosition={targetPos}
                isSelected={selectedConnections.includes(connection.id)}
                onClick={() => onConnectionSelect(connection.id)}
              />
            );
          })}

          {/* Render active connection drag */}
          {connectionDrag.isActive && connectionDrag.currentPosition && connectionDrag.sourceNodeId && (
            (() => {
              const sourceNode = nodes.find(n => n.id === connectionDrag.sourceNodeId);
              if (!sourceNode) return null;

              const sourcePos = canvasToScreen(
                sourceNode.position.x + 200,
                sourceNode.position.y + 50
              );
              const targetPos = canvasToScreen(
                connectionDrag.currentPosition.x,
                connectionDrag.currentPosition.y
              );

              return (
                <path
                  d={`M ${sourcePos.x} ${sourcePos.y} Q ${(sourcePos.x + targetPos.x) / 2} ${sourcePos.y} ${targetPos.x} ${targetPos.y}`}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                  className="pointer-events-none"
                />
              );
            })()
          )}
        </svg>

        {/* Render nodes */}
        <div className="relative" style={{ zIndex: 2 }}>
          {nodes.map(node => {
            const screenPos = canvasToScreen(node.position.x, node.position.y);
            
            return (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: screenPos.x,
                  top: screenPos.y,
                  transform: `scale(${viewport.zoom})`,
                  transformOrigin: 'top left'
                }}
              >
                <WorkflowNodeComponent
                  node={node}
                  isSelected={selectedNodes.includes(node.id)}
                  isExecuting={isExecuting}
                  executionResult={executionResults[node.id]}
                  onSelect={(multiSelect) => onNodeSelect(node.id, multiSelect)}
                  onDragStart={(startPos) => handleNodeDragStart(node.id, startPos)}
                  onDrag={(position) => handleNodeDrag(node.id, position)}
                  onConnectionStart={handleConnectionStart}
                  onConnectionEnd={handleConnectionEnd}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="p-2"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="p-2"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFitToView}
          className="p-2"
        >
          <Maximize className="w-4 h-4" />
        </Button>
        <div className="text-xs text-gray-500 text-center px-2">
          {Math.round(viewport.zoom * 100)}%
        </div>
      </div>

      {/* Pan indicator */}
      {dragState.isDragging && dragState.dragType === 'pan' && (
        <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
          <Move className="w-4 h-4" />
          Panning
        </div>
      )}
    </div>
  );
}