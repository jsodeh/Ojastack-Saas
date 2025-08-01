/**
 * Advanced Workflow Demo
 * Demonstrates usage of advanced workflow nodes with configuration
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Code, 
  RotateCcw, 
  Filter, 
  Zap, 
  Settings,
  Play,
  Eye
} from 'lucide-react';

// Import advanced nodes
import { ConditionalLogicNode } from '../../lib/workflow-nodes/conditional-logic-node';
import { LoopNode } from '../../lib/workflow-nodes/loop-node';
import { DataTransformNode } from '../../lib/workflow-nodes/data-transform-node';
import { JSNode } from '../../lib/workflow-nodes/js-node';
import { SubworkflowNode } from '../../lib/workflow-nodes/subworkflow-node';

// Import configuration components
import ConditionBuilder from './ConditionBuilder';
import LoopConfiguration from './LoopConfiguration';
import DataTransformConfiguration from './DataTransformConfiguration';
import NodeConfigurationPanel from './NodeConfigurationPanel';

export const AdvancedWorkflowDemo: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Create demo instances of advanced nodes
  const demoNodes = {
    conditionalLogic: new ConditionalLogicNode('demo-conditional', { x: 100, y: 100 }),
    loop: new LoopNode('demo-loop', { x: 100, y: 200 }),
    dataTransform: new DataTransformNode('demo-transform', { x: 100, y: 300 }),
    javascript: new JSNode('demo-js', { x: 100, y: 400 }),
    subworkflow: new SubworkflowNode('demo-subworkflow', { x: 100, y: 500 })
  };

  const nodeDescriptions = {
    conditionalLogic: {
      title: 'Conditional Logic Node',
      description: 'Build complex conditional expressions with multiple condition groups',
      icon: Filter,
      color: 'bg-yellow-100 text-yellow-800',
      features: [
        'Multiple condition groups with AND/OR logic',
        'Support for various data types (string, number, boolean, date)',
        'Advanced operators (contains, regex, ranges)',
        'Visual condition builder interface'
      ]
    },
    loop: {
      title: 'Loop Node',
      description: 'Iterate over data with various loop types and advanced controls',
      icon: RotateCcw,
      color: 'bg-blue-100 text-blue-800',
      features: [
        'Multiple loop types (for-each, while, for-range, until)',
        'Parallel execution with concurrency control',
        'Batch processing capabilities',
        'Error handling and retry logic'
      ]
    },
    dataTransform: {
      title: 'Data Transform Node',
      description: 'Transform and manipulate data with multiple operations',
      icon: Zap,
      color: 'bg-green-100 text-green-800',
      features: [
        'Multiple transformation operations',
        'Data mapping, filtering, and sorting',
        'Format conversion and validation',
        'Custom JavaScript transformations'
      ]
    },
    javascript: {
      title: 'JavaScript Node',
      description: 'Execute custom JavaScript code with sandboxing',
      icon: Code,
      color: 'bg-purple-100 text-purple-800',
      features: [
        'Sandboxed JavaScript execution',
        'Configurable timeout and security',
        'Access to workflow data and variables',
        'Syntax validation and error handling'
      ]
    },
    subworkflow: {
      title: 'Subworkflow Node',
      description: 'Execute nested workflows with data mapping',
      icon: Settings,
      color: 'bg-gray-100 text-gray-800',
      features: [
        'Nested workflow execution',
        'Input/output data mapping',
        'Variable isolation options',
        'Retry logic and error handling'
      ]
    }
  };

  const handleDemoSelect = (nodeType: string) => {
    setSelectedDemo(nodeType);
    setShowConfig(true);
  };

  const renderNodeCard = (nodeType: string, info: any) => {
    const Icon = info.icon;
    
    return (
      <Card key={nodeType} className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${info.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{info.title}</CardTitle>
                <CardDescription className="text-sm">
                  {info.description}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Advanced
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Key Features:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {info.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDemoSelect(nodeType)}
                className="flex-1"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Demo execution
                  console.log(`Executing ${nodeType} demo`);
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Demo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Advanced Workflow Nodes</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore powerful workflow nodes that enable complex data processing, 
          conditional logic, loops, and custom JavaScript execution.
        </p>
      </div>

      {/* Node Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(nodeDescriptions).map(([nodeType, info]) =>
          renderNodeCard(nodeType, info)
        )}
      </div>

      {/* Configuration Panel */}
      {showConfig && selectedDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex">
              {/* Main Content */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {nodeDescriptions[selectedDemo].title} Configuration
                    </h2>
                    <p className="text-gray-600">
                      Configure the advanced settings for this node type
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfig(false);
                      setSelectedDemo(null);
                    }}
                  >
                    Close
                  </Button>
                </div>

                {/* Render appropriate configuration component */}
                {selectedDemo === 'conditionalLogic' && (
                  <ConditionBuilder
                    conditionGroups={demoNodes.conditionalLogic.config.conditionGroups || []}
                    onConditionGroupsChange={(groups) => {
                      demoNodes.conditionalLogic.config.conditionGroups = groups;
                    }}
                    availableFields={['user.name', 'user.email', 'message.text', 'timestamp', 'status']}
                  />
                )}

                {selectedDemo === 'loop' && (
                  <LoopConfiguration
                    config={demoNodes.loop.config}
                    onConfigChange={(config) => {
                      demoNodes.loop.config = config;
                    }}
                    availableFields={['items', 'users', 'messages', 'data']}
                  />
                )}

                {selectedDemo === 'dataTransform' && (
                  <DataTransformConfiguration
                    config={demoNodes.dataTransform.config}
                    onConfigChange={(config) => {
                      demoNodes.dataTransform.config = config;
                    }}
                    availableFields={['name', 'email', 'age', 'status', 'created_at']}
                  />
                )}

                {selectedDemo === 'javascript' && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">JavaScript Code Editor</CardTitle>
                        <CardDescription>
                          Write custom JavaScript code to process workflow data
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <textarea
                          value={demoNodes.javascript.config.code}
                          onChange={(e) => {
                            demoNodes.javascript.config.code = e.target.value;
                          }}
                          className="w-full h-64 p-3 border rounded-md font-mono text-sm"
                          placeholder="// Your JavaScript code here\n// Available variables: data, variables, console\n\nreturn {\n  processed: true,\n  result: data.map(item => ({ ...item, processed: true }))\n};"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Execution Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Timeout (ms)
                          </label>
                          <input
                            type="number"
                            value={demoNodes.javascript.config.timeout}
                            onChange={(e) => {
                              demoNodes.javascript.config.timeout = parseInt(e.target.value) || 5000;
                            }}
                            className="w-full px-3 py-2 border rounded-md"
                            min="100"
                            max="60000"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Sandboxed Execution</label>
                            <p className="text-xs text-gray-500">Run code in isolated environment</p>
                          </div>
                          <Button
                            variant={demoNodes.javascript.config.sandboxed ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              demoNodes.javascript.config.sandboxed = !demoNodes.javascript.config.sandboxed;
                            }}
                          >
                            {demoNodes.javascript.config.sandboxed ? 'Enabled' : 'Disabled'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedDemo === 'subworkflow' && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Subworkflow Settings</CardTitle>
                        <CardDescription>
                          Configure nested workflow execution
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Subworkflow ID
                          </label>
                          <input
                            type="text"
                            value={demoNodes.subworkflow.config.subworkflowId}
                            onChange={(e) => {
                              demoNodes.subworkflow.config.subworkflowId = e.target.value;
                            }}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Enter subworkflow ID..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={demoNodes.subworkflow.config.subworkflowName || ''}
                            onChange={(e) => {
                              demoNodes.subworkflow.config.subworkflowName = e.target.value;
                            }}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Enter display name..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Retry Count
                            </label>
                            <input
                              type="number"
                              value={demoNodes.subworkflow.config.retryCount}
                              onChange={(e) => {
                                demoNodes.subworkflow.config.retryCount = parseInt(e.target.value) || 0;
                              }}
                              className="w-full px-3 py-2 border rounded-md"
                              min="0"
                              max="10"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Retry Delay (ms)
                            </label>
                            <input
                              type="number"
                              value={demoNodes.subworkflow.config.retryDelay}
                              onChange={(e) => {
                                demoNodes.subworkflow.config.retryDelay = parseInt(e.target.value) || 1000;
                              }}
                              className="w-full px-3 py-2 border rounded-md"
                              min="0"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Isolate Variables</label>
                            <p className="text-xs text-gray-500">Keep subworkflow variables separate</p>
                          </div>
                          <Button
                            variant={demoNodes.subworkflow.config.isolateVariables ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              demoNodes.subworkflow.config.isolateVariables = !demoNodes.subworkflow.config.isolateVariables;
                            }}
                          >
                            {demoNodes.subworkflow.config.isolateVariables ? 'Enabled' : 'Disabled'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Usage Examples</CardTitle>
          <CardDescription>
            Common scenarios where advanced workflow nodes are useful
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Data Processing Pipeline</h4>
              <p className="text-sm text-gray-600">
                Use Data Transform → Loop → Conditional Logic to process large datasets 
                with complex business rules and transformations.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">Transform</Badge>
                <Badge variant="outline" className="text-xs">Loop</Badge>
                <Badge variant="outline" className="text-xs">Conditional</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Custom Business Logic</h4>
              <p className="text-sm text-gray-600">
                Combine JavaScript Node with Conditional Logic to implement 
                complex business rules that can't be expressed with standard nodes.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">JavaScript</Badge>
                <Badge variant="outline" className="text-xs">Conditional</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Modular Workflows</h4>
              <p className="text-sm text-gray-600">
                Use Subworkflow Nodes to create reusable workflow components 
                and build complex systems from smaller, manageable pieces.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">Subworkflow</Badge>
                <Badge variant="outline" className="text-xs">Modular</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Batch Processing</h4>
              <p className="text-sm text-gray-600">
                Use Loop Node with parallel execution and batch processing 
                to handle large volumes of data efficiently.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">Loop</Badge>
                <Badge variant="outline" className="text-xs">Parallel</Badge>
                <Badge variant="outline" className="text-xs">Batch</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedWorkflowDemo;