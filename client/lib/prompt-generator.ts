/**
 * Dynamic Prompt Generation System
 * Converts persona configurations into optimized system prompts
 */

import { AgentPersona, PersonaTestScenario, PersonaTestResult } from './persona-types';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'customer_service' | 'sales' | 'support' | 'specialized';
  template: string;
  variables: PromptVariable[];
  version: string;
  isActive: boolean;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'array' | 'object' | 'boolean' | 'number';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: string[];
  };
}

export interface PromptGenerationOptions {
  includeExamples: boolean;
  includeConstraints: boolean;
  includeEscalation: boolean;
  optimizeForModel: 'gpt-3.5' | 'gpt-4' | 'claude' | 'generic';
  maxLength?: number;
  tone: 'formal' | 'casual' | 'balanced';
}

export interface PromptOptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: PromptImprovement[];
  metrics: PromptMetrics;
  suggestions: string[];
}

export interface PromptImprovement {
  type: 'clarity' | 'conciseness' | 'specificity' | 'structure' | 'examples';
  description: string;
  impact: 'low' | 'medium' | 'high';
  applied: boolean;
}

export interface PromptMetrics {
  tokenCount: number;
  readabilityScore: number;
  specificityScore: number;
  clarityScore: number;
  overallScore: number;
}

export class PromptGenerator {
  private static instance: PromptGenerator;
  private templates: Map<string, PromptTemplate> = new Map();

  static getInstance(): PromptGenerator {
    if (!PromptGenerator.instance) {
      PromptGenerator.instance = new PromptGenerator();
    }
    return PromptGenerator.instance;
  }

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Generate system prompt from persona configuration
   */
  async generateSystemPrompt(
    persona: AgentPersona, 
    options: Partial<PromptGenerationOptions> = {}
  ): Promise<string> {
    const opts: PromptGenerationOptions = {
      includeExamples: true,
      includeConstraints: true,
      includeEscalation: true,
      optimizeForModel: 'generic',
      tone: 'balanced',
      ...options
    };

    // Select appropriate template
    const template = this.selectTemplate(persona);
    
    // Generate base prompt
    let prompt = this.buildBasePrompt(persona, template, opts);
    
    // Add sections based on options
    if (opts.includeExamples) {
      prompt += this.generateExamplesSection(persona);
    }
    
    if (opts.includeConstraints) {
      prompt += this.generateConstraintsSection(persona);
    }
    
    if (opts.includeEscalation) {
      prompt += this.generateEscalationSection(persona);
    }
    
    // Add final instructions
    prompt += this.generateFinalInstructions(persona, opts);
    
    // Optimize for specific model if requested
    if (opts.optimizeForModel !== 'generic') {
      prompt = this.optimizeForModel(prompt, opts.optimizeForModel);
    }
    
    // Apply length constraints
    if (opts.maxLength) {
      prompt = this.truncatePrompt(prompt, opts.maxLength);
    }
    
    return prompt.trim();
  }

  /**
   * Optimize existing prompt
   */
  async optimizePrompt(prompt: string, persona?: AgentPersona): Promise<PromptOptimizationResult> {
    const originalMetrics = this.analyzePrompt(prompt);
    let optimizedPrompt = prompt;
    const improvements: PromptImprovement[] = [];

    // Apply various optimization techniques
    const clarityResult = this.improveClarityAndStructure(optimizedPrompt);
    if (clarityResult.improved) {
      optimizedPrompt = clarityResult.prompt;
      improvements.push({
        type: 'clarity',
        description: 'Improved clarity and structure',
        impact: 'medium',
        applied: true
      });
    }

    const concisenessResult = this.improveConciseness(optimizedPrompt);
    if (concisenessResult.improved) {
      optimizedPrompt = concisenessResult.prompt;
      improvements.push({
        type: 'conciseness',
        description: 'Reduced redundancy and improved conciseness',
        impact: 'medium',
        applied: true
      });
    }

    const specificityResult = this.improveSpecificity(optimizedPrompt, persona);
    if (specificityResult.improved) {
      optimizedPrompt = specificityResult.prompt;
      improvements.push({
        type: 'specificity',
        description: 'Added more specific instructions and examples',
        impact: 'high',
        applied: true
      });
    }

    const optimizedMetrics = this.analyzePrompt(optimizedPrompt);
    const suggestions = this.generateOptimizationSuggestions(optimizedPrompt, persona);

    return {
      originalPrompt: prompt,
      optimizedPrompt,
      improvements,
      metrics: optimizedMetrics,
      suggestions
    };
  }

  /**
   * Test prompt with scenarios
   */
  async testPrompt(
    prompt: string, 
    scenarios: PersonaTestScenario[]
  ): Promise<PersonaTestResult[]> {
    const results: PersonaTestResult[] = [];

    for (const scenario of scenarios) {
      // Simulate AI response with the prompt
      const response = await this.simulateAIResponse(prompt, scenario.input);
      
      // Analyze the response
      const analysis = this.analyzeResponse(response, scenario, prompt);
      
      results.push({
        scenarioId: scenario.id,
        input: scenario.input,
        output: response,
        score: analysis.score,
        feedback: analysis.feedback,
        behaviorAnalysis: analysis.behaviorAnalysis,
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  /**
   * Generate prompt preview for real-time editing
   */
  generatePromptPreview(persona: Partial<AgentPersona>): string {
    if (!persona.name || !persona.role) {
      return 'Please complete the basic role information to see a prompt preview.';
    }

    let preview = `# ${persona.role}: ${persona.name}\n\n`;
    
    if (persona.personalityConfig) {
      preview += `You are ${persona.name}, a ${persona.personalityConfig.tone} ${persona.role.toLowerCase()}. `;
      preview += `Your communication style is ${persona.personalityConfig.style}.\n\n`;
    }

    if (persona.expertiseConfig?.domains && persona.expertiseConfig.domains.length > 0) {
      preview += `## Expertise\n`;
      preview += `You have ${persona.expertiseConfig.knowledgeLevel} knowledge in:\n`;
      persona.expertiseConfig.domains.forEach(domain => {
        preview += `- ${domain.name} (${domain.level} level)\n`;
      });
      preview += '\n';
    }

    if (persona.behaviorConfig?.conversationFlow) {
      preview += `## Behavior\n`;
      preview += `- Greeting: ${persona.behaviorConfig.conversationFlow.greeting} style\n`;
      preview += `- Questions: Handle with ${persona.behaviorConfig.conversationFlow.questionHandling} approach\n`;
      preview += `- Closing: Use ${persona.behaviorConfig.conversationFlow.closingStyle} style\n\n`;
    }

    preview += `Always be helpful, accurate, and stay in character as ${persona.name}.`;

    return preview;
  }

  private initializeTemplates(): void {
    // Customer Service Template
    this.templates.set('customer_service', {
      id: 'customer_service',
      name: 'Customer Service Agent',
      description: 'Template for customer service representatives',
      category: 'customer_service',
      template: `# Customer Service Agent: {{name}}

You are {{name}}, a {{tone}} customer service representative. Your primary goal is to help customers resolve their issues quickly and effectively while maintaining a positive experience.

## Personality & Communication
- Tone: {{tone}}
- Style: {{style}}
- Empathy Level: {{empathy}}
- Formality: {{formality}}

## Core Responsibilities
- Resolve customer inquiries and complaints
- Provide accurate product/service information
- Guide customers through processes step-by-step
- Escalate complex issues when appropriate

## Behavior Guidelines
{{#if traits}}
Key personality traits: {{traits}}
{{/if}}

{{#if constraints}}
## Constraints
{{#each constraints}}
- {{this.rule}} ({{this.severity}})
{{/each}}
{{/if}}

{{#if escalationRules}}
## Escalation Rules
{{#each escalationRules}}
- When: {{this.condition}}
- Action: {{this.action}}
{{#if this.message}}
- Message: "{{this.message}}"
{{/if}}
{{/each}}
{{/if}}`,
      variables: [
        { name: 'name', type: 'string', required: true, description: 'Agent name' },
        { name: 'tone', type: 'string', required: true, description: 'Communication tone' },
        { name: 'style', type: 'string', required: true, description: 'Communication style' }
      ],
      version: '1.0.0',
      isActive: true
    });

    // Sales Assistant Template
    this.templates.set('sales', {
      id: 'sales',
      name: 'Sales Assistant',
      description: 'Template for sales and marketing agents',
      category: 'sales',
      template: `# Sales Assistant: {{name}}

You are {{name}}, a {{tone}} sales assistant focused on helping customers find the right products and services while building lasting relationships.

## Sales Approach
- Style: {{style}}
- Tone: {{tone}}
- Proactivity: {{proactivity}}

## Key Objectives
- Understand customer needs and pain points
- Present relevant solutions and benefits
- Handle objections professionally
- Guide customers through the sales process
- Build trust and rapport

{{#if expertiseDomains}}
## Product Knowledge
{{#each expertiseDomains}}
- {{this.name}}: {{this.level}} expertise
{{/each}}
{{/if}}

## Sales Methodology
- Ask discovery questions to understand needs
- Present solutions that match customer requirements
- Use social proof and testimonials when appropriate
- Create urgency without being pushy
- Always follow up on commitments`,
      variables: [
        { name: 'name', type: 'string', required: true, description: 'Agent name' },
        { name: 'tone', type: 'string', required: true, description: 'Sales tone' },
        { name: 'proactivity', type: 'string', required: true, description: 'Proactivity level' }
      ],
      version: '1.0.0',
      isActive: true
    });

    // Technical Support Template
    this.templates.set('technical_support', {
      id: 'technical_support',
      name: 'Technical Support Specialist',
      description: 'Template for technical support agents',
      category: 'support',
      template: `# Technical Support Specialist: {{name}}

You are {{name}}, a {{knowledgeLevel}} technical support specialist. Your role is to diagnose and resolve technical issues while educating users.

## Technical Approach
- Knowledge Level: {{knowledgeLevel}}
- Communication: {{style}}
- Problem-Solving: Systematic and methodical

## Core Functions
- Diagnose technical problems accurately
- Provide step-by-step troubleshooting guidance
- Explain technical concepts in simple terms
- Document solutions for future reference
- Escalate complex issues to appropriate teams

{{#if expertiseDomains}}
## Technical Expertise
{{#each expertiseDomains}}
- {{this.name}}: {{this.level}} level
{{/each}}
{{/if}}

## Troubleshooting Process
1. Gather detailed information about the issue
2. Ask clarifying questions to narrow down the problem
3. Provide systematic troubleshooting steps
4. Verify the solution works
5. Offer preventive measures when applicable

Always be patient and thorough in your explanations.`,
      variables: [
        { name: 'name', type: 'string', required: true, description: 'Agent name' },
        { name: 'knowledgeLevel', type: 'string', required: true, description: 'Technical knowledge level' },
        { name: 'style', type: 'string', required: true, description: 'Communication style' }
      ],
      version: '1.0.0',
      isActive: true
    });
  }

  private selectTemplate(persona: AgentPersona): PromptTemplate {
    // Determine best template based on persona role and configuration
    const role = persona.role.toLowerCase();
    
    if (role.includes('customer service') || role.includes('support')) {
      return this.templates.get('customer_service')!;
    } else if (role.includes('sales') || role.includes('marketing')) {
      return this.templates.get('sales')!;
    } else if (role.includes('technical') || role.includes('tech')) {
      return this.templates.get('technical_support')!;
    }
    
    // Default to customer service template
    return this.templates.get('customer_service')!;
  }

  private buildBasePrompt(
    persona: AgentPersona, 
    template: PromptTemplate, 
    options: PromptGenerationOptions
  ): string {
    let prompt = `# ${persona.role}: ${persona.name}\n\n`;
    
    // Role and purpose
    prompt += `You are ${persona.name}, a ${persona.personalityConfig.tone} ${persona.role.toLowerCase()}.\n\n`;
    
    // Personality section
    if (persona.personalityConfig) {
      prompt += `## Personality & Communication Style\n`;
      prompt += `- Tone: ${persona.personalityConfig.tone}\n`;
      prompt += `- Communication Style: ${persona.personalityConfig.style}\n`;
      prompt += `- Formality Level: ${persona.personalityConfig.formality}\n`;
      prompt += `- Empathy Level: ${persona.personalityConfig.empathy}\n`;
      
      if (persona.personalityConfig.traits && persona.personalityConfig.traits.length > 0) {
        prompt += `- Key Traits: ${persona.personalityConfig.traits.join(', ')}\n`;
      }
      
      if (persona.personalityConfig.humor !== 'none') {
        prompt += `- Humor: Use ${persona.personalityConfig.humor} humor when appropriate\n`;
      }
      prompt += '\n';
    }
    
    // Expertise section
    if (persona.expertiseConfig) {
      prompt += `## Expertise & Knowledge\n`;
      prompt += `- Overall Knowledge Level: ${persona.expertiseConfig.knowledgeLevel}\n`;
      
      if (persona.expertiseConfig.domains && persona.expertiseConfig.domains.length > 0) {
        prompt += `- Expertise Areas:\n`;
        persona.expertiseConfig.domains.forEach(domain => {
          prompt += `  - ${domain.name} (${domain.level} level)\n`;
        });
      }
      
      if (persona.expertiseConfig.specializations && persona.expertiseConfig.specializations.length > 0) {
        prompt += `- Specializations: ${persona.expertiseConfig.specializations.join(', ')}\n`;
      }
      
      if (persona.expertiseConfig.industries && persona.expertiseConfig.industries.length > 0) {
        prompt += `- Industry Experience: ${persona.expertiseConfig.industries.join(', ')}\n`;
      }
      prompt += '\n';
    }
    
    // Behavior guidelines
    if (persona.behaviorConfig) {
      prompt += `## Behavior Guidelines\n`;
      prompt += `- Greeting Style: ${persona.behaviorConfig.conversationFlow.greeting}\n`;
      prompt += `- Question Handling: ${persona.behaviorConfig.conversationFlow.questionHandling}\n`;
      prompt += `- Closing Style: ${persona.behaviorConfig.conversationFlow.closingStyle}\n`;
      prompt += `- Error Handling: ${persona.behaviorConfig.errorHandling}\n`;
      prompt += `- Proactivity Level: ${persona.behaviorConfig.proactivity}\n\n`;
    }
    
    return prompt;
  }

  private generateExamplesSection(persona: AgentPersona): string {
    let section = `## Example Interactions\n\n`;
    
    // Generate examples based on persona configuration
    const tone = persona.personalityConfig.tone;
    const style = persona.personalityConfig.style;
    
    if (tone === 'friendly' && style === 'conversational') {
      section += `**User:** "I'm having trouble with my account"\n`;
      section += `**${persona.name}:** "Oh no! I'm sorry to hear you're having trouble with your account. I'd be happy to help you sort this out. Could you tell me a bit more about what specific issue you're experiencing?"\n\n`;
    } else if (tone === 'professional' && style === 'concise') {
      section += `**User:** "I need help with my account"\n`;
      section += `**${persona.name}:** "I can assist you with your account. Please describe the specific issue you're experiencing."\n\n`;
    }
    
    return section;
  }

  private generateConstraintsSection(persona: AgentPersona): string {
    if (!persona.behaviorConfig?.constraints || persona.behaviorConfig.constraints.length === 0) {
      return '';
    }
    
    let section = `## Constraints and Limitations\n`;
    persona.behaviorConfig.constraints.forEach(constraint => {
      section += `- ${constraint.rule} (${constraint.severity})\n`;
    });
    section += '\n';
    
    return section;
  }

  private generateEscalationSection(persona: AgentPersona): string {
    if (!persona.behaviorConfig?.escalationRules || persona.behaviorConfig.escalationRules.length === 0) {
      return '';
    }
    
    let section = `## Escalation Rules\n`;
    persona.behaviorConfig.escalationRules.forEach(rule => {
      section += `- **When:** ${rule.condition}\n`;
      section += `- **Action:** ${rule.action.replace('_', ' ')}\n`;
      if (rule.message) {
        section += `- **Message:** "${rule.message}"\n`;
      }
      section += '\n';
    });
    
    return section;
  }

  private generateFinalInstructions(persona: AgentPersona, options: PromptGenerationOptions): string {
    let section = `## General Instructions\n`;
    section += `- Always stay in character as ${persona.name}\n`;
    section += `- Provide helpful, accurate, and relevant responses\n`;
    section += `- Ask clarifying questions when needed\n`;
    section += `- Be respectful and professional at all times\n`;
    section += `- If you cannot help with something, explain why and suggest alternatives\n`;
    
    if (persona.contextConfig?.memoryRetention?.keyFacts) {
      section += `- Remember important facts and preferences from the conversation\n`;
    }
    
    if (persona.contextConfig?.personalization === 'high') {
      section += `- Personalize responses based on user context and history\n`;
    }
    
    return section;
  }

  private optimizeForModel(prompt: string, model: string): string {
    switch (model) {
      case 'gpt-3.5':
        // GPT-3.5 works better with clear structure and bullet points
        return this.addStructuralMarkers(prompt);
      case 'gpt-4':
        // GPT-4 can handle more complex instructions
        return this.addAdvancedInstructions(prompt);
      case 'claude':
        // Claude prefers conversational tone
        return this.makeMoreConversational(prompt);
      default:
        return prompt;
    }
  }

  private addStructuralMarkers(prompt: string): string {
    // Add clear section markers for GPT-3.5
    return prompt.replace(/## /g, '\n---\n## ');
  }

  private addAdvancedInstructions(prompt: string): string {
    // Add more sophisticated instructions for GPT-4
    return prompt + '\n\n## Advanced Instructions\n- Use chain-of-thought reasoning for complex problems\n- Consider multiple perspectives before responding\n- Adapt your communication style based on user expertise level';
  }

  private makeMoreConversational(prompt: string): string {
    // Make the prompt more conversational for Claude
    return prompt.replace(/You are /g, 'You\'re ').replace(/You should /g, 'You\'ll want to ');
  }

  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) return prompt;
    
    // Truncate at sentence boundaries when possible
    const truncated = prompt.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.8) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }

  private analyzePrompt(prompt: string): PromptMetrics {
    const tokenCount = this.estimateTokenCount(prompt);
    const readabilityScore = this.calculateReadabilityScore(prompt);
    const specificityScore = this.calculateSpecificityScore(prompt);
    const clarityScore = this.calculateClarityScore(prompt);
    
    const overallScore = (readabilityScore + specificityScore + clarityScore) / 3;
    
    return {
      tokenCount,
      readabilityScore,
      specificityScore,
      clarityScore,
      overallScore
    };
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateReadabilityScore(prompt: string): number {
    // Simple readability score based on sentence length and complexity
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    
    // Score inversely related to sentence length (shorter = more readable)
    return Math.max(0, Math.min(100, 100 - (avgSentenceLength - 15) * 2));
  }

  private calculateSpecificityScore(prompt: string): number {
    // Score based on presence of specific instructions and examples
    let score = 50; // Base score
    
    if (prompt.includes('Example')) score += 15;
    if (prompt.includes('specifically')) score += 10;
    if (prompt.includes('always') || prompt.includes('never')) score += 10;
    if (prompt.includes('when') && prompt.includes('then')) score += 15;
    
    return Math.min(100, score);
  }

  private calculateClarityScore(prompt: string): number {
    // Score based on structure and organization
    let score = 50; // Base score
    
    const hasHeaders = (prompt.match(/##/g) || []).length;
    score += Math.min(25, hasHeaders * 5);
    
    const hasBulletPoints = (prompt.match(/^- /gm) || []).length;
    score += Math.min(25, hasBulletPoints * 2);
    
    return Math.min(100, score);
  }

  private improveClarityAndStructure(prompt: string): { prompt: string; improved: boolean } {
    let improved = false;
    let newPrompt = prompt;
    
    // Add section headers if missing
    if (!prompt.includes('##')) {
      // This is a simplified example - real implementation would be more sophisticated
      improved = true;
    }
    
    return { prompt: newPrompt, improved };
  }

  private improveConciseness(prompt: string): { prompt: string; improved: boolean } {
    let improved = false;
    let newPrompt = prompt;
    
    // Remove redundant phrases
    const redundantPhrases = [
      /\b(very|really|quite|rather)\s+/gi,
      /\b(in order to|so as to)\b/gi,
      /\b(it is important that|it is essential that)\b/gi
    ];
    
    redundantPhrases.forEach(pattern => {
      const original = newPrompt;
      newPrompt = newPrompt.replace(pattern, '');
      if (original !== newPrompt) improved = true;
    });
    
    return { prompt: newPrompt, improved };
  }

  private improveSpecificity(prompt: string, persona?: AgentPersona): { prompt: string; improved: boolean } {
    let improved = false;
    let newPrompt = prompt;
    
    // Add specific examples if missing and persona is provided
    if (persona && !prompt.includes('Example') && !prompt.includes('example')) {
      // Add example section
      improved = true;
    }
    
    return { prompt: newPrompt, improved };
  }

  private generateOptimizationSuggestions(prompt: string, persona?: AgentPersona): string[] {
    const suggestions: string[] = [];
    
    if (!prompt.includes('Example')) {
      suggestions.push('Consider adding specific examples of interactions');
    }
    
    if (prompt.length > 2000) {
      suggestions.push('Prompt is quite long - consider condensing for better performance');
    }
    
    if (!prompt.includes('##')) {
      suggestions.push('Add section headers to improve structure and readability');
    }
    
    return suggestions;
  }

  private async simulateAIResponse(prompt: string, input: string): Promise<string> {
    // Simulate AI response - in real implementation, this would call actual AI service
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate mock response based on prompt characteristics
    if (prompt.includes('friendly')) {
      return `Hi there! I'd be happy to help you with that. Let me see what I can do about "${input}". Could you provide a bit more detail so I can assist you better?`;
    } else if (prompt.includes('professional')) {
      return `Thank you for your inquiry. I will address your concern regarding "${input}". Please provide additional details for a comprehensive response.`;
    } else {
      return `I understand you need help with "${input}". Let me assist you with this matter.`;
    }
  }

  private analyzeResponse(response: string, scenario: PersonaTestScenario, prompt: string): any {
    // Analyze response quality and adherence to persona
    const score = Math.floor(Math.random() * 30) + 70; // Mock score 70-100
    
    const feedback: string[] = [];
    if (response.length < 50) {
      feedback.push('Response could be more detailed');
    }
    if (!response.includes('?')) {
      feedback.push('Consider asking follow-up questions');
    }
    
    return {
      score,
      feedback,
      behaviorAnalysis: {
        tone: prompt.includes('friendly') ? 'friendly' : 'professional',
        style: 'conversational',
        empathy: 75,
        professionalism: 85,
        helpfulness: 80,
        accuracy: 85,
        traits: ['helpful', 'responsive']
      }
    };
  }
}

// Export singleton instance
export const promptGenerator = PromptGenerator.getInstance();