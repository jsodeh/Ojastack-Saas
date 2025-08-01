import React, { useState, useEffect } from 'react';
import WorkflowManager from '../../components/WorkflowManager';
import { n8nService } from '../../lib/n8n-service';
import { n8nIntegration } from '../../lib/n8n-integration';

const WorkflowTest: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<any>(null);
    const [integrationTest, setIntegrationTest] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [testResults, setTestResults] = useState<string[]>([]);
    const [selectedAgentId] = useState('test-agent-123'); // Mock agent ID for testing

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setIsLoading(true);
        try {
            const status = await n8nService.testConnection();
            setConnectionStatus(status);

            if (status.success) {
                setTestResults(prev => [...prev, '✅ N8N connection successful']);
            } else {
                setTestResults(prev => [...prev, `❌ N8N connection failed: ${status.error}`]);
            }
        } catch (error) {
            setTestResults(prev => [...prev, `❌ Connection test failed: ${error}`]);
        } finally {
            setIsLoading(false);
        }
    };

    const runIntegrationTest = async () => {
        setIsLoading(true);
        setTestResults(prev => [...prev, '🧪 Running integration tests...']);

        try {
            const results = await n8nIntegration.testIntegration();
            setIntegrationTest(results);

            setTestResults(prev => [...prev,
            `N8N Connection: ${results.n8nConnection ? '✅' : '❌'}`,
            `Webhook Endpoint: ${results.webhookEndpoint ? '✅' : '❌'}`,
            `Workflow Execution: ${results.workflowExecution ? '✅' : '❌'}`
            ]);

            if (results.errors.length > 0) {
                results.errors.forEach(error => {
                    setTestResults(prev => [...prev, `❌ ${error}`]);
                });
            }
        } catch (error) {
            setTestResults(prev => [...prev, `❌ Integration test failed: ${error}`]);
        } finally {
            setIsLoading(false);
        }
    };

    const testWorkflowCreation = async () => {
        setIsLoading(true);
        setTestResults(prev => [...prev, '🔧 Testing workflow creation...']);

        try {
            // Test creating a workflow from template
            const workflow = await n8nIntegration.createAgentWorkflow(
                selectedAgentId,
                'lead-qualification',
                {
                    crmUrl: 'https://api.example-crm.com',
                    crmApiKey: 'test-api-key',
                    qualificationScore: 75,
                    salesTeamEmail: 'sales@example.com'
                },
                'Test Lead Qualification Workflow'
            );

            setTestResults(prev => [...prev,
            `✅ Workflow created: ${workflow.name}`,
            `Workflow ID: ${workflow.id}`
            ]);
        } catch (error) {
            setTestResults(prev => [...prev, `❌ Workflow creation failed: ${error}`]);
        } finally {
            setIsLoading(false);
        }
    };

    const testWorkflowExecution = async () => {
        setIsLoading(true);
        setTestResults(prev => [...prev, '▶️ Testing workflow execution...']);

        try {
            // Get first available workflow
            const workflows = await n8nService.getWorkflows();
            if (workflows.length === 0) {
                setTestResults(prev => [...prev, '❌ No workflows available for testing']);
                return;
            }

            const testWorkflow = workflows[0];
            const executionId = await n8nIntegration.executeWorkflow(
                testWorkflow.id,
                'test-conversation-123',
                {
                    testData: true,
                    timestamp: new Date().toISOString()
                }
            );

            setTestResults(prev => [...prev,
                `✅ Workflow execution started`,
            `Execution ID: ${executionId}`
            ]);
        } catch (error) {
            setTestResults(prev => [...prev, `❌ Workflow execution failed: ${error}`]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearResults = () => {
        setTestResults([]);
    };

    const getStatusColor = (success: boolean) => {
        return success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
    };

    return (
        <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">N8N Workflow Testing</h1>
                    <p className="mt-2 text-gray-600">
                        Test and manage N8N workflow integrations for automated agent processes.
                    </p>
                </div>

                {/* Connection Status */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Connection Status</h2>
                        <button
                            onClick={checkConnection}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>

                    {connectionStatus && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-4 rounded-lg ${getStatusColor(connectionStatus.success)}`}>
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">
                                        {connectionStatus.success ? '✅' : '❌'}
                                    </span>
                                    <div>
                                        <div className="font-semibold">N8N Service</div>
                                        <div className="text-sm">
                                            {connectionStatus.success ? 'Connected' : 'Disconnected'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-blue-100 text-blue-600">
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">🔗</span>
                                    <div>
                                        <div className="font-semibold">API Endpoint</div>
                                        <div className="text-sm">{import.meta.env.VITE_N8N_API_URL || 'Not configured'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-purple-100 text-purple-600">
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">🔑</span>
                                    <div>
                                        <div className="font-semibold">API Key</div>
                                        <div className="text-sm">
                                            {import.meta.env.VITE_N8N_API_KEY ? 'Configured' : 'Not configured'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Testing Tools */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Testing Tools</h2>
                        <div className="space-x-2">
                            <button
                                onClick={runIntegrationTest}
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                Run Integration Test
                            </button>
                            <button
                                onClick={testWorkflowCreation}
                                disabled={isLoading}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                Test Workflow Creation
                            </button>
                            <button
                                onClick={testWorkflowExecution}
                                disabled={isLoading}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                            >
                                Test Execution
                            </button>
                            <button
                                onClick={clearResults}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                Clear Results
                            </button>
                        </div>
                    </div>

                    {/* Test Results */}
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
                        {testResults.length === 0 ? (
                            <div className="text-gray-500">No test results yet. Run some tests to see output here.</div>
                        ) : (
                            testResults.map((result, index) => (
                                <div key={index} className="mb-1">
                                    {result}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Integration Test Results */}
                {integrationTest && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Integration Test Results</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-4 rounded-lg ${getStatusColor(integrationTest.n8nConnection)}`}>
                                <div className="font-semibold">N8N Connection</div>
                                <div className="text-sm">
                                    {integrationTest.n8nConnection ? 'Working' : 'Failed'}
                                </div>
                            </div>
                            <div className={`p-4 rounded-lg ${getStatusColor(integrationTest.webhookEndpoint)}`}>
                                <div className="font-semibold">Webhook Endpoint</div>
                                <div className="text-sm">
                                    {integrationTest.webhookEndpoint ? 'Available' : 'Unavailable'}
                                </div>
                            </div>
                            <div className={`p-4 rounded-lg ${getStatusColor(integrationTest.workflowExecution)}`}>
                                <div className="font-semibold">Workflow Execution</div>
                                <div className="text-sm">
                                    {integrationTest.workflowExecution ? 'Working' : 'Failed'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Workflow Manager */}
                <WorkflowManager
                    agentId={selectedAgentId}
                    onWorkflowCreated={(workflow) => {
                        setTestResults(prev => [...prev, `✅ Workflow created: ${workflow.name}`]);
                    }}
                    onWorkflowExecuted={(executionId) => {
                        setTestResults(prev => [...prev, `▶️ Workflow executed: ${executionId}`]);
                    }}
                />

                {/* Feature Overview */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">N8N Integration Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-4xl mb-3">⚙️</div>
                            <h3 className="font-semibold text-gray-900 mb-2">Workflow Templates</h3>
                            <p className="text-sm text-gray-600">
                                Pre-built templates for common automation scenarios like lead qualification and customer support.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl mb-3">⚡</div>
                            <h3 className="font-semibold text-gray-900 mb-2">Smart Triggers</h3>
                            <p className="text-sm text-gray-600">
                                Automatically trigger workflows based on conversation events, keywords, and user intents.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl mb-3">🔗</div>
                            <h3 className="font-semibold text-gray-900 mb-2">API Integration</h3>
                            <p className="text-sm text-gray-600">
                                Connect with CRMs, email systems, calendars, and hundreds of other services through N8N.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl mb-3">📊</div>
                            <h3 className="font-semibold text-gray-900 mb-2">Execution Monitoring</h3>
                            <p className="text-sm text-gray-600">
                                Track workflow executions, monitor performance, and debug issues in real-time.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Configuration Guide */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration Guide</h2>
                    <div className="space-y-4">
                        <div className="border-l-4 border-blue-500 pl-4">
                            <h3 className="font-semibold text-gray-900">1. Set up N8N Environment Variables</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Configure VITE_N8N_API_URL, VITE_N8N_API_KEY, and VITE_N8N_WEBHOOK_URL in your .env file.
                            </p>
                        </div>
                        <div className="border-l-4 border-green-500 pl-4">
                            <h3 className="font-semibold text-gray-900">2. Install N8N Server</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Run N8N locally with: <code className="bg-gray-100 px-2 py-1 rounded">npx n8n</code>
                            </p>
                        </div>
                        <div className="border-l-4 border-purple-500 pl-4">
                            <h3 className="font-semibold text-gray-900">3. Create API Key</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Generate an API key in N8N settings and add it to your environment variables.
                            </p>
                        </div>
                        <div className="border-l-4 border-orange-500 pl-4">
                            <h3 className="font-semibold text-gray-900">4. Test Connection</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Use the "Test Connection" button above to verify your N8N integration is working.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default WorkflowTest;