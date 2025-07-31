/**
 * Persona Types for Agent Creation
 * Defines types for the persona creation wizard
 */

export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  personalityConfig: PersonalityConfig;
  expertiseConfig: ExpertiseConfig;
  behaviorConfig: BehaviorConfig;
  contextConfig: ContextConfig;
  generatedPrompt: string;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalityConfig {
  tone: PersonalityTone;
  style: CommunicationStyle;
  traits: PersonalityTrait[];
  emotionalRange: EmotionalRange;
  formality: FormalityLevel;
  humor: HumorLevel;
  empathy: EmpathyLevel;
  customTraits?: string[];
}

export interface ExpertiseConfig {
  domains: ExpertiseDomain[];
  knowledgeLevel: KnowledgeLevel;
  specializations: string[];
  industries: string[];
  languages: string[];
  certifications?: string[];
  experience?: ExperienceLevel;
}

export interface BehaviorConfig {
  responsePatterns: ResponsePattern[];
  constraints: BehaviorConstraint[];
  escalationRules: EscalationRule[];
  conversationFlow: ConversationFlow;
  errorHandling: ErrorHandlingStyle;
  proactivity: ProactivityLevel;
}

export interface ContextConfig {
  memoryRetention: MemoryRetention;
  contextWindow: number;
  personalization: PersonalizationLevel;
  adaptability: AdaptabilityLevel;
  learningMode: LearningMode;
}

// Personality Types
export type PersonalityTone = 
  | 'professional' 
  | 'friendly' 
  | 'casual' 
  | 'authoritative' 
  | 'supportive' 
  | 'enthusiastic'
  | 'calm'
  | 'energetic';

export type CommunicationStyle = 
  | 'concise' 
  | 'detailed' 
  | 'conversational' 
  | 'instructional' 
  | 'consultative'
  | 'storytelling';

export type PersonalityTrait = 
  | 'patient' 
  | 'analytical' 
  | 'creative' 
  | 'diplomatic' 
  | 'direct'
  | 'encouraging'
  | 'methodical'
  | 'innovative'
  | 'collaborative'
  | 'decisive';

export type EmotionalRange = 'minimal' | 'moderate' | 'expressive' | 'highly_expressive';
export type FormalityLevel = 'very_formal' | 'formal' | 'semi_formal' | 'informal' | 'very_informal';
export type HumorLevel = 'none' | 'subtle' | 'moderate' | 'frequent';
export type EmpathyLevel = 'low' | 'moderate' | 'high' | 'very_high';

// Expertise Types
export interface ExpertiseDomain {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  subcategories?: string[];
}

export type KnowledgeLevel = 'basic' | 'intermediate' | 'advanced' | 'expert' | 'specialist';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive' | 'consultant';

// Behavior Types
export interface ResponsePattern {
  trigger: string;
  pattern: string;
  priority: number;
  conditions?: string[];
}

export interface BehaviorConstraint {
  type: 'content' | 'length' | 'topic' | 'format' | 'timing';
  rule: string;
  severity: 'warning' | 'strict' | 'blocking';
}

export interface EscalationRule {
  condition: string;
  action: 'human_handoff' | 'supervisor_alert' | 'workflow_redirect';
  threshold?: number;
  message?: string;
}

export interface ConversationFlow {
  greeting: GreetingStyle;
  questionHandling: QuestionHandlingStyle;
  closingStyle: ClosingStyle;
  followUpBehavior: FollowUpBehavior;
}

export type GreetingStyle = 'warm' | 'professional' | 'brief' | 'personalized' | 'contextual';
export type QuestionHandlingStyle = 'direct' | 'exploratory' | 'clarifying' | 'comprehensive';
export type ClosingStyle = 'summary' | 'action_items' | 'open_ended' | 'formal' | 'friendly';
export type FollowUpBehavior = 'proactive' | 'reactive' | 'scheduled' | 'none';

export type ErrorHandlingStyle = 'apologetic' | 'explanatory' | 'redirective' | 'escalating';
export type ProactivityLevel = 'passive' | 'moderate' | 'active' | 'highly_active';

// Context Types
export interface MemoryRetention {
  shortTerm: number; // minutes
  longTerm: number; // days
  keyFacts: boolean;
  preferences: boolean;
  conversationHistory: boolean;
}

export type PersonalizationLevel = 'none' | 'basic' | 'moderate' | 'high' | 'adaptive';
export type AdaptabilityLevel = 'fixed' | 'limited' | 'moderate' | 'high' | 'dynamic';
export type LearningMode = 'static' | 'session_based' | 'user_based' | 'continuous';

// Wizard State Types
export interface PersonaWizardState {
  currentStep: PersonaWizardStep;
  completedSteps: PersonaWizardStep[];
  sessionId: string;
  personaData: Partial<AgentPersona>;
  isValid: boolean;
  errors: Record<string, string>;
  isDirty: boolean;
}

export type PersonaWizardStep = 
  | 'role_definition'
  | 'personality_setup'
  | 'expertise_config'
  | 'behavior_config'
  | 'context_config'
  | 'review_generate'
  | 'testing'
  | 'completion';

export interface WizardStepConfig {
  step: PersonaWizardStep;
  title: string;
  description: string;
  isRequired: boolean;
  estimatedTime: number; // minutes
  dependencies?: PersonaWizardStep[];
}

// Preset Templates
export interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  category: PersonaCategory;
  icon: string;
  presetConfig: Partial<AgentPersona>;
  customizationOptions: CustomizationOption[];
  usageCount: number;
  rating: number;
  isOfficial: boolean;
}

export type PersonaCategory = 
  | 'customer_service'
  | 'sales'
  | 'support'
  | 'education'
  | 'healthcare'
  | 'finance'
  | 'legal'
  | 'hr'
  | 'marketing'
  | 'general';

export interface CustomizationOption {
  field: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'slider' | 'toggle';
  options?: Array<{ label: string; value: any }>;
  defaultValue?: any;
  description?: string;
}

// Validation Types
export interface PersonaValidationResult {
  isValid: boolean;
  errors: PersonaValidationError[];
  warnings: PersonaValidationWarning[];
  completeness: number; // 0-100%
}

export interface PersonaValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  step: PersonaWizardStep;
}

export interface PersonaValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  step: PersonaWizardStep;
}

// Testing Types
export interface PersonaTestScenario {
  id: string;
  name: string;
  description: string;
  input: string;
  expectedBehavior: string[];
  category: 'greeting' | 'question' | 'complaint' | 'complex' | 'edge_case';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PersonaTestResult {
  scenarioId: string;
  input: string;
  output: string;
  score: number; // 0-100
  feedback: string[];
  behaviorAnalysis: BehaviorAnalysis;
  timestamp: string;
}

export interface BehaviorAnalysis {
  tone: string;
  style: string;
  empathy: number;
  professionalism: number;
  helpfulness: number;
  accuracy: number;
  traits: string[];
}