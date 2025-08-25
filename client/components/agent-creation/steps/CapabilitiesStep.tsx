import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  MessageSquare, 
  Mic, 
  Image, 
  Video, 
  Wrench, 
  DollarSign,
  Info,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAgentCreation } from '../AgentCreationContext';
import { AgentCapabilities } from '@/lib/agent-service';
import { toolSystem } from '@/lib/tool-system';
import { ToolDefinition } from '@/lib/tool-types';



interface CapabilityConfig {
  id: keyof AgentCapabilities;
  name: string;
  description: string;
  icon: React.ReactNode;
  providers: Array<{
    id: string;
    name: string;
    description: string;
    cost: string;
    features: string[];
  }>;
  dependencies?: string[];
  tools?: string[];
}

interface CostEstimate {
  monthly: number;
  perMessage: number;
  breakdown: Array<{
    capability: string;
    cost: number;
    description: string;
  }>;
}

const CAPABILITY_CONFIGS: CapabilityConfig[] = [
  {
    id: 'text',
    name: 'Text/Chat',
    description: 'Enable text-based conversations and chat interactions',
    icon: <MessageSquare className="h-5 w-5" />,
    providers: [
      {
        id: 'openai',
        name: 'OpenAI GPT-4',
        description: 'Advanced language model with excellent reasoning',
        cost: '$0.03 per 1K tokens',
        features: ['Advanced reasoning', 'Code generation', 'Creative writing', 'Analysis']
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Safe and helpful AI assistant',
        cost: '$0.025 per 1K tokens',
        features: ['Safety-focused', 'Long context', 'Analytical', 'Ethical reasoning']
      }
    ],
    tools: ['web_search', 'calculator', 'datetime']
  },
  {
    id: 'voice',
    name: 'Voice',
    description: 'Enable voice conversations with speech-to-text and text-to-speech',
    icon: <Mic className="h-5 w-5" />,
    providers: [
      {
        id: 'elevenlabs',
        name: 'ElevenLabs',
        description: 'High-quality voice synthesis and recognition',
        cost: '$0.30 per 1K characters',
        features: ['Natural voices', 'Voice cloning', 'Multiple languages', 'Real-time']
      }
    ],
    dependencies: ['text'],
    tools: ['web_search', 'calculator', 'datetime']
  },
  {
    id: 'image',
    name: 'Image Processing',
    description: 'Analyze and understand images, generate visual content',
    icon: <Image className="h-5 w-5" />,
    providers: [
      {
        id: 'openai',
        name: 'OpenAI Vision',
        description: 'Advanced image understanding and analysis',
        cost: '$0.01 per image',
        features: ['Image analysis', 'OCR', 'Scene understanding', 'Object detection']
      },
      {
        id: 'anthropic',
        name: 'Anthropic Vision',
        description: 'Safe image analysis with detailed descriptions',
        cost: '$0.008 per image',
        features: ['Detailed descriptions', 'Safety filtering', 'Document analysis', 'Chart reading']
      }
    ],
    dependencies: ['text'],
    tools: ['web_search']
  },
  {
    id: 'video',
    name: 'Video Calls',
    description: 'Enable real-time video conversations and interactions',
    icon: <Video className="h-5 w-5" />,
    providers: [
      {
        id: 'livekit',
        name: 'LiveKit',
        description: 'Real-time video communication platform',
        cost: '$0.004 per minute',
        features: ['HD video', 'Screen sharing', 'Recording', 'Low latency']
      }
    ],
    dependencies: ['text', 'voice'],
    tools: ['web_search', 'calculator', 'datetime']
  }
];

export default function CapabilitiesStep({ onNext, onPrevious }: StepProps) {
  const { state, setCapabilities, setStepValidation } = useAgentCreation();
  const [capabilities, setLocalCapabilities] = useState<AgentCapabilities>(state.capabilities);
  const [availableTools, setAvailableTools] = useState<ToolDefinition[]>([]);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [costEstimate, setCostEstimate] = useState<CostEstimate>({
    monthly: 0,
    perMessage: 0,
    breakdown: []
  });

  // Load available tools
  useEffect(() => {
    const loadTools = async () => {
      const tools = toolSystem.getEnabledTools();
      setAvailableTools(tools);
    };
    loadTools();
  }, []);

  // Calculate cost estimate when capabilities change
  useEffect(() => {
    calculateCostEstimate();
  }, [capabilities]);

  // Validate step when capabilities change
  useEffect(() => {
    const hasEnabledCapability = Object.values(capabilities).some(cap => 
      typeof cap === 'object' && cap.enabled
    );
    setStepValidation('capabilities', hasEnabledCapability);
  }, [capabilities, setStepValidation]);

  const calculateCostEstimate = () => {
    let monthly = 0;
    let perMessage = 0;
    const breakdown: CostEstimate['breakdown'] = [];

    if (capabilities.text.enabled) {
      const textCost = capabilities.text.provider === 'openai' ? 0.03 : 0.025;
      monthly += 50; // Base monthly cost
      perMessage += textCost;
      breakdown.push({
        capability: 'Text Processing',
        cost: textCost,
        description: `${capabilities.text.provider === 'openai' ? 'OpenAI GPT-4' : 'Anthropic Claude'} - per 1K tokens`
      });
    }

    if (capabilities.voice.enabled) {
      const voiceCost = 0.30;
      monthly += 30;
      perMessage += voiceCost;
      breakdown.push({
        capability: 'Voice Processing',
        cost: voiceCost,
        description: 'ElevenLabs - per 1K characters'
      });
    }

    if (capabilities.image.enabled) {
      const imageCost = capabilities.image.provider === 'openai' ? 0.01 : 0.008;
      monthly += 20;
      perMessage += imageCost;
      breakdown.push({
        capability: 'Image Processing',
        cost: imageCost,
        description: `${capabilities.image.provider === 'openai' ? 'OpenAI Vision' : 'Anthropic Vision'} - per image`
      });
    }

    if (capabilities.video.enabled) {
      const videoCost = 0.004;
      monthly += 100;
      perMessage += videoCost;
      breakdown.push({
        capability: 'Video Calls',
        cost: videoCost,
        description: 'LiveKit - per minute'
      });
    }

    setCostEstimate({ monthly, perMessage, breakdown });
  };

  const handleCapabilityToggle = (capabilityId: keyof AgentCapabilities, enabled: boolean) => {
    const newCapabilities = { ...capabilities };
    
    if (capabilityId === 'text') {
      newCapabilities.text = { ...newCapabilities.text, enabled };
    } else if (capabilityId === 'voice') {
      newCapabilities.voice = { ...newCapabilities.voice, enabled };
    } else if (capabilityId === 'image') {
      newCapabilities.image = { ...newCapabilities.image, enabled };
    } else if (capabilityId === 'video') {
      newCapabilities.video = { ...newCapabilities.video, enabled };
    }

    // Handle dependencies
    if (enabled) {
      const config = CAPABILITY_CONFIGS.find(c => c.id === capabilityId);
      if (config?.dependencies) {
        config.dependencies.forEach(dep => {
          if (dep === 'text') {
            newCapabilities.text = { ...newCapabilities.text, enabled: true };
          } else if (dep === 'voice') {
            newCapabilities.voice = { ...newCapabilities.voice, enabled: true };
          }
        });
      }
    }

    // Handle reverse dependencies (disable dependent capabilities)
    if (!enabled) {
      if (capabilityId === 'text') {
        newCapabilities.voice = { ...newCapabilities.voice, enabled: false };
        newCapabilities.image = { ...newCapabilities.image, enabled: false };
        newCapabilities.video = { ...newCapabilities.video, enabled: false };
      } else if (capabilityId === 'voice') {
        newCapabilities.video = { ...newCapabilities.video, enabled: false };
      }
    }

    setLocalCapabilities(newCapabilities);
    setCapabilities(newCapabilities);
  };

  const handleProviderChange = (capabilityId: keyof AgentCapabilities, providerId: string) => {
    const newCapabilities = { ...capabilities };
    
    if (capabilityId === 'text') {
      newCapabilities.text = { 
        ...newCapabilities.text, 
        provider: providerId as 'openai' | 'anthropic' 
      };
    } else if (capabilityId === 'image') {
      newCapabilities.image = { 
        ...newCapabilities.image, 
        provider: providerId as 'openai' | 'anthropic' 
      };
    }

    setLocalCapabilities(newCapabilities);
    setCapabilities(newCapabilities);
  };

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    const newTools = enabled 
      ? [...capabilities.tools, toolId]
      : capabilities.tools.filter(t => t !== toolId);
    
    const newCapabilities = { ...capabilities, tools: newTools };
    setLocalCapabilities(newCapabilities);
    setCapabilities(newCapabilities);
  };

  const getToolsByCategory = (category: string) => {
    return availableTools.filter(tool => tool.category === category);
  };

  const isCapabilityEnabled = (capabilityId: keyof AgentCapabilities): boolean => {
    const cap = capabilities[capabilityId];
    return typeof cap === 'object' && cap.enabled;
  };

  const getEnabledCapabilitiesCount = (): number => {
    return Object.values(capabilities).filter(cap => 
      typeof cap === 'object' && cap.enabled
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <span>Capabilities Selection</span>
        </h2>
        <p className="text-muted-foreground mt-2">
          Choose which modalities your agent can handle and configure the tools it can use.
        </p>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CAPABILITY_CONFIGS.map((config) => {
          const isEnabled = isCapabilityEnabled(config.id);
          const capability = capabilities[config.id];
          const hasProvider = typeof capability === 'object' && 'provider' in capability;

          return (
            <Card key={config.id} className={`transition-all ${isEnabled ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(enabled) => handleCapabilityToggle(config.id, enabled)}
                  />
                </div>

                {/* Dependencies Warning */}
                {config.dependencies && isEnabled && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Requires: {config.dependencies.map(dep => 
                        CAPABILITY_CONFIGS.find(c => c.id === dep)?.name
                      ).join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>

              {isEnabled && (
                <CardContent className="space-y-4">
                  {/* Provider Selection */}
                  {hasProvider && config.providers.length > 1 && (
                    <div>
                      <h4 className="font-medium mb-2">Service Provider</h4>
                      <div className="space-y-2">
                        {config.providers.map((provider) => (
                          <div
                            key={provider.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              (capability as any).provider === provider.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => handleProviderChange(config.id, provider.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium">{provider.name}</h5>
                                <p className="text-sm text-muted-foreground">{provider.description}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span className="text-xs">{provider.cost}</span>
                                </div>
                              </div>
                              {(capability as any).provider === provider.id && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {provider.features.map((feature) => (
                                <Badge key={feature} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Single Provider Info */}
                  {hasProvider && config.providers.length === 1 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{config.providers[0].name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {config.providers[0].description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs">{config.providers[0].cost}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Tools Selection */}
      {getEnabledCapabilitiesCount() > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wrench className="h-5 w-5" />
              <span>Available Tools</span>
            </CardTitle>
            <CardDescription>
              Select the tools your agent can use to enhance its capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {['search', 'data', 'utility', 'communication', 'automation'].map((category) => {
              const categoryTools = getToolsByCategory(category);
              if (categoryTools.length === 0) return null;

              const isExpanded = expandedTools[category];

              return (
                <div key={category}>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto"
                    onClick={() => setExpandedTools(prev => ({ ...prev, [category]: !isExpanded }))}
                  >
                    <span className="font-medium capitalize">{category} Tools ({categoryTools.length})</span>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 pl-4">
                      {categoryTools.map((tool) => (
                        <div key={tool.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <h5 className="font-medium">{tool.name}</h5>
                            <p className="text-sm text-muted-foreground">{tool.description}</p>
                          </div>
                          <Switch
                            checked={capabilities.tools.includes(tool.id)}
                            onCheckedChange={(enabled) => handleToolToggle(tool.id, enabled)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Cost Estimation */}
      {getEnabledCapabilitiesCount() > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Cost Estimation</span>
            </CardTitle>
            <CardDescription>
              Estimated costs based on your selected capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Monthly Base Cost</h4>
                <p className="text-2xl font-bold text-primary">${costEstimate.monthly}</p>
                <p className="text-sm text-muted-foreground">Fixed monthly fees</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Per Message Cost</h4>
                <p className="text-2xl font-bold text-primary">${costEstimate.perMessage.toFixed(3)}</p>
                <p className="text-sm text-muted-foreground">Variable usage costs</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <h4 className="font-medium">Cost Breakdown</h4>
              {costEstimate.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.capability}</span>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="font-mono">${item.cost.toFixed(3)}</span>
                </div>
              ))}
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                These are estimated costs. Actual usage may vary based on conversation volume and complexity.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Validation Messages */}
      {getEnabledCapabilitiesCount() === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please enable at least one capability to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button 
          onClick={onNext} 
          disabled={getEnabledCapabilitiesCount() === 0}
        >
          Next: Channels
        </Button>
      </div>
    </div>
  );
}