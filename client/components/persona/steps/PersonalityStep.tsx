import React, { useState, useEffect } from 'react';
import { AgentPersona, PersonalityTone, CommunicationStyle, PersonalityTrait } from '@/lib/persona-types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  ChevronRight,
  Heart,
  Smile,
  Briefcase,
  MessageCircle,
  Volume2,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalityStepProps {
  personaData: Partial<AgentPersona>;
  onUpdate: (data: Partial<AgentPersona>) => void;
  onNext: () => void;
  onPrevious: () => void;
  errors: Record<string, string>;
}

const toneOptions: Array<{ value: PersonalityTone; label: string; description: string; icon: any }> = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-focused', icon: Briefcase },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable', icon: Smile },
  { value: 'casual', label: 'Casual', description: 'Relaxed and informal', icon: MessageCircle },
  { value: 'authoritative', label: 'Authoritative', description: 'Confident and decisive', icon: Volume2 },
  { value: 'supportive', label: 'Supportive', description: 'Caring and helpful', icon: Heart },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic and positive', icon: Users }
];

const styleOptions: Array<{ value: CommunicationStyle; label: string; description: string }> = [
  { value: 'concise', label: 'Concise', description: 'Brief and to the point' },
  { value: 'detailed', label: 'Detailed', description: 'Thorough explanations' },
  { value: 'conversational', label: 'Conversational', description: 'Natural dialogue style' },
  { value: 'instructional', label: 'Instructional', description: 'Step-by-step guidance' },
  { value: 'consultative', label: 'Consultative', description: 'Advisory and questioning' },
  { value: 'storytelling', label: 'Storytelling', description: 'Uses examples and narratives' }
];

const traitOptions: Array<{ value: PersonalityTrait; label: string; description: string }> = [
  { value: 'patient', label: 'Patient', description: 'Takes time to understand and help' },
  { value: 'analytical', label: 'Analytical', description: 'Logical and detail-oriented' },
  { value: 'creative', label: 'Creative', description: 'Innovative and imaginative' },
  { value: 'diplomatic', label: 'Diplomatic', description: 'Tactful and considerate' },
  { value: 'direct', label: 'Direct', description: 'Straightforward and honest' },
  { value: 'encouraging', label: 'Encouraging', description: 'Motivating and positive' },
  { value: 'methodical', label: 'Methodical', description: 'Systematic and organized' },
  { value: 'innovative', label: 'Innovative', description: 'Forward-thinking and adaptable' },
  { value: 'collaborative', label: 'Collaborative', description: 'Team-oriented and inclusive' },
  { value: 'decisive', label: 'Decisive', description: 'Quick to make decisions' }
];

export default function PersonalityStep({
  personaData,
  onUpdate,
  onNext,
  onPrevious,
  errors
}: PersonalityStepProps) {
  const [tone, setTone] = useState<PersonalityTone>(
    personaData.personalityConfig?.tone || 'professional'
  );
  const [style, setStyle] = useState<CommunicationStyle>(
    personaData.personalityConfig?.style || 'conversational'
  );
  const [traits, setTraits] = useState<PersonalityTrait[]>(
    personaData.personalityConfig?.traits || []
  );
  const [formality, setFormality] = useState(
    personaData.personalityConfig?.formality === 'very_formal' ? 4 :
    personaData.personalityConfig?.formality === 'formal' ? 3 :
    personaData.personalityConfig?.formality === 'semi_formal' ? 2 :
    personaData.personalityConfig?.formality === 'informal' ? 1 : 0
  );
  const [empathy, setEmpathy] = useState(
    personaData.personalityConfig?.empathy === 'very_high' ? 4 :
    personaData.personalityConfig?.empathy === 'high' ? 3 :
    personaData.personalityConfig?.empathy === 'moderate' ? 2 :
    personaData.personalityConfig?.empathy === 'low' ? 1 : 2
  );
  const [humor, setHumor] = useState(
    personaData.personalityConfig?.humor === 'frequent' ? 3 :
    personaData.personalityConfig?.humor === 'moderate' ? 2 :
    personaData.personalityConfig?.humor === 'subtle' ? 1 : 0
  );

  // Update persona data when values change
  useEffect(() => {
    const formalityLevels = ['very_informal', 'informal', 'semi_formal', 'formal', 'very_formal'];
    const empathyLevels = ['low', 'moderate', 'high', 'very_high'];
    const humorLevels = ['none', 'subtle', 'moderate', 'frequent'];

    const updatedPersonalityConfig = {
      ...personaData.personalityConfig,
      tone,
      style,
      traits,
      formality: formalityLevels[formality] as any,
      empathy: empathyLevels[empathy] as any,
      humor: humorLevels[humor] as any,
      emotionalRange: 'moderate' as any
    };

    onUpdate({
      ...personaData,
      personalityConfig: updatedPersonalityConfig
    });
  }, [tone, style, traits, formality, empathy, humor]);

  const handleTraitToggle = (trait: PersonalityTrait) => {
    if (traits.includes(trait)) {
      setTraits(traits.filter(t => t !== trait));
    } else if (traits.length < 5) { // Limit to 5 traits
      setTraits([...traits, trait]);
    }
  };

  const handleSubmit = () => {
    onNext();
  };

  const getFormalityLabel = (value: number) => {
    const labels = ['Very Informal', 'Informal', 'Semi-formal', 'Formal', 'Very Formal'];
    return labels[value];
  };

  const getEmpathyLabel = (value: number) => {
    const labels = ['Low', 'Moderate', 'High', 'Very High'];
    return labels[value];
  };

  const getHumorLabel = (value: number) => {
    const labels = ['None', 'Subtle', 'Moderate', 'Frequent'];
    return labels[value];
  };

  return (
    <div className="space-y-8">
      {/* Tone Selection */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Personality Tone <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Choose the overall tone your agent should use when communicating
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {toneOptions.map(option => {
            const Icon = option.icon;
            return (
              <Card
                key={option.value}
                className={cn(
                  'p-4 cursor-pointer transition-all hover:shadow-md',
                  tone === option.value 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                    : 'hover:border-gray-300'
                )}
                onClick={() => setTone(option.value)}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <Icon className={cn(
                    'w-6 h-6',
                    tone === option.value ? 'text-blue-600' : 'text-gray-600'
                  )} />
                  <div>
                    <h4 className={cn(
                      'font-medium text-sm',
                      tone === option.value ? 'text-blue-900' : 'text-gray-900'
                    )}>
                      {option.label}
                    </h4>
                    <p className={cn(
                      'text-xs',
                      tone === option.value ? 'text-blue-700' : 'text-gray-600'
                    )}>
                      {option.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Communication Style */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Communication Style <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            How should your agent structure and deliver information?
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {styleOptions.map(option => (
            <Card
              key={option.value}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md',
                style === option.value 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'hover:border-gray-300'
              )}
              onClick={() => setStyle(option.value)}
            >
              <div className="flex items-start space-x-3">
                <div className={cn(
                  'w-3 h-3 rounded-full mt-1',
                  style === option.value ? 'bg-blue-600' : 'bg-gray-300'
                )} />
                <div>
                  <h4 className={cn(
                    'font-medium text-sm',
                    style === option.value ? 'text-blue-900' : 'text-gray-900'
                  )}>
                    {option.label}
                  </h4>
                  <p className={cn(
                    'text-xs',
                    style === option.value ? 'text-blue-700' : 'text-gray-600'
                  )}>
                    {option.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Personality Traits */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Personality Traits
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Select up to 5 traits that best describe your agent's personality
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {traitOptions.map(option => (
            <Badge
              key={option.value}
              variant={traits.includes(option.value) ? "default" : "outline"}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm transition-all',
                traits.includes(option.value) 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'hover:bg-gray-100',
                traits.length >= 5 && !traits.includes(option.value) && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => handleTraitToggle(option.value)}
            >
              {option.label}
            </Badge>
          ))}
        </div>
        
        {traits.length > 0 && (
          <div className="text-sm text-gray-600">
            Selected: {traits.length}/5 traits
          </div>
        )}
      </div>

      {/* Personality Sliders */}
      <div className="space-y-6">
        <Label className="text-base font-semibold">Fine-tune Personality</Label>
        
        {/* Formality */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Formality Level</Label>
            <Badge variant="outline">{getFormalityLabel(formality)}</Badge>
          </div>
          <Slider
            value={[formality]}
            onValueChange={(value) => setFormality(value[0])}
            max={4}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Very Informal</span>
            <span>Very Formal</span>
          </div>
        </div>

        {/* Empathy */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Empathy Level</Label>
            <Badge variant="outline">{getEmpathyLabel(empathy)}</Badge>
          </div>
          <Slider
            value={[empathy]}
            onValueChange={(value) => setEmpathy(value[0])}
            max={3}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>Very High</span>
          </div>
        </div>

        {/* Humor */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Humor Usage</Label>
            <Badge variant="outline">{getHumorLabel(humor)}</Badge>
          </div>
          <Slider
            value={[humor]}
            onValueChange={(value) => setHumor(value[0])}
            max={3}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>None</span>
            <span>Frequent</span>
          </div>
        </div>
      </div>

      {/* Preview */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-3">Personality Preview</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>{personaData.name || 'Your agent'}</strong> will communicate with a{' '}
            <strong>{tone}</strong> tone using a <strong>{style}</strong> style.
          </p>
          {traits.length > 0 && (
            <p>
              Key personality traits: <strong>{traits.join(', ')}</strong>
            </p>
          )}
          <p>
            Formality: <strong>{getFormalityLabel(formality)}</strong> • 
            Empathy: <strong>{getEmpathyLabel(empathy)}</strong> • 
            Humor: <strong>{getHumorLabel(humor)}</strong>
          </p>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrevious}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button onClick={handleSubmit}>
          Continue to Expertise
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}