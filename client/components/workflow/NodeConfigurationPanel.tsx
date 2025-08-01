/**
 * Node Configuration Panel
 * Unified configuration interface for all workflow node types
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Settings, 
  Info, 
  TestTube, 
  Save, 
  X,
  AlertTriangle,
  CheckCircle,
  Code,
  Zap,
  RotateCcw,
  Filter
} from 'lucide-react';

// Import configuration components
import ConditionBuilder from './ConditionBuilder';
import LoopConfiguration from './LoopConfiguration';
import DataTransformConfiguration from './DataTransformConfiguration';

// Import node types
import { ConditionalLogicNode } from '../../lib/workflow-nodes/conditional-logic-node';
import { LoopNode } from '../../lib/workflow-nodes/loop-node';
import { DataTransformNode } from '../../lib/workflow-nodes/data-transform-node';
import { JSNode } from '../../lib/workflow-nodes/js-node';
import { SubworkflowNode } from '../../lib/workflow-nodes/subworkflow-node';

interface NodeConfigurationPanelProps {
  node: any; // BaseNode or specific node type
  onConfigChange: (config: any) => void;
  onClose: () => void;
  onSave: () => void;
  onTest?: () => void;
  availableFields?: string[];
  className?: string;
}

export const NodeConfigurationPanel: React.FC<NodeConfigurationPanelProps> = ({
  node,
  onConfigChange,
  onClose,
  onSave,
  onTest,
  availableFields = [],
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('config');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<any>(null);

  const handleConfigChange = (newConfig: any) => {
    onConfigChange(newConfig);
    
    // Validate configuration
    if (node.validate) {
      const validation = node.validate();
      setValidationErrors(validation.errors || []);
    }
  };

  const handleTest = async () => {
    if (onTest) {
      try {
        const result = await onTest();
        setTestResult(result);
      } catch (error) {
        setTestResult({ error: error.message });
      }
    }
  };

  const renderBasicConfiguration = () => (
    <div className="space-y-4">
      {/* Node Name */}
      <div>
        <Label htmlFor="nodeName">Node Name</Label>
        <Input
          id="nodeName"
          value={node.name || ''}
          onChange={(e) => handleConfigChange({ ...node.config, name: e.target.value })}
          placeholder="Enter node name..."
          className="mt-1"
        />
      </div>

      {/* Node Description */}
      <div>
        <Label htmlFor="nodeDescription">Description</Label>
        <Input
          id="nodeDescription"
          value={node.description || ''}
          onChange={(e) => handleConfigChange({ ...node.config, description: e.target.value })}
          placeholder="Enter node description..."
          className="mt-1"
        />
      </div>

      {/* Node-specific basic settings */}
      {renderNodeSpecificBasicConfig()}
    </div>
  );

  const renderNodeSpecificBasicConfig = () => {
    switch (node.type) {
      case 'javascript':
        return (
          <div>
            <Label htmlFor="jsCode">JavaScript Code</Label>
            <textarea
              id="jsCode"
              value={node.config?.code || ''}
              onChange={(e) => handleConfigChange({ ...node.config, code: e.target.value })}
              placeholder="// Your JavaScript code here\nreturn data;"
              className="w-full mt-1 px-3 py-2 border rounded-md font-mono text-sm"
              rows={8}
            />
          </div>
        );

      case 'subworkflow':
        return (
          <div>
            <Label htmlFor="subworkflowId">Subworkflow ID</Label>
            <Input
              id="subworkflowId"
              value={node.config?.subworkflowId || ''}
              onChange={(e) => handleConfigChange({ ...node.config, subworkflowId: e.target.value })}
              placeholder="Enter subworkflow ID..."
              className="mt-1"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderAdvancedConfiguration = () => {
    switch (node.type) {
      case 'conditional_logic':
        return (
          <ConditionBuilder
            conditionGroups={node.config?.conditionGroups || []}
            onConditionGroupsChange={(groups) => 
              handleConfigChange({ ...node.config, conditionGroups: groups })
            }
            availableFields={availableFields}
          />
        );

      case 'loop':
        return (
          <LoopConfiguration
            config={node.config || {}}
            onConfigChange={handleConfigChange}
            availableFields={availableFields}
          />
        );

      case 'data_transform':
        return (
          <DataTransformConfiguration
            config={node.config || { operations: [], preserveOriginal: true, validateSchema: false }}
            onConfigChange={handleConfigChange}
            availableFields={availableFields}
          />
        );

      case 'javascript':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="timeout">Execution Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={node.config?.timeout || 5000}
                onChange={(e) => handleConfigChange({ 
                  ...node.config, 
                  timeout: parseInt(e.target.value) || 5000 
                })}
                min={100}
                max={60000}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Sandboxed Execution</Label>
                <p className="text-xs text-gray-500">Run code in isolated environment</p>
              </div>
              <Button
                variant={node.config?.sandboxed ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleConfigChange({ 
                  ...node.config, 
                  sandboxed: !node.config?.sandboxed 
                })}
              >
                {node.config?.sandboxed ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            <div>
              <Label htmlFor="returnVariable">Return Variable Name</Label>
              <Input
                id="returnVariable"
                value={node.config?.returnVariable || 'result'}
                onChange={(e) => handleConfigChange({ 
                  ...node.config, 
                  returnVariable: e.target.value 
                })}
                placeholder="result"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'subworkflow':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="subworkflowName">Subworkflow Name</Label>
              <Input
                id="subworkflowName"
                value={node.config?.subworkflowName || ''}
                onChange={(e) => handleConfigChange({ 
                  ...node.config, 
                  subworkflowName: e.target.value 
                })}
                placeholder="Enter display name..."
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Isolate Variables</Label>
                <p className="text-xs text-gray-500">Keep subworkflow variables separate</p>
              </div>
              <Button
                variant={node.config?.isolateVariables ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleConfigChange({ 
                  ...node.config, 
                  isolateVariables: !node.config?.isolateVariables 
                })}
              >
                {node.config?.isolateVariables ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            <div>
              <Label htmlFor="retryCount">Retry Count</Label>
              <Input
                id="retryCount"
                type="number"
                value={node.config?.retryCount || 0}
                onChange={(e) => handleConfigChange({ 
                  ...node.config, 
                  retryCount: parseInt(e.target.value) || 0 
                })}
                min={0}
                max={10}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="retryDelay">Retry Delay (ms)</Label>
              <Input
                id="retryDelay"
                type="number"
                value={node.config?.retryDelay || 1000}
                onChange={(e) => handleConfigChange({ 
                  ...node.config, 
                  retryDelay: parseInt(e.target.value) || 1000 
                })}
                min={0}
                className="mt-1"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-400">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No advanced configuration available</p>
          </div>
        );
    }
  };

  const renderTestResults = () => (
    <div className="space-y-4">
      {!testResult ? (
        <div className="text-center py-8">
          <TestTube className="h-8 w-8 mx-auto mb-4 text-gray-300" />
          <p className="text-sm text-gray-500 mb-4">
            Test your node configuration with sample data
          </p>
          <Button onClick={handleTest} disabled={!onTest}>
            <TestTube className="h-4 w-4 mr-2" />
            Run Test
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            {testResult.error ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <h4 className="font-medium">
              {testResult.error ? 'Test Failed' : 'Test Successful'}
            </h4>
          </div>

          <Card className={testResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <CardContent className="pt-4">
              <pre className="text-xs overflow-auto max-h-64">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            className="mt-4"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Run Test Again
          </Button>
        </div>
      )}
    </div>
  );

  const getNodeIcon = () => {
    const icons = {
      conditional_logic: Filter,
      loop: RotateCcw,
      data_transform: Zap,
      javascript: Code,
      subworkflow: Settings
    };
    return icons[node.type] || Settings;
  };

  const NodeIcon = getNodeIcon();

  return (
    <div className={`bg-white border-l shadow-lg ${className}`} style={{ width: '400px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <NodeIcon className="h-5 w-5 text-gray-500" />
          <div>
            <h3 className="font-medium">{node.name || 'Configure Node'}</h3>
            <p className="text-sm text-gray-500">
              {node.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 border-b bg-red-50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Configuration Errors</h4>
              <ul className="text-xs text-red-700 mt-1 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 m-4">
            <TabsTrigger value="config" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="test" className="text-xs">
              <TestTube className="h-3 w-3 mr-1" />
              Test
            </TabsTrigger>
          </TabsList>

          <div className="px-4 pb-4">
            <TabsContent value="config" className="mt-0">
              {renderBasicConfiguration()}
            </TabsContent>

            <TabsContent value="advanced" className="mt-0">
              {renderAdvancedConfiguration()}
            </TabsContent>

            <TabsContent value="test" className="mt-0">
              {renderTestResults()}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          {validationErrors.length === 0 ? (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Valid
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {validationErrors.length} Error{validationErrors.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={onSave}
            disabled={validationErrors.length > 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NodeConfigurationPanel;