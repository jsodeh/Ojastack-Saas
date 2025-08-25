import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Rocket,
  CheckCircle,
  Globe,
  Phone,
  Slack,
  Mail,
  Copy,
  ExternalLink,
  Settings,
  Monitor,
  Activity,
  AlertTriangle,
  Info,
  Code
} from 'lucide-react';

import { useAgentCreation } from '../AgentCreationContext';
import { StepProps } from '../AgentCreationWizard';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface DeploymentStepProps extends StepProps {
  onComplete?: (agentId: string) => void;
}

interface DeploymentProgress {
  step: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  message: string;
}

interface DeployedAgent {
  id: string;
  name: string;
  status: 'deploying' | 'active' | 'error';
  endpoints: {
    api: string;
    webhook: string;
    widget: string;
  };
  channels: Array<{
    type: string;
    enabled: boolean;
    status: string;
    endpoint?: string;
  }>;
  metrics: {
    uptime: number;
    responseTime: number;
    conversations: number;
  };
}

const DEPLOYMENT_STEPS: Omit<DeploymentProgress, 'status'>[] = [
  { step: 'Validating Configuration', message: 'Checking agent settings and capabilities' },
  { step: 'Creating Agent', message: 'Setting up your agent in the system' },
  { step: 'Processing Knowledge Base', message: 'Indexing documents and creating embeddings' },
  { step: 'Configuring Channels', message: 'Setting up deployment channels' },
  { step: 'Testing Endpoints', message: 'Verifying all integrations work correctly' },
  { step: 'Finalizing Deployment', message: 'Making your agent available to users' }
];

export default function DeploymentStep({ onComplete, onNext, onPrevious }: DeploymentStepProps) {
  const { state, resetWizard } = useAgentCreation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'completed' | 'error'>('idle');
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress[]>([]);
  const [deployedAgent, setDeployedAgent] = useState<DeployedAgent | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [agentName, setAgentName] = useState(state.agentName || '');
  const [deploymentNotes, setDeploymentNotes] = useState('');

  useEffect(() => {
    // Initialize deployment steps
    const initialSteps = DEPLOYMENT_STEPS.map(step => ({
      ...step,
      status: 'pending' as const
    }));
    setDeploymentProgress(initialSteps);
  }, []);

  const startDeployment = async () => {
    if (!agentName.trim()) {
      toast({
        title: 'Agent Name Required',
        description: 'Please provide a name for your agent',
        variant: 'destructive'
      });
      return;
    }

    setDeploymentStatus('deploying');
    setCurrentStep(0);

    try {
      // Process each deployment step
      for (let i = 0; i < DEPLOYMENT_STEPS.length; i++) {
        setCurrentStep(i);
        
        // Update current step to in-progress
        setDeploymentProgress(prev => prev.map((step, index) => 
          index === i ? { ...step, status: 'in-progress' } : step
        ));

        // Simulate deployment step (replace with actual API calls)
        await simulateDeploymentStep(i);

        // Update current step to completed
        setDeploymentProgress(prev => prev.map((step, index) => 
          index === i ? { ...step, status: 'completed' } : step
        ));

        // Wait before next step
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Create deployed agent object
      const agentId = crypto.randomUUID();
      const deployed: DeployedAgent = {
        id: agentId,
        name: agentName,
        status: 'active',
        endpoints: {
          api: `https://api.ojastack.com/agents/${agentId}`,
          webhook: `https://api.ojastack.com/webhooks/${agentId}`,
          widget: `https://widget.ojastack.com/${agentId}`
        },
        channels: state.channels.filter(ch => ch.enabled).map(ch => ({
          type: ch.type,
          enabled: ch.enabled,
          status: 'active',
          endpoint: `https://api.ojastack.com/channels/${ch.type}/${agentId}`
        })),
        metrics: {
          uptime: 100,
          responseTime: 150,
          conversations: 0
        }
      };

      setDeployedAgent(deployed);
      setDeploymentStatus('completed');

      toast({
        title: 'Deployment Successful!',
        description: `${agentName} has been deployed successfully`
      });

      if (onComplete) {
        onComplete(agentId);
      }

    } catch (error) {
      setDeploymentStatus('error');
      setDeploymentProgress(prev => prev.map((step, index) => 
        index === currentStep ? { ...step, status: 'error' } : step
      ));
      
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    }
  };

  const simulateDeploymentStep = async (stepIndex: number): Promise<void> => {
    // Simulate different processing times for different steps
    const processingTimes = [1000, 2000, 3000, 1500, 1000, 500];
    await new Promise(resolve => setTimeout(resolve, processingTimes[stepIndex] || 1000));
    
    // Simulate occasional errors for demo purposes
    if (Math.random() < 0.05) {
      throw new Error(`Failed at step: ${DEPLOYMENT_STEPS[stepIndex].step}`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`
    });
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'webchat': return Globe;
      case 'whatsapp': return Phone;
      case 'slack': return Slack;
      case 'email': return Mail;
      default: return Settings;
    }
  };

  const handleGoToDashboard = () => {
    resetWizard();
    navigate('/dashboard/agents');
  };

  const handleCreateAnother = () => {
    resetWizard();
    window.location.reload();
  };

  const progressPercentage = deploymentStatus === 'deploying' 
    ? ((currentStep + 1) / DEPLOYMENT_STEPS.length) * 100
    : deploymentStatus === 'completed' ? 100 : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Deploy Your Agent</h2>
        <p className="text-muted-foreground">
          Review your configuration and deploy your agent to make it available to users
        </p>
      </div>

      {deploymentStatus === 'idle' && (
        <>
          {/* Configuration Review */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Review</CardTitle>
              <CardDescription>
                Review your agent configuration before deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agent Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="agent-name">Agent Name</Label>
                    <Input
                      id="agent-name"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Enter final agent name"
                    />
                  </div>
                  
                  <div>
                    <Label>Template</Label>
                    <p className="text-sm text-muted-foreground">
                      {state.template?.name || 'Custom Agent'}
                    </p>
                  </div>
                  
                  <div>
                    <Label>Capabilities</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {state.capabilities.text.enabled && <Badge>Text</Badge>}
                      {state.capabilities.voice.enabled && <Badge>Voice</Badge>}
                      {state.capabilities.image.enabled && <Badge>Vision</Badge>}
                      {state.capabilities.video.enabled && <Badge>Video</Badge>}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Knowledge Bases</Label>
                    <p className="text-sm text-muted-foreground">
                      {state.knowledgeBases.length} knowledge base(s) configured
                    </p>
                  </div>
                </div>

                {/* Deployment Channels */}
                <div className="space-y-4">
                  <div>
                    <Label>Deployment Channels</Label>
                    <div className="space-y-2 mt-2">
                      {state.channels.filter(ch => ch.enabled).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No channels configured</p>
                      ) : (
                        state.channels.filter(ch => ch.enabled).map((channel, index) => {
                          const Icon = getChannelIcon(channel.type);
                          return (
                            <div key={index} className="flex items-center space-x-2">
                              <Icon className="h-4 w-4" />
                              <span className="text-sm capitalize">{channel.type}</span>
                              <Badge variant="outline">Enabled</Badge>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="deployment-notes">Deployment Notes (Optional)</Label>
                    <Input
                      id="deployment-notes"
                      value={deploymentNotes}
                      onChange={(e) => setDeploymentNotes(e.target.value)}
                      placeholder="Add any notes about this deployment"
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Once deployed, your agent will be available on all configured channels. You can modify settings later from the dashboard.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Deploy Button */}
          <div className="flex justify-center">
            <Button 
              onClick={startDeployment}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
              disabled={!agentName.trim()}
            >
              <Rocket className="h-5 w-5 mr-2" />
              Deploy Agent
            </Button>
          </div>
        </>
      )}

      {deploymentStatus === 'deploying' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 animate-spin" />
              <span>Deploying {agentName}</span>
            </CardTitle>
            <CardDescription>
              Please wait while we deploy your agent...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Deployment Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Step by Step Progress */}
            <div className="space-y-3">
              {deploymentProgress.map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {step.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {step.status === 'in-progress' && (
                      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    {step.status === 'error' && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    {step.status === 'pending' && (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      step.status === 'completed' ? 'text-green-700' :
                      step.status === 'in-progress' ? 'text-primary' :
                      step.status === 'error' ? 'text-red-700' :
                      'text-muted-foreground'
                    }`}>
                      {step.step}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {deploymentStatus === 'completed' && deployedAgent && (
        <>
          {/* Success Message */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    {deployedAgent.name} Deployed Successfully!
                  </h3>
                  <p className="text-green-700">
                    Your agent is now live and ready to assist users
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deployment Details */}
          <Tabs defaultValue="endpoints" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="endpoints">Endpoints & Integration</TabsTrigger>
              <TabsTrigger value="channels">Active Channels</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Endpoints</CardTitle>
                  <CardDescription>
                    Use these endpoints to integrate with your agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Agent API</Label>
                        <p className="text-sm text-muted-foreground font-mono">
                          {deployedAgent.endpoints.api}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(deployedAgent.endpoints.api, 'API Endpoint')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Webhook URL</Label>
                        <p className="text-sm text-muted-foreground font-mono">
                          {deployedAgent.endpoints.webhook}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(deployedAgent.endpoints.webhook, 'Webhook URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Widget Embed</Label>
                        <p className="text-sm text-muted-foreground font-mono">
                          {deployedAgent.endpoints.widget}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(deployedAgent.endpoints.widget, 'Widget URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="channels" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Channels</CardTitle>
                  <CardDescription>
                    Your agent is available on these channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {deployedAgent.channels.map((channel, index) => {
                      const Icon = getChannelIcon(channel.type);
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5" />
                            <div>
                              <p className="font-medium capitalize">{channel.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {channel.status === 'active' ? 'Live and accepting messages' : 'Configuration needed'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={channel.status === 'active' ? 'default' : 'secondary'}>
                              {channel.status}
                            </Badge>
                            {channel.endpoint && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(channel.endpoint!, 'Channel Endpoint')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Uptime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {deployedAgent.metrics.uptime}%
                      </div>
                      <p className="text-sm text-muted-foreground">Since deployment</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Response Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {deployedAgent.metrics.responseTime}ms
                      </div>
                      <p className="text-sm text-muted-foreground">Average</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {deployedAgent.metrics.conversations}
                      </div>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <Button variant="outline" onClick={handleCreateAnother}>
              Create Another Agent
            </Button>
            <Button onClick={handleGoToDashboard}>
              <Monitor className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </>
      )}

      {deploymentStatus === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Deployment Failed
                </h3>
                <p className="text-red-700">
                  There was an error deploying your agent. Please try again.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={() => {
                  setDeploymentStatus('idle');
                  setCurrentStep(0);
                  setDeploymentProgress(DEPLOYMENT_STEPS.map(step => ({ ...step, status: 'pending' })));
                }}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}