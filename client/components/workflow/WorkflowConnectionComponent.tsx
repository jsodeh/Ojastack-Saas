import React from 'react';
import { WorkflowConnection, CanvasPosition } from '@/lib/workflow-types';
import { cn } from '@/lib/utils';

interface WorkflowConnectionComponentProps {
  connection: WorkflowConnection;
  sourcePosition: CanvasPosition;
  targetPosition: CanvasPosition;
  isSelected: boolean;
  onClick: () => void;
  isExecuting?: boolean;
  hasExecuted?: boolean;
}

export default function WorkflowConnectionComponent({
  connection,
  sourcePosition,
  targetPosition,
  isSelected,
  onClick,
  isExecuting = false,
  hasExecuted = false
}: WorkflowConnectionComponentProps) {
  // Calculate control points for smooth curve
  const controlPoint1X = sourcePosition.x + (targetPosition.x - sourcePosition.x) * 0.5;
  const controlPoint1Y = sourcePosition.y;
  const controlPoint2X = sourcePosition.x + (targetPosition.x - sourcePosition.x) * 0.5;
  const controlPoint2Y = targetPosition.y;

  // Create path string
  const pathData = `
    M ${sourcePosition.x} ${sourcePosition.y}
    C ${controlPoint1X} ${controlPoint1Y}
      ${controlPoint2X} ${controlPoint2Y}
      ${targetPosition.x} ${targetPosition.y}
  `;

  // Calculate midpoint for label/status
  const midX = (sourcePosition.x + targetPosition.x) / 2;
  const midY = (sourcePosition.y + targetPosition.y) / 2;

  return (
    <g>
      {/* Connection path */}
      <path
        d={pathData}
        stroke={
          isSelected 
            ? '#3b82f6' 
            : isExecuting 
              ? '#10b981' 
              : hasExecuted 
                ? '#6b7280' 
                : '#d1d5db'
        }
        strokeWidth={isSelected ? 3 : 2}
        fill="none"
        className={cn(
          'cursor-pointer transition-all duration-200',
          isExecuting && 'animate-pulse',
          'hover:stroke-blue-400'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        strokeDasharray={isExecuting ? '5,5' : undefined}
      />

      {/* Arrow head */}
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={
              isSelected 
                ? '#3b82f6' 
                : isExecuting 
                  ? '#10b981' 
                  : hasExecuted 
                    ? '#6b7280' 
                    : '#d1d5db'
            }
          />
        </marker>
      </defs>
      
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={2}
        fill="none"
        markerEnd={`url(#arrowhead-${connection.id})`}
      />

      {/* Execution indicator */}
      {(isExecuting || hasExecuted) && (
        <circle
          cx={midX}
          cy={midY}
          r="4"
          fill={isExecuting ? '#10b981' : '#6b7280'}
          className={isExecuting ? 'animate-ping' : ''}
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={midX}
          cy={midY}
          r="6"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="2,2"
          className="animate-spin"
          style={{ animationDuration: '3s' }}
        />
      )}
    </g>
  );
}