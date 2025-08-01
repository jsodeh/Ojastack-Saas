/**
 * Data Transform Configuration Component
 * Visual interface for configuring data transformation operations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowRight,
  Code,
  Filter,
  Shuffle,
  Calculator,
  Type,
  Calendar,
  Hash,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  DataTransformNodeConfig, 
  TransformOperation, 
  TransformOperationType 
} from '../../lib/workflow-nodes/data-transform-node';

interface DataTransformConfigurationProps {
  config: DataTransformNodeConfig;
  onConfigChange: (config: DataTransformNodeConfig) => void;
  availableFields: string[];
  className?: string;
}

export const DataTransformConfiguration: React.FC<DataTransformConfigurationProps> = ({
  config,
  onConfigChange,
  availableFields,
  className = ''
}) => {
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const updateConfig = (updates: Partial<DataTransformNodeConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const addOperation = () => {
    const newOperation: TransformOperation = {
      id: crypto.randomUUID(),
      type: 'map',
      enabled: true,
      sourceField: '',
      targetField: '',
      expression: ''
    };

    updateConfig({
      operations: [...config.operations, newOperation]
    });
  };

  const removeOperation = (operationId: string) => {
    updateConfig({
      operations: config.operations.filter(op => op.id !== operationId)
    });
  };

  const updateOperation = (operationId: string, updates: Partial<TransformOperation>) => {
    updateConfig({
      operations: config.operations.map(op =>
        op.id === operationId ? { ...op, ...updates } : op
      )
    });
  };

  const duplicateOperation = (operationId: string) => {
    const operation = config.operations.find(op => op.id === operationId);
    if (operation) {
      const duplicated: TransformOperation = {
        ...operation,
        id: crypto.randomUUID(),
        targetField: `${operation.targetField}_copy`
      };
      
      updateConfig({
        operations: [...config.operations, duplicated]
      });
    }
  };

  const moveOperation = (operationId: string, direction: 'up' | 'down') => {
    const currentIndex = config.operations.findIndex(op => op.id === operationId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= config.operations.length) return;

    const newOperations = [...config.operations];
    [newOperations[currentIndex], newOperations[newIndex]] = 
    [newOperations[newIndex], newOperations[currentIndex]];

    updateConfig({ operations: newOperations });
  };

  const getOperationIcon = (type: TransformOperationType) => {
    const icons = {
      map: ArrowRight,
      filter: Filter,
      sort: Shuffle,
      group: Hash,
      aggregate: Calculator,
      format: Type,
      date: Calendar,
      custom: Code
    };
    return icons[type] || Code;
  };

  const getOperationDescription = (type: TransformOperationType) => {
    const descriptions = {
      map: 'Transform field values',
      filter: 'Filter data based on conditions',
      sort: 'Sort data by field values',
      group: 'Group data by field values',
      aggregate: 'Calculate aggregated values',
      format: 'Format field values',
      date: 'Transform date/time values',
      custom: 'Custom JavaScript transformation'
    };
    return descriptions[type] || 'Custom transformation';
  };

  const renderOperationConfiguration = (operation: TransformOperation) => {
    const Icon = getOperationIcon(operation.type);

    return (
      <Card key={operation.id} className={`mb-4 ${!operation.enabled ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-sm">
                {operation.type.charAt(0).toUpperCase() + operation.type.slice(1)} Operation
              </CardTitle>
              <Badge variant={operation.enabled ? 'default' : 'secondary'} className="text-xs">
                {operation.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateOperation(operation.id, { enabled: !operation.enabled })}
                className="p-1"
              >
                {operation.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => duplicateOperation(operation.id)}
                className="p-1"
              >
                <Copy className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeOperation(operation.id)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <CardDescription className="text-xs">
            {getOperationDescription(operation.type)}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Operation Type */}
            <div>
              <Label className="text-sm">Operation Type</Label>
              <select
                value={operation.type}
                onChange={(e) => updateOperation(operation.id, { 
                  type: e.target.value as TransformOperationType 
                })}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              >
                <option value="map">Map - Transform Values</option>
                <option value="filter">Filter - Filter Data</option>
                <option value="sort">Sort - Sort Data</option>
                <option value="group">Group - Group Data</option>
                <option value="aggregate">Aggregate - Calculate Values</option>
                <option value="format">Format - Format Values</option>
                <option value="date">Date - Date Operations</option>
                <option value="custom">Custom - JavaScript Code</option>
              </select>
            </div>

            {/* Source Field */}
            {['map', 'filter', 'sort', 'format', 'date'].includes(operation.type) && (
              <div>
                <Label className="text-sm">Source Field</Label>
                <select
                  value={operation.sourceField || ''}
                  onChange={(e) => updateOperation(operation.id, { sourceField: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Select source field...</option>
                  {availableFields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Field */}
            {['map', 'format', 'date', 'aggregate'].includes(operation.type) && (
              <div>
                <Label className="text-sm">Target Field</Label>
                <Input
                  value={operation.targetField || ''}
                  onChange={(e) => updateOperation(operation.id, { targetField: e.target.value })}
                  placeholder="Enter target field name..."
                  className="mt-1 text-sm"
                />
              </div>
            )}

            {/* Expression/Configuration */}
            <div>
              <Label className="text-sm">
                {operation.type === 'custom' ? 'JavaScript Code' : 
                 operation.type === 'filter' ? 'Filter Condition' :
                 operation.type === 'sort' ? 'Sort Configuration' :
                 operation.type === 'group' ? 'Group By Field' :
                 operation.type === 'aggregate' ? 'Aggregation Function' :
                 'Transformation Expression'}
              </Label>
              
              {operation.type === 'custom' ? (
                <Textarea
                  value={operation.expression || ''}
                  onChange={(e) => updateOperation(operation.id, { expression: e.target.value })}
                  placeholder="// JavaScript code to transform data\nreturn data.map(item => ({ ...item, newField: item.oldField * 2 }));"
                  className="mt-1 font-mono text-sm"
                  rows={4}
                />
              ) : operation.type === 'filter' ? (
                <Textarea
                  value={operation.expression || ''}
                  onChange={(e) => updateOperation(operation.id, { expression: e.target.value })}
                  placeholder="item => item.status === 'active'"
                  className="mt-1 font-mono text-sm"
                  rows={2}
                />
              ) : operation.type === 'sort' ? (
                <div className="space-y-2">
                  <Input
                    value={operation.expression || ''}
                    onChange={(e) => updateOperation(operation.id, { expression: e.target.value })}
                    placeholder="field1,field2:desc"
                    className="mt-1 text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Comma-separated fields. Add :desc for descending order
                  </p>
                </div>
              ) : operation.type === 'group' ? (
                <Input
                  value={operation.expression || ''}
                  onChange={(e) => updateOperation(operation.id, { expression: e.target.value })}
                  placeholder="category"
                  className="mt-1 text-sm"
                />
              ) : operation.type === 'aggregate' ? (
                <select
                  value={operation.expression || ''}
                  onChange={(e) => updateOperation(operation.id, { expression: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Select aggregation...</option>
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Count</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                  <option value="first">First</option>
                  <option value="last">Last</option>
                </select>
              ) : operation.type === 'format' ? (
                <select
                  value={operation.expression || ''}
                  onChange={(e) => updateOperation(operation.id, { expression: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Select format...</option>
                  <option value="uppercase">Uppercase</option>
                  <option value="lowercase">Lowercase</option>
                  <option value="capitalize">Capitalize</option>
                  <option value="trim">Trim Whitespace</option>
                  <option value="number">Parse Number</option>
                  <option value="string">Convert to String</option>
                  <option value="boolean">Convert to Boolean</option>
                </select>
              ) : operation.type === 'date' ? (
                <div className="space-y-2">
                  <select
                    value={operation.expression || ''}
                    onChange={(e) => updateOperation(operation.id, { expression: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Select date operation...</option>
                    <option value="format:YYYY-MM-DD">Format as YYYY-MM-DD</option>
                    <option value="format:MM/DD/YYYY">Format as MM/DD/YYYY</option>
                    <option value="format:DD/MM/YYYY">Format as DD/MM/YYYY</option>
                    <option value="timestamp">Convert to Timestamp</option>
                    <option value="iso">Convert to ISO String</option>
                    <option value="relative">Relative Time (e.g., "2 days ago")</option>
                    <option value="add:1:day">Add 1 Day</option>
                    <option value="subtract:1:day">Subtract 1 Day</option>
                  </select>
                </div>
              ) : (
                <Input
                  value={operation.expression || ''}
                  onChange={(e) => updateOperation(operation.id, { expression: e.target.value })}
                  placeholder="Enter transformation expression..."
                  className="mt-1 text-sm"
                />
              )}
            </div>

            {/* Operation-specific options */}
            {operation.type === 'map' && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <strong>Available variables:</strong> item (current item), index (current index), array (full array)
              </div>
            )}

            {operation.type === 'custom' && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <strong>Available variables:</strong> data (input data), variables (workflow variables), 
                Math, Date, JSON, String, Number, Boolean, Array, Object
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const generatePreview = () => {
    // Mock data for preview
    const mockData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, status: 'active', created: '2024-01-01' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, status: 'inactive', created: '2024-01-02' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, status: 'active', created: '2024-01-03' }
    ];

    // Simulate transformation (simplified)
    let transformedData = [...mockData];
    
    config.operations.filter(op => op.enabled).forEach(operation => {
      switch (operation.type) {
        case 'filter':
          if (operation.expression) {
            transformedData = transformedData.filter(item => 
              operation.expression.includes('active') ? item.status === 'active' : true
            );
          }
          break;
        case 'map':
          if (operation.sourceField && operation.targetField) {
            transformedData = transformedData.map(item => ({
              ...item,
              [operation.targetField]: `Transformed: ${item[operation.sourceField]}`
            }));
          }
          break;
        // Add more cases as needed
      }
    });

    setPreviewData(transformedData);
    setShowPreview(true);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Data Transform Configuration</h3>
          <p className="text-sm text-gray-500">
            Configure data transformation operations to modify workflow data
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={generatePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={addOperation} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Operation
          </Button>
        </div>
      </div>

      {/* Operations List */}
      {config.operations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Code className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <CardTitle className="text-lg mb-2">No Transform Operations</CardTitle>
            <CardDescription className="mb-4">
              Add transformation operations to modify your workflow data
            </CardDescription>
            <Button onClick={addOperation}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Operation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          {config.operations.map(operation => renderOperationConfiguration(operation))}
        </div>
      )}

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Global Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Preserve Original Data</Label>
                <p className="text-xs text-gray-500">Keep original fields alongside transformed ones</p>
              </div>
              <Button
                variant={config.preserveOriginal ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ preserveOriginal: !config.preserveOriginal })}
              >
                {config.preserveOriginal ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Validate Schema</Label>
                <p className="text-xs text-gray-500">Validate data structure after transformation</p>
              </div>
              <Button
                variant={config.validateSchema ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ validateSchema: !config.validateSchema })}
              >
                {config.validateSchema ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal/Panel */}
      {showPreview && previewData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Transformation Preview</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-white rounded border p-3 max-h-64 overflow-auto">
              <pre className="text-xs">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operation Summary */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Operations Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Operations:</span>
              <span className="font-medium">{config.operations.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Enabled Operations:</span>
              <span className="font-medium">{config.operations.filter(op => op.enabled).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Preserve Original:</span>
              <span className="font-medium">{config.preserveOriginal ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataTransformConfiguration;