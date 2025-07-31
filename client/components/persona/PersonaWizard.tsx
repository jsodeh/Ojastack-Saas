import React, { useState, useEffect } from 'react';
import { PersonaWizardState, PersonaWizardStep, WizardStepConfig } from '@/lib/persona-types';
import { personaService } from '@/lib/persona-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import step components
import RoleDefinitionStep from './steps/RoleDefinitionStep';
import PersonalityStep from './steps/PersonalityStep';
import ExpertiseStep from './steps/ExpertiseStep';
import BehaviorStep from './steps/BehaviorStep';
import ContextStep from './steps/ContextStep';
import ReviewGenerateStep from './steps/ReviewGenerateStep';
import TestingStep from './steps/TestingStep';
import CompletionStep from './steps/CompletionStep';

interface PersonaWizardProps {
  userId: string;
  sessionId?: string;
  onComplete?: (persona: any) => void;
  onCancel?: () => void;
  className?: string;
}

export default function PersonaWizard({
  userId,
  sessionId,
  onComplete,
  onCancel,
  className
}: PersonaWizardProps) {
  const [wizardState, setWizardState] = useState<PersonaWizardState | null>(null);
  const [stepConfigs, setStepConfigs] = useState<WizardStepConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize wizard
  useEffect(() => {
    initializeWizard();
  }, [sessionId, userId]);

  const initializeWizard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get step configurations
      const configs = personaService.getWizardSteps();
      setStepConfigs(configs);

      // Load or create session
      let state: PersonaWizardState;
      if (sessionId) {
        const existingState = await personaService.loadWizardSession(sessionId);
        if (existingState) {
          state = existingState;
        } else {
          throw new Error('Session not found');
        }
      } else {
        state = await personaService.createWizardSession(userId);
      }

      setWizardState(state);
    } catch (error) {
      console.error('Failed to initialize wizard:', error);
      setError('Failed to initialize persona wizard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save wizard state
  const saveWizardState = async (newState: PersonaWizardState) => {
    if (!newState.sessionId) return;

    try {
      await personaService.updateWizardSession(newState.sessionId, newState);
      setWizardState(newState);
    } catch (error) {
      console.error('Failed to save wizard state:', error);
      setError('Failed to save progress. Please try again.');
    }
  };

  // Navigate to step
  const navigateToStep = async (step: PersonaWizardStep) => {
    if (!wizardState) return;

    const newState = {
      ...wizardState,
      currentStep: step,
      isDirty: true
    };

    await saveWizardState(newState);
  };

  // Complete current step
  const completeStep = async (stepData: any) => {
    if (!wizardState) return;

    const currentStep = wizardState.currentStep;
    const newPersonaData = { ...wizardState.personaData, ...stepData };
    
    // Mark step as completed if not already
    const completedSteps = wizardState.completedSteps.includes(currentStep)
      ? wizardState.completedSteps
      : [...wizardState.completedSteps, currentStep];

    const newState = {
      ...wizardState,
      personaData: newPersonaData,
      completedSteps,
      isDirty: true
    };

    // Validate the updated persona
    const validation = personaService.validatePersona(newPersonaData);
    newState.isValid = validation.isValid;
    newState.errors = validation.errors.reduce((acc, error) => {
      acc[error.field] = error.message;
      return acc;
    }, {} as Record<string, string>);

    await saveWizardState(newState);
  };

  // Go to next step
  const goToNextStep = () => {
    if (!wizardState) return;

    const currentIndex = stepConfigs.findIndex(config => config.step === wizardState.currentStep);
    if (currentIndex < stepConfigs.length - 1) {
      const nextStep = stepConfigs[currentIndex + 1].step;
      navigateToStep(nextStep);
    }
  };

  // Go to previous step
  const goToPreviousStep = () => {
    if (!wizardState) return;

    const currentIndex = stepConfigs.findIndex(config => config.step === wizardState.currentStep);
    if (currentIndex > 0) {
      const previousStep = stepConfigs[currentIndex - 1].step;
      navigateToStep(previousStep);
    }
  };

  // Complete wizard
  const completeWizard = async () => {
    if (!wizardState) return;

    try {
      setIsSaving(true);
      const persona = await personaService.completeWizardSession(wizardState.sessionId, userId);
      
      if (persona) {
        onComplete?.(persona);
      } else {
        throw new Error('Failed to save persona');
      }
    } catch (error) {
      console.error('Failed to complete wizard:', error);
      setError('Failed to save persona. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get current step config
  const getCurrentStepConfig = (): WizardStepConfig | null => {
    if (!wizardState) return null;
    return stepConfigs.find(config => config.step === wizardState.currentStep) || null;
  };

  // Calculate progress
  const getProgress = (): number => {
    if (!wizardState) return 0;
    return (wizardState.completedSteps.length / stepConfigs.length) * 100;
  };

  // Render step component
  const renderStepComponent = () => {
    if (!wizardState) return null;

    const commonProps = {
      personaData: wizardState.personaData,
      onUpdate: completeStep,
      onNext: goToNextStep,
      onPrevious: goToPreviousStep,
      errors: wizardState.errors
    };

    switch (wizardState.currentStep) {
      case 'role_definition':
        return <RoleDefinitionStep {...commonProps} />;
      case 'personality_setup':
        return <PersonalityStep {...commonProps} />;
      case 'expertise_config':
        return <ExpertiseStep {...commonProps} />;
      case 'behavior_config':
        return <BehaviorStep {...commonProps} />;
      case 'context_config':
        return <ContextStep {...commonProps} />;
      case 'review_generate':
        return <ReviewGenerateStep {...commonProps} />;
      case 'testing':
        return <TestingStep {...commonProps} />;
      case 'completion':
        return <CompletionStep {...commonProps} onComplete={completeWizard} />;
      default:
        return <div>Unknown step</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading persona wizard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={initializeWizard}>Try Again</Button>
      </Card>
    );
  }

  if (!wizardState) return null;

  const currentStepConfig = getCurrentStepConfig();
  const progress = getProgress();
  const currentStepIndex = stepConfigs.findIndex(config => config.step === wizardState.currentStep);

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              Create Agent Persona
            </h1>
            <p className="text-gray-600 mt-1">
              Build a unique personality for your AI agent
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => saveWizardState(wizardState)}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Step {currentStepIndex + 1} of {stepConfigs.length}
            </span>
            <span className="text-gray-600">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {stepConfigs.map((config, index) => {
            const isCompleted = wizardState.completedSteps.includes(config.step);
            const isCurrent = wizardState.currentStep === config.step;
            const isAccessible = index === 0 || wizardState.completedSteps.includes(stepConfigs[index - 1].step);

            return (
              <div key={config.step} className="flex items-center">
                <button
                  onClick={() => isAccessible ? navigateToStep(config.step) : null}
                  disabled={!isAccessible}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-lg transition-colors min-w-[120px]',
                    isCurrent && 'bg-blue-50 border-2 border-blue-200',
                    isCompleted && !isCurrent && 'bg-green-50 border border-green-200',
                    !isAccessible && 'opacity-50 cursor-not-allowed',
                    isAccessible && !isCurrent && !isCompleted && 'hover:bg-gray-50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center mb-2',
                    isCurrent && 'bg-blue-600 text-white',
                    isCompleted && 'bg-green-600 text-white',
                    !isCurrent && !isCompleted && 'bg-gray-200 text-gray-600'
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-medium text-center',
                    isCurrent && 'text-blue-700',
                    isCompleted && 'text-green-700',
                    !isCurrent && !isCompleted && 'text-gray-600'
                  )}>
                    {config.title}
                  </span>
                  {config.estimatedTime && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {config.estimatedTime}min
                      </span>
                    </div>
                  )}
                </button>
                
                {index < stepConfigs.length - 1 && (
                  <div className="w-8 h-px bg-gray-300 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step */}
      <Card className="p-6">
        {currentStepConfig && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {currentStepConfig.title}
            </h2>
            <p className="text-gray-600">
              {currentStepConfig.description}
            </p>
            {currentStepConfig.estimatedTime && (
              <Badge variant="secondary" className="mt-2">
                <Clock className="w-3 h-3 mr-1" />
                ~{currentStepConfig.estimatedTime} minutes
              </Badge>
            )}
          </div>
        )}

        {/* Step Content */}
        {renderStepComponent()}
      </Card>

      {/* Error Display */}
      {Object.keys(wizardState.errors).length > 0 && (
        <Card className="mt-4 p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 mb-2">Please fix the following issues:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {Object.entries(wizardState.errors).map(([field, message]) => (
                  <li key={field}>• {message}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}