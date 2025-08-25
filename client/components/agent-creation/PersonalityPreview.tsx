import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  RefreshCw, 
  Sparkles, 
  User, 
  Bot, 
  Eye,
  RotateCcw,
  Zap
} from 'lucide-react';
import { PersonalityConfig, AgentTemplate } from '@/lib/agent-service';

interface PersonalityPreviewProps {
  personality: PersonalityConfig;
  agentName: string;
  template?: AgentTemplate;
  onPersonalityChange?: (personality: PersonalityConfig) => void;
}

interface PreviewScenario {
  id: string;
  name: string;
  description: string;
  userMessage: string;
  category: 'greeting' | 'question' | 'problem' | 'complex' | 'emotional';
  icon: React.ReactNode;
}

interface PreviewResponse {
  scenarioId: string;
  response: string;
  characteristics: string[];
  timestamp: number;
}

const PREVIEW_SCENARIOS: PreviewScenario[] = [
  {
    id: 'greeting',
    name: 'First Contact',
    description: 'How the agent greets new users',
    userMessage: 'Hello, I need help with something.',
    category: 'greeting',
    icon: <User className="h-4 w-4" />
  },
  {
    id: 'simple-question',
    name: 'Simple Question',
    description: 'Response to a straightforward inquiry',
    userMessage: 'What are your main features?',
    category: 'question',
    icon: <MessageSquare className="h-4 w-4" />
  },
  {
    id: 'complex-problem',
    name: 'Complex Problem',
    description: 'Handling a multi-part technical issue',
    userMessage: 'I\'m having trouble integrating your API with my system. The authentication keeps failing, and I\'m not sure if it\'s a configuration issue or a code problem.',
    category: 'complex',
    icon: <Zap className="h-4 w-4" />
  },
  {
    id: 'emotional-situation',
    name: 'Frustrated User',
    description: 'Dealing with an upset or frustrated user',
    userMessage: 'This is really frustrating! I\'ve been trying to get this to work for hours and nothing is helping. I\'m about to give up.',
    category: 'emotional',
    icon: <Sparkles className="h-4 w-4" />
  },
  {
    id: 'problem-solving',
    name: 'Problem Solving',
    description: 'Helping solve a specific issue',
    userMessage: 'My dashboard isn\'t loading properly. It shows a blank screen after I log in.',
    category: 'problem',
    icon: <Bot className="h-4 w-4" />
  }
];

export default function PersonalityPreview({ 
  personality, 
  agentName, 
  template,
  onPersonalityChange 
}: PersonalityPreviewProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('greeting');
  const [responses, setResponses] = useState<Map<string, PreviewResponse>>(new Map());
  const [isGenerating, setIsGenerating] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [templateResponses, setTemplateResponses] = useState<Map<string, PreviewResponse>>(new Map());

  // Generate responses when personality changes
  useEffect(() => {
    generateAllResponses();
  }, [personality, agentName]);

  // Generate template comparison responses when template is available
  useEffect(() => {
    if (template && showComparison) {
      generateTemplateResponses();
    }
  }, [template, showComparison]);

  const generateAllResponses = async () => {
    const newResponses = new Map<string, PreviewResponse>();
    
    for (const scenario of PREVIEW_SCENARIOS) {
      setIsGenerating(prev => new Set([...prev, scenario.id]));
      
      try {
        const response = await generateResponse(scenario, personality, agentName);
        newResponses.set(scenario.id, response);
      } catch (error) {
        console.error(`Failed to generate response for ${scenario.id}:`, error);
      } finally {
        setIsGenerating(prev => {
          const newSet = new Set(prev);
          newSet.delete(scenario.id);
          return newSet;
        });
      }
    }
    
    setResponses(newResponses);
  };

  const generateTemplateResponses = async () => {
    if (!template?.personality) return;
    
    const templatePersonality = {
      ...personality,
      ...(template.personality as any)
    };
    
    const newResponses = new Map<string, PreviewResponse>();
    
    for (const scenario of PREVIEW_SCENARIOS) {
      try {
        const response = await generateResponse(scenario, templatePersonality, template.name);
        newResponses.set(scenario.id, response);
      } catch (error) {
        console.error(`Failed to generate template response for ${scenario.id}:`, error);
      }
    }
    
    setTemplateResponses(newResponses);
  };

  const generateResponse = async (
    scenario: PreviewScenario, 
    config: PersonalityConfig, 
    name: string
  ): Promise<PreviewResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    const response = generateMockResponse(scenario, config, name);
    const characteristics = analyzeResponseCharacteristics(response, config);
    
    return {
      scenarioId: scenario.id,
      response,
      characteristics,
      timestamp: Date.now()
    };
  };

  const generateMockResponse = (
    scenario: PreviewScenario, 
    config: PersonalityConfig, 
    name: string
  ): string => {
    const toneVariations = {
      professional: {
        greeting: `Hello! I'm ${name}, and I'm here to assist you professionally. How may I help you today?`,
        question: `I'd be happy to provide information about my main features. Let me outline the key capabilities I offer...`,
        problem: `I understand you're experiencing a dashboard loading issue. Let me help you troubleshoot this systematically.`,
        complex: `Thank you for providing those details about your API integration challenge. Let me address both the authentication and configuration aspects.`,
        emotional: `I understand your frustration, and I'm here to help resolve this issue efficiently. Let's work through this together.`
      },
      friendly: {
        greeting: `Hi there! I'm ${name}, and I'm excited to help you out! What can I do for you today?`,
        question: `Great question! I'd love to tell you about what I can do. Here are my main features...`,
        problem: `Oh no, that sounds frustrating! Let's get your dashboard working properly. I'll walk you through some solutions.`,
        complex: `I can definitely help with your API integration! Authentication issues can be tricky, but we'll figure this out together.`,
        emotional: `I totally get how frustrating that must be! Don't give up - I'm here to help, and we'll get this sorted out.`
      },
      casual: {
        greeting: `Hey! I'm ${name}. What's up? How can I help?`,
        question: `Sure thing! Here's what I can do for you...`,
        problem: `Ah, the blank screen issue. Yeah, that's annoying. Let's fix it.`,
        complex: `API troubles, huh? Authentication can be a pain. Let me help you sort this out.`,
        emotional: `Ugh, I feel you! That sounds super frustrating. But hey, we'll get this working - don't worry!`
      },
      formal: {
        greeting: `Good day. I am ${name}, and I shall be pleased to provide assistance. How may I be of service?`,
        question: `I would be delighted to inform you of my primary capabilities and features.`,
        problem: `I acknowledge the technical difficulty you are experiencing. Please allow me to provide a systematic solution.`,
        complex: `I understand the complexity of your integration challenge. Permit me to address each component methodically.`,
        emotional: `I recognize your frustration with this matter. Please be assured that I shall provide comprehensive assistance.`
      },
      enthusiastic: {
        greeting: `Hello and welcome! I'm ${name}, and I'm absolutely thrilled to help you today! What exciting challenge can we tackle together?`,
        question: `Oh, I'm so excited to share what I can do! There are so many amazing features I'd love to tell you about!`,
        problem: `This is a great opportunity to get your dashboard working perfectly! I love solving these kinds of issues!`,
        complex: `What an interesting technical challenge! API integrations can be complex, but that's what makes solving them so rewarding!`,
        emotional: `I can hear how much effort you've put into this, and that dedication is admirable! Let's channel that energy into finding the perfect solution!`
      },
      encouraging: {
        greeting: `Hello! I'm ${name}, and I'm here to support you every step of the way. You're in the right place for help!`,
        question: `That's a wonderful question! I'm happy to share my capabilities with you - you're going to find some great solutions here.`,
        problem: `You're taking exactly the right approach by reaching out! Dashboard issues are completely solvable, and I'll guide you through it.`,
        complex: `You're handling a complex integration challenge really well by breaking it down like this. Let's tackle each piece together.`,
        emotional: `Your persistence shows real determination, and that's going to pay off! Let's turn this frustration into success.`
      }
    };

    let baseResponse = toneVariations[config.tone]?.[scenario.category] || 
                     toneVariations.professional[scenario.category];

    // Adjust for creativity level
    if (config.creativityLevel > 70) {
      baseResponse += ' I have some innovative approaches we could explore that might work perfectly for your situation.';
    } else if (config.creativityLevel < 30) {
      baseResponse += ' I\'ll provide you with proven, reliable solutions that have worked well for others.';
    }

    // Adjust for response style
    if (config.responseStyle.length === 'comprehensive') {
      baseResponse += ' Let me provide you with detailed information and context to ensure you have everything you need.';
    } else if (config.responseStyle.length === 'concise') {
      // Keep response shorter
      baseResponse = baseResponse.split('.')[0] + '.';
    }

    // Adjust for empathy level
    if (config.responseStyle.empathy === 'high' && scenario.category === 'emotional') {
      baseResponse += ' I want you to know that your feelings are completely valid, and I\'m committed to helping you succeed.';
    }

    // Adjust for proactivity
    if (config.responseStyle.proactivity === 'proactive') {
      baseResponse += ' I\'ll also suggest some additional resources that might be helpful for your situation.';
    }

    return baseResponse;
  };

  const analyzeResponseCharacteristics = (response: string, config: PersonalityConfig): string[] => {
    const characteristics: string[] = [];
    
    // Tone characteristics
    characteristics.push(`${config.tone} tone`);
    
    // Length characteristics
    if (response.length > 200) {
      characteristics.push('detailed response');
    } else if (response.length < 100) {
      characteristics.push('concise response');
    } else {
      characteristics.push('balanced length');
    }
    
    // Creativity characteristics
    if (config.creativityLevel > 70) {
      characteristics.push('creative approach');
    } else if (config.creativityLevel < 30) {
      characteristics.push('conservative approach');
    } else {
      characteristics.push('balanced creativity');
    }
    
    // Empathy characteristics
    if (response.includes('understand') || response.includes('feel')) {
      characteristics.push('empathetic');
    }
    
    // Proactivity characteristics
    if (response.includes('also') || response.includes('additional')) {
      characteristics.push('proactive suggestions');
    }
    
    return characteristics;
  };

  const refreshResponse = async (scenarioId: string) => {
    setIsGenerating(prev => new Set([...prev, scenarioId]));
    
    try {
      const scenario = PREVIEW_SCENARIOS.find(s => s.id === scenarioId);
      if (scenario) {
        const response = await generateResponse(scenario, personality, agentName);
        setResponses(prev => new Map(prev.set(scenarioId, response)));
      }
    } catch (error) {
      console.error(`Failed to refresh response for ${scenarioId}:`, error);
    } finally {
      setIsGenerating(prev => {
        const newSet = new Set(prev);
        newSet.delete(scenarioId);
        return newSet;
      });
    }
  };

  const selectedScenarioData = PREVIEW_SCENARIOS.find(s => s.id === selectedScenario);
  const currentResponse = responses.get(selectedScenario);
  const templateResponse = templateResponses.get(selectedScenario);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Personality Preview
          </span>
          <div className="flex items-center gap-2">
            {template && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {showComparison ? 'Hide' : 'Show'} Template Comparison
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={generateAllResponses}
              disabled={isGenerating.size > 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating.size > 0 ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          See how your personality settings affect agent responses in different scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Test Scenarios</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PREVIEW_SCENARIOS.map((scenario) => (
              <Button
                key={scenario.id}
                variant={selectedScenario === scenario.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedScenario(scenario.id)}
                className="justify-start h-auto p-3"
              >
                <div className="flex items-start gap-2 text-left">
                  {scenario.icon}
                  <div>
                    <div className="font-medium text-xs">{scenario.name}</div>
                    <div className="text-xs opacity-70 mt-1">{scenario.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Preview Content */}
        {selectedScenarioData && (
          <div className="space-y-4">
            {/* User Message */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">User Message</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">{selectedScenarioData.userMessage}</p>
                </div>
              </div>
            </div>

            {/* Response Tabs */}
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Current Settings</TabsTrigger>
                <TabsTrigger value="comparison" disabled={!showComparison || !template}>
                  Template Default
                </TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Agent Response</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshResponse(selectedScenario)}
                      disabled={isGenerating.has(selectedScenario)}
                    >
                      <RefreshCw className={`h-3 w-3 ${isGenerating.has(selectedScenario) ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Bot className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        {isGenerating.has(selectedScenario) ? (
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Generating response...
                          </div>
                        ) : currentResponse ? (
                          <p className="text-sm text-green-800">{currentResponse.response}</p>
                        ) : (
                          <p className="text-sm text-green-600 italic">Response will appear here...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Response Characteristics */}
                  {currentResponse && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground">Response Characteristics</h5>
                      <div className="flex flex-wrap gap-1">
                        {currentResponse.characteristics.map((characteristic, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {characteristic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="comparison" className="space-y-4">
                {template && templateResponse && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Template Default Response</h4>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Bot className="h-4 w-4 text-purple-600 mt-0.5" />
                        <p className="text-sm text-purple-800">{templateResponse.response}</p>
                      </div>
                    </div>

                    {/* Template Characteristics */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground">Template Characteristics</h5>
                      <div className="flex flex-wrap gap-1">
                        {templateResponse.characteristics.map((characteristic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {characteristic}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Comparison Summary */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-medium mb-2">Key Differences</h5>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>• Current tone: <strong>{personality.tone}</strong> vs Template: <strong>{(template.personality as unknown as PersonalityConfig)?.tone || 'default'}</strong></div>
                        <div>• Current creativity: <strong>{personality.creativityLevel}%</strong> vs Template: <strong>{(template.personality as unknown as PersonalityConfig)?.creativityLevel || 50}%</strong></div>
                        <div>• Response length: <strong>{personality.responseStyle.length}</strong> vs Template: <strong>{(template.personality as unknown as PersonalityConfig)?.responseStyle?.length || 'default'}</strong></div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}