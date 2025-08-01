import React, { useState, useCallback } from 'react';
import { WorkflowNode, CanvasPosition } from '@/lib/workflow-types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Settings,
  Trash2,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowNodeComponentProps {
  node: WorkflowNode;
  isSelected: boolean;
  isExecuting?: boolean;
  executionResult?: any;
  onSelect: (multiSelect?: boolean) => void;
  onDragStart: (startPos: CanvasPosition) => void;
  onDrag: (position: CanvasPosition) => void;
  onConnectionStart: (nodeId: string, portId: string, position: CanvasPosition) => void;
  onConnectionEnd: (nodeId: string, portId: string) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onConfigure?: () => void;
}

export default function WorkflowNodeComponent({
  node,
  isSelected,
  isExecuting = false,
  executionResult,
  onSelect,
  onDragStart,
  onDrag,
  onConnectionStart,
  onConnectionEnd,
  onDelete,
  onDuplicate,
  onConfigure
}: WorkflowNodeComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<CanvasPosition>({ x: 0, y: 0 });

  // Get execution status
  const getExecutionStatus = () => {
    if (isExecuting) return 'running';
    if (executionResult?.success === true) return 'success';
    if (executionResult?.success === false) return 'error';
    if (!node.isValid) return 'invalid';
    return 'idle';
  };

  const executionStatus = getExecutionStatus();

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    e.preventDefault();
    e.stopPropagation();
    
    const startPos = { x: e.clientX, y: e.clientY };
    setDragStart(startPos);
    setIsDragging(true);
    onDragStart(startPos);
    
    // Select node
    onSelect(e.ctrlKey || e.metaKey);
  }, [onDragStart, onSelect]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const newPosition = {
      x: node.position.x + deltaX,
      y: node.position.y + deltaY
    };
    
    onDrag(newPosition);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, node.position, onDrag]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up drag event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle connection port interactions
  const handlePortMouseDown = useCallback((portId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    onConnectionStart(node.id, portId, position);
  }, [node.id, onConnectionStart]);

  const handlePortMouseUp = useCallback((portId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    onConnectionEnd(node.id, portId);
  }, [node.id, onConnectionEnd]);

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (executionStatus) {
      case 'running':
        return { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-50' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50' };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50' };
      case 'invalid':
        return { icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-50' };
      default:
        return { icon: null, color: 'text-gray-500', bgColor: 'bg-gray-50' };
    }
  };

  const { icon: StatusIcon, color: statusColor, bgColor: statusBgColor } = getStatusDisplay();

  return (
    <Card
      className={cn(
        'relative w-48 min-h-24 cursor-move select-none transition-all duration-200',
        'border-2 shadow-sm hover:shadow-md',
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200',
        isDragging && 'shadow-lg scale-105',
        executionStatus === 'running' && 'animate-pulse',
        statusBgColor
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b"
        style={{ backgroundColor: node.color + '20' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: node.color }}
          >
            {node.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{node.name}</h4>
            <Badge variant="secondary" className="text-xs">
              {node.category}
            </Badge>
          </div>
        </div>
        
        {StatusIcon && (
          <StatusIcon className={cn('w-4 h-4', statusColor)} />
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {node.description}
        </p>
        
        {/* Configuration summary */}
        {Object.keys(node.configuration).length > 0 && (
          <div className="text-xs text-gray-500">
            {Object.keys(node.configuration).length} config{Object.keys(node.configuration).length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Execution result */}
        {executionResult && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            {executionResult.success ? (
              <span className="text-green-600">✓ Executed successfully</span>
            ) : (
              <span className="text-red-600">✗ {executionResult.error}</span>
            )}
          </div>
        )}

        {/* Validation errors */}
        {node.errors && node.errors.length > 0 && (
          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
            {node.errors[0]}
          </div>
        )}
      </div>

      {/* Input Ports */}
      {node.inputs.length > 0 && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2">
          {node.inputs.map((input, index) => (
            <div
              key={input.id}
              className={cn(
                'w-3 h-3 rounded-full border-2 bg-white cursor-pointer',
                'hover:scale-125 transition-transform',
                input.connected ? 'border-blue-500 bg-blue-500' : 'border-gray-400',
                input.required && !input.connected && 'border-red-400'
              )}
              style={{
                top: `${(index + 1) * (100 / (node.inputs.length + 1))}%`,
                position: 'absolute'
              }}
              title={`${input.name}${input.required ? ' (required)' : ''}: ${input.description}`}
              onMouseDown={(e) => handlePortMouseDown(input.id, e)}
              onMouseUp={(e) => handlePortMouseUp(input.id, e)}
            />
          ))}
        </div>
      )}

      {/* Output Ports */}
      {node.outputs.length > 0 && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2">
          {node.outputs.map((output, index) => (
            <div
              key={output.id}
              className={cn(
                'w-3 h-3 rounded-full border-2 bg-white cursor-pointer',
                'hover:scale-125 transition-transform',
                output.connected ? 'border-green-500 bg-green-500' : 'border-gray-400'
              )}
              style={{
                top: `${(index + 1) * (100 / (node.outputs.length + 1))}%`,
                position: 'absolute'
              }}
              title={`${output.name}: ${output.description}`}
              onMouseDown={(e) => handlePortMouseDown(output.id, e)}
              onMouseUp={(e) => handlePortMouseUp(output.id, e)}
            />
          ))}
        </div>
      )}

      {/* Action buttons (shown on hover/selection) */}
      {(isSelected || isDragging) && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {onConfigure && (
            <Button
              variant="secondary"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onConfigure();
              }}
            >
              <Settings className="w-3 h-3" />
            </Button>
          )}
          {onDuplicate && (
            <Button
              variant="secondary"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}