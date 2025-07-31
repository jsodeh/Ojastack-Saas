import React, { useState, useEffect } from 'react';
import { n8nService, type N8NWorkflow, type WorkflowTemplate } from '../lib/n8n-service';
import { n8nIntegration, type WorkflowTrigger, type WorkflowExecution } from '../lib/n8n-integration';

interface WorkflowManagerProps {
  agentId?: string;
  onWorkflowCreated?: (workflow: N8NWorkflow) => void;
  onWorkflowExecuted?: (executionId: string) => void;
}

const WorkflowManager: React.FC<WorkflowManagerProps> = ({
  agentId,
  onWorkflowCreated,
  onWorkflowExecuted
}) => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'executions' | 'triggers'>('workflows');
  const [workflows, setWorkflows] = useState<N8NWorkflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [triggers, setTriggers] = useState<WorkflowTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8NWorkflow | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [integrationStats, setIntegrationStats] = useState<any>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [agentId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load workflows
      if (n8nService.isAvailable()) {
        const workflowData = await n8nService.getWorkflows();
        setWorkflows(workflowData);
      }

      // Load templates
      const templateData = n8nService.getWorkflowTemplates();
      setTemplates(templateData);

      // Load executions
      if (agentId) {
        const executionData = n8nIntegration.getAgentExecutions(agentId);
        setExecutions(executionData);
      }

      // Load triggers
      const triggerData = n8nIntegration.getTriggers();
      setTriggers(triggerData);

      // Load integration stats
      const stats = n8nIntegration.getIntegrationStats();
      setIntegrationStats(stats);

    } catch (error) {
      console.error('Failed to load workflow data:', error);
      setError('Failed to load workflow data. Please check your N8N connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkflowFromTemplate = async (template: WorkflowTemplate, variables: Record<string, any>) => {
    if (!agentId) {
      setError('Agent ID is required to create workflows');
      return;
    }

    setIsLoading(true);
    try {
      const workflow = await n8nIntegration.createAgentWorkflow(
        agentId,
        template.id,
        variables
      );
      
      setWorkflows(prev => [...prev, workflow]);
      setShowCreateDialog(false);
      onWorkflowCreated?.(workflow);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      setError('Failed to create workflow. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    if (!agentId) {
      setError('Agent ID is required to execute workflows');
      return;
    }

    setIsLoading(true);
    try {
      const executionId = await n8nIntegration.executeWorkflow(
        workflowId,
        `conversation-${Date.now()}`, // Mock conversation ID
        { manualExecution: true }
      );
      
      onWorkflowExecuted?.(executionId);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      setError('Failed to execute workflow. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWorkflowActive = async (workflowId: string, active: boolean) => {
    setIsLoading(true);
    try {
      await n8nService.setWorkflowActive(workflowId, active);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      setError('Failed to update workflow status.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'error':
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'waiting':
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Workflow Manager</h2>
            <p className="text-gray-600 mt-1">Manage N8N workflows and automation</p>
          </div>
          
          {integrationStats && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{integrationStats.totalExecutions}</div>
                <div className="text-gray-500">Executions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{integrationStats.activeTriggers}</div>
                <div className="text-gray-500">Active Triggers</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mt-6">
          <nav className="flex space-x-8">
            {[
              { id: 'workflows', label: 'Workflows', count: workflows.length },
              { id: 'templates', label: 'Templates', count: templates.length },
              { id: 'executions', label: 'Executions', count: executions.length },
              { id: 'triggers', label: 'Triggers', count: triggers.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Active Workflows</h3>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!agentId}
              >
                Create Workflow
              </button>
            </div>

            {workflows.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">⚙️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
                <p className="text-gray-500 mb-4">Create your first workflow from a template</p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={!agentId}
                >
                  Create Workflow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 truncate">{workflow.name}</h4>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        workflow.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-3">
                      <div>Nodes: {workflow.nodes?.length || 0}</div>
                      <div>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => executeWorkflow(workflow.id)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        disabled={isLoading}
                      >
                        Execute
                      </button>
                      <button
                        onClick={() => toggleWorkflowActive(workflow.id, !workflow.active)}
                        className={`flex-1 px-3 py-2 text-sm rounded ${
                          workflow.active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                        disabled={isLoading}
                      >
                        {workflow.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Workflow Templates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 mb-3">
                    <div>Category: {template.category}</div>
                    <div>Variables: {template.variables.length}</div>
                    <div>Integrations: {template.integrations.join(', ')}</div>
                  </div>

                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    disabled={!agentId}
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executions Tab */}
        {activeTab === 'executions' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Executions</h3>
            
            {executions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No executions yet</h3>
                <p className="text-gray-500">Workflow executions will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workflow
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {executions.slice(0, 10).map((execution) => (
                      <tr key={execution.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {execution.workflowId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                            {execution.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {execution.startedAt.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {execution.completedAt 
                            ? formatDuration(execution.completedAt.getTime() - execution.startedAt.getTime())
                            : 'Running...'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {execution.status === 'running' && (
                            <button
                              onClick={() => n8nIntegration.cancelExecution(execution.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Triggers Tab */}
        {activeTab === 'triggers' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Workflow Triggers</h3>
            
            {triggers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">⚡</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No triggers configured</h3>
                <p className="text-gray-500">Triggers will be created automatically when you set up workflows</p>
              </div>
            ) : (
              <div className="space-y-3">
                {triggers.map((trigger) => (
                  <div key={trigger.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{trigger.name}</h4>
                        <p className="text-sm text-gray-600">{trigger.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>Type: {trigger.type}</span>
                          <span>Workflow: {trigger.workflowId}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trigger.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {trigger.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                        <button
                          onClick={() => n8nIntegration.setTriggerEnabled(trigger.id, !trigger.enabled)}
                          className={`px-3 py-1 text-xs rounded ${
                            trigger.enabled
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {trigger.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Selection Dialog */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configure {selectedTemplate.name}
            </h3>
            
            <div className="space-y-4">
              {selectedTemplate.variables.map((variable) => (
                <div key={variable.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {variable.name}
                    {variable.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={variable.type === 'number' ? 'number' : 'text'}
                    placeholder={variable.description}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                </div>
              ))}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // This would collect form data and create the workflow
                  createWorkflowFromTemplate(selectedTemplate, {});
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={isLoading}
              >
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowManager;