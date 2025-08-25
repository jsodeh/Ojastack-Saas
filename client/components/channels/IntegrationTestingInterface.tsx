import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TestTube, 
  PlayCircle,
  CheckCircle, 
  XCircle,
  AlertCircle,
  Clock,
  Smartphone,
  Slack,
  MessageSquare,
  Globe,
  Send,
  RefreshCw,
  Download,
  Eye,
  Settings,
  Zap,
  Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChannelConfig {
  id: string;
  type: 'whatsapp' | 'slack' | 'webchat' | 'api';
  name: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastTested?: Date;
  configuration: Record<string, any>;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  channelTypes: string[];
  steps: Array<{
    action: string;
    expected: string;
    timeout?: number;
  }>;
}

interface TestResult {
  id: string;
  scenarioId: string;
  channelId: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  steps: Array<{
    stepIndex: number;
    status: 'pending' | 'running' | 'passed' | 'failed';
    result?: string;
    error?: string;
    duration?: number;
  }>;
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>;
}

interface IntegrationTestingInterfaceProps {
  channels: ChannelConfig[];
  onChannelUpdate: (channelId: string, updates: Partial<ChannelConfig>) => void;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'basic-connectivity',
    name: 'Basic Connectivity',
    description: 'Test basic connection and authentication',
    channelTypes: ['whatsapp', 'slack', 'webchat', 'api'],
    steps: [
      { action: 'Verify connection', expected: 'Connection established' },
      { action: 'Test authentication', expected: 'Authentication successful' },
      { action: 'Validate permissions', expected: 'Required permissions granted' }
    ]
  },
  {
    id: 'message-sending',
    name: 'Message Sending',
    description: 'Test outbound message functionality',
    channelTypes: ['whatsapp', 'slack', 'webchat'],
    steps: [
      { action: 'Send test message', expected: 'Message sent successfully' },
      { action: 'Verify delivery status', expected: 'Message delivered', timeout: 10000 },
      { action: 'Check formatting', expected: 'Message format preserved' }
    ]
  },
  {
    id: 'message-receiving',
    name: 'Message Receiving',
    description: 'Test inbound message handling',
    channelTypes: ['whatsapp', 'slack', 'webchat'],
    steps: [
      { action: 'Send inbound test message', expected: 'Message received' },
      { action: 'Verify webhook delivery', expected: 'Webhook triggered' },
      { action: 'Validate message parsing', expected: 'Message parsed correctly' }
    ]
  },
  {
    id: 'interactive-components',
    name: 'Interactive Components',
    description: 'Test buttons, quick replies, and interactive elements',
    channelTypes: ['whatsapp', 'slack', 'webchat'],
    steps: [
      { action: 'Send interactive message', expected: 'Interactive elements rendered' },
      { action: 'Test button interaction', expected: 'Button click registered' },
      { action: 'Verify callback handling', expected: 'Callback processed correctly' }
    ]
  },
  {
    id: 'file-handling',
    name: 'File Handling',
    description: 'Test file upload and download capabilities',
    channelTypes: ['whatsapp', 'slack', 'webchat'],
    steps: [
      { action: 'Upload test file', expected: 'File uploaded successfully' },
      { action: 'Process file content', expected: 'File processed' },
      { action: 'Send file response', expected: 'File sent to user' }
    ]
  }
];

const CHANNEL_ICONS = {
  whatsapp: <Smartphone className="w-5 h-5 text-green-500" />,
  slack: <Slack className="w-5 h-5 text-purple-500" />,
  webchat: <MessageSquare className="w-5 h-5 text-blue-500" />,
  api: <Globe className="w-5 h-5 text-orange-500" />
};

export default function IntegrationTestingInterface({ 
  channels, 
  onChannelUpdate 
}: IntegrationTestingInterfaceProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testMode, setTestMode] = useState<'individual' | 'batch'>('batch');

  const queryClient = useQueryClient();

  // Run test mutation
  const runTestMutation = useMutation({
    mutationFn: async ({ 
      channelId, 
      scenarioId, 
      testId 
    }: { 
      channelId: string; 
      scenarioId: string; 
      testId: string;
    }) => {
      const channel = channels.find(c => c.id === channelId);
      const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
      
      if (!channel || !scenario) {
        throw new Error('Channel or scenario not found');
      }

      // Update channel status to testing
      onChannelUpdate(channelId, { status: 'testing' });

      const response = await fetch('/.netlify/functions/run-integration-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          channelType: channel.type,
          channelConfig: channel.configuration,
          scenario,
          testId
        })
      });
      
      if (!response.ok) {
        throw new Error('Test execution failed');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      const { channelId, testId } = variables;
      
      // Update test result
      setTestResults(prev => prev.map(result => 
        result.id === testId 
          ? { ...result, ...data, status: 'passed', endTime: new Date() }
          : result
      ));
      
      // Update channel status back to connected
      onChannelUpdate(channelId, { status: 'connected', lastTested: new Date() });
      
      toast.success('Test completed successfully');
    },
    onError: (error, variables) => {
      const { channelId, testId } = variables;
      
      // Update test result with error
      setTestResults(prev => prev.map(result => 
        result.id === testId 
          ? { 
              ...result, 
              status: 'failed', 
              endTime: new Date(),
              logs: [
                ...result.logs,
                {
                  timestamp: new Date(),
                  level: 'error',
                  message: error.message
                }
              ]
            }
          : result
      ));
      
      // Update channel status to error
      onChannelUpdate(channelId, { status: 'error' });
      
      toast.error('Test failed: ' + error.message);
    }
  });

  const handleChannelSelection = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleScenarioSelection = (scenarioId: string) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const runSelectedTests = async () => {
    if (selectedChannels.length === 0 || selectedScenarios.length === 0) {
      toast.error('Please select at least one channel and scenario');
      return;
    }

    setIsRunningTests(true);
    const newTestResults: TestResult[] = [];

    // Create test results for each combination
    for (const channelId of selectedChannels) {
      for (const scenarioId of selectedScenarios) {
        const channel = channels.find(c => c.id === channelId);
        const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
        
        if (channel && scenario && scenario.channelTypes.includes(channel.type)) {
          const testId = `${channelId}-${scenarioId}-${Date.now()}`;
          const testResult: TestResult = {
            id: testId,
            scenarioId,
            channelId,
            status: 'running',
            startTime: new Date(),
            steps: scenario.steps.map((_, index) => ({
              stepIndex: index,
              status: 'pending'
            })),
            logs: [{
              timestamp: new Date(),
              level: 'info',
              message: `Starting test: ${scenario.name} on ${channel.name}`
            }]
          };
          
          newTestResults.push(testResult);
        }
      }
    }

    setTestResults(newTestResults);

    // Run tests sequentially or in parallel based on mode
    if (testMode === 'individual') {
      for (const result of newTestResults) {
        setCurrentTest(result.id);
        try {
          await runTestMutation.mutateAsync({
            channelId: result.channelId,
            scenarioId: result.scenarioId,
            testId: result.id
          });
        } catch (error) {
          console.error('Test failed:', error);
        }
      }
    } else {
      // Run all tests in parallel
      const testPromises = newTestResults.map(result =>
        runTestMutation.mutateAsync({
          channelId: result.channelId,
          scenarioId: result.scenarioId,
          testId: result.id
        }).catch(error => console.error('Test failed:', error))
      );
      
      await Promise.allSettled(testPromises);
    }

    setCurrentTest(null);
    setIsRunningTests(false);
    toast.success('Test suite completed');
  };

  const runQuickTest = async (channelId: string) => {
    const basicScenario = TEST_SCENARIOS.find(s => s.id === 'basic-connectivity');
    if (!basicScenario) return;

    const testId = `quick-${channelId}-${Date.now()}`;
    const testResult: TestResult = {
      id: testId,
      scenarioId: basicScenario.id,
      channelId,
      status: 'running',
      startTime: new Date(),
      steps: basicScenario.steps.map((_, index) => ({
        stepIndex: index,
        status: 'pending'
      })),
      logs: [{
        timestamp: new Date(),
        level: 'info',
        message: 'Running quick connectivity test'
      }]
    };

    setTestResults(prev => [...prev, testResult]);
    setCurrentTest(testId);

    try {
      await runTestMutation.mutateAsync({
        channelId,
        scenarioId: basicScenario.id,
        testId
      });
    } finally {
      setCurrentTest(null);
    }
  };

  const exportTestResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      testResults,
      channels: channels.map(c => ({ id: c.id, name: c.name, type: c.type, status: c.status })),
      summary: {
        totalTests: testResults.length,
        passed: testResults.filter(r => r.status === 'passed').length,
        failed: testResults.filter(r => r.status === 'failed').length,
        duration: testResults.reduce((acc, r) => acc + (r.duration || 0), 0)
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTestStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return 'text-blue-600';
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTestStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'passed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Integration Testing</h3>
          <p className="text-muted-foreground">
            Test and validate all channel integrations with comprehensive scenarios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={testMode} onValueChange={setTestMode as any}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="batch">Batch Testing</SelectItem>
              <SelectItem value="individual">Sequential Testing</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportTestResults} disabled={testResults.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Test Configuration */}
        <div className="space-y-6">
          {/* Channel Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Select Channels
              </CardTitle>
              <CardDescription>
                Choose which channels to test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {channels.map(channel => (
                <div
                  key={channel.id}
                  className={cn(
                    "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedChannels.includes(channel.id) 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleChannelSelection(channel.id)}
                >
                  <div className="flex items-center space-x-3">
                    {CHANNEL_ICONS[channel.type]}
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={channel.status === 'connected' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {channel.status}
                        </Badge>
                        {channel.lastTested && (
                          <span className="text-xs text-muted-foreground">
                            Last tested: {channel.lastTested.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        runQuickTest(channel.id);
                      }}
                      disabled={isRunningTests}
                    >
                      <Zap className="w-3 h-3" />
                    </Button>
                    {selectedChannels.includes(channel.id) && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Scenario Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Scenarios
              </CardTitle>
              <CardDescription>
                Choose which tests to run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {TEST_SCENARIOS.map(scenario => (
                <div
                  key={scenario.id}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedScenarios.includes(scenario.id) 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleScenarioSelection(scenario.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{scenario.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {scenario.channelTypes.map(type => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {selectedScenarios.includes(scenario.id) && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Run Tests Button */}
          <Button 
            onClick={runSelectedTests}
            disabled={isRunningTests || selectedChannels.length === 0 || selectedScenarios.length === 0}
            className="w-full"
            size="lg"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Run Selected Tests
              </>
            )}
          </Button>
        </div>

        {/* Right Panel - Test Results */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Test Results
                </CardTitle>
                {testResults.length > 0 && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600">
                      ✓ {testResults.filter(r => r.status === 'passed').length} Passed
                    </span>
                    <span className="text-red-600">
                      ✗ {testResults.filter(r => r.status === 'failed').length} Failed
                    </span>
                    <span className="text-blue-600">
                      ↻ {testResults.filter(r => r.status === 'running').length} Running
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] p-4">
                {testResults.length === 0 ? (
                  <div className="text-center py-12">
                    <TestTube className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tests run yet</h3>
                    <p className="text-muted-foreground">
                      Select channels and scenarios, then run tests to see results here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testResults.map(result => {
                      const channel = channels.find(c => c.id === result.channelId);
                      const scenario = TEST_SCENARIOS.find(s => s.id === result.scenarioId);
                      
                      return (
                        <Card key={result.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                {channel && CHANNEL_ICONS[channel.type]}
                                <div>
                                  <h4 className="font-medium">
                                    {scenario?.name} - {channel?.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    Started: {result.startTime.toLocaleTimeString()}
                                    {result.endTime && (
                                      <> • Duration: {Math.round((result.endTime.getTime() - result.startTime.getTime()) / 1000)}s</>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className={cn("flex items-center space-x-2", getTestStatusColor(result.status))}>
                                {getTestStatusIcon(result.status)}
                                <span className="font-medium capitalize">{result.status}</span>
                              </div>
                            </div>

                            {/* Test Steps */}
                            <div className="space-y-2">
                              {result.steps.map((step, index) => (
                                <div key={index} className="flex items-center space-x-3 text-sm">
                                  <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center",
                                    step.status === 'passed' ? "bg-green-100 text-green-600" :
                                    step.status === 'failed' ? "bg-red-100 text-red-600" :
                                    step.status === 'running' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                                  )}>
                                    {step.status === 'passed' ? <CheckCircle className="w-3 h-3" /> :
                                     step.status === 'failed' ? <XCircle className="w-3 h-3" /> :
                                     step.status === 'running' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                                     <span className="text-xs">{index + 1}</span>}
                                  </div>
                                  <span className={cn(
                                    step.status === 'running' && "font-medium"
                                  )}>
                                    {scenario?.steps[index]?.action}
                                  </span>
                                  {step.duration && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {step.duration}ms
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Error Messages */}
                            {result.status === 'failed' && (
                              <Alert variant="destructive" className="mt-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  {result.logs.find(log => log.level === 'error')?.message || 'Test failed'}
                                </AlertDescription>
                              </Alert>
                            )}

                            {/* Test Logs */}
                            {result.logs.length > 0 && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm font-medium">View Logs</summary>
                                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono max-h-32 overflow-y-auto">
                                  {result.logs.map((log, index) => (
                                    <div key={index} className={cn(
                                      "flex space-x-2",
                                      log.level === 'error' && "text-red-600",
                                      log.level === 'warn' && "text-yellow-600"
                                    )}>
                                      <span className="text-muted-foreground">
                                        {log.timestamp.toLocaleTimeString()}
                                      </span>
                                      <span className="uppercase">{log.level}</span>
                                      <span>{log.message}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}