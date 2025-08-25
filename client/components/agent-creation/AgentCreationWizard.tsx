import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  X,
  CheckCircle,
  Circle,
  AlertCircle
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { AgentCreationProvider, useAgentCreation } from './AgentCreationContext';
import { AgentTemplate } from '@/lib/agent-service';

// Step components (will be implemented in subsequent tasks)
import TemplateSelectionStep from './steps/TemplateSelectionStep';
import KnowledgeBaseStep from './steps/KnowledgeBaseStep';
import PersonalityStep from './steps/PersonalityStep';
import CapabilitiesStep from './steps/CapabilitiesStep';
import ChannelsStep from './steps/ChannelsStep';
import TestingStep from './steps/TestingStep';
import DeploymentStep from './steps/DeploymentStep';

interface AgentCreationWizardProps {
  template?: AgentTemplate;
  onComplete?: (agentId: string) => void;
  onCancel?: () => void;
}

export interface StepProps {
    onNext: () => void;
    onPrevious: () => void;
}

function AgentCreationWizardContent({ template, onComplete, onCancel }: AgentCreationWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const {
    state,
    steps,
    nextStep,
    previousStep,
    goToStep,
    setTemplate,
    saveDraft,
    resetWizard,
    validateStep
  } = useAgentCreation();

  // Initialize with template if provided
  useEffect(() => {
    if (template) {
      setTemplate(template);
    }
  }, [template, setTemplate]);

  // Load draft if specified in URL
  useEffect(() => {
    const draftId = searchParams.get('draft');
    if (draftId) {
      // TODO: Load draft from database
      console.log('Loading draft:', draftId);
    }
  }, [searchParams]);

  // Auto-save draft when state changes
  useEffect(() => {
    if (state.hasUnsavedChanges) {
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 2000); // Save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [state, saveDraft]);

  const handleNext = () => {
    const currentStepId = steps[state.currentStep].id;
    const isValid = validateStep(currentStepId);
    
    if (!isValid) {
      toast({
        title: "Please complete this step",
        description: "Fill in all required fields before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to completed steps or the next step
    if (stepIndex <= state.currentStep + 1) {
      goToStep(stepIndex);
    }
  };

  const handleCancel = () => {
    if (state.hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmLeave) return;
    }
    
    if (onCancel) {
      onCancel();
    } else {
      navigate('/dashboard/agents');
    }
  };

  const handleSaveDraft = async () => {
    await saveDraft();
    toast({
      title: "Draft Saved",
      description: "Your progress has been saved.",
    });
  };

  const renderStepContent = () => {
    const currentStepId = steps[state.currentStep].id;
    const props = { onNext: handleNext, onPrevious: handlePrevious };
    
    switch (currentStepId) {
      case 'template':
        return <TemplateSelectionStep {...props} />;
      case 'knowledge':
        return <KnowledgeBaseStep {...props} />;
      case 'personality':
        return <PersonalityStep {...props} />;
      case 'capabilities':
        return <CapabilitiesStep {...props} />;
      case 'channels':
        return <ChannelsStep {...props} />;
      case 'testing':
        return <TestingStep {...props} />;
      case 'deployment':
        return <DeploymentStep onComplete={onComplete} {...props} />;
      default:
        return <div>Step not found</div>;
    }
  };

  const currentStep = steps[state.currentStep];
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === steps.length - 1;
  const canProceed = validateStep(currentStep.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Agents
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold">
                  {state.agentName || 'Create New Agent'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Step {state.currentStep + 1} of {steps.length}: {currentStep.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {state.lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Saved {state.lastSaved.toLocaleTimeString()}
                </span>
              )}
              {state.hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Unsaved changes
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Overall Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">{state.progress}%</span>
                    </div>
                    <Progress value={state.progress} className="h-2" />
                  </div>

                  {/* Step List */}
                  <div className="space-y-3">
                    {steps.map((step, index) => {
                      const isCurrent = index === state.currentStep;
                      const isCompleted = step.isComplete;
                      const isAccessible = index <= state.currentStep + 1;
                      const hasErrors = state.errors[step.id]?.length > 0;

                      return (
                        <div
                          key={step.id}
                          className={`flex items-start space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            isCurrent 
                              ? 'bg-primary/10 border border-primary/20' 
                              : isAccessible 
                                ? 'hover:bg-gray-50' 
                                : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => isAccessible && handleStepClick(index)}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : hasErrors ? (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            ) : isCurrent ? (
                              <Circle className="h-5 w-5 text-primary fill-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              isCurrent ? 'text-primary' : isCompleted ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              {step.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {step.description}
                            </p>
                            {hasErrors && (
                              <p className="text-xs text-red-500 mt-1">
                                {state.errors[step.id].length} error{state.errors[step.id].length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                {/* Step Header */}
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline">
                      Step {state.currentStep + 1} of {steps.length}
                    </Badge>
                    {currentStep.isOptional && (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{currentStep.title}</h2>
                  <p className="text-muted-foreground">{currentStep.description}</p>
                </div>

                {/* Step Content */}
                <div className="mb-8">
                  {renderStepContent()}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={isFirstStep}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-3">
                    {!canProceed && !currentStep.isOptional && (
                      <span className="text-sm text-muted-foreground">
                        Complete required fields to continue
                      </span>
                    )}
                    
                    {isLastStep ? (
                      <Button
                        onClick={handleNext}
                        disabled={!canProceed}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Deploy Agent
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        disabled={!canProceed && !currentStep.isOptional}
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with provider
export default function AgentCreationWizard(props: AgentCreationWizardProps) {
  return (
    <AgentCreationProvider>
      <AgentCreationWizardContent {...props} />
    </AgentCreationProvider>
  );
}