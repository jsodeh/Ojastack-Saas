import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Circle, 
  AlertCircle,
  Clock,
  Sparkles,
  Database,
  User,
  Settings,
  Zap,
  TestTube,
  Rocket
} from 'lucide-react';

import { useAgentCreation, WizardStep } from './AgentCreationContext';

interface WizardProgressProps {
  variant?: 'sidebar' | 'horizontal' | 'compact';
  showLabels?: boolean;
  showProgress?: boolean;
}

const STEP_ICONS = {
  template: Sparkles,
  knowledge: Database,
  personality: User,
  capabilities: Settings,
  channels: Zap,
  testing: TestTube,
  deployment: Rocket
};

export default function WizardProgress({ 
  variant = 'sidebar', 
  showLabels = true,
  showProgress = true 
}: WizardProgressProps) {
  const { state, steps, goToStep } = useAgentCreation();

  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to completed steps or the next step
    if (stepIndex <= state.currentStep + 1) {
      goToStep(stepIndex);
    }
  };

  if (variant === 'horizontal') {
    return (
      <div className="w-full">
        {showProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{state.progress}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCurrent = index === state.currentStep;
            const isCompleted = step.isComplete;
            const isAccessible = index <= state.currentStep + 1;
            const hasErrors = state.errors[step.id]?.length > 0;
            const IconComponent = STEP_ICONS[step.id as keyof typeof STEP_ICONS] || Circle;

            return (
              <div key={step.id} className="flex flex-col items-center space-y-2">
                <div
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : hasErrors
                          ? 'border-red-500 bg-red-50 text-red-500'
                          : isAccessible
                            ? 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
                            : 'border-gray-200 bg-gray-50 text-gray-300'
                  }`}
                  onClick={() => isAccessible && handleStepClick(index)}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : hasErrors ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <IconComponent className="h-5 w-5" />
                  )}
                  
                  {/* Step number badge */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                  </div>
                </div>
                
                {showLabels && (
                  <div className="text-center">
                    <p className={`text-xs font-medium ${
                      isCurrent ? 'text-primary' : isCompleted ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                )}
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className={`absolute top-5 left-full w-full h-0.5 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} style={{ transform: 'translateX(20px)', width: 'calc(100% - 40px)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {steps.map((step, index) => {
            const isCurrent = index === state.currentStep;
            const isCompleted = step.isComplete;
            const hasErrors = state.errors[step.id]?.length > 0;

            return (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full ${
                  isCurrent
                    ? 'bg-primary'
                    : isCompleted
                      ? 'bg-green-500'
                      : hasErrors
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                }`}
              />
            );
          })}
        </div>
        <span className="text-sm text-muted-foreground">
          {state.currentStep + 1} of {steps.length}
        </span>
        {showProgress && (
          <span className="text-sm font-medium">
            {state.progress}%
          </span>
        )}
      </div>
    );
  }

  // Default sidebar variant
  return (
    <div className="space-y-6">
      {showProgress && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{state.progress}%</span>
          </div>
          <Progress value={state.progress} className="h-2" />
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCurrent = index === state.currentStep;
          const isCompleted = step.isComplete;
          const isAccessible = index <= state.currentStep + 1;
          const hasErrors = state.errors[step.id]?.length > 0;
          const IconComponent = STEP_ICONS[step.id as keyof typeof STEP_ICONS] || Circle;

          return (
            <div
              key={step.id}
              className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                isCurrent 
                  ? 'bg-primary/10 border border-primary/20' 
                  : isAccessible 
                    ? 'hover:bg-gray-50' 
                    : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => isAccessible && handleStepClick(index)}
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : hasErrors
                        ? 'bg-red-50 text-red-500'
                        : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : hasErrors ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : isCurrent ? (
                    <IconComponent className="h-4 w-4" />
                  ) : (
                    <IconComponent className="h-4 w-4" />
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className={`text-sm font-medium ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    {step.title}
                  </p>
                  
                  <div className="flex items-center space-x-1">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {index + 1}
                    </Badge>
                    
                    {step.isOptional && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        Optional
                      </Badge>
                    )}
                    
                    {isCurrent && (
                      <Clock className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {step.description}
                </p>
                
                {hasErrors && (
                  <div className="mt-1">
                    <p className="text-xs text-red-500">
                      {state.errors[step.id].length} error{state.errors[step.id].length !== 1 ? 's' : ''}
                    </p>
                    <ul className="text-xs text-red-500 mt-1 space-y-0.5">
                      {state.errors[step.id].slice(0, 2).map((error, errorIndex) => (
                        <li key={errorIndex} className="flex items-start space-x-1">
                          <span>•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                      {state.errors[step.id].length > 2 && (
                        <li className="text-xs text-muted-foreground">
                          +{state.errors[step.id].length - 2} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export individual step progress indicator
export function StepProgressIndicator({ 
  stepId, 
  size = 'md' 
}: { 
  stepId: string; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const { state, steps } = useAgentCreation();
  
  const step = steps.find(s => s.id === stepId);
  const stepIndex = steps.findIndex(s => s.id === stepId);
  
  if (!step) return null;
  
  const isCurrent = stepIndex === state.currentStep;
  const isCompleted = step.isComplete;
  const hasErrors = state.errors[step.id]?.length > 0;
  const IconComponent = STEP_ICONS[step.id as keyof typeof STEP_ICONS] || Circle;
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-10 h-10'
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]} rounded-full ${
      isCurrent
        ? 'bg-primary text-primary-foreground'
        : isCompleted
          ? 'bg-green-500 text-white'
          : hasErrors
            ? 'bg-red-50 text-red-500 border border-red-200'
            : 'bg-gray-100 text-gray-400'
    }`}>
      {isCompleted ? (
        <CheckCircle className={iconSizes[size]} />
      ) : hasErrors ? (
        <AlertCircle className={iconSizes[size]} />
      ) : (
        <IconComponent className={iconSizes[size]} />
      )}
    </div>
  );
}