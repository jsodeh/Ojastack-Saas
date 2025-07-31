import React, { useState, useEffect } from 'react';
import { 
  AgentPersona, 
  GreetingStyle, 
  QuestionHandlingStyle, 
  ClosingStyle, 
  FollowUpBehavior,
  ErrorHandlingStyle,
  ProactivityLevel,
  BehaviorConstraint,
  EscalationRule
} from '@/lib/persona-types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  MessageSquare,
  HelpCircle,
  CheckCircle,
  ArrowUp,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BehaviorStepProps {
  personaData: Partial<AgentPersona>;
  onUpdate: (data: Partial<AgentPersona>) => void;
  onNext: () => void;
  onPrevious: () => void;
  errors: Record<string, string>;
}

const greetingStyles: Array<{ value: GreetingStyle; label: string; description: string; example: string }> = [
  { 
    value: 'warm', 
    label: 'Warm', 
    description: 'Friendly and welcoming',
    example: "Hello! I'm so glad you're here. How can I brighten your day?"
  },
  { 
    value: 'professional', 
    label: 'Professional', 
    description: 'Courteous and business-like',
    example: "Good day. I'm here to assist you. How may I help you today?"
  },
  { 
    value: 'brief', 
    label: 'Brief', 
    description: 'Quick and to the point',
    example: "Hi! How can I help?"
  },
  { 
    value: 'personalized', 
    label: 'Personalized', 
    description: 'Tailored to the user',
    example: "Welcome back, Sarah! Ready to continue where we left off?"
  }
];

const questionHandlingStyles: Array<{ value: QuestionHandlingStyle; label: string; description: string }> = [
  { value: 'direct', label: 'Direct', description: 'Straight to the answer' },
  { value: 'exploratory', label: 'Exploratory', description: 'Ask follow-up questions to understand better' },
  { value: 'clarifying', label: 'Clarifying', description: 'Ensure understanding before answering' },
  { value: 'comprehensive', label: 'Comprehensive', description: 'Provide thorough, detailed responses' }
];

const closingStyles: Array<{ value: ClosingStyle; label: string; description: string }> = [
  { value: 'summary', label: 'Summary', description: 'Recap what was discussed' },
  { value: 'action_items', label: 'Action Items', description: 'List next steps' },
  { value: 'open_ended', label: 'Open-ended', description: 'Invite further questions' },
  { value: 'formal', label: 'Formal', description: 'Professional closing' },
  { value: 'friendly', label: 'Friendly', description: 'Warm farewell' }
];

const followUpBehaviors: Array<{ value: FollowUpBehavior; label: string; description: string }> = [
  { value: 'proactive', label: 'Proactive', description: 'Actively check in with users' },
  { value: 'reactive', label: 'Reactive', description: 'Respond when contacted' },
  { value: 'scheduled', label: 'Scheduled', description: 'Follow up at set intervals' },
  { value: 'none', label: 'None', description: 'No follow-up behavior' }
];

const errorHandlingStyles: Array<{ value: ErrorHandlingStyle; label: string; description: string }> = [
  { value: 'apologetic', label: 'Apologetic', description: 'Express regret and offer help' },
  { value: 'explanatory', label: 'Explanatory', description: 'Explain what went wrong' },
  { value: 'redirective', label: 'Redirective', description: 'Guide to alternative solutions' },
  { value: 'escalating', label: 'Escalating', description: 'Quickly escalate to human help' }
];

const proactivityLevels: Array<{ value: ProactivityLevel; label: string; description: string }> = [
  { value: 'passive', label: 'Passive', description: 'Only respond to direct questions' },
  { value: 'moderate', label: 'Moderate', description: 'Offer relevant suggestions' },
  { value: 'active', label: 'Active', description: 'Anticipate needs and offer help' },
  { value: 'highly_active', label: 'Highly Active', description: 'Continuously engage and assist' }
];

export default function BehaviorStep({
  personaData,
  onUpdate,
  onNext,
  onPrevious,
  errors
}: BehaviorStepProps) {
  const [greetingStyle, setGreetingStyle] = useState<GreetingStyle>(
    personaData.behaviorConfig?.conversationFlow?.greeting || 'professional'
  );
  const [questionHandling, setQuestionHandling] = useState<QuestionHandlingStyle>(
    personaData.behaviorConfig?.conversationFlow?.questionHandling || 'comprehensive'
  );
  const [closingStyle, setClosingStyle] = useState<ClosingStyle>(
    personaData.behaviorConfig?.conversationFlow?.closingStyle || 'summary'
  );
  const [followUpBehavior, setFollowUpBehavior] = useState<FollowUpBehavior>(
    personaData.behaviorConfig?.conversationFlow?.followUpBehavior || 'reactive'
  );
  const [errorHandling, setErrorHandling] = useState<ErrorHandlingStyle>(
    personaData.behaviorConfig?.errorHandling || 'explanatory'
  );
  const [proactivity, setProactivity] = useState<ProactivityLevel>(
    personaData.behaviorConfig?.proactivity || 'moderate'
  );
  const [constraints, setConstraints] = useState<BehaviorConstraint[]>(
    personaData.behaviorConfig?.constraints || []
  );
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>(
    personaData.behaviorConfig?.escalationRules || []
  );

  const [newConstraint, setNewConstraint] = useState({ rule: '', type: 'content' as const, severity: 'warning' as const });
  const [newEscalationRule, setNewEscalationRule] = useState({ condition: '', action: 'human_handoff' as const, message: '' });

  // Update persona data when values change
  useEffect(() => {
    const updatedBehaviorConfig = {
      ...personaData.behaviorConfig,
      conversationFlow: {
        greeting: greetingStyle,
        questionHandling,
        closingStyle,
        followUpBehavior
      },
      errorHandling,
      proactivity,
      constraints,
      escalationRules,
      responsePatterns: personaData.behaviorConfig?.responsePatterns || []
    };

    onUpdate({
      ...personaData,
      behaviorConfig: updatedBehaviorConfig
    });
  }, [greetingStyle, questionHandling, closingStyle, followUpBehavior, errorHandling, proactivity, constraints, escalationRules]);

  const addConstraint = () => {
    if (newConstraint.rule.trim()) {
      setConstraints([...constraints, { ...newConstraint, rule: newConstraint.rule.trim() }]);
      setNewConstraint({ rule: '', type: 'content', severity: 'warning' });
    }
  };

  const removeConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index));
  };

  const addEscalationRule = () => {
    if (newEscalationRule.condition.trim()) {
      setEscalationRules([...escalationRules, { 
        ...newEscalationRule, 
        condition: newEscalationRule.condition.trim(),
        message: newEscalationRule.message.trim() || undefined
      }]);
      setNewEscalationRule({ condition: '', action: 'human_handoff', message: '' });
    }
  };

  const removeEscalationRule = (index: number) => {
    setEscalationRules(escalationRules.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onNext();
  };

  return (
    <div className="space-y-8">
      {/* Conversation Flow */}
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold">Conversation Flow</Label>
          <p className="text-sm text-gray-600 mt-1">
            Define how your agent handles different parts of a conversation
          </p>
        </div>

        {/* Greeting Style */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Greeting Style
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {greetingStyles.map(style => (
              <Card
                key={style.value}
                className={cn(
                  'p-4 cursor-pointer transition-all hover:shadow-md',
                  greetingStyle === style.value 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                    : 'hover:border-gray-300'
                )}
                onClick={() => setGreetingStyle(style.value)}
              >
                <div className="space-y-2">
                  <h4 className={cn(
                    'font-medium text-sm',
                    greetingStyle === style.value ? 'text-blue-900' : 'text-gray-900'
                  )}>
                    {style.label}
                  </h4>
                  <p className={cn(
                    'text-xs',
                    greetingStyle === style.value ? 'text-blue-700' : 'text-gray-600'
                  )}>
                    {style.description}
                  </p>
                  <div className={cn(
                    'text-xs italic p-2 rounded bg-gray-100',
                    greetingStyle === style.value && 'bg-blue-100'
                  )}>
                    "{style.example}"
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Question Handling */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Question Handling
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {questionHandlingStyles.map(style => (
              <Card
                key={style.value}
                className={cn(
                  'p-3 cursor-pointer transition-all hover:shadow-md text-center',
                  questionHandling === style.value 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                    : 'hover:border-gray-300'
                )}
                onClick={() => setQuestionHandling(style.value)}
              >
                <h4 className={cn(
                  'font-medium text-sm mb-1',
                  questionHandling === style.value ? 'text-blue-900' : 'text-gray-900'
                )}>
                  {style.label}
                </h4>
                <p className={cn(
                  'text-xs',
                  questionHandling === style.value ? 'text-blue-700' : 'text-gray-600'
                )}>
                  {style.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Closing Style */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Closing Style
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {closingStyles.map(style => (
              <Card
                key={style.value}
                className={cn(
                  'p-3 cursor-pointer transition-all hover:shadow-md text-center',
                  closingStyle === style.value 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                    : 'hover:border-gray-300'
                )}
                onClick={() => setClosingStyle(style.value)}
              >
                <h4 className={cn(
                  'font-medium text-sm mb-1',
                  closingStyle === style.value ? 'text-blue-900' : 'text-gray-900'
                )}>
                  {style.label}
                </h4>
                <p className={cn(
                  'text-xs',
                  closingStyle === style.value ? 'text-blue-700' : 'text-gray-600'
                )}>
                  {style.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Behavior Settings */}
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold">Behavior Settings</Label>
          <p className="text-sm text-gray-600 mt-1">
            Configure how your agent behaves in different situations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Error Handling */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Error Handling
            </Label>
            <div className="space-y-2">
              {errorHandlingStyles.map(style => (
                <Card
                  key={style.value}
                  className={cn(
                    'p-3 cursor-pointer transition-all hover:shadow-md',
                    errorHandling === style.value 
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                      : 'hover:border-gray-300'
                  )}
                  onClick={() => setErrorHandling(style.value)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      errorHandling === style.value ? 'bg-blue-600' : 'bg-gray-300'
                    )} />
                    <div>
                      <h4 className={cn(
                        'font-medium text-sm',
                        errorHandling === style.value ? 'text-blue-900' : 'text-gray-900'
                      )}>
                        {style.label}
                      </h4>
                      <p className={cn(
                        'text-xs',
                        errorHandling === style.value ? 'text-blue-700' : 'text-gray-600'
                      )}>
                        {style.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Proactivity Level */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Proactivity Level
            </Label>
            <div className="space-y-2">
              {proactivityLevels.map(level => (
                <Card
                  key={level.value}
                  className={cn(
                    'p-3 cursor-pointer transition-all hover:shadow-md',
                    proactivity === level.value 
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                      : 'hover:border-gray-300'
                  )}
                  onClick={() => setProactivity(level.value)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      proactivity === level.value ? 'bg-blue-600' : 'bg-gray-300'
                    )} />
                    <div>
                      <h4 className={cn(
                        'font-medium text-sm',
                        proactivity === level.value ? 'text-blue-900' : 'text-gray-900'
                      )}>
                        {level.label}
                      </h4>
                      <p className={cn(
                        'text-xs',
                        proactivity === level.value ? 'text-blue-700' : 'text-gray-600'
                      )}>
                        {level.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavior Constraints */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Behavior Constraints</Label>
          <p className="text-sm text-gray-600 mt-1">
            Set rules and limitations for your agent's behavior
          </p>
        </div>

        <Card className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <select
                  value={newConstraint.type}
                  onChange={(e) => setNewConstraint({ ...newConstraint, type: e.target.value as any })}
                  className="w-full text-sm border rounded px-2 py-1"
                >
                  <option value="content">Content</option>
                  <option value="length">Length</option>
                  <option value="topic">Topic</option>
                  <option value="format">Format</option>
                  <option value="timing">Timing</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <select
                  value={newConstraint.severity}
                  onChange={(e) => setNewConstraint({ ...newConstraint, severity: e.target.value as any })}
                  className="w-full text-sm border rounded px-2 py-1"
                >
                  <option value="warning">Warning</option>
                  <option value="strict">Strict</option>
                  <option value="blocking">Blocking</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs">Rule</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Never discuss politics"
                    value={newConstraint.rule}
                    onChange={(e) => setNewConstraint({ ...newConstraint, rule: e.target.value })}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={addConstraint} disabled={!newConstraint.rule.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {constraints.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Active Constraints</Label>
                {constraints.map((constraint, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {constraint.type}
                      </Badge>
                      <Badge variant={constraint.severity === 'blocking' ? 'destructive' : 'secondary'} className="text-xs">
                        {constraint.severity}
                      </Badge>
                      <span className="text-sm">{constraint.rule}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeConstraint(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Escalation Rules */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Escalation Rules</Label>
          <p className="text-sm text-gray-600 mt-1">
            Define when and how to escalate conversations to humans
          </p>
        </div>

        <Card className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Condition</Label>
                <Input
                  placeholder="e.g., User asks for refund over $500"
                  value={newEscalationRule.condition}
                  onChange={(e) => setNewEscalationRule({ ...newEscalationRule, condition: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Action</Label>
                <select
                  value={newEscalationRule.action}
                  onChange={(e) => setNewEscalationRule({ ...newEscalationRule, action: e.target.value as any })}
                  className="w-full text-sm border rounded px-2 py-1"
                >
                  <option value="human_handoff">Human Handoff</option>
                  <option value="supervisor_alert">Supervisor Alert</option>
                  <option value="workflow_redirect">Workflow Redirect</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Message (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Message to show when escalating..."
                  value={newEscalationRule.message}
                  onChange={(e) => setNewEscalationRule({ ...newEscalationRule, message: e.target.value })}
                  className="text-sm"
                />
                <Button size="sm" onClick={addEscalationRule} disabled={!newEscalationRule.condition.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {escalationRules.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Active Escalation Rules</Label>
                {escalationRules.map((rule, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">{rule.condition}</span>
                      <Badge variant="outline" className="text-xs">
                        {rule.action.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeEscalationRule(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrevious}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button onClick={handleSubmit}>
          Continue to Context
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}