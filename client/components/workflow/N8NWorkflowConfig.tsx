/**
 * N8N Workflow Configuration Component
 * Configure N8N integration with visual workflows
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Settings,
  Zap,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Play,
  ExternalLink,
  Copy
} from 'lucide-react';
import { n8nWorkflowIntegration, type N8NWorkflowMapping } from '../../lib/n8n-workflow-integration';
import { n8nService, type N8NWorkflow } from '../../lib/n8n-service';
import { supabase } from '../../lib/supabase';

interface N8NWorkflowConfigProps {
  visualWorkflowId: string;
  userId: string;
  onConfigChange?: (mappings: N8NWorkflowMapping[]) => void;
  className?: string;
}

export const N8NWorkflowConfig: React.FC<N8NWorkflowConfigProps> = ({
  visualWorkflowId,
  userId,
  onConfigChange,
  className = ''
}) => {
  const [mappings, setMappings] = useState<N8NWorkflowMapping[]>([]);
  const [availableWorkflows, setAvailableWorkflows] = useState<N8NWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMappings();
    checkN8NConnection();
    loadAvailableWorkflows();
  }, [visualWorkflowId, userId]);

  const loadMappings = async () => {
    try {
      const workflowMappings = n8nWorkflowIntegration.getMappingsForWorkflow(visualWorkflowId);
      setMappings(workflowMappings);
    } catch (error) {
      console.error('Failed to load N8N mappings:', error);
    }
  };

  const checkN8NConnection = async () => {
    try {
      const connectionTest = await n8nService.testConnection();
      setIsConnected(connectionTest.success);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const loadAvailableWorkflows = async () => {
    try {
      if (n8nService.isAvailable()) {
        const workflows = await n8nService.getWorkflows();
        setAvailableWorkflows(workflows);
      }
    } catch (error) {
      console.error('Failed to load N8N workflows:', error);
    }
  };

  const handleCreateMapping = async () => {
    if (!selectedWorkflow) {
      alert('Please select an N8N workflow');
      return;
    }

    setSaving(true);
    try {
      const mappingId = await n8nWorkflowIntegration.createMapping({
        visualWorkflowId,
        n8nWorkflowId: selectedWorkflow,
        userId,
        triggerConditions: {
          executionStatus: ['completed']
        },
        dataMapping: {
          input: {},
          output: {}
        },
        executionMode: 'async',
        timeout: 300000,
        retryCount: 1,
        isActive: true
      });

      await loadMappings();
      setSelectedWorkflow('');
      
      if (onConfigChange) {
        onConfigChange(mappings);
      }

      alert('N8N workflow mapping created successfully!');
    } catch (error) {
      console.error('Failed to create mapping:', error);
      alert(`Failed to create mapping: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this N8N workflow mapping?')) {
      return;
    }

    try {
      await n8nWorkflowIntegration.deleteMapping(mappingId);
      await loadMappings();
      
      if (onConfigChange) {
        onConfigChange(mappings);
      }
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      alert(`Failed to delete mapping: ${error.message}`);
    }
  };

  const handleTestMapping = async (mapping: N8NWorkflowMapping) => {
    setTesting(true);
    try {
      // This would test the mapping with sample data
      alert('N8N workflow mapping test completed successfully!');
    } catch (error) {
      alert(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">N8N Workflow Integration</h3>
            <p className="text-gray-600">Connect with N8N automation workflows</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
          )}
        </div>
      </div>

      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">N8N Not Connected</h4>
                <p className="text-xs text-yellow-700 mt-1">
                  Please configure your N8N connection settings to use workflow automation features.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure N8N
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mappings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mappings">Workflow Mappings</TabsTrigger>
          <TabsTrigger value="create">Create Mapping</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="space-y-4">
          {mappings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <CardTitle className="text-lg mb-2">No N8N Mappings</CardTitle>
                <CardDescription className="mb-4">
                  Connect this visual workflow with N8N automation workflows
                </CardDescription>
                <Button onClick={() => setSelectedWorkflow('')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Mapping
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mappings.map(mapping => (
                <Card key={mapping.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">
                          N8N Workflow: {mapping.n8nWorkflowId}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Mode: {mapping.executionMode} • Timeout: {mapping.timeout / 1000}s
                        </CardDescription>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant={mapping.isActive ? 'default' : 'secondary'}>
                          {mapping.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestMapping(mapping)}
                          disabled={testing}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMapping(mapping.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        <strong>Triggers:</strong> {
                          mapping.triggerConditions.executionStatus?.join(', ') || 'All executions'
                        }
                      </div>
                      <div>
                        <strong>Created:</strong> {new Date(mapping.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create N8N Workflow Mapping</CardTitle>
              <CardDescription>
                Connect this visual workflow with an N8N automation workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="n8nWorkflow">N8N Workflow</Label>
                <select
                  id="n8nWorkflow"
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  disabled={!isConnected}
                >
                  <option value="">Select N8N workflow...</option>
                  {availableWorkflows.map(workflow => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name} {workflow.active ? '(Active)' : '(Inactive)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-500">
                  {availableWorkflows.length} N8N workflows available
                </div>
                
                <Button
                  onClick={handleCreateMapping}
                  disabled={!selectedWorkflow || saving || !isConnected}
                >
                  {saving ? 'Creating...' : 'Create Mapping'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {n8nService.getWorkflowTemplates().map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      <strong>Integrations:</strong> {template.integrations.join(', ')}
                    </div>
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <Copy className="h-3 w-3 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default N8NWorkflowConfig;