import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Sparkles,
  Database,
  Settings,
  MessageSquare,
  Headphones,
  Video,
  Globe,
  TestTube,
  Rocket
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface AgentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  personality: {
    tone: string;
    style: string;
    language: string;
    creativity_level: number;
  };
  features: {
    voice_enabled: boolean;
    video_enabled: boolean;
    multimodal: boolean;
    tools: string[];
    integrations: string[];
  };
  default_config: {
    knowledge_bases: string[];
    channels: string[];
    workflows: string[];
    ai_provider: string;
  };
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
}

const steps: WizardStep[] = [
  {
    id: 'template',
    title: 'Template Selection',
    description: 'Choose your starting template',
    icon: Sparkles,
    completed: false
  },
  {
    id: 'knowledge',
    title: 'Knowledge Base',
    description: 'Add your content sources',
    icon: Database,
    completed: false
  },
  {
    id: 'personality',
    title: 'Personality',
    description: 'Configure agent behavior',
    icon: MessageSquare,
    completed: false
  },
  {
    id: 'capabilities',
    title: 'Capabilities',
    description: 'Enable features and tools',
    icon: Settings,
    completed: false
  },
  {
    id: 'channels',
    title: 'Channels',
    description: 'Choose deployment channels',
    icon: Globe,
    completed: false
  },
  {
    id: 'testing',
    title: 'Testing',
    description: 'Test your agent',
    icon: TestTube,
    completed: false
  },
  {
    id: 'deployment',
    title: 'Deployment',
    description: 'Launch your agent',
    icon: Rocket,
    completed: false
  }
];

export default function AgentCreationWizard() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [template, setTemplate] = useState<AgentTemplate | null>(null);
  const [agentConfig, setAgentConfig] = useState({
    name: '',
    description: '',
    personality: {
      tone: 'professional',
      style: 'balanced',
      language: 'en',
      creativity_level: 50
    },
    knowledge_bases: [] as string[],
    capabilities: {
      voice_enabled: false,
      video_enabled: false,
      multimodal: true,
      tools: [] as string[],
      integrations: [] as string[]
    },
    channels: [] as string[],
    ai_provider: 'openai'
  });

  useEffect(() => {
    if (templateId && templateId !== 'custom') {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    // Mock template loading - replace with actual API call
    const mockTemplate: AgentTemplate = {
      id: '1',
      name: 'Sales Agent',
      category: 'sales',
      description: 'Intelligent sales assistant that qualifies leads and manages CRM data',
      icon: '💼',
      personality: {
        tone: 'professional',
        style: 'persuasive',
        language: 'en',
        creativity_level: 60
      },
      features: {
        voice_enabled: true,
        video_enabled: true,
        multimodal: true,
        tools: ['web_search', 'calculator', 'calendar'],
        integrations: ['hubspot', 'salesforce', 'email']
      },
      default_config: {
        knowledge_bases: ['sales_materials'],
        channels: ['web_chat', 'whatsapp', 'email'],
        workflows: ['lead_qualification'],
        ai_provider: 'openai'
      }
    };

    setTemplate(mockTemplate);
    setAgentConfig(prev => ({
      ...prev,
      name: mockTemplate.name,
      description: mockTemplate.description,
      personality: mockTemplate.personality,
      capabilities: mockTemplate.features,
      channels: mockTemplate.default_config.channels,
      ai_provider: mockTemplate.default_config.ai_provider
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return template !== null;
      case 1: return agentConfig.knowledge_bases.length > 0;
      case 2: return agentConfig.name.trim() !== '';
      case 3: return true;
      case 4: return agentConfig.channels.length > 0;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <TemplateSelectionStep template={template} />;
      case 1:
        return <KnowledgeBaseStep config={agentConfig} setConfig={setAgentConfig} />;
      case 2:
        return <PersonalityStep config={agentConfig} setConfig={setAgentConfig} />;
      case 3:
        return <CapabilitiesStep config={agentConfig} setConfig={setAgentConfig} />;
      case 4:
        return <ChannelsStep config={agentConfig} setConfig={setAgentConfig} />;
      case 5:
        return <TestingStep config={agentConfig} />;
      case 6:
        return <DeploymentStep config={agentConfig} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard/agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
          <Badge variant="secondary">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} />
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center space-y-2">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                  ${isActive ? 'border-primary bg-primary text-primary-foreground' : 
                    isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                    'border-muted-foreground bg-background'}
                `}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <IconComponent className="h-4 w-4" />
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {React.createElement(steps[currentStep].icon, { className: "h-5 w-5" })}
            <span>{steps[currentStep].title}</span>
          </CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={prevStep} 
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        {currentStep === steps.length - 1 ? (
          <Button onClick={() => navigate('/dashboard/agents')}>
            <Check className="h-4 w-4 mr-2" />
            Complete Setup
          </Button>
        ) : (
          <Button 
            onClick={nextStep} 
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Step Components
function TemplateSelectionStep({ template }: { template: AgentTemplate | null }) {
  if (!template) {
    return (
      <div className="text-center py-8">
        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Template Selected</h3>
        <p className="text-muted-foreground">
          Please select a template from the gallery to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">{template.icon}</div>
        <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
        <p className="text-muted-foreground">{template.description}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Features</h4>
          <div className="space-y-2">
            {template.features.voice_enabled && (
              <div className="flex items-center space-x-2">
                <Headphones className="h-4 w-4" />
                <span className="text-sm">Voice Enabled</span>
              </div>
            )}
            {template.features.video_enabled && (
              <div className="flex items-center space-x-2">
                <Video className="h-4 w-4" />
                <span className="text-sm">Video Calls</span>
              </div>
            )}
            {template.features.multimodal && (
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">Multimodal</span>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Integrations</h4>
          <div className="flex flex-wrap gap-1">
            {template.features.integrations.map((integration) => (
              <Badge key={integration} variant="secondary" className="text-xs">
                {integration}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeBaseStep({ config, setConfig }: any) {
  const mockKnowledgeBases = [
    { id: '1', name: 'Product Documentation', description: 'Complete product docs' },
    { id: '2', name: 'Company FAQ', description: 'Frequently asked questions' },
    { id: '3', name: 'Sales Materials', description: 'Sales presentations and materials' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Knowledge Bases</h3>
        <p className="text-muted-foreground mb-4">
          Choose the knowledge bases your agent should have access to.
        </p>
      </div>
      
      <div className="space-y-3">
        {mockKnowledgeBases.map((kb) => (
          <div key={kb.id} className="flex items-center space-x-3 p-3 border rounded-lg">
            <Checkbox
              checked={config.knowledge_bases.includes(kb.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setConfig((prev: any) => ({
                    ...prev,
                    knowledge_bases: [...prev.knowledge_bases, kb.id]
                  }));
                } else {
                  setConfig((prev: any) => ({
                    ...prev,
                    knowledge_bases: prev.knowledge_bases.filter((id: string) => id !== kb.id)
                  }));
                }
              }}
            />
            <div>
              <div className="font-medium">{kb.name}</div>
              <div className="text-sm text-muted-foreground">{kb.description}</div>
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="outline" className="w-full">
        <Database className="h-4 w-4 mr-2" />
        Create New Knowledge Base
      </Button>
    </div>
  );
}

function PersonalityStep({ config, setConfig }: any) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium">Agent Name</label>
        <Input
          value={config.name}
          onChange={(e) => setConfig((prev: any) => ({ ...prev, name: e.target.value }))}
          placeholder="Enter agent name"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={config.description}
          onChange={(e) => setConfig((prev: any) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what your agent does"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Tone</label>
        <Select 
          value={config.personality.tone} 
          onValueChange={(value) => setConfig((prev: any) => ({
            ...prev,
            personality: { ...prev.personality, tone: value }
          }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">
          Creativity Level: {config.personality.creativity_level}%
        </label>
        <Slider
          value={[config.personality.creativity_level]}
          onValueChange={([value]) => setConfig((prev: any) => ({
            ...prev,
            personality: { ...prev.personality, creativity_level: value }
          }))}
          max={100}
          step={10}
        />
      </div>
    </div>
  );
}

function CapabilitiesStep({ config, setConfig }: any) {
  const availableTools = [
    { id: 'web_search', name: 'Web Search', description: 'Search the internet for information' },
    { id: 'calculator', name: 'Calculator', description: 'Perform mathematical calculations' },
    { id: 'datetime', name: 'Date & Time', description: 'Handle date and time operations' },
    { id: 'weather', name: 'Weather', description: 'Get weather information' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Voice & Video</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Voice Responses</div>
              <div className="text-sm text-muted-foreground">Enable text-to-speech</div>
            </div>
            <Checkbox
              checked={config.capabilities.voice_enabled}
              onCheckedChange={(checked) => setConfig((prev: any) => ({
                ...prev,
                capabilities: { ...prev.capabilities, voice_enabled: checked }
              }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Video Calls</div>
              <div className="text-sm text-muted-foreground">Enable video conversations</div>
            </div>
            <Checkbox
              checked={config.capabilities.video_enabled}
              onCheckedChange={(checked) => setConfig((prev: any) => ({
                ...prev,
                capabilities: { ...prev.capabilities, video_enabled: checked }
              }))}
            />
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Tools</h3>
        <div className="space-y-3">
          {availableTools.map((tool) => (
            <div key={tool.id} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                checked={config.capabilities.tools.includes(tool.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setConfig((prev: any) => ({
                      ...prev,
                      capabilities: {
                        ...prev.capabilities,
                        tools: [...prev.capabilities.tools, tool.id]
                      }
                    }));
                  } else {
                    setConfig((prev: any) => ({
                      ...prev,
                      capabilities: {
                        ...prev.capabilities,
                        tools: prev.capabilities.tools.filter((id: string) => id !== tool.id)
                      }
                    }));
                  }
                }}
              />
              <div>
                <div className="font-medium">{tool.name}</div>
                <div className="text-sm text-muted-foreground">{tool.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelsStep({ config, setConfig }: any) {
  const availableChannels = [
    { id: 'web_chat', name: 'Web Chat', description: 'Website chat widget', icon: '💬' },
    { id: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp Business API', icon: '📱' },
    { id: 'slack', name: 'Slack', description: 'Slack workspace integration', icon: '💬' },
    { id: 'email', name: 'Email', description: 'Email-to-chat conversion', icon: '📧' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Deployment Channels</h3>
        <p className="text-muted-foreground mb-4">
          Select where you want to deploy your agent.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {availableChannels.map((channel) => (
          <Card 
            key={channel.id} 
            className={`cursor-pointer transition-colors ${
              config.channels.includes(channel.id) ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
            }`}
            onClick={() => {
              if (config.channels.includes(channel.id)) {
                setConfig((prev: any) => ({
                  ...prev,
                  channels: prev.channels.filter((id: string) => id !== channel.id)
                }));
              } else {
                setConfig((prev: any) => ({
                  ...prev,
                  channels: [...prev.channels, channel.id]
                }));
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{channel.icon}</span>
                <div>
                  <div className="font-medium">{channel.name}</div>
                  <div className="text-sm text-muted-foreground">{channel.description}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TestingStep({ config }: any) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Test Your Agent</h3>
        <p className="text-muted-foreground">
          Try a conversation with your agent to make sure it works as expected.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Agent Preview</CardTitle>
          <CardDescription>
            {config.name} • {config.personality.tone} tone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">Chat interface would appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DeploymentStep({ config }: any) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Rocket className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Ready to Deploy!</h3>
        <p className="text-muted-foreground">
          Your agent is configured and ready to go live.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Deployment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agent Name:</span>
            <span className="font-medium">{config.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Knowledge Bases:</span>
            <span className="font-medium">{config.knowledge_bases.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Channels:</span>
            <span className="font-medium">{config.channels.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tools:</span>
            <span className="font-medium">{config.capabilities.tools.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}