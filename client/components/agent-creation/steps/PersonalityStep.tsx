import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Sparkles, MessageSquare, Settings, Eye, EyeOff, Wand2 } from 'lucide-react';
import { useAgentCreation } from '../AgentCreationContext';
import { PersonalityConfig } from '@/lib/agent-service';
import PromptEditor from '../PromptEditor';
import PersonalityPreview from '../PersonalityPreview';
import { promptGenerator, PromptGenerationOptions } from '@/lib/prompt-generator';



const TONE_OPTIONS = [
  {
    value: 'professional' as const,
    label: 'Professional',
    description: 'Formal, business-like communication',
    preview: 'I would be happy to assist you with your inquiry. Let me provide you with the information you need.',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    value: 'friendly' as const,
    label: 'Friendly',
    description: 'Warm, approachable, and personable',
    preview: 'Hi there! I\'d love to help you out with that. Let me see what I can find for you!',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    value: 'casual' as const,
    label: 'Casual',
    description: 'Relaxed, conversational style',
    preview: 'Hey! Sure thing, I can help with that. What exactly are you looking for?',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    value: 'formal' as const,
    label: 'Formal',
    description: 'Structured, respectful communication',
    preview: 'Good day. I shall be pleased to provide assistance regarding your request. Please allow me to address your inquiry.',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  {
    value: 'enthusiastic' as const,
    label: 'Enthusiastic',
    description: 'Energetic and excited to help',
    preview: 'Awesome question! I\'m excited to help you with this - there\'s so much we can explore together!',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  {
    value: 'encouraging' as const,
    label: 'Encouraging',
    description: 'Supportive and motivating',
    preview: 'That\'s a great question! You\'re on the right track, and I\'m here to support you every step of the way.',
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  }
];

const RESPONSE_STYLE_OPTIONS = {
  length: [
    { value: 'concise' as const, label: 'Concise', description: 'Brief, to-the-point responses' },
    { value: 'detailed' as const, label: 'Detailed', description: 'Comprehensive explanations' },
    { value: 'comprehensive' as const, label: 'Comprehensive', description: 'Thorough, in-depth responses' }
  ],
  formality: [
    { value: 'casual' as const, label: 'Casual', description: 'Relaxed communication style' },
    { value: 'professional' as const, label: 'Professional', description: 'Business-appropriate tone' },
    { value: 'formal' as const, label: 'Formal', description: 'Structured, respectful language' }
  ],
  empathy: [
    { value: 'low' as const, label: 'Low', description: 'Factual, direct responses' },
    { value: 'medium' as const, label: 'Medium', description: 'Balanced emotional awareness' },
    { value: 'high' as const, label: 'High', description: 'Highly empathetic and understanding' }
  ],
  proactivity: [
    { value: 'reactive' as const, label: 'Reactive', description: 'Responds only to direct questions' },
    { value: 'balanced' as const, label: 'Balanced', description: 'Offers relevant suggestions' },
    { value: 'proactive' as const, label: 'Proactive', description: 'Anticipates needs and offers help' }
  ]
};



export default function PersonalityStep({ onNext, onPrevious }: StepProps) {
  const { state, setPersonality, setAgentInfo, setStepValidation } = useAgentCreation();
  const [localPersonality, setLocalPersonality] = useState<PersonalityConfig>(state.personality);
  const [agentName, setAgentName] = useState(state.agentName);
  const [agentDescription, setAgentDescription] = useState(state.agentDescription);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [previewTone, setPreviewTone] = useState<string | null>(null);

  // Generate prompt options for the prompt generator
  const promptOptions: PromptGenerationOptions = {
    agentName: agentName || 'Assistant',
    agentDescription: agentDescription,
    template: state.selectedTemplate,
    knowledgeBases: state.knowledgeBases,
    capabilities: state.capabilities ? Object.keys(state.capabilities).filter(key => 
      state.capabilities[key as keyof typeof state.capabilities]?.enabled
    ) : []
  };

  // Update system prompt when personality changes (only if not manually edited)
  useEffect(() => {
    if (agentName.trim() && !showPromptEditor) {
      const generatedPrompt = promptGenerator.generateSystemPrompt(localPersonality, promptOptions);
      const updatedPersonality = {
        ...localPersonality,
        systemPrompt: generatedPrompt
      };
      setLocalPersonality(updatedPersonality);
    }
  }, [localPersonality.tone, localPersonality.creativityLevel, localPersonality.responseStyle, agentName, promptOptions, showPromptEditor]);

  // Validate step
  useEffect(() => {
    const isValid = agentName.trim().length > 0 && localPersonality.systemPrompt.trim().length > 0;
    setStepValidation('personality', isValid);
  }, [agentName, localPersonality.systemPrompt, setStepValidation]);

  const handlePersonalityChange = (updates: Partial<PersonalityConfig>) => {
    const updated = { ...localPersonality, ...updates };
    setLocalPersonality(updated);
    setPersonality(updated);
  };

  const handleAgentInfoChange = (name: string, description: string) => {
    setAgentName(name);
    setAgentDescription(description);
    setAgentInfo(name, description);
  };

  const handlePromptChange = (newPrompt: string) => {
    const updated = { ...localPersonality, systemPrompt: newPrompt };
    setLocalPersonality(updated);
    setPersonality(updated);
  };

  const handleNext = () => {
    setPersonality(localPersonality);
    setAgentInfo(agentName, agentDescription);
    onNext();
  };

  const selectedToneOption = TONE_OPTIONS.find(option => option.value === localPersonality.tone);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <User className="h-6 w-6" />
          Personality Configuration
        </h2>
        <p className="text-muted-foreground mt-2">
          Define your agent's personality and communication style
        </p>
      </div>

      {/* Agent Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Agent Information
          </CardTitle>
          <CardDescription>
            Set your agent's name and description
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name *</Label>
            <Input
              id="agent-name"
              placeholder="Enter your agent's name"
              value={agentName}
              onChange={(e) => handleAgentInfoChange(e.target.value, agentDescription)}
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-description">Description</Label>
            <Textarea
              id="agent-description"
              placeholder="Describe what your agent does and its purpose"
              value={agentDescription}
              onChange={(e) => handleAgentInfoChange(agentName, e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tone Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Communication Tone
          </CardTitle>
          <CardDescription>
            Choose how your agent communicates with users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TONE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  localPersonality.tone === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePersonalityChange({ tone: option.value })}
                onMouseEnter={() => setPreviewTone(option.value)}
                onMouseLeave={() => setPreviewTone(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={option.color}>
                    {option.label}
                  </Badge>
                  {localPersonality.tone === option.value && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {option.description}
                </p>
                {(previewTone === option.value || localPersonality.tone === option.value) && (
                  <div className="text-xs bg-gray-50 p-2 rounded italic">
                    "{option.preview}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Creativity Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Creativity Level
          </CardTitle>
          <CardDescription>
            Control how creative and innovative your agent's responses are
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Creativity: {localPersonality.creativityLevel}%</Label>
              <Badge variant="outline">
                {localPersonality.creativityLevel < 30 ? 'Conservative' :
                 localPersonality.creativityLevel > 70 ? 'Creative' : 'Balanced'}
              </Badge>
            </div>
            <Slider
              value={[localPersonality.creativityLevel]}
              onValueChange={([value]) => handlePersonalityChange({ creativityLevel: value })}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Conservative & Factual</span>
              <span>Balanced & Thoughtful</span>
              <span>Creative & Innovative</span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm">
              <strong>Current setting:</strong> Your agent will be{' '}
              {localPersonality.creativityLevel < 30 
                ? 'conservative and stick to factual information'
                : localPersonality.creativityLevel > 70 
                ? 'creative and offer innovative solutions'
                : 'balanced, providing thoughtful and well-reasoned responses'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Response Style Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Response Style</CardTitle>
          <CardDescription>
            Fine-tune how your agent structures and delivers responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(RESPONSE_STYLE_OPTIONS).map(([category, options]) => (
            <div key={category} className="space-y-3">
              <Label className="text-sm font-medium capitalize">
                {category === 'length' ? 'Response Length' :
                 category === 'formality' ? 'Formality Level' :
                 category === 'empathy' ? 'Empathy Level' :
                 'Proactivity Level'}
              </Label>
              <div className="flex gap-2 flex-wrap">
                {options.map((option) => (
                  <Button
                    key={option.value}
                    variant={localPersonality.responseStyle[category as keyof typeof localPersonality.responseStyle] === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePersonalityChange({
                      responseStyle: {
                        ...localPersonality.responseStyle,
                        [category]: option.value
                      }
                    })}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {options.find(opt => opt.value === localPersonality.responseStyle[category as keyof typeof localPersonality.responseStyle])?.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Personality Preview */}
      <PersonalityPreview
        personality={localPersonality}
        agentName={agentName || 'Your Agent'}
        template={state.selectedTemplate}
        onPersonalityChange={handlePersonalityChange}
      />

      {/* System Prompt Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              System Prompt
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPromptEditor(!showPromptEditor)}
            >
              {showPromptEditor ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPromptEditor ? 'Hide Editor' : 'Show Editor'}
            </Button>
          </CardTitle>
          <CardDescription>
            Configure the system prompt that will guide your agent's behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPromptEditor ? (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Current Prompt Preview:</p>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {localPersonality.systemPrompt || 'System prompt will be generated based on your personality settings...'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPromptEditor(true)}
                className="w-full"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Open Advanced Prompt Editor
              </Button>
            </div>
          ) : (
            <PromptEditor
              personality={localPersonality}
              options={promptOptions}
              onPromptChange={handlePromptChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!agentName.trim() || !localPersonality.systemPrompt.trim()}
        >
          Next: Capabilities
        </Button>
      </div>
    </div>
  );
}