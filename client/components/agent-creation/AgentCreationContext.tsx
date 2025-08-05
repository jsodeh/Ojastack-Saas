import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { AgentTemplate, PersonalityConfig, AgentCapabilities, DeploymentChannel } from '@/lib/agent-service';

// Wizard step definitions
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isValid: boolean;
  isOptional?: boolean;
}

// Agent creation state
export interface AgentCreationState {
  // Wizard navigation
  currentStep: number;
  totalSteps: number;
  progress: number;
  
  // Agent data
  template?: AgentTemplate;
  agentName: string;
  agentDescription: string;
  
  // Step data
  knowledgeBases: string[];
  newKnowledgeBase?: {
    name: string;
    files: File[];
    uploadProgress: Map<string, number>;
    processingStatus: Map<string, 'uploading' | 'processing' | 'complete' | 'error'>;
  };
  
  personality: PersonalityConfig;
  capabilities: AgentCapabilities;
  channels: DeploymentChannel[];
  
  // Draft management
  isDraft: boolean;
  draftId?: string;
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
  
  // Validation
  stepValidation: Record<string, boolean>;
  errors: Record<string, string[]>;
}

// Action types
type AgentCreationAction =
  | { type: 'SET_TEMPLATE'; payload: AgentTemplate }
  | { type: 'SET_AGENT_INFO'; payload: { name: string; description: string } }
  | { type: 'SET_KNOWLEDGE_BASES'; payload: string[] }
  | { type: 'SET_NEW_KNOWLEDGE_BASE'; payload: AgentCreationState['newKnowledgeBase'] }
  | { type: 'SET_PERSONALITY'; payload: PersonalityConfig }
  | { type: 'SET_CAPABILITIES'; payload: AgentCapabilities }
  | { type: 'SET_CHANNELS'; payload: DeploymentChannel[] }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'SET_STEP_VALIDATION'; payload: { step: string; isValid: boolean } }
  | { type: 'SET_ERRORS'; payload: { step: string; errors: string[] } }
  | { type: 'CLEAR_ERRORS'; payload: string }
  | { type: 'SAVE_DRAFT'; payload: { draftId: string; timestamp: Date } }
  | { type: 'LOAD_DRAFT'; payload: Partial<AgentCreationState> }
  | { type: 'MARK_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'RESET_WIZARD' };

// Initial state
const initialState: AgentCreationState = {
  currentStep: 0,
  totalSteps: 7,
  progress: 0,
  
  agentName: '',
  agentDescription: '',
  
  knowledgeBases: [],
  
  personality: {
    tone: 'professional',
    creativityLevel: 50,
    responseStyle: {
      length: 'detailed',
      formality: 'professional',
      empathy: 'medium',
      proactivity: 'balanced'
    },
    systemPrompt: ''
  },
  
  capabilities: {
    text: { enabled: true, provider: 'openai', model: 'gpt-4' },
    voice: { enabled: false, provider: 'elevenlabs', voiceId: 'default' },
    image: { enabled: false },
    video: { enabled: false },
    tools: []
  },
  
  channels: [],
  
  isDraft: true,
  hasUnsavedChanges: false,
  
  stepValidation: {},
  errors: {}
};

// Reducer
function agentCreationReducer(state: AgentCreationState, action: AgentCreationAction): AgentCreationState {
  switch (action.type) {
    case 'SET_TEMPLATE':
      return {
        ...state,
        template: action.payload,
        agentName: action.payload.name,
        agentDescription: action.payload.description,
        personality: { ...state.personality, ...action.payload.default_personality },
        capabilities: { ...state.capabilities, ...action.payload.capabilities },
        hasUnsavedChanges: true
      };
      
    case 'SET_AGENT_INFO':
      return {
        ...state,
        agentName: action.payload.name,
        agentDescription: action.payload.description,
        hasUnsavedChanges: true
      };
      
    case 'SET_KNOWLEDGE_BASES':
      return {
        ...state,
        knowledgeBases: action.payload,
        hasUnsavedChanges: true
      };
      
    case 'SET_NEW_KNOWLEDGE_BASE':
      return {
        ...state,
        newKnowledgeBase: action.payload,
        hasUnsavedChanges: true
      };
      
    case 'SET_PERSONALITY':
      return {
        ...state,
        personality: action.payload,
        hasUnsavedChanges: true
      };
      
    case 'SET_CAPABILITIES':
      return {
        ...state,
        capabilities: action.payload,
        hasUnsavedChanges: true
      };
      
    case 'SET_CHANNELS':
      return {
        ...state,
        channels: action.payload,
        hasUnsavedChanges: true
      };
      
    case 'NEXT_STEP':
      const nextStep = Math.min(state.currentStep + 1, state.totalSteps - 1);
      return {
        ...state,
        currentStep: nextStep,
        progress: Math.round(((nextStep + 1) / state.totalSteps) * 100)
      };
      
    case 'PREVIOUS_STEP':
      const prevStep = Math.max(state.currentStep - 1, 0);
      return {
        ...state,
        currentStep: prevStep,
        progress: Math.round(((prevStep + 1) / state.totalSteps) * 100)
      };
      
    case 'GO_TO_STEP':
      return {
        ...state,
        currentStep: action.payload,
        progress: Math.round(((action.payload + 1) / state.totalSteps) * 100)
      };
      
    case 'SET_STEP_VALIDATION':
      return {
        ...state,
        stepValidation: {
          ...state.stepValidation,
          [action.payload.step]: action.payload.isValid
        }
      };
      
    case 'SET_ERRORS':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.step]: action.payload.errors
        }
      };
      
    case 'CLEAR_ERRORS':
      const newErrors = { ...state.errors };
      delete newErrors[action.payload];
      return {
        ...state,
        errors: newErrors
      };
      
    case 'SAVE_DRAFT':
      return {
        ...state,
        draftId: action.payload.draftId,
        lastSaved: action.payload.timestamp,
        hasUnsavedChanges: false
      };
      
    case 'LOAD_DRAFT':
      return {
        ...state,
        ...action.payload,
        hasUnsavedChanges: false
      };
      
    case 'MARK_UNSAVED_CHANGES':
      return {
        ...state,
        hasUnsavedChanges: action.payload
      };
      
    case 'RESET_WIZARD':
      return {
        ...initialState,
        currentStep: 0,
        progress: Math.round((1 / initialState.totalSteps) * 100)
      };
      
    default:
      return state;
  }
}

// Context
interface AgentCreationContextType {
  state: AgentCreationState;
  dispatch: React.Dispatch<AgentCreationAction>;
  
  // Convenience methods
  setTemplate: (template: AgentTemplate) => void;
  setAgentInfo: (name: string, description: string) => void;
  setKnowledgeBases: (bases: string[]) => void;
  setPersonality: (personality: PersonalityConfig) => void;
  setCapabilities: (capabilities: AgentCapabilities) => void;
  setChannels: (channels: DeploymentChannel[]) => void;
  
  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  
  // Validation
  validateStep: (stepId: string) => boolean;
  setStepValidation: (step: string, isValid: boolean) => void;
  setStepErrors: (step: string, errors: string[]) => void;
  clearStepErrors: (step: string) => void;
  
  // Draft management
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  resetWizard: () => void;
  
  // Step definitions
  steps: WizardStep[];
}

const AgentCreationContext = createContext<AgentCreationContextType | undefined>(undefined);

// Step definitions
const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'template',
    title: 'Template Selection',
    description: 'Choose a template or start from scratch',
    isComplete: false,
    isValid: false
  },
  {
    id: 'knowledge',
    title: 'Knowledge Base',
    description: 'Add your content sources',
    isComplete: false,
    isValid: false
  },
  {
    id: 'personality',
    title: 'Personality',
    description: 'Configure agent behavior',
    isComplete: false,
    isValid: false
  },
  {
    id: 'capabilities',
    title: 'Capabilities',
    description: 'Enable features and tools',
    isComplete: false,
    isValid: false
  },
  {
    id: 'channels',
    title: 'Channels',
    description: 'Choose deployment channels',
    isComplete: false,
    isValid: false
  },
  {
    id: 'testing',
    title: 'Testing',
    description: 'Test your agent',
    isComplete: false,
    isValid: false
  },
  {
    id: 'deployment',
    title: 'Deployment',
    description: 'Deploy your agent',
    isComplete: false,
    isValid: false
  }
];

// Provider component
export function AgentCreationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(agentCreationReducer, initialState);

  // Auto-save draft every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!state.hasUnsavedChanges) return;

    const autoSaveInterval = setInterval(() => {
      saveDraft();
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [state.hasUnsavedChanges]);

  // Convenience methods
  const setTemplate = useCallback((template: AgentTemplate) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
  }, []);

  const setAgentInfo = useCallback((name: string, description: string) => {
    dispatch({ type: 'SET_AGENT_INFO', payload: { name, description } });
  }, []);

  const setKnowledgeBases = useCallback((bases: string[]) => {
    dispatch({ type: 'SET_KNOWLEDGE_BASES', payload: bases });
  }, []);

  const setPersonality = useCallback((personality: PersonalityConfig) => {
    dispatch({ type: 'SET_PERSONALITY', payload: personality });
  }, []);

  const setCapabilities = useCallback((capabilities: AgentCapabilities) => {
    dispatch({ type: 'SET_CAPABILITIES', payload: capabilities });
  }, []);

  const setChannels = useCallback((channels: DeploymentChannel[]) => {
    dispatch({ type: 'SET_CHANNELS', payload: channels });
  }, []);

  // Navigation
  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const previousStep = useCallback(() => {
    dispatch({ type: 'PREVIOUS_STEP' });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'GO_TO_STEP', payload: step });
  }, []);

  // Validation
  const validateStep = useCallback((stepId: string): boolean => {
    switch (stepId) {
      case 'template':
        return state.agentName.trim().length > 0;
      case 'knowledge':
        return state.knowledgeBases.length > 0 || (state.newKnowledgeBase?.files.length || 0) > 0;
      case 'personality':
        return state.personality.systemPrompt.trim().length > 0;
      case 'capabilities':
        return Object.values(state.capabilities).some(cap => cap.enabled);
      case 'channels':
        return state.channels.some(channel => channel.enabled);
      case 'testing':
        return true; // Testing is always valid once reached
      case 'deployment':
        return true; // Deployment is always valid once reached
      default:
        return false;
    }
  }, [state]);

  const setStepValidation = useCallback((step: string, isValid: boolean) => {
    dispatch({ type: 'SET_STEP_VALIDATION', payload: { step, isValid } });
  }, []);

  const setStepErrors = useCallback((step: string, errors: string[]) => {
    dispatch({ type: 'SET_ERRORS', payload: { step, errors } });
  }, []);

  const clearStepErrors = useCallback((step: string) => {
    dispatch({ type: 'CLEAR_ERRORS', payload: step });
  }, []);

  // Draft management
  const saveDraft = useCallback(async () => {
    try {
      // TODO: Implement actual draft saving to database
      const draftId = state.draftId || `draft_${Date.now()}`;
      const draftData = {
        ...state,
        draftId,
        lastSaved: new Date()
      };
      
      localStorage.setItem(`agent_draft_${draftId}`, JSON.stringify(draftData));
      
      dispatch({ 
        type: 'SAVE_DRAFT', 
        payload: { draftId, timestamp: new Date() } 
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [state]);

  const loadDraft = useCallback(async (draftId: string) => {
    try {
      // TODO: Implement actual draft loading from database
      const draftData = localStorage.getItem(`agent_draft_${draftId}`);
      if (draftData) {
        const parsedData = JSON.parse(draftData);
        dispatch({ type: 'LOAD_DRAFT', payload: parsedData });
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);

  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET_WIZARD' });
  }, []);

  // Update step completion status based on validation
  const steps = WIZARD_STEPS.map((step, index) => ({
    ...step,
    isComplete: index < state.currentStep || validateStep(step.id),
    isValid: state.stepValidation[step.id] ?? validateStep(step.id)
  }));

  const contextValue: AgentCreationContextType = {
    state,
    dispatch,
    
    setTemplate,
    setAgentInfo,
    setKnowledgeBases,
    setPersonality,
    setCapabilities,
    setChannels,
    
    nextStep,
    previousStep,
    goToStep,
    
    validateStep,
    setStepValidation,
    setStepErrors,
    clearStepErrors,
    
    saveDraft,
    loadDraft,
    resetWizard,
    
    steps
  };

  return (
    <AgentCreationContext.Provider value={contextValue}>
      {children}
    </AgentCreationContext.Provider>
  );
}

// Hook to use the context
export function useAgentCreation() {
  const context = useContext(AgentCreationContext);
  if (context === undefined) {
    throw new Error('useAgentCreation must be used within an AgentCreationProvider');
  }
  return context;
}