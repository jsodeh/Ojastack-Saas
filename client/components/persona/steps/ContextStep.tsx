import React, { useState, useEffect } from 'react';
import { 
  AgentPersona, 
  PersonalizationLevel, 
  AdaptabilityLevel, 
  LearningMode 
} from '@/lib/persona-types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  ChevronRight,
  Brain,
  Clock,
  User,
  TrendingUp,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextStepProps {
  personaData: Partial<AgentPersona>;
  onUpdate: (data: Partial<AgentPersona>) => void;
  onNext: () => void;
  onPrevious: () => void;
  errors: Record<string, string>;
}

const personalizationLevels: Array<{ value: PersonalizationLevel; label: string; description: string }> = [
  { value: 'none', label: 'None', description: 'No personalization - same for all users' },
  { value: 'basic', label: 'Basic', description: 'Remember user name and basic preferences' },
  { value: 'moderate', label: 'Moderate', description: 'Adapt based on conversation history' },
  { value: 'high', label: 'High', description: 'Deep personalization with user modeling' },
  { value: 'adaptive', label: 'Adaptive', description: 'Continuously learn and adapt to user' }
];

const adaptabilityLevels: Array<{ value: AdaptabilityLevel; label: string; description: string }> = [
  { value: 'fixed', label: 'Fixed', description: 'Consistent behavior, no adaptation' },
  { value: 'limited', label: 'Limited', description: 'Minor adjustments based on context' },
  { value: 'moderate', label: 'Moderate', description: 'Adapt communication style as needed' },
  { value: 'high', label: 'High', description: 'Flexible adaptation to user needs' },
  { value: 'dynamic', label: 'Dynamic', description: 'Real-time adaptation to conversation flow' }
];

const learningModes: Array<{ value: LearningMode; label: string; description: string }> = [
  { value: 'static', label: 'Static', description: 'No learning - fixed knowledge base' },
  { value: 'session_based', label: 'Session-based', description: 'Learn within conversation sessions' },
  { value: 'user_based', label: 'User-based', description: 'Learn and remember per user' },
  { value: 'continuous', label: 'Continuous', description: 'Continuously learn from all interactions' }
];

export default function ContextStep({
  personaData,
  onUpdate,
  onNext,
  onPrevious,
  errors
}: ContextStepProps) {
  const [shortTermMemory, setShortTermMemory] = useState(
    personaData.contextConfig?.memoryRetention?.shortTerm || 30
  );
  const [longTermMemory, setLongTermMemory] = useState(
    personaData.contextConfig?.memoryRetention?.longTerm || 7
  );
  const [contextWindow, setContextWindow] = useState(
    personaData.contextConfig?.contextWindow || 4000
  );
  const [personalization, setPersonalization] = useState<PersonalizationLevel>(
    personaData.contextConfig?.personalization || 'moderate'
  );
  const [adaptability, setAdaptability] = useState<AdaptabilityLevel>(
    personaData.contextConfig?.adaptability || 'moderate'
  );
  const [learningMode, setLearningMode] = useState<LearningMode>(
    personaData.contextConfig?.learningMode || 'session_based'
  );
  const [rememberKeyFacts, setRememberKeyFacts] = useState(
    personaData.contextConfig?.memoryRetention?.keyFacts !== false
  );
  const [rememberPreferences, setRememberPreferences] = useState(
    personaData.contextConfig?.memoryRetention?.preferences !== false
  );
  const [rememberHistory, setRememberHistory] = useState(
    personaData.contextConfig?.memoryRetention?.conversationHistory !== false
  );

  // Update persona data when values change
  useEffect(() => {
    const updatedContextConfig = {
      ...personaData.contextConfig,
      memoryRetention: {
        shortTerm: shortTermMemory,
        longTerm: longTermMemory,
        keyFacts: rememberKeyFacts,
        preferences: rememberPreferences,
        conversationHistory: rememberHistory
      },
      contextWindow,
      personalization,
      adaptability,
      learningMode
    };

    onUpdate({
      ...personaData,
      contextConfig: updatedContextConfig
    });
  }, [
    shortTermMemory,
    longTermMemory,
    contextWindow,
    personalization,
    adaptability,
    learningMode,
    rememberKeyFacts,
    rememberPreferences,
    rememberHistory
  ]);

  const handleSubmit = () => {
    onNext();
  };

  const getMemoryLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const getDaysLabel = (days: number) => {
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  };

  const getContextWindowLabel = (tokens: number) => {
    if (tokens < 1000) return `${tokens} tokens`;
    return `${(tokens / 1000).toFixed(1)}k tokens`;
  };

  return (
    <div className="space-y-8">
      {/* Memory Retention */}
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Memory & Retention
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            Configure how your agent remembers and uses information
          </p>
        </div>

        {/* Memory Duration Sliders */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Short-term Memory</Label>
              <Badge variant="outline">{getMemoryLabel(shortTermMemory)}</Badge>
            </div>
            <Slider
              value={[shortTermMemory]}
              onValueChange={(value) => setShortTermMemory(value[0])}
              min={5}
              max={240}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>5 minutes</span>
              <span>4 hours</span>
            </div>
            <p className="text-xs text-gray-600">
              How long to remember details within a conversation
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Long-term Memory</Label>
              <Badge variant="outline">{getDaysLabel(longTermMemory)}</Badge>
            </div>
            <Slider
              value={[longTermMemory]}
              onValueChange={(value) => setLongTermMemory(value[0])}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 day</span>
              <span>30 days</span>
            </div>
            <p className="text-xs text-gray-600">
              How long to remember user information across sessions
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Context Window</Label>
              <Badge variant="outline">{getContextWindowLabel(contextWindow)}</Badge>
            </div>
            <Slider
              value={[contextWindow]}
              onValueChange={(value) => setContextWindow(value[0])}
              min={1000}
              max={16000}
              step={500}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1k tokens</span>
              <span>16k tokens</span>
            </div>
            <p className="text-xs text-gray-600">
              Maximum conversation context to maintain
            </p>
          </div>
        </div>

        {/* Memory Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">What to Remember</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="keyFacts"
                checked={rememberKeyFacts}
                onChange={(e) => setRememberKeyFacts(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="keyFacts" className="text-sm">
                Key Facts & Information
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="preferences"
                checked={rememberPreferences}
                onChange={(e) => setRememberPreferences(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="preferences" className="text-sm">
                User Preferences & Settings
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="history"
                checked={rememberHistory}
                onChange={(e) => setRememberHistory(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="history" className="text-sm">
                Conversation History
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Personalization */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Personalization Level
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            How much should your agent personalize responses for each user?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {personalizationLevels.map(level => (
            <Card
              key={level.value}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md',
                personalization === level.value 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'hover:border-gray-300'
              )}
              onClick={() => setPersonalization(level.value)}
            >
              <div className="space-y-2">
                <h4 className={cn(
                  'font-medium text-sm',
                  personalization === level.value ? 'text-blue-900' : 'text-gray-900'
                )}>
                  {level.label}
                </h4>
                <p className={cn(
                  'text-xs',
                  personalization === level.value ? 'text-blue-700' : 'text-gray-600'
                )}>
                  {level.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Adaptability */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Adaptability Level
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            How flexible should your agent be in adapting its behavior?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {adaptabilityLevels.map(level => (
            <Card
              key={level.value}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md',
                adaptability === level.value 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'hover:border-gray-300'
              )}
              onClick={() => setAdaptability(level.value)}
            >
              <div className="space-y-2">
                <h4 className={cn(
                  'font-medium text-sm',
                  adaptability === level.value ? 'text-blue-900' : 'text-gray-900'
                )}>
                  {level.label}
                </h4>
                <p className={cn(
                  'text-xs',
                  adaptability === level.value ? 'text-blue-700' : 'text-gray-600'
                )}>
                  {level.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Learning Mode */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Database className="w-5 h-5" />
            Learning Mode
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            How should your agent learn and improve over time?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {learningModes.map(mode => (
            <Card
              key={mode.value}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md',
                learningMode === mode.value 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'hover:border-gray-300'
              )}
              onClick={() => setLearningMode(mode.value)}
            >
              <div className="space-y-2">
                <h4 className={cn(
                  'font-medium text-sm',
                  learningMode === mode.value ? 'text-blue-900' : 'text-gray-900'
                )}>
                  {mode.label}
                </h4>
                <p className={cn(
                  'text-xs',
                  learningMode === mode.value ? 'text-blue-700' : 'text-gray-600'
                )}>
                  {mode.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Summary */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-3">Context Configuration Summary</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Memory:</strong> {getMemoryLabel(shortTermMemory)} short-term, {getDaysLabel(longTermMemory)} long-term
          </p>
          <p>
            <strong>Context Window:</strong> {getContextWindowLabel(contextWindow)}
          </p>
          <p>
            <strong>Personalization:</strong> {personalization} level
          </p>
          <p>
            <strong>Adaptability:</strong> {adaptability} flexibility
          </p>
          <p>
            <strong>Learning:</strong> {learningMode.replace('_', ' ')} mode
          </p>
          <p>
            <strong>Remembers:</strong> {[
              rememberKeyFacts && 'key facts',
              rememberPreferences && 'preferences', 
              rememberHistory && 'conversation history'
            ].filter(Boolean).join(', ') || 'nothing'}
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
          Continue to Review
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}