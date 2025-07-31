/**
 * Persona Service
 * Handles persona creation, management, and testing
 */

import { supabase } from './supabase';
import {
  AgentPersona,
  PersonaWizardState,
  PersonaWizardStep,
  PersonaTemplate,
  PersonaValidationResult,
  PersonaTestScenario,
  PersonaTestResult,
  WizardStepConfig
} from './persona-types';

export class PersonaService {
  private static instance: PersonaService;

  static getInstance(): PersonaService {
    if (!PersonaService.instance) {
      PersonaService.instance = new PersonaService();
    }
    return PersonaService.instance;
  }

  /**
   * Get wizard step configurations
   */
  getWizardSteps(): WizardStepConfig[] {
    return [
      {
        step: 'role_definition',
        title: 'Define Role & Purpose',
        description: 'Set the basic role and purpose of your agent',
        isRequired: true,
        estimatedTime: 3
      },
      {
        step: 'personality_setup',
        title: 'Personality & Tone',
        description: 'Configure personality traits and communication style',
        isRequired: true,
        estimatedTime: 5,
        dependencies: ['role_definition']
      },
      {
        step: 'expertise_config',
        title: 'Expertise & Knowledge',
        description: 'Define knowledge domains and expertise levels',
        isRequired: true,
        estimatedTime: 4,
        dependencies: ['role_definition']
      },
      {
        step: 'behavior_config',
        title: 'Behavior & Responses',
        description: 'Set response patterns and conversation flow',
        isRequired: true,
        estimatedTime: 6,
        dependencies: ['personality_setup', 'expertise_config']
      },
      {
        step: 'context_config',
        title: 'Context & Memory',
        description: 'Configure memory retention and personalization',
        isRequired: false,
        estimatedTime: 3,
        dependencies: ['behavior_config']
      },
      {
        step: 'review_generate',
        title: 'Review & Generate',
        description: 'Review configuration and generate system prompt',
        isRequired: true,
        estimatedTime: 2,
        dependencies: ['behavior_config']
      },
      {
        step: 'testing',
        title: 'Test & Refine',
        description: 'Test the persona with sample scenarios',
        isRequired: false,
        estimatedTime: 10,
        dependencies: ['review_generate']
      },
      {
        step: 'completion',
        title: 'Save & Deploy',
        description: 'Save the persona and prepare for deployment',
        isRequired: true,
        estimatedTime: 1,
        dependencies: ['review_generate']
      }
    ];
  }

  /**
   * Create a new wizard session
   */
  async createWizardSession(userId: string): Promise<PersonaWizardState> {
    const sessionId = crypto.randomUUID();
    
    const sessionData = {
      currentStep: 'role_definition' as PersonaWizardStep,
      completedSteps: [],
      sessionId,
      personaData: {
        id: crypto.randomUUID(),
        name: '',
        role: '',
        personalityConfig: {
          tone: 'professional',
          style: 'conversational',
          traits: [],
          emotionalRange: 'moderate',
          formality: 'semi_formal',
          humor: 'subtle',
          empathy: 'moderate'
        },
        expertiseConfig: {
          domains: [],
          knowledgeLevel: 'intermediate',
          specializations: [],
          industries: [],
          languages: ['en']
        },
        behaviorConfig: {
          responsePatterns: [],
          constraints: [],
          escalationRules: [],
          conversationFlow: {
            greeting: 'professional',
            questionHandling: 'comprehensive',
            closingStyle: 'summary',
            followUpBehavior: 'reactive'
          },
          errorHandling: 'explanatory',
          proactivity: 'moderate'
        },
        contextConfig: {
          memoryRetention: {
            shortTerm: 30,
            longTerm: 7,
            keyFacts: true,
            preferences: true,
            conversationHistory: true
          },
          contextWindow: 4000,
          personalization: 'moderate',
          adaptability: 'moderate',
          learningMode: 'session_based'
        },
        isTemplate: false
      },
      isValid: false,
      errors: {},
      isDirty: false
    };

    // Save session to database
    try {
      const { error } = await supabase
        .from('persona_creation_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          session_data: sessionData,
          current_step: sessionData.currentStep,
          status: 'active'
        });

      if (error) {
        console.error('Failed to create wizard session:', error);
      }
    } catch (error) {
      console.error('Failed to save wizard session:', error);
    }

    return sessionData;
  }

  /**
   * Load existing wizard session
   */
  async loadWizardSession(sessionId: string): Promise<PersonaWizardState | null> {
    try {
      const { data, error } = await supabase
        .from('persona_creation_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        console.error('Failed to load wizard session:', error);
        return null;
      }

      return data.session_data as PersonaWizardState;
    } catch (error) {
      console.error('Failed to load wizard session:', error);
      return null;
    }
  }

  /**
   * Update wizard session
   */
  async updateWizardSession(sessionId: string, state: PersonaWizardState): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('persona_creation_sessions')
        .update({
          session_data: state,
          current_step: state.currentStep,
          completed_steps: state.completedSteps,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Failed to update wizard session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update wizard session:', error);
      return false;
    }
  }

  /**
   * Complete wizard session and save persona
   */
  async completeWizardSession(sessionId: string, userId: string): Promise<AgentPersona | null> {
    try {
      // Load session
      const session = await this.loadWizardSession(sessionId);
      if (!session || !session.personaData) {
        throw new Error('Invalid session data');
      }

      // Generate final prompt
      const generatedPrompt = await this.generateSystemPrompt(session.personaData as AgentPersona);

      // Create final persona
      const persona: AgentPersona = {
        ...session.personaData as AgentPersona,
        generatedPrompt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save persona to database
      const { data, error } = await supabase
        .from('agent_personas')
        .insert({
          id: persona.id,
          user_id: userId,
          name: persona.name,
          role: persona.role,
          personality_config: persona.personalityConfig,
          expertise_config: persona.expertiseConfig,
          behavior_config: persona.behaviorConfig,
          context_config: persona.contextConfig,
          generated_prompt: persona.generatedPrompt,
          is_template: persona.isTemplate
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save persona:', error);
        return null;
      }

      // Mark session as completed
      await supabase
        .from('persona_creation_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      return persona;
    } catch (error) {
      console.error('Failed to complete wizard session:', error);
      return null;
    }
  }

  /**
   * Validate persona configuration
   */
  validatePersona(persona: Partial<AgentPersona>): PersonaValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];
    let completeness = 0;

    // Role validation
    if (!persona.name || persona.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Persona name is required',
        severity: 'error',
        step: 'role_definition'
      });
    } else {
      completeness += 15;
    }

    if (!persona.role || persona.role.trim() === '') {
      errors.push({
        field: 'role',
        message: 'Persona role is required',
        severity: 'error',
        step: 'role_definition'
      });
    } else {
      completeness += 15;
    }

    // Personality validation
    if (persona.personalityConfig) {
      if (persona.personalityConfig.traits && persona.personalityConfig.traits.length > 0) {
        completeness += 20;
      } else {
        warnings.push({
          field: 'personality.traits',
          message: 'Consider adding personality traits for better responses',
          step: 'personality_setup'
        });
      }
    }

    // Expertise validation
    if (persona.expertiseConfig) {
      if (persona.expertiseConfig.domains && persona.expertiseConfig.domains.length > 0) {
        completeness += 20;
      } else {
        warnings.push({
          field: 'expertise.domains',
          message: 'Add expertise domains to improve response accuracy',
          step: 'expertise_config'
        });
      }
    }

    // Behavior validation
    if (persona.behaviorConfig) {
      completeness += 15;
      
      if (persona.behaviorConfig.escalationRules && persona.behaviorConfig.escalationRules.length === 0) {
        warnings.push({
          field: 'behavior.escalationRules',
          message: 'Consider adding escalation rules for complex scenarios',
          step: 'behavior_config'
        });
      }
    }

    // Context validation
    if (persona.contextConfig) {
      completeness += 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness: Math.min(100, completeness)
    };
  }

  /**
   * Generate system prompt from persona configuration
   */
  async generateSystemPrompt(persona: AgentPersona): Promise<string> {
    const sections: string[] = [];

    // Role and purpose
    sections.push(`# Role: ${persona.role}`);
    sections.push(`You are ${persona.name}, ${persona.role.toLowerCase()}.`);

    // Personality
    if (persona.personalityConfig) {
      const personality = persona.personalityConfig;
      sections.push(`\n# Personality & Communication Style`);
      sections.push(`- Tone: ${personality.tone}`);
      sections.push(`- Communication Style: ${personality.style}`);
      sections.push(`- Formality Level: ${personality.formality}`);
      sections.push(`- Empathy Level: ${personality.empathy}`);
      
      if (personality.traits && personality.traits.length > 0) {
        sections.push(`- Key Traits: ${personality.traits.join(', ')}`);
      }
      
      if (personality.humor !== 'none') {
        sections.push(`- Humor: Use ${personality.humor} humor when appropriate`);
      }
    }

    // Expertise
    if (persona.expertiseConfig) {
      const expertise = persona.expertiseConfig;
      sections.push(`\n# Expertise & Knowledge`);
      sections.push(`- Knowledge Level: ${expertise.knowledgeLevel}`);
      
      if (expertise.domains && expertise.domains.length > 0) {
        sections.push(`- Expertise Domains:`);
        expertise.domains.forEach(domain => {
          sections.push(`  - ${domain.name} (${domain.level})`);
        });
      }
      
      if (expertise.specializations && expertise.specializations.length > 0) {
        sections.push(`- Specializations: ${expertise.specializations.join(', ')}`);
      }
      
      if (expertise.industries && expertise.industries.length > 0) {
        sections.push(`- Industries: ${expertise.industries.join(', ')}`);
      }
    }

    // Behavior guidelines
    if (persona.behaviorConfig) {
      const behavior = persona.behaviorConfig;
      sections.push(`\n# Behavior Guidelines`);
      sections.push(`- Greeting Style: ${behavior.conversationFlow.greeting}`);
      sections.push(`- Question Handling: ${behavior.conversationFlow.questionHandling}`);
      sections.push(`- Closing Style: ${behavior.conversationFlow.closingStyle}`);
      sections.push(`- Error Handling: ${behavior.errorHandling}`);
      sections.push(`- Proactivity: ${behavior.proactivity}`);
      
      if (behavior.constraints && behavior.constraints.length > 0) {
        sections.push(`\n## Constraints:`);
        behavior.constraints.forEach(constraint => {
          sections.push(`- ${constraint.rule} (${constraint.severity})`);
        });
      }
      
      if (behavior.escalationRules && behavior.escalationRules.length > 0) {
        sections.push(`\n## Escalation Rules:`);
        behavior.escalationRules.forEach(rule => {
          sections.push(`- ${rule.condition} → ${rule.action}`);
        });
      }
    }

    // Context and memory
    if (persona.contextConfig) {
      const context = persona.contextConfig;
      sections.push(`\n# Context & Memory`);
      sections.push(`- Personalization: ${context.personalization}`);
      sections.push(`- Adaptability: ${context.adaptability}`);
      sections.push(`- Learning Mode: ${context.learningMode}`);
      
      if (context.memoryRetention) {
        sections.push(`- Remember key facts: ${context.memoryRetention.keyFacts ? 'Yes' : 'No'}`);
        sections.push(`- Remember preferences: ${context.memoryRetention.preferences ? 'Yes' : 'No'}`);
      }
    }

    // General instructions
    sections.push(`\n# General Instructions`);
    sections.push(`- Always stay in character as ${persona.name}`);
    sections.push(`- Provide helpful, accurate, and relevant responses`);
    sections.push(`- Ask clarifying questions when needed`);
    sections.push(`- Be respectful and professional at all times`);
    sections.push(`- If you cannot help with something, explain why and suggest alternatives`);

    return sections.join('\n');
  }

  /**
   * Get persona templates
   */
  async getPersonaTemplates(): Promise<PersonaTemplate[]> {
    // Mock templates for now - in real implementation, these would come from database
    return [
      {
        id: 'customer-service-rep',
        name: 'Customer Service Representative',
        description: 'Friendly and helpful customer service agent',
        category: 'customer_service',
        icon: '🎧',
        presetConfig: {
          role: 'Customer Service Representative',
          personalityConfig: {
            tone: 'friendly',
            style: 'conversational',
            traits: ['patient', 'empathetic', 'helpful'],
            emotionalRange: 'moderate',
            formality: 'semi_formal',
            humor: 'subtle',
            empathy: 'high'
          }
        },
        customizationOptions: [],
        usageCount: 1250,
        rating: 4.8,
        isOfficial: true
      },
      {
        id: 'sales-assistant',
        name: 'Sales Assistant',
        description: 'Persuasive and knowledgeable sales support agent',
        category: 'sales',
        icon: '💼',
        presetConfig: {
          role: 'Sales Assistant',
          personalityConfig: {
            tone: 'enthusiastic',
            style: 'consultative',
            traits: ['persuasive', 'knowledgeable', 'confident'],
            emotionalRange: 'expressive',
            formality: 'semi_formal',
            humor: 'moderate',
            empathy: 'moderate'
          }
        },
        customizationOptions: [],
        usageCount: 890,
        rating: 4.6,
        isOfficial: true
      },
      {
        id: 'technical-support',
        name: 'Technical Support Specialist',
        description: 'Expert technical support with problem-solving focus',
        category: 'support',
        icon: '🔧',
        presetConfig: {
          role: 'Technical Support Specialist',
          personalityConfig: {
            tone: 'professional',
            style: 'instructional',
            traits: ['analytical', 'methodical', 'patient'],
            emotionalRange: 'minimal',
            formality: 'formal',
            humor: 'none',
            empathy: 'moderate'
          }
        },
        customizationOptions: [],
        usageCount: 675,
        rating: 4.7,
        isOfficial: true
      }
    ];
  }

  /**
   * Get test scenarios for persona testing
   */
  getTestScenarios(): PersonaTestScenario[] {
    return [
      {
        id: 'greeting-test',
        name: 'Initial Greeting',
        description: 'Test how the persona greets new users',
        input: 'Hello, I need help with something.',
        expectedBehavior: ['Warm greeting', 'Offer assistance', 'Ask clarifying questions'],
        category: 'greeting',
        difficulty: 'easy'
      },
      {
        id: 'complex-question',
        name: 'Complex Question',
        description: 'Test handling of complex multi-part questions',
        input: 'I have a problem with my account, I can\'t log in, and I think my password was changed, but I also need to update my billing information. Can you help?',
        expectedBehavior: ['Break down the issues', 'Prioritize problems', 'Provide step-by-step help'],
        category: 'complex',
        difficulty: 'hard'
      },
      {
        id: 'complaint-handling',
        name: 'Customer Complaint',
        description: 'Test empathy and problem-solving for complaints',
        input: 'I\'m really frustrated! Your service has been terrible and I want my money back!',
        expectedBehavior: ['Show empathy', 'Acknowledge frustration', 'Offer solutions'],
        category: 'complaint',
        difficulty: 'medium'
      },
      {
        id: 'edge-case',
        name: 'Out of Scope Request',
        description: 'Test handling of requests outside expertise',
        input: 'Can you help me with my tax returns?',
        expectedBehavior: ['Politely decline', 'Explain limitations', 'Suggest alternatives'],
        category: 'edge_case',
        difficulty: 'medium'
      }
    ];
  }

  /**
   * Test persona with a scenario
   */
  async testPersona(persona: AgentPersona, scenario: PersonaTestScenario): Promise<PersonaTestResult> {
    // Simulate AI response using the persona's generated prompt
    // In real implementation, this would call the AI service with the persona prompt
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Mock response based on persona configuration
    const mockResponse = this.generateMockResponse(persona, scenario);
    
    // Analyze the response
    const analysis = this.analyzeBehavior(mockResponse, persona);
    
    // Calculate score based on expected behavior
    const score = this.calculateTestScore(mockResponse, scenario, analysis);

    return {
      scenarioId: scenario.id,
      input: scenario.input,
      output: mockResponse,
      score,
      feedback: this.generateFeedback(score, analysis, scenario),
      behaviorAnalysis: analysis,
      timestamp: new Date().toISOString()
    };
  }

  private generateMockResponse(persona: AgentPersona, scenario: PersonaTestScenario): string {
    const personality = persona.personalityConfig;
    const role = persona.role;

    // Generate response based on scenario and personality
    switch (scenario.category) {
      case 'greeting':
        if (personality.tone === 'friendly') {
          return `Hello! I'm ${persona.name}, your ${role.toLowerCase()}. I'd be happy to help you with whatever you need. Could you tell me a bit more about what you're looking for assistance with?`;
        } else if (personality.tone === 'professional') {
          return `Good day. I am ${persona.name}, ${role}. How may I assist you today?`;
        }
        break;
        
      case 'complaint':
        if (personality.empathy === 'high') {
          return `I completely understand your frustration, and I sincerely apologize for the poor experience you've had. Let me see what I can do to make this right for you. Could you please provide me with some specific details about the issues you've encountered so I can address them properly?`;
        }
        break;
        
      case 'complex':
        return `I can see you have several concerns that need attention. Let me help you work through these step by step. First, let's address your login issue, then we can move on to your password and billing information. For the login problem, could you tell me what happens when you try to access your account?`;
        
      case 'edge_case':
        return `I appreciate you reaching out, but I'm specifically designed to help with ${persona.expertiseConfig?.domains?.[0]?.name || 'our services'} rather than tax-related matters. For tax assistance, I'd recommend consulting with a qualified tax professional or using specialized tax software. Is there anything else I can help you with regarding our services?`;
    }

    return `Thank you for your message. As ${persona.name}, I'm here to help you. Let me address your request...`;
  }

  private analyzeBehavior(response: string, persona: AgentPersona): any {
    // Mock behavior analysis
    return {
      tone: persona.personalityConfig.tone,
      style: persona.personalityConfig.style,
      empathy: persona.personalityConfig.empathy === 'high' ? 85 : 70,
      professionalism: persona.personalityConfig.formality === 'formal' ? 90 : 75,
      helpfulness: 80,
      accuracy: 85,
      traits: persona.personalityConfig.traits || []
    };
  }

  private calculateTestScore(response: string, scenario: PersonaTestScenario, analysis: any): number {
    // Mock scoring based on response quality and expected behavior
    let score = 70; // Base score

    // Adjust based on scenario difficulty
    if (scenario.difficulty === 'easy') score += 10;
    if (scenario.difficulty === 'hard') score -= 5;

    // Adjust based on behavior analysis
    score += (analysis.empathy - 70) * 0.2;
    score += (analysis.helpfulness - 70) * 0.3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private generateFeedback(score: number, analysis: any, scenario: PersonaTestScenario): string[] {
    const feedback: string[] = [];

    if (score >= 90) {
      feedback.push('Excellent response! The persona handled this scenario very well.');
    } else if (score >= 75) {
      feedback.push('Good response with room for minor improvements.');
    } else if (score >= 60) {
      feedback.push('Adequate response, but could be enhanced.');
    } else {
      feedback.push('Response needs significant improvement.');
    }

    if (analysis.empathy < 70) {
      feedback.push('Consider increasing empathy level for better user connection.');
    }

    if (scenario.category === 'complaint' && analysis.empathy < 80) {
      feedback.push('Complaint handling requires higher empathy and acknowledgment.');
    }

    return feedback;
  }
}

// Export singleton instance
export const personaService = PersonaService.getInstance();